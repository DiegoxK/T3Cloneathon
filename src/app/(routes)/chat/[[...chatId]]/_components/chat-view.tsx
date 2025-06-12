import React from "react";

interface ChatViewProps {
  chatId?: string;
}

export default function ChatView({ chatId }: ChatViewProps) {
  return (
    <div>
      ChatView <span>{chatId}</span>
    </div>
  );
}
