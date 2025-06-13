import { type CoreMessage, generateText, streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { redis } from "@/server/redis";
import { env } from "@/env";
import { auth } from "@/server/auth";
import { decrypt } from "@/server/lib/crypto";
import { db } from "@/server/db";
import {
  messages as messagesTable,
  chats as chatsTable,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

const BATCH_INTERVAL_MS = 100;
const BATCH_SIZE_CHARS = 20;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, chatId, model } = (await req.json()) as {
    messages: CoreMessage[];
    chatId: string;
    model?: string;
  };

  console.log(`[${chatId}] Received request for /api/chat/generate`);

  generateAndPublishInBatches(messages, chatId, model, session.user).catch(
    (err) => {
      console.error(
        `[${chatId}] Uncaught error in background generation:`,
        err,
      );
    },
  );

  return new Response(JSON.stringify({ status: "generation_started" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function generateAndPublishInBatches(
  coreMessages: CoreMessage[],
  chatId: string,
  model: string | undefined,
  user: { id: string; encryptedApiKey: string | null },
) {
  const redisChannel = `chat:${chatId}`;
  console.log(
    `[${chatId}] Starting stream generation. Publishing to Redis channel: ${redisChannel}`,
  );

  try {
    const host = "t3-chat-cloneathon.vercel.app";
    const protocol = "https";
    const baseUrl = `${protocol}://${host}`;

    let apiKey: string | undefined;
    if (user.encryptedApiKey) {
      apiKey = decrypt(user.encryptedApiKey);
    }

    const openrouter = createOpenRouter({
      apiKey: apiKey ?? env.OPENROUTER_API_KEY,
      headers: { "HTTP-Referer": baseUrl, "X-Title": "T3 Chat Cloneathon" },
    });

    const modelToUse = model ?? "anthropic/claude-3-haiku";

    const result = streamText({
      model: openrouter(modelToUse),
      system: "You are a helpful and friendly chatbot.",
      messages: coreMessages,
    });

    let buffer = "";
    let lastPublishTime = Date.now();
    let finalContent = "";
    let batchCount = 0;

    for await (const chunk of result.textStream) {
      buffer += chunk;
      finalContent += chunk;
      const timeSinceLastPublish = Date.now() - lastPublishTime;

      if (
        buffer.length >= BATCH_SIZE_CHARS ||
        timeSinceLastPublish >= BATCH_INTERVAL_MS
      ) {
        if (buffer.length > 0) {
          batchCount++;
          console.log(
            `[${chatId}] Publishing batch #${batchCount} (${buffer.length} chars)`,
          );
          await redis.publish(
            redisChannel,
            JSON.stringify({ type: "chunk", data: buffer }),
          );
          buffer = "";
          lastPublishTime = Date.now();
        }
      }
    }

    if (buffer.length > 0) {
      batchCount++;
      console.log(
        `[${chatId}] Publishing final batch #${batchCount} (${buffer.length} chars)`,
      );
      await redis.publish(
        redisChannel,
        JSON.stringify({ type: "chunk", data: buffer }),
      );
    }

    console.log(`[${chatId}] Stream finished. Saving assistant message to DB.`);
    const existingChat = await db.query.chats.findFirst({
      where: eq(chatsTable.id, chatId),
    });

    if (!existingChat) {
      console.log(`[${chatId}] New chat detected. Generating title...`);
      const { text: title } = await generateText({
        model: openrouter("anthropic/claude-3-haiku"),
        // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
        prompt: `Summarize this in 5 words or less: "${coreMessages.at(-1)?.content}"`,
      });
      await db
        .insert(chatsTable)
        .values({ id: chatId, userId: user.id, title: title.trim() });
      console.log(`[${chatId}] Created new chat with title: "${title.trim()}"`);
    }

    await db.insert(messagesTable).values({
      chatId,
      role: "assistant",
      content: finalContent,
      model: modelToUse,
    });
    console.log(`[${chatId}] Assistant message saved successfully.`);

    console.log(`[${chatId}] Publishing [DONE] signal to Redis.`);
    await redis.publish(redisChannel, JSON.stringify({ type: "done" }));
  } catch (error) {
    console.error(`[${chatId}] Stream generation process failed:`, error);
    await redis.publish(
      redisChannel,
      JSON.stringify({
        type: "error",
        data: "An error occurred during generation.",
      }),
    );
  }
}
