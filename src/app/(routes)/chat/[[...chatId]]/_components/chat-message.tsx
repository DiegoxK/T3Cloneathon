import { type Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      {isAssistant && (
        <div className="bg-primary text-primary-foreground flex-shrink-0 rounded-full p-2">
          <Bot className="size-5" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap",
          isAssistant ? "bg-muted" : "bg-primary text-primary-foreground",
        )}
      >
        {isLoading ? <Loader2 className="animate-spin" /> : message.content}
      </div>

      {!isAssistant && (
        <div className="bg-muted flex-shrink-0 rounded-full p-2">
          <User className="size-5" />
        </div>
      )}
    </div>
  );
}
