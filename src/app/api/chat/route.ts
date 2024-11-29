import { StreamingTextResponse, Message } from "ai";
import Groq from "groq-sdk";
import { experimental_buildLlama2Prompt } from "ai/prompts";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  const { messages, selectedRepo } = await req.json();

  // Get the last message
  const lastMessage = messages[messages.length - 1];

  // Create system prompt based on the selected repository
  const systemPrompt = `You are a helpful AI assistant specializing in the ${selectedRepo} repository. 
  Your responses should be focused on helping users understand and work with this codebase.
  Always provide clear, concise explanations and code examples when relevant.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((message: Message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      model: "llama-3.1-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      stream: true,
    });

    // Convert the response to a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error:", error);
    return new Response("Error processing your request", { status: 500 });
  }
}
