"use client";

import { api, type RouterOutputs } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal } from "lucide-react";

import { ChatMessage } from "./chat-message";
import { useEffect, useState } from "react";

import { generateId, type CoreMessage } from "ai";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useRouter } from "next/navigation";

type Message = RouterOutputs["chat"]["getMessages"][number];

interface ChatViewProps {
  chatId?: string;
}

export function ChatView({ chatId }: ChatViewProps) {
  const utils = api.useUtils();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [messages] = api.chat.getMessages.useSuspenseQuery({ chatId });

  const { stream, generation, isStreaming } = useChatStream({
    onFinish: (assistantContent) => {
      addMessage.mutate({
        chatId,
        role: "assistant",
        messageContent: assistantContent,
      });
    },
  });

  useEffect(() => {
    if (
      chatId &&
      messages.length === 1 &&
      messages[0]?.role === "user" &&
      !isStreaming
    ) {
      stream({ messages });
    }
  }, [chatId, isStreaming, messages, stream]);

  const addMessage = api.chat.addMessage.useMutation({
    onMutate: (input) => {
      void utils.chat.getMessages.cancel();
      const tempId = generateId();

      const optimisticEntry: Message = {
        id: tempId,
        createdAt: new Date(),
        chatId: "",
        role: input.role,
        content: input.messageContent,
      };

      if (chatId) {
        const previousMessages = utils.chat.getMessages.getData({
          chatId,
        });

        optimisticEntry.chatId = chatId;

        utils.chat.getMessages.setData({ chatId }, () => {
          if (!previousMessages) return undefined;

          return [...previousMessages, optimisticEntry];
        });

        if (input.role === "user") {
          const currentData = utils.chat.getMessages.getData({
            chatId,
          });

          if (!currentData) {
            throw new Error("Failed to get optimistic data");
          }

          stream({
            messages: currentData,
          });
        }
      }
      if (!chatId && input.role === "user") {
        utils.chat.getMessages.setData({}, () => {
          return [optimisticEntry];
        });
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
