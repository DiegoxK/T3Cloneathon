"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Share } from "lucide-react";

import { api } from "@/trpc/react";
import { type RouterOutputs } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Chat = RouterOutputs["chat"]["list"][0];

interface ShareChatButtonProps {
  chat: Chat;
}

export function ShareChatButton({ chat }: ShareChatButtonProps) {
  const utils = api.useUtils();
  const [isCopied, setIsCopied] = useState(false);
  const shareUrl = `${window.location.origin}/share/${chat.id}`;

  const { mutate: updateSharing, isPending } =
    api.chat.updateSharing.useMutation({
      onSuccess: () => {
        void utils.chat.list.invalidate();
        toast.success(`Sharing status updated.`);
      },
      onError: (err) => {
        toast.error(`Failed to update sharing: ${err.message}`);
      },
    });

  const onCopy = () => {
    void navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <Share className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col space-y-2 text-center sm:text-left">
          <h3 className="text-lg font-semibold">Share chat</h3>
          <p className="text-muted-foreground text-sm">
            Anyone with the link can view this conversation.
          </p>
        </div>
        <div className="flex items-center space-x-2 pt-4">
          <Switch
            id="public-switch"
            checked={chat.isPublic}
            onCheckedChange={(isChecked: boolean) =>
              updateSharing({ chatId: chat.id, isPublic: isChecked })
            }
            disabled={isPending}
          />
          <Label htmlFor="public-switch" className="flex-grow">
            {chat.isPublic ? "Shared with public" : "Private chat"}
          </Label>
        </div>
        {chat.isPublic && (
          <div className="flex items-center space-x-2 pt-4">
            <Input value={shareUrl} readOnly className="h-9 flex-1" />
            <Button size="icon" className="h-9 w-9" onClick={onCopy}>
              {isCopied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
