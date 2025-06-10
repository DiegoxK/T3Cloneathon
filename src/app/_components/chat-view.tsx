"use client";

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

type MessagesList = RouterOutputs["chat"]["getMessages"][number];

interface ChatViewProps {
  chatId?: string;
  messages: MessagesList[];
}

export function ChatView({ chatId, messages }: ChatViewProps) {
  const router = useRouter();
  const utils = api.useUtils();

  const [input, setInput] = useState("");

  const { stream, generation, isStreaming } = useChatStream({
    onFinish: (assistantContent) => {
      const userMessage = messages[messages.length - 1];
      if (!userMessage || userMessage.role !== "user") return;

      addMessage.mutate({
        chatId: chatId,
        role: "assistant",
        messageContent: userMessage.content,
      });
    },
  });

  const addMessage = api.chat.addMessage.useMutation({
    onMutate: (input) => {
      if (chatId) {
        void utils.chat.getMessages.cancel();

        const previousMessages = utils.chat.getMessages.getData({ chatId });

        console.log(previousMessages);

        const tempId = generateId();

        const optimisticEntry: MessagesList = {
          id: tempId,
          createdAt: new Date(),
          chatId: input.chatId!,
          role: input.role,
          content: input.messageContent,
        };

        utils.chat.getMessages.setData({ chatId }, () => {
          if (!previousMessages) return undefined;

          return [...previousMessages, optimisticEntry];
        });

        if (input.role === "user") {
          const currentData = utils.chat.getMessages.getData({ chatId });

          console.log(currentData);
          // stream(
          //   messages.
          // )
        }
      }
    },
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

  // Custom submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input) return;

    addMessage.mutate({
      chatId: chatId,
      role: "user",
      messageContent: input,
    });
  };

  return (
    <div className="flex flex-col">
      <ScrollArea className="h-[calc(100vh-115px)] p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
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
