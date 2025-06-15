import { streamText, type CoreMessage } from "ai";
import { auth } from "@/server/auth";

import { getOpenRouterProvider } from "@/server/lib/openrouter";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as {
    messages: CoreMessage[];
    model?: string;
  };
  const { messages, model } = body;

  const openrouter = getOpenRouterProvider(session, req);

  const modelToUse = model ?? "anthropic/claude-3-haiku";

  console.log("MODEL SENT TO OPEN ROUTER: ", modelToUse);

  const result = streamText({
    model: openrouter(modelToUse),
    system: "You are a helpful and friendly chatbot.",
    messages,
    onError: (error) => {
      console.log("THERE WAS AN ERROR: ", error);
    },
    onFinish: (message) => {
      console.log("Message finished:", message);
    },
  });

  return result.toDataStreamResponse();
}
