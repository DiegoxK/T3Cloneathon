"use client";

import { useChat, type Message } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent, useCallback } from "react";

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

  const processedPendingChatId = useRef<string | null>(null);

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

  const { messages, input, setInput, handleInputChange, isLoading, append } =
    useChat({
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

  const processUserMessage = useCallback(
    (content: string) => {
      if (!chatId) return;

      saveMessage({
        chatId,
        role: "user",
        messageContent: content,
      });

      void append({
        role: "user",
        content: content,
      });

      setInput("");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, saveMessage, append],
  );

  useEffect(() => {
    if (!chatId) {
      setSelectedModel("anthropic/claude-3-haiku");
      return;
    }

    const lastAssistantMessageWithModel = dbMessages
      .slice()
      .reverse()
      .find((msg) => msg.role === "assistant" && msg.model);

    if (lastAssistantMessageWithModel?.model) {
      setSelectedModel(lastAssistantMessageWithModel.model);
    }
  }, [chatId, dbMessages, setSelectedModel]);

  useEffect(() => {
    if (chatId && processedPendingChatId.current !== chatId) {
      const pendingMessage = sessionStorage.getItem(PENDING_MESSAGE_KEY);

      if (pendingMessage) {
        sessionStorage.removeItem(PENDING_MESSAGE_KEY);
        processedPendingChatId.current = chatId;
        processUserMessage(pendingMessage);
      }
    }
  }, [chatId, processUserMessage]);

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const messageContent = input.trim();
    if (!messageContent) return;

    if (!chatId) {
      const newChatId = generateUUID();
      sessionStorage.setItem(PENDING_MESSAGE_KEY, messageContent);
      router.push(`/chat/${newChatId}`);
    } else {
      processUserMessage(messageContent);
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
