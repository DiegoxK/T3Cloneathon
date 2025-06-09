import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/server/lib/crypto";
import { env } from "@/env";

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const host = req.headers.get("host");
  const protocol = host?.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const body = (await req.json()) as {
    messages: CoreMessage[];
    data?: { model?: string };
  };
  const { messages, data } = body;

  //Fetch user to get API key
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  let apiKey: string | undefined;
  if (user?.encryptedApiKey) {
    try {
      apiKey = decrypt(user.encryptedApiKey);
    } catch (e) {
      console.error("Failed to decrypt user's API key", e);
    }
  }

  // Initialize OpenRouter with user's key or fallback
  const openrouter = createOpenRouter({
    apiKey: apiKey ?? env.OPENROUTER_API_KEY,
    headers: {
      "HTTP-Referer": baseUrl,
      "X-Title": "T3 Chat Cloneathon",
    },
  });

  const modelToUse = data?.model ?? "anthropic/claude-3-haiku";

  const result = streamText({
    model: openrouter(modelToUse),
    system: "You are a helpful and friendly chatbot.",
    messages,
  });

  return result.toDataStreamResponse();
}
