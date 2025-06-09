"use client";

import { useChat } from "@ai-sdk/react";
import { type RouterOutputs } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal } from "lucide-react";

import { ChatMessage } from "./chat-message";

type MessagesList = RouterOutputs["chat"]["getMessages"];

interface ChatViewProps {
  chatId?: string;
  initialMessages: MessagesList;
}

export function ChatView({ chatId, initialMessages }: ChatViewProps) {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    initialMessages: initialMessages,
    body: {
      chatId: chatId,
    },
    api: "/api/chat",
  });

  const isProcessing = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">
                Start a conversation by typing below.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            placeholder="Ask me anything..."
            onChange={handleInputChange}
            disabled={isProcessing}
          />
          <Button type="submit" disabled={isProcessing || !input.trim()}>
            <SendHorizonal className="size-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
