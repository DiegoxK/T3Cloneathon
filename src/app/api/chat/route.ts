import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@/server/auth";
import { decrypt } from "@/server/lib/crypto";
import { env } from "@/env";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const host = req.headers.get("host") ?? "localhost";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const body = (await req.json()) as {
    messages: CoreMessage[];
    model?: string;
  };
  const { messages, model } = body;

  let apiKey: string | undefined;
  if (session.user.encryptedApiKey) {
    try {
      apiKey = decrypt(session.user.encryptedApiKey);
    } catch (e) {
      console.error("Failed to decrypt user's API key", e);
    }
  }

  const openrouter = createOpenRouter({
    apiKey: apiKey ?? env.OPENROUTER_API_KEY,
    headers: {
      "HTTP-Referer": baseUrl,
      "X-Title": "T3 Chat Cloneathon",
    },
  });

  const modelToUse = model ?? "anthropic/claude-3-haiku";

  console.log("MODEL SENT TO OPEN ROUTER: ", modelToUse);

  const result = streamText({
    model: openrouter(modelToUse),
    system: "You are a helpful and friendly chatbot.",
    messages,
  });

  return result.toDataStreamResponse();
}
