// src/app(routes)/chat\[[...chatId]]/_components/chat-view.tsx
"use client";

import { useChat, type Message } from "@ai-sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type FormEvent } from "react";

import { generateUUID } from "@/lib/utils";
import { api } from "@/trpc/react";
import { ChatList } from "./chat-list";
import { ChatForm } from "./chat-form";
import { useModel } from "@/context/model-context";

interface ChatViewProps {
  chatId?: string;
}

export default function ChatView({ chatId }: ChatViewProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { selectedModel } = useModel();

  const [dbMessages] = api.chat.getMessages.useSuspenseQuery(
    { chatId },
    { refetchOnWindowFocus: false, refetchOnReconnect: false },
  );

  const { mutate: saveUserMessage } = api.chat.addMessage.useMutation({
    onSuccess: (data) => {
      // Invalidate queries to refetch chat list after new chat is created
      if (!dbMessages.length) {
        void utils.chat.list.invalidate();
      }
      // Optimistically update the messages list on the client
      void utils.chat.getMessages.invalidate({ chatId: data.chatId });
    },
    onError: (err) => console.error("Failed to save user message:", err),
  });

  // We use useChat to manage UI state, but not for API calls anymore
  const { messages, input, setInput, handleInputChange, setMessages } = useChat(
    {
      id: chatId,
      initialMessages: dbMessages,
      body: { model: selectedModel },
    },
  );

  const eventSourceRef = useRef<EventSource | null>(null);

  // Effect to handle SSE connection
  useEffect(() => {
    if (!chatId) return;

    const connect = () => {
      // If there's an existing connection, close it
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/chat/subscribe?chatId=${chatId}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log(`[${chatId}] SSE Connection established.`);
      };

      es.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as {
          type: string;
          data?: string;
        };

        if (message.type === "chunk") {
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              // Append chunk to the last assistant message
              const updatedLastMessage = {
                ...lastMessage,
                content: lastMessage.content + message.data,
              };
              return [...prevMessages.slice(0, -1), updatedLastMessage];
            } else {
              // Create a new assistant message if one doesn't exist
              return [
                ...prevMessages,
                {
                  id: generateUUID(),
                  role: "assistant",
                  content: message.data ?? "",
                },
              ];
            }
          });
        } else if (message.type === "done") {
          console.log(`[${chatId}] SSE stream finished.`);
          es.close();
          // Invalidate to get the new assistant message from the DB with its real ID
          void utils.chat.getMessages.invalidate({ chatId });
        } else if (message.type === "error") {
          console.error(`[${chatId}] SSE error:`, message.data);
          es.close();
        }
      };

      es.onerror = (err) => {
        console.error(`[${chatId}] SSE connection error:`, err);
        es.close();
        // Optional: implement retry logic here
      };
    };

    connect();

    // Cleanup on component unmount or chatId change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [chatId, setMessages, utils.chat.getMessages]);

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const messageContent = input.trim();
    if (!messageContent) return;

    // Use current chatId or generate a new one
    const currentChatId = chatId ?? generateUUID();

    // Optimistically add user message to the UI
    const userMessage: Message = {
      id: generateUUID(),
      role: "user",
      content: messageContent,
    };
    setMessages([...messages, userMessage]);

    // Add a placeholder for the assistant's response
    const assistantPlaceholder: Message = {
      id: generateUUID(),
      role: "assistant",
      content: "",
    };
    setMessages((current) => [...current, assistantPlaceholder]);

    setInput("");

    // Save the user message to the DB
    saveUserMessage({
      chatId: currentChatId,
      role: "user",
      messageContent: messageContent,
    });

    // If it's a new chat, redirect
    if (!chatId) {
      router.push(`/chat/${currentChatId}`);
    }

    // Call the new generate endpoint
    await fetch("/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: currentChatId,
        messages: [...messages, userMessage], // send full history
        model: selectedModel,
      }),
    });
  };

  const isResponding =
    messages.at(-1)?.role === "assistant" && messages.at(-1)?.content === "";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="text-muted-foreground border-b p-4 text-sm font-medium">
        Chat ID: {chatId ?? "New Chat"}
      </div>
      <ChatList messages={messages} isLoading={isResponding} />
      <ChatForm
        input={input}
        handleInputChange={handleInputChange}
        handleFormSubmit={handleFormSubmit}
        isLoading={isResponding}
      />
    </div>
  );
}
