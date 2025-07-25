import "@/styles/globals.css";
import "highlight.js/styles/base16/ros-pine-moon.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";

import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "T3Cloneathon",
  description: "The truly best",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
