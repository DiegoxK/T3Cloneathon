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

  // Track if we've processed pending message for this chat
  const hasPendingMessageProcessed = useRef<string | null>(null);

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

  // Handle model selection based on chat context
  useEffect(() => {
    if (!chatId) {
      // New chat - use default model
      setSelectedModel("anthropic/claude-3-haiku");
    } else if (dbMessages.length > 0) {
      // Existing chat - use model from last assistant message with model info
      const lastAssistantMessage = dbMessages
        .slice()
        .reverse()
        .find((msg) => msg.role === "assistant" && msg.model);

      if (lastAssistantMessage?.model) {
        setSelectedModel(lastAssistantMessage.model);
      }
    }
  }, [chatId, dbMessages, setSelectedModel]);

  // Handle pending message from sessionStorage (only once per chat)
  useEffect(() => {
    // Skip if already processed for this chat or no chatId
    if (!chatId || hasPendingMessageProcessed.current === chatId) {
      return;
    }

    const pendingMessage = sessionStorage.getItem(PENDING_MESSAGE_KEY);

    if (pendingMessage && messages.length === 0 && !isLoading) {
      // Mark as processed immediately to prevent double execution
      hasPendingMessageProcessed.current = chatId;
      sessionStorage.removeItem(PENDING_MESSAGE_KEY);

      // Save and append the message
      saveMessage({
        chatId,
        role: "user",
        messageContent: pendingMessage,
      });

      void append({
        role: "user",
        content: pendingMessage,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messages.length, isLoading]);

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
