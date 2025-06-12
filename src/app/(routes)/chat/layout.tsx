import { SidebarProvider } from "@/components/ui/sidebar";
import { ModelProvider } from "@/context/model-context";
import type { ReactNode } from "react";

interface ChatLayoutProps {
  children: ReactNode;
}

export default async function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <SidebarProvider>
      <ModelProvider>{children}</ModelProvider>
    </SidebarProvider>
  );
}
