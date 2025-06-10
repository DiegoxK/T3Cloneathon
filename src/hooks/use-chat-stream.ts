"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { type CoreMessage } from "ai";

interface ChatStreamContext {
  messages: CoreMessage[];
  model?: string;
}

const generateAiResponse = async (
  context: ChatStreamContext,
): Promise<ReadableStream<Uint8Array>> => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: context.messages,
      data: { model: context.model },
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  if (!response.body) {
    throw new Error("Response has no body");
  }

  return response.body;
};

interface UseChatStreamProps {
  onFinish?: (completion: string) => void;
  onError?: (error: Error) => void;
}

export function useChatStream({ onFinish, onError }: UseChatStreamProps = {}) {
  const [generation, setGeneration] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const mutation = useMutation<
    ReadableStream<Uint8Array>,
    Error,
    ChatStreamContext
  >({
    mutationFn: generateAiResponse,
    onSuccess: async (stream, variables) => {
      setIsStreaming(true);
      setGeneration("");

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      let done = false;
      let fullResponse = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: !done });

        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          const match = /^0:"((?:\\.|[^"\\])*)"/.exec(line);
          if (match?.[1]) {
            const textContent = JSON.parse(`"${match[1]}"`) as string;
            setGeneration((prev) => prev + textContent);
            fullResponse += textContent;
          }
        }
      }

      setIsStreaming(false);
      onFinish?.(fullResponse);
    },
    onError: (error) => {
      setIsStreaming(false);
      setGeneration(`Error: ${error.message}`);
      onError?.(error);
    },
  });

  return {
    stream: mutation.mutate,
    generation,
    isStreaming,
    status: mutation.status,
  };
}
