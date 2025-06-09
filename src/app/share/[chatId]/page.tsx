import { notFound } from "next/navigation";
import { api } from "@/trpc/server";
import { ChatMessage } from "@/app/_components/chat-message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SharedChatPageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  try {
    const resolvedParams = await params;
    const chatId = resolvedParams.chatId;

    // Fetch shared chat data
    const sharedChat = await api.chat.getShared({ chatId: chatId });

    return (
      <main className="bg-muted/40 flex h-screen flex-col items-center">
        <div className="w-full max-w-4xl flex-1">
          <header className="bg-background flex h-16 items-center justify-between border-b px-4">
            <div>
              <h1 className="text-lg font-semibold">{sharedChat.title}</h1>
              <p className="text-muted-foreground text-sm">
                Shared by {sharedChat.user.name ?? "Anonymous"}
              </p>
            </div>
            <Button asChild>
              <Link href="/chat">Start your own chat</Link>
            </Button>
          </header>

          <ScrollArea className="h-[calc(100vh-4rem)] p-4">
            <div className="space-y-4">
              {sharedChat.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </main>
    );
  } catch (error) {
    return notFound();
  }
}
