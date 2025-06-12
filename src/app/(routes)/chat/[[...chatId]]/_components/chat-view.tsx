"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, type FormEvent } from "react";

import { generateUUID } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ChatList } from "./chat-list";
import { ChatForm } from "./chat-form";
import { useModel } from "@/context/model-context";

const PENDING_MESSAGE_KEY = "pending-chat-message";

interface ChatViewProps {
  chatId?: string;
}

export default function ChatView({ chatId }: ChatViewProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { selectedModel } = useModel();

  const [dbMessages] = api.chat.getMessages.useSuspenseQuery(
    { chatId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const { mutate: saveMessage } = api.chat.addMessage.useMutation({
    onSuccess: (data, variables) => {
      void utils.chat.list.invalidate();
      console.log("success");
    },
    onError: (err) => {
      console.error("Failed to save message:", err);
    },
  });

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
    initialMessages: dbMessages,

    onFinish(message, options) {
      if (chatId) {
        saveMessage({
          chatId,
          role: "assistant",
          messageContent: message.content,
          model: selectedModel,
        });
      }
    },
  });

  useEffect(() => {
    const pendingMessage = sessionStorage.getItem(PENDING_MESSAGE_KEY);

    if (pendingMessage && messages.length === 0 && !isLoading) {
      void append({
        role: "user",
        content: pendingMessage,
      });

      if (chatId) {
        saveMessage({
          chatId,
          role: "user",
          messageContent: pendingMessage,
        });
      }

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
      const formData = new FormData(e.currentTarget);
      const value = formData.get("userInput");

      handleSubmit(e);

      // check later if value is file
      if (typeof value !== "string") {
        console.error("Invalid input");
        return;
      }

      saveMessage({
        chatId,
        role: "user",
        messageContent: value,
      });
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
