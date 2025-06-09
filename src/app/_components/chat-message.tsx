"use client";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { type Message } from "ai";

import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-4", isUser && "justify-end")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md border select-none",
          isUser ? "bg-background" : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? <User /> : <Bot />}
      </div>
      <div className="prose prose-sm bg-muted dark:prose-invert max-w-[90%] overflow-x-auto rounded-lg p-3">
        <ReactMarkdown
          rehypePlugins={[rehypeHighlight]}
          components={{
            code({ node, className, children, ...props }) {
              return (
                <code className={cn(className, "rounded-md p-1")} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
