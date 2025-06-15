import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { decrypt } from "@/server/lib/crypto";
import type { Session } from "next-auth";
import { env } from "@/env";

export function getOpenRouterProvider(session: Session | null, req?: Request) {
  let apiKey: string | undefined;

  // Safely try to decrypt the user's key
  if (session?.user?.encryptedApiKey) {
    try {
      apiKey = decrypt(session.user.encryptedApiKey);
    } catch (e) {
      console.error(
        "Failed to decrypt user's API key, falling back to default.",
        e,
      );
    }
  }

  // Define the headers object, which might be empty
  const headers: Record<string, string> = {
    "X-Title": "T3 Chat Cloneathon",
  };

  // Conditionally add the Referer header only if the request object is provided
  if (req) {
    const host = req.headers.get("host") ?? "localhost";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;
    headers["HTTP-Referer"] = baseUrl;
  }

  // Create and return the provider function
  return createOpenRouter({
    // Use the user's key if available, otherwise use the app's key
    apiKey: apiKey ?? env.OPENROUTER_API_KEY,
    headers: headers,
  });
}
