"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { type RouterOutputs } from "@/trpc/react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type ChatList = RouterOutputs["chat"]["list"];

interface ChatSidebarProps {
  chats: ChatList;
  activeChatId?: string;
}

export function ChatSidebar({ chats, activeChatId }: ChatSidebarProps) {
  if (!chats?.length) {
    return (
      <div className="text-muted-foreground p-4 text-sm">
        No conversations yet.
      </div>
    );
  }

  return (
    <SidebarMenu>
      {chats.map((chat) => (
        <SidebarMenuItem key={chat.id}>
          <Link href={`/chat/${chat.id}`} className="w-full">
            <SidebarMenuButton
              className={cn(
                "w-full justify-start",
                activeChatId === chat.id && "bg-sidebar-accent",
              )}
            >
              <MessageSquare className="mr-2 size-4" />
              <span className="truncate">{chat.title}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
