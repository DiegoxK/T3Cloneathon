import type { Message } from "@/types";
import { ChatMessage } from "./chat-message";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Pencil, Recycle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

interface ChatListProps {
  messages: UIMessage[];
  currentBranch: Message[];
  messagesById: Map<string, Message>;
  isLoading: boolean;
  childrenByParentId: Map<string | null, Message[]>;
  handleReroll: (message: Message) => void;
  handleTabChange: (newlySelectedChildId: string) => void;
}

export function ChatList({
  messages,
  currentBranch,
  messagesById,
  isLoading,
  childrenByParentId,
  handleReroll,
  handleTabChange,
}: ChatListProps) {
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-muted-foreground">How can I help you today?</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => {
          // Find if this message is a branching point
          const potentialBranches = childrenByParentId.get(message.id) ?? [];
          // Find which of the children is part of the current active branch
          const activeChild = currentBranch.find(
            (m) => m.parentMessageId === message.id,
          );

          return (
            <div key={message.id}>
              {/* The Message Bubble */}
              <ChatMessage key={`${message.id}`} message={message} />

              <div
                className={cn(
                  "flex",
                  message.role === "assistant" ? "" : "justify-end",
                )}
              >
                {message.role === "assistant" ? (
                  <Button
                    onClick={() => {
                      const currentMessage = messagesById.get(message.id);

                      console.log("useChat message:", message);
                      console.warn("Current Message", currentMessage);

                      if (currentMessage) {
                        handleReroll(currentMessage);
                      } else {
                        console.log("failed to select message");
                      }
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Recycle />
                  </Button>
                ) : (
                  message.role === "user" && (
                    <Button
                      onClick={() => {
                        console.log("pencil");
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Pencil />
                    </Button>
                  )
                )}
              </div>

              {potentialBranches.length > 1 && (
                <div className="mt-4 pl-4">
                  <Tabs
                    value={activeChild?.id}
                    onValueChange={handleTabChange}
                    className="w-full"
                  >
                    <TabsList>
                      {potentialBranches.map((branchChild, index) => (
                        <TabsTrigger
                          key={branchChild.id}
                          value={branchChild.id}
                        >
                          {branchChild.branchName ?? `Variation ${index + 1}`}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
