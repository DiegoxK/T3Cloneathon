"use client";

import { useChat, type Message } from "@ai-sdk/react";
import { api, type RouterOutputs } from "@/trpc/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizonal } from "lucide-react";

import { ChatMessage } from "./chat-message";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { generateId } from "ai";

type MessagesList = RouterOutputs["chat"]["getMessages"];

interface ChatViewProps {
  chatId?: string;
  initialMessages: MessagesList;
}

export function ChatView({ chatId, initialMessages }: ChatViewProps) {
  const router = useRouter();
  const utils = api.useUtils();

  // create a ref to hold the user's message
  const lastUserMessage = useRef<Message | null>(null);

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

  const { messages, input, setInput, append, status } = useChat({
    initialMessages,
    id: chatId,
    body: {
      chatId: chatId,
    },
    api: "/api/chat",
    onFinish: (assistantMessage) => {
      /**
       * useChat messages array appears to be outdated when onFinish is called
       * lastUserMessage ref will be use here to get the last user message
       */
      const userMessage = lastUserMessage.current;
      if (!userMessage) return;

      addMessage.mutate({
        chatId: chatId,
        messageContent: userMessage.content,
        assistantContent: assistantMessage.content,
      });

      // Clear the ref for the next message
      lastUserMessage.current = null;
    },
  });

  const isProcessing = status === "submitted" || status === "streaming";

  // Custom submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
    };

    // Store userMessage in ref
    lastUserMessage.current = userMessage;

    // Append message into useChat hook messages
    void append(userMessage);
    setInput("");
  };
  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map((m) => <ChatMessage key={m.id} message={m} />)
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">
                Start a conversation by typing below.
              </p>
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
            disabled={isProcessing}
          />
          <Button type="submit" disabled={isProcessing || !input.trim()}>
            <SendHorizonal className="size-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
