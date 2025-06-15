"use client";

import type { Message } from "@/types";
import { useChat } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  type FormEvent,
  useCallback,
  useMemo,
  useState,
} from "react";

import { generateUUID } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ChatList } from "./chat-list";
import { ChatForm } from "./chat-form";
import { useModel } from "@/context/model-context";
import { findMostRecentLeaf, getBranchForMessage } from "@/lib/branch";

const PENDING_MESSAGE_KEY = "pending-chat-message";

interface ChatViewProps {
  chatId?: string;
}

export default function ChatView({ chatId }: ChatViewProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { selectedModel, setSelectedModel } = useModel();

  const [selectedLeafId, setSelectedLeafId] = useState<string | null>(null);

  const processedPendingChatId = useRef<string | null>(null);
  const lastMessage = useRef<Message | null>(null);

  const { mutate: saveMessage } = api.chat.addMessage.useMutation({
    onSuccess: (data) => {
      void utils.chat.getMessages.invalidate();
      void utils.chat.list.invalidate();

      lastMessage.current = data.message ?? null;
    },
    onError: (err) => {
      console.error("Failed to save message:", err);
    },
  });

  const [dbMessages] = api.chat.getMessages.useSuspenseQuery(
    { chatId },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const messagesById = useMemo(() => {
    return new Map(dbMessages.map((msg) => [msg.id, msg]));
  }, [dbMessages]);

  const childrenByParentId = useMemo(() => {
    const map = new Map<string | null, Message[]>();
    for (const msg of dbMessages) {
      const children = map.get(msg.parentMessageId) ?? [];
      children.push(msg);
      map.set(msg.parentMessageId, children);
    }
    // Sort children for consistent display order in the Tabs
    for (const children of map.values()) {
      children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }
    return map;
  }, [dbMessages]);

  const currentBranch = useMemo(() => {
    if (!selectedLeafId || messagesById.size === 0) {
      return [];
    }
    return getBranchForMessage(selectedLeafId, messagesById);
  }, [selectedLeafId, messagesById]);

  const { messages, input, setInput, handleInputChange, status, append } =
    useChat({
      id: chatId,
      api: "/api/chat",
      initialMessages: currentBranch,
      body: { model: selectedModel },

      onFinish(message) {
        if (chatId && lastMessage?.current) {
          saveMessage({
            chatId,
            role: "assistant",
            messageContent: message.content,
            model: selectedModel,
            parentMessageId: lastMessage.current.id ?? undefined,
          });
        }
      },
    });

  const isResponding = status !== "ready" && status !== "error";

  const processUserMessage = useCallback(
    (content: string) => {
      if (!chatId) return;

      if (!lastMessage?.current) {
        const firstMessage = {
          id: generateUUID(),
          chatId,
          role: "user" as const,
          content,
          createdAt: new Date(),
          model: selectedModel ?? null,
          parentMessageId: null,
          branchName: null,
        };

        saveMessage({
          messageId: firstMessage.id,
          chatId,
          role: "user",
          messageContent: content,
        });

        lastMessage.current = firstMessage;
      } else {
        saveMessage({
          chatId,
          role: "user",
          messageContent: content,
          parentMessageId: lastMessage.current.id,
        });
      }

      console.log("Calling append");
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

    if (!lastMessage.current) {
      const mostRecentMessage = dbMessages[dbMessages.length - 1];
      lastMessage.current = mostRecentMessage ?? null;
    }

    if (lastMessage.current) {
      setSelectedLeafId(lastMessage.current.id);
    }

    if (
      lastMessage.current?.model &&
      lastMessage.current.role === "assistant"
    ) {
      setSelectedModel(lastMessage.current.model);
    }
  }, [chatId, dbMessages, lastMessage, setSelectedModel]);

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

  const handleBranchSelect = (selectedChild: Message) => {
    const newLeaf = findMostRecentLeaf(selectedChild, childrenByParentId);
    setSelectedLeafId(newLeaf.id);
  };

  const handleTabChange = (newlySelectedChildId: string) => {
    const selectedChildMessage = messagesById.get(newlySelectedChildId);
    if (selectedChildMessage) {
      handleBranchSelect(selectedChildMessage);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="text-muted-foreground border-b p-4 text-sm font-medium">
        Chat ID: {chatId ?? "New Chat"}
      </div>
      <ChatList
        messages={messages}
        isLoading={isResponding}
        handleTabChange={handleTabChange}
      />
      <ChatForm
        input={input}
        handleInputChange={handleInputChange}
        handleFormSubmit={handleFormSubmit}
        isLoading={isResponding}
      />
    </div>
  );
}
