import { redis } from "@/server/redis";
import { type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const redisMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chunk"), data: z.string() }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), data: z.string() }),
]);
type RedisMessage = z.infer<typeof redisMessageSchema>;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("Missing chatId parameter", { status: 400 });
  }

  const redisChannel = `chat:${chatId}`;
  console.log(`[${chatId}] Received request for /api/chat/subscribe`);

  const stream = new ReadableStream({
    async start(controller) {
      const subscriber = redis.duplicate();
      await subscriber.connect();

      let isClosed = false;

      const cleanup = () => {
        if (!isClosed) {
          isClosed = true;
          console.log(
            `[${chatId}] Cleaning up SSE connection and Redis subscription.`,
          );
          subscriber.unsubscribe(redisChannel).catch(console.error);
          subscriber.quit().catch(console.error);
          try {
            controller.close();
          } catch {}
        }
      };

      subscriber.on("message", (channel, messageStr) => {
        if (isClosed || channel !== redisChannel) {
          return;
        }

        console.log(
          `[${chatId}] Received message from Redis: ${messageStr.substring(0, 100)}...`,
        );
        let parsedMessage: RedisMessage;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const json = JSON.parse(messageStr);
          const result = redisMessageSchema.safeParse(json);
          if (!result.success) {
            console.error(
              `[${chatId}] Invalid message format:`,
              result.error.flatten(),
            );
            return;
          }
          parsedMessage = result.data;
        } catch (e) {
          console.error(
            `[${chatId}] Failed to JSON.parse message:`,
            messageStr,
            e,
          );
          return;
        }

        controller.enqueue(`data: ${JSON.stringify(parsedMessage)}\n\n`);

        if (parsedMessage.type === "done" || parsedMessage.type === "error") {
          console.log(
            `[${chatId}] Received '${parsedMessage.type}' signal. Closing connection.`,
          );
          cleanup();
        }
      });

      await subscriber.subscribe(redisChannel, (err, count) => {
        if (err) {
          console.error(`[${chatId}] Failed to subscribe to Redis:`, err);
          controller.error(err);
          isClosed = true;
        } else {
          console.log(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `[${chatId}] Subscribed successfully to Redis! Client is subscribed to ${count} channels.`,
          );
        }
      });

      req.signal.onabort = () => {
        console.log(`[${chatId}] Client disconnected (onabort).`);
        cleanup();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
