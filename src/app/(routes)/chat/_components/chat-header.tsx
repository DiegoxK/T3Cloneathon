import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModelSelector } from "./model-selector";

export default function ChatHeader() {
  return (
    <div className="flex items-center gap-2 border-b p-2">
      <SidebarTrigger />
      <ModelSelector />
    </div>
  );
}
