"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type CoreMessage } from "ai";
import type { Message } from "@/app/_components/chat-view";

class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

class StreamProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamProcessingError";
  }
}

interface ChatStreamContext {
  messages: Message[];
  model?: string;
}

interface ApiErrorResponse {
  error: string;
  code?: string;
}

const generateAiResponse = async (
  context: ChatStreamContext,
): Promise<ReadableStream<Uint8Array>> => {
  let response: Response;

  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: context.messages,
        data: { model: context.model },
      }),
    });
  } catch (error) {
    throw new NetworkError(
      error instanceof Error ? error.message : "Network request failed",
    );
  }

  // Handle HTTP error responses
  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;

    try {
      // Try to parse error response for more details
      const errorData = (await response.json()) as ApiErrorResponse;
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If parsing fails, use generic message based on status
      switch (response.status) {
        case 401:
          errorMessage = "Authentication required. Please log in.";
          break;
        case 403:
          errorMessage = "Access denied. Please check your permissions.";
          break;
        case 429:
          errorMessage = "Rate limit exceeded. Please try again later.";
          break;
        case 500:
          errorMessage = "Server error. Please try again later.";
          break;
        default:
          errorMessage = `Request failed with status ${response.status}`;
      }
    }

    throw new NetworkError(errorMessage, response.status);
  }

  // Validate response body exists
  if (!response.body) {
    throw new NetworkError("Response has no body");
  }

  return response.body;
};

// Stream parsing with better error handling
const parseStreamChunk = (line: string): string | null => {
  try {
    const match = /^0:"((?:\\.|[^"\\])*)"/.exec(line);
    if (match?.[1]) {
      return JSON.parse(`"${match[1]}"`) as string;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse stream chunk:", line, error);
    return null;
  }
};

interface UseChatStreamProps {
  onFinish?: (completion: {
    assistantContent: string;
    chatId?: string;
  }) => void;
  onError?: (error: Error) => void;
  onProgress?: (currentText: string) => void;
}

export function useChatStream({
  onFinish,
  onError,
  onProgress,
}: UseChatStreamProps = {}) {
  const [generation, setGeneration] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const mutation = useMutation<
    ReadableStream<Uint8Array>,
    Error,
    ChatStreamContext
  >({
    mutationFn: generateAiResponse,
    onSuccess: async (stream, context) => {
      setIsStreaming(true);
      setGeneration("");

      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        reader = stream.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let fullResponse = "";
        let buffer = ""; // Buffer for incomplete lines

        while (!done) {
          const readResult = await reader.read();
          done = readResult.done;

          if (readResult.value) {
            const chunk = decoder.decode(readResult.value, { stream: !done });
            buffer += chunk;

            // Process complete lines
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === "") continue;

              const textContent = parseStreamChunk(line);
              if (textContent) {
                setGeneration((prev) => {
                  const newText = prev + textContent;
                  onProgress?.(newText);
                  return newText;
                });
                fullResponse += textContent;
              }
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const textContent = parseStreamChunk(buffer);
          if (textContent) {
            setGeneration((prev) => prev + textContent);
            fullResponse += textContent;
          }
        }

        setIsStreaming(false);

        // Call onFinish with the complete response
        onFinish?.({
          assistantContent: fullResponse,
          chatId: context.messages[0]?.chatId,
        });
      } catch (error) {
        console.error("Stream processing error:", error);

        const streamError = new StreamProcessingError(
          error instanceof Error
            ? `Stream processing failed: ${error.message}`
            : "Stream processing failed",
        );

        setIsStreaming(false);
        setGeneration(`Error: ${streamError.message}`);
        onError?.(streamError);
      } finally {
        // Ensure reader is properly closed
        try {
          await reader?.cancel();
        } catch (error) {
          console.warn("Failed to cancel stream reader:", error);
        }
      }
    },

    onError: (error) => {
      setIsStreaming(false);

      // Provide user-friendly error messages
      let errorMessage = "An unexpected error occurred";

      if (error instanceof NetworkError) {
        errorMessage = error.message;
      } else if (error instanceof StreamProcessingError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setGeneration(`Error: ${errorMessage}`);
      onError?.(error);
    },
  });

  // Enhanced methods with validation
  const startStream = (context: ChatStreamContext) => {
    // Validate context before starting
    if (!context.messages || context.messages.length === 0) {
      const error = new Error("Messages array cannot be empty");
      onError?.(error);
      return;
    }

    mutation.mutate(context);
  };

  const reset = () => {
    setGeneration("");
    setIsStreaming(false);
  };

  return {
    stream: startStream,
    generation,
    isStreaming,
    status: mutation.status,
    error: mutation.error,
    reset,
    isIdle: mutation.status === "idle",
    isPending: mutation.status === "pending",
    isError: mutation.status === "error",
    isSuccess: mutation.status === "success",
  };
}
