"use client";

import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";

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
  const { selectedModel, setSelectedModel } = useModel();
  const hasSetInitialModel = useRef(false);

  const [dbMessages] = api.chat.getMessages.useSuspenseQuery(
    { chatId },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const { mutate: saveMessage } = api.chat.addMessage.useMutation({
    onSuccess: () => {
      void utils.chat.list.invalidate();
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
    body: { model: selectedModel },
    onFinish(message) {
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
    hasSetInitialModel.current = false;

    if (!chatId) {
      setSelectedModel("anthropic/claude-3-haiku");
    }
  }, [chatId, setSelectedModel]);

  useEffect(() => {
    if (chatId && dbMessages.length > 0 && !hasSetInitialModel.current) {
      const lastMessage = dbMessages[dbMessages.length - 1];
      if (
        lastMessage?.role === "assistant" &&
        typeof lastMessage.model === "string"
      ) {
        setSelectedModel(lastMessage.model);
      }
      hasSetInitialModel.current = true;
    }
  }, [chatId, dbMessages, setSelectedModel]);

  useEffect(() => {
    const pendingMessage = sessionStorage.getItem(PENDING_MESSAGE_KEY);

    if (pendingMessage && messages.length === 0 && !isLoading && chatId) {
      saveMessage({
        chatId,
        role: "user",
        messageContent: pendingMessage,
      });

      void append({
        role: "user",
        content: pendingMessage,
      });

      sessionStorage.removeItem(PENDING_MESSAGE_KEY);
    }
  }, [chatId, messages.length, isLoading, append, saveMessage]);

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!chatId) {
      const newChatId = generateUUID();
      sessionStorage.setItem(PENDING_MESSAGE_KEY, input);
      router.push(`/chat/${newChatId}`);
    } else {
      const userMessageContent = input;
      handleSubmit(e);
      saveMessage({
        chatId,
        role: "user",
        messageContent: userMessageContent,
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
