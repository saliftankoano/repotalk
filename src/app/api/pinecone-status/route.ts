import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";

export async function GET() {
  try {
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = process.env.PINECONE_INDEX!;
    const description = await client.describeIndex(indexName);

    const ready = description.status?.ready === true;

    return NextResponse.json({ ready });
  } catch (error) {
    console.error("Error checking Pinecone status:", error);
    return NextResponse.json({ ready: false });
  }
}

export async function POST(request: Request) {
  try {
    const { repository } = await request.json();

    if (!repository) {
      return NextResponse.json(
        { error: "Repository parameter is required" },
        { status: 400 }
      );
    }

    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    const indexName = `repo-${repository.replace("/", "-")}`.toLowerCase();

    // Check if index exists
    const indexList = await client.listIndexes();
    const indexExists = indexList?.indexes?.some(
      (index) => index.name === indexName
    );

    if (!indexExists) {
      try {
        // Create new index with default settings
        await client.createIndex({
          name: indexName,
          dimension: 1536,
          metric: "cosine",
          spec: {
            serverless: {
              cloud: "aws",
              region: "us-east-1",
            },
          },
          deletionProtection: "disabled",
        });

        // Wait for index to initialize
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (createError: any) {
        // If the error is not about the index already existing, rethrow it
        if (!createError.message?.includes("ALREADY_EXISTS")) {
          throw createError;
        }
        // Otherwise, we can proceed since the index exists
        console.log("Index already exists, proceeding with status check");
      }
    }

    // Check index status
    const description = await client.describeIndex(indexName);
    const ready = description.status?.ready === true;

    return NextResponse.json({ ready, indexName });
  } catch (error) {
    console.error("Error checking/preparing Pinecone index:", error);
    return NextResponse.json({
      ready: false,
      error: "Failed to prepare index",
    });
  }
}
