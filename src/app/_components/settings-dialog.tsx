"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsDialog() {
  const [apiKey, setApiKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { mutate: updateApiKey, isPending } = api.user.updateApiKey.useMutation(
    {
      onSuccess: () => {
        toast.success("API Key saved successfully!");
        setIsOpen(false);
      },
      onError: (err) => {
        toast.error(`Failed to save API Key: ${err.message}`);
      },
    },
  );

  const handleSave = () => {
    // TODO: Input validation
    updateApiKey({ apiKey });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <KeyRound className="mr-2 size-4" />
          <span>API Key</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provide your API Key</DialogTitle>
          <DialogDescription>
            Your key is stored securely and never shared. It&apos;s only used to
            process your requests.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="api-key" className="text-right">
              OpenRouter Key
            </Label>
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
