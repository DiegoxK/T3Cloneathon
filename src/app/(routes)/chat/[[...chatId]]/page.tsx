interface ChatPageProps {
  params: Promise<{
    chatId?: string[];
  }>;
}
export default async function ChatPage({ params }: ChatPageProps) {
  const resolvedParams = await params;
  const chatId = resolvedParams.chatId?.[0];

  return (
    <div>
      ChatId
      <span>{chatId}</span>
    </div>
  );
}
