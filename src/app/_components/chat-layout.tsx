"use client";

import { PlusIcon } from "lucide-react";

import { api } from "@/trpc/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

import { ChatSidebar } from "./chat-sidebar";
import { ChatView } from "./chat-view";
import { SettingsDialog } from "./settings-dialog";
import Link from "next/link";

export function ChatLayout({ chatId }: { chatId?: string }) {
  const [chatList] = api.chat.list.useSuspenseQuery();

  return (
    <div className="flex h-screen w-full items-start">
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/chat" className="w-full">
                <Button variant="outline" className="w-full justify-start">
                  <PlusIcon className="mr-2 size-4" />
                  <span>New Chat</span>
                </Button>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <ChatSidebar chats={chatList} activeChatId={chatId} />
        </SidebarContent>
        <SidebarFooter className="p-2">
          <SettingsDialog />
        </SidebarFooter>
      </Sidebar>

      <main className="flex h-screen w-full flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b p-2">
          <SidebarTrigger />
          <h2 className="font-semibold">T3 Chat Clone</h2>
        </div>

        <ChatView chatId={chatId} />
      </main>
    </div>
  );
}
