"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, type FormEvent } from "react";

import { generateUUID } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ChatList } from "./chat-list";
import { ChatForm } from "./chat-form";

const PENDING_MESSAGE_KEY = "pending-chat-message";

interface ChatViewProps {
  chatId?: string;
}

export default function ChatView({ chatId }: ChatViewProps) {
  const router = useRouter();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
  } = useChat({
    id: chatId,
    api: "/api/chat",

    // onFinish(message, options) {},
  });

  useEffect(() => {
    const pendingMessage = sessionStorage.getItem(PENDING_MESSAGE_KEY);

    if (pendingMessage && messages.length === 0 && !isLoading) {
      void append({
        role: "user",
        content: pendingMessage,
      });

      sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!chatId) {
      const newChatId = generateUUID();
      sessionStorage.setItem(PENDING_MESSAGE_KEY, input);
      router.push(`/chat/${newChatId}`);
    } else {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="text-muted-foreground border-b p-4 text-sm font-medium">
        Chat ID: {chatId ?? "New Chat"}
      </div>
      <ChatList messages={messages} isLoading={isLoading} />
      <ChatForm
        input={input}
        handleInputChange={handleInputChange}
        handleFormSubmit={handleFormSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
