"use client";

import { type Message } from "@ai-sdk/react";
import { api, type RouterOutputs } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal } from "lucide-react";

import { ChatMessage } from "./chat-message";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { generateId, type CoreMessage } from "ai";
import { useChatStream } from "@/hooks/use-chat-stream";

type MessagesList = RouterOutputs["chat"]["getMessages"];

interface ChatViewProps {
  chatId?: string;
  initialMessages: MessagesList;
}

export function ChatView({ chatId, initialMessages }: ChatViewProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<CoreMessage[]>(initialMessages);

  const addMessage = api.chat.addMessage.useMutation({
    onSuccess: (data) => {
      if (!chatId) {
        router.push(`/chat/${data.chatId}`, { scroll: false });
      }
      void utils.chat.list.invalidate();
      if (chatId) {
        void utils.chat.getMessages.invalidate({ chatId });
      }
    },
    onError: (err) => {
      console.error("Failed to save message:", err);
    },
  });

  const { stream, generation, isStreaming } = useChatStream({
    onFinish: (assistantContent) => {
      const userMessage = messages[messages.length - 1];
      if (!userMessage || userMessage.role !== "user") return;

      addMessage.mutate({
        chatId: chatId,
        messageContent: userMessage.content,
        assistantContent: assistantContent,
      });
    },
  });

  // Custom submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");

    stream({
      messages: newMessages,
    });
  };
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} />
          ))}
          {isStreaming && (
            <ChatMessage
              message={{
                id: "streaming-response",
                role: "assistant",
                content: generation,
              }}
            />
          )}
          {messages.length === 0 && !isStreaming && (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">How can I help you today?</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={input}
            placeholder="Ask me anything..."
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
          />
          <Button type="submit" disabled={isStreaming || !input.trim()}>
            <SendHorizonal className="size-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
