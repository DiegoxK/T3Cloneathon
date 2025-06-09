import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { ChatLayout } from "@/app/_components/chat-layout";
import { SidebarProvider } from "@/components/ui/sidebar";

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
  if (chatId) {
    void api.chat.getMessages.prefetch({ chatId });
  }

  return (
    <HydrateClient>
      <SidebarProvider>
        <ChatLayout chatId={chatId} />
      </SidebarProvider>
    </HydrateClient>
  );
}
