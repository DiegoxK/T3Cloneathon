import { openai } from "@ai-sdk/openai";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@/server/auth";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: CoreMessage[] };

  const result = streamText({
    model: openai("gpt-4o"),
    system:
      "You are a helpful and friendly chatbot. Answer questions to the best of your ability.",
    messages,
  });

  return result.toDataStreamResponse();
}
