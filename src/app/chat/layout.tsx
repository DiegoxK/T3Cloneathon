import { ModelProvider } from "@/context/model-context";

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ModelProvider>{children}</ModelProvider>;
}
