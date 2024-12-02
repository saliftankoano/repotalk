import { auth, clerkClient } from "@clerk/nextjs/server";
import { Octokit } from "@octokit/rest";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

interface CodeContent {
  path: string;
  content: string;
  type: "function" | "file";
  functionName?: string;
}

async function getGithubToken(
  userId: string | null | undefined
): Promise<string> {
  if (!userId) {
    throw new Error("Unauthorized: No user ID provided");
  }

  const provider = "oauth_github";
  const client = await clerkClient();
  const clerkResponse = await client.users.getUserOauthAccessToken(
    userId,
    provider
  );
  const githubToken = clerkResponse.data[0]?.token;

  if (!githubToken) {
    throw new Error("Access token not found");
  }

  return githubToken;
}

async function fetchRepositoryContent(
  repository: string | undefined,
  githubToken: string
) {
  if (!repository) {
    throw new Error("Repository identifier is required");
  }

  try {
    console.log("Fetching repository content for:", repository);
    console.log("GitHub token present:", !!githubToken);

    const [owner, repo] = repository.split("/");
    if (!owner || !repo) {
      console.error(
        "Invalid repository format. Expected owner/repo, got:",
        repository
      );
      throw new Error("Invalid repository format");
    }

    const octokit = new Octokit({
      auth: githubToken,
    });

    // Log the API call we're about to make
    console.log(
      `Making GitHub API call to: repos/${owner}/${repo}/git/trees/main?recursive=1`
    );

    // Fetch the repository tree
    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: "main", // You might want to make this configurable for repos using different default branches
      recursive: "1",
    });

    console.log("Tree response:", {
      truncated: tree.truncated,
      totalItems: tree.tree.length,
    });

    // Filter and fetch file contents
    const contentItems = await Promise.all(
      tree.tree
        .filter((item) => {
          const isFile = item.type === "blob";
          const hasValidExtension =
            item.path && /\.(js|jsx|ts|tsx|md|txt|ipynb|py)$/.test(item.path);
          console.log(
            `File ${item.path}: isFile=${isFile}, hasValidExtension=${hasValidExtension}`
          );
          return isFile && hasValidExtension;
        })
        .map(async (item) => {
          try {
            const { data } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: item.path!,
            });

            // Type guard to ensure we're working with a single file response
            if (Array.isArray(data) || !("content" in data)) {
              console.log(`Skipping ${item.path}: Invalid response format`);
              return null;
            }

            const content = Buffer.from(data.content, "base64").toString(
              "utf-8"
            );

            // Reduced minimum length requirement
            if (!content || content.trim().length < 5) {
              console.log(`Skipping ${item.path}: Empty or too small`);
              return null;
            }

            console.log(
              `Successfully fetched ${item.path} with ${content.length} characters`
            );

            // Function detection for Python files
            if (item.path?.endsWith(".py")) {
              const pythonFunctions = content
                .split("\n")
                .filter((line) => line.trim().startsWith("def "))
                .map((line) => {
                  const match = line.match(
                    /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/
                  );
                  return match ? match[1] : null;
                })
                .filter(Boolean) as string[];

              console.log(
                `Found ${pythonFunctions.length} Python functions in ${item.path}`
              );

              if (pythonFunctions.length > 0) {
                return [
                  { path: item.path!, content, type: "file" } as CodeContent,
                  ...pythonFunctions.map((funcName) => ({
                    path: item.path!,
                    content,
                    type: "function" as const,
                    functionName: funcName,
                  })),
                ];
              }
            }

            return {
              path: item.path!,
              content,
              type: "file" as const,
            } as CodeContent;
          } catch (error) {
            console.error(`Error fetching content for ${item.path}:`, error);
            return null;
          }
        })
    );

    // Filter out null values and log final count
    const validItems = contentItems.filter((item) => item !== null);
    console.log(`Found ${validItems.length} valid files to process`);

    return validItems;
  } catch (error) {
    console.error("Error in fetchRepositoryContent:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { repository } = await req.json();

    if (!repository) {
      return new Response(
        JSON.stringify({ error: "Repository identifier is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    const githubToken = await getGithubToken(userId);
    const contentItems = await fetchRepositoryContent(repository, githubToken);
    console.log(`Fetched ${contentItems.length} content items`);

    // Flatten the array of content items
    const flattenedItems = contentItems.flat();

    // Generate embeddings for each content item
    const embeddings = [];
    for (const item of flattenedItems) {
      try {
        console.log(`Generating embedding for ${item.path}`);
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: item.content,
        });

        if (!response?.data?.[0]?.embedding) {
          console.error(
            "Invalid embedding response for",
            item.path,
            ":",
            response
          );
          continue;
        }

        embeddings.push({
          ...item,
          embedding: response.data[0].embedding,
          type: "file",
          functionName: undefined,
        });
      } catch (error) {
        console.error(`Error generating embedding for ${item.path}:`, error);
        // Continue with next item instead of throwing
        continue;
      }
    }

    // Add validation before proceeding
    console.log(
      `Successfully generated ${embeddings.length} embeddings out of ${flattenedItems.length} items`
    );
    if (!embeddings.length) {
      throw new Error(
        `No valid embeddings generated from ${flattenedItems.length} items`
      );
    }

    // Create or get existing index
    const indexName = `repo-${repository.replace("/", "-")}`.toLowerCase();
    const dimension = embeddings[0].embedding.length;

    // Check if index exists, if not create it
    const indexList = await pinecone.listIndexes();
    if (!indexList?.indexes?.some((index) => index.name === indexName)) {
      await pinecone.createIndex({
        name: indexName,
        dimension: dimension,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        },
        deletionProtection: "disabled",
      });
      // Wait for index to be ready
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const index = pinecone.index(indexName);

    // Upsert all embeddings with improved metadata
    await index.upsert(
      embeddings.map((item) => ({
        id: `${repository}-${item.path}-${item.type}${
          item.functionName ? `-${item.functionName}` : ""
        }`,
        values: item.embedding as number[],
        metadata: {
          repository,
          path: item.path || "",
          content: item.content,
          type: item.type,
          functionName: item.functionName || "",
          timestamp: new Date().toISOString(),
        },
      }))
    );

    return new Response(
      JSON.stringify({
        success: true,
        indexName,
        stats: {
          totalItems: embeddings.length,
          files: embeddings.filter((e) => e.type === "file").length,
          functions: embeddings.filter((e) => e.type === "function").length,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in embedding generation:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate embedding" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
