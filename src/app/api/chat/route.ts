import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type CoreMessage } from "ai";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/server/lib/crypto";
import { env } from "@/env";

export const maxDuration = 30;

// Define custom error types for better error handling
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

// Define the expected request body structure
interface ChatRequestBody {
  messages: CoreMessage[];
  data?: {
    model?: string;
  };
}

// Validate request body structure
function validateRequestBody(body: unknown): ChatRequestBody {
  if (!body || typeof body !== "object") {
    throw new APIError("Invalid request body", 400, "INVALID_BODY");
  }

  const typedBody = body as Record<string, unknown>;

  if (!Array.isArray(typedBody.messages)) {
    throw new APIError("Messages must be an array", 400, "INVALID_MESSAGES");
  }

  return {
    messages: typedBody.messages as CoreMessage[],
    data: typedBody.data as { model?: string } | undefined,
  };
}

// Safely decrypt API key with proper error handling
function safeDecryptApiKey(encryptedKey: string): string | null {
  try {
    return decrypt(encryptedKey);
  } catch (error) {
    // Log the error but don't expose sensitive details
    console.error("Failed to decrypt user's API key:", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    throw new DecryptionError("Failed to decrypt API key");
  }
}

// Main POST handler with comprehensive error handling
export async function POST(req: Request): Promise<Response> {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { messages, data } = validateRequestBody(body);

    // Validate messages array is not empty
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages array cannot be empty" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Extract host information safely
    const host = req.headers.get("host");
    if (!host) {
      return new Response(
        JSON.stringify({ error: "Host header is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Fetch user with error handling
    let user;
    try {
      user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });
    } catch (error) {
      console.error("Database query failed:", error);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle API key decryption
    let apiKey: string | undefined;
    try {
      if (user?.encryptedApiKey) {
        const decryptedKey = safeDecryptApiKey(user.encryptedApiKey);
        apiKey = decryptedKey ?? undefined;
      }
    } catch (error) {
      if (error instanceof DecryptionError) {
        // If user's key is corrupted, fall back to system key
        console.warn("Using fallback API key due to decryption error");
        apiKey = undefined;
      } else {
        throw error; // Re-throw unexpected errors
      }
    }

    // Validate API key availability
    const finalApiKey = apiKey ?? env.OPENROUTER_API_KEY;
    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: "API key not available" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize OpenRouter
    const openrouter = createOpenRouter({
      apiKey: finalApiKey,
      headers: {
        "HTTP-Referer": baseUrl,
        "X-Title": "T3 Chat Cloneathon",
      },
    });

    const modelToUse = data?.model ?? "anthropic/claude-3-haiku";
    console.log("MODEL SENT TO OPENROUTER:", modelToUse);

    // Generate response with error handling
    try {
      const result = streamText({
        model: openrouter(modelToUse),
        system: "You are a helpful and friendly chatbot.",
        messages,
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error("OpenRouter API error:", error);

      // Handle specific OpenRouter errors
      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded. Please try again later.",
            }),
            {
              status: 429,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        if (error.message.includes("invalid model")) {
          return new Response(
            JSON.stringify({ error: "Invalid model specified" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate response" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("Unexpected error in chat API:", error);

    // Handle known custom errors
    if (error instanceof APIError) {
      return new Response(
        JSON.stringify({ error: error.message, code: error.code }),
        {
          status: error.statusCode,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle unexpected errors
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
