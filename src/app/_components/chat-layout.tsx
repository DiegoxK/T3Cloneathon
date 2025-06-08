"use client";

import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { api, type RouterOutputs } from "@/trpc/react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

import { ChatSidebar } from "./chat-sidebar";
import { ChatView } from "./chat-view";

// type ChatList = RouterOutputs["chat"]["list"];
// type MessagesList = RouterOutputs["chat"]["getMessages"];

export function ChatLayout({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const [chatList] = api.chat.list.useSuspenseQuery();

  // Only call if chatId is defined
  const [initialMessages] = chatId
    ? api.chat.getMessages.useSuspenseQuery({ chatId })
    : [undefined];

  const createChat = api.chat.create.useMutation({
    onSuccess: (newChat) => {
      router.push(`/chat/${newChat.id}`);
    },
  });

  return (
    <div className="flex h-screen w-full items-start">
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  createChat.mutate({
                    messages: [],
                    initialMessage: "New Chat",
                  });
                }}
                disabled={createChat.isPending}
              >
                <PlusIcon className="mr-2 size-4" />
                <span>New Chat</span>
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <ChatSidebar chats={chatList} activeChatId={chatId} />
        </SidebarContent>
      </Sidebar>

      <main className="flex h-full flex-1 flex-col">
        <div className="flex items-center gap-2 border-b p-2">
          <SidebarTrigger />
          <h2 className="font-semibold">T3 Chat Clone</h2>
        </div>

        <ChatView chatId={chatId} initialMessages={initialMessages!} />
      </main>
    </div>
  );
}
