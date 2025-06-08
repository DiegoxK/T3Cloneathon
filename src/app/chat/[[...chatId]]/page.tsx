import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { ChatLayout } from "@/app/_components/chat-layout";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function ChatPage({
  params,
}: {
  params: { chatId?: string[] };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const chatId = params.chatId?.[0];

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
