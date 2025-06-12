"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

interface SidebarChatMenuProps {
  activeChatId?: string;
}

export default function SidebarChatMenu({
  activeChatId,
}: SidebarChatMenuProps) {
  const [chatList] = api.chat.list.useSuspenseQuery();

  if (!chatList?.length) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        No conversations yet.
      </div>
    );
  }

  return (
    <SidebarMenu>
      {chatList.map((chat) => (
        <SidebarMenuItem key={chat.id}>
          <Link href={`/chat/${chat.id}`} className="w-full">
            <SidebarMenuButton
              className={cn(
                "w-full justify-start",
                activeChatId === chat.id && "bg-sidebar-accent cursor-default",
              )}
            >
              <MessageSquare className="mr-2 size-4" />
              <span className="truncate">{chat.title}</span>
            </SidebarMenuButton>
          </Link>
          <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
            {/* <ShareChatButton chat={chat} /> */}
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
