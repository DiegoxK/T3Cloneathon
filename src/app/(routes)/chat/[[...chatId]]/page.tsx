import { api, HydrateClient } from "@/trpc/server";
import ChatSidebar from "../_components/chat-sidebar";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import ChatHeader from "../_components/chat-header";
import ChatView from "./_components/chat-view";

interface ChatPageProps {
  params: Promise<{
    chatId?: string[];
  }>;
}
export default async function ChatPage({ params }: ChatPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const resolvedParams = await params;
  const chatId = resolvedParams.chatId?.[0];

  void api.chat.list.prefetch();
  void api.chat.getMessages.prefetch({ chatId });

  return (
    <div className="flex h-screen w-full">
      <HydrateClient>
        <ChatSidebar chatId={chatId} />
        <main className="flex h-screen w-full flex-col overflow-hidden">
          <ChatHeader />
          <ChatView chatId={chatId} />
        </main>
      </HydrateClient>
    </div>
  );
}
