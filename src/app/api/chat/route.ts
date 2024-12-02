import { Groq } from "groq-sdk";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { messages, selectedRepo } = await req.json();

    if (!selectedRepo) {
      throw new Error("No repository selected");
    }

    console.log("Received request with repo:", selectedRepo);

    // Get the last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((msg: any) => msg.role === "user")?.content;

    if (!lastUserMessage) {
      throw new Error("No user message found");
    }

    const indexName = `repo-${selectedRepo.replace("/", "-")}`.toLowerCase();

    // Check if index exists before querying
    try {
      const indexList = await pinecone.listIndexes();
      const indexExists = indexList?.indexes?.some(
        (index) => index.name === indexName
      );

      if (!indexExists) {
        return new Response(
          JSON.stringify({
            error:
              "Repository not embedded yet. Please embed the repository first.",
            type: "NOT_EMBEDDED",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generate embedding for the user's query
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: lastUserMessage,
      });

      // Query Pinecone
      const index = pinecone.index(indexName);
      const queryResponse = await index.query({
        vector: embedding.data[0].embedding,
        topK: 2,
        includeMetadata: true,
      });

      // Extract relevant code snippets and create context
      const contextSnippets = queryResponse.matches
        .map((match) => {
          const metadata = match.metadata as {
            path: string;
            content: string;
            type: string;
            functionName?: string;
          };
          return `File: ${metadata.path}${
            metadata.functionName ? `\nFunction: ${metadata.functionName}` : ""
          }\n\nCode:\n${metadata.content}\n`;
        })
        .join("\n---\n\n");

      const systemPrompt = `You are a helpful AI assistant specializing in the ${selectedRepo} repository. 
      Your responses should be focused on helping users understand and work with this codebase.
      Always provide clear, concise explanations and code examples when relevant.
      
      Here is the most relevant code context from the repository:
      
      ${contextSnippets}`;

      console.log("Calling Groq API...");
      const completion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        model: "llama-3.1-70b-versatile",
        stream: true,
        temperature: 0.7,
      });
      console.log("Got Groq response");

      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log("Starting stream...");
            for await (const chunk of completion) {
              console.log("Received chunk:", chunk);
              const delta = chunk.choices[0]?.delta as { content?: string };
              const content = delta?.content;
              if (content !== undefined && content !== "") {
                controller.enqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      choices: [{ delta: { content } }],
                    })}\n\n`
                  )
                );
              }
            }
            console.log("Stream complete");
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error: any) {
      if (error.message?.includes("404")) {
        return new Response(
          JSON.stringify({
            error:
              "Repository not embedded yet. Please embed the repository first.",
            type: "NOT_EMBEDDED",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response(JSON.stringify({ error: error }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
