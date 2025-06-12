import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { SettingsDialog } from "./settings-dialog";
import SidebarChatMenu from "./sidebar-chat-menu";

interface ChatSidebarProps {
  chatId: string | undefined;
}

export default function ChatSidebar({ chatId }: ChatSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/chat" className="w-full">
              <Button
                variant="outline"
                className="flex w-full items-center justify-start"
              >
                <PlusIcon className="mr-2 size-4" />
                <span>New Chat</span>
              </Button>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarChatMenu activeChatId={chatId} />
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SettingsDialog />
      </SidebarFooter>
    </Sidebar>
  );
}
