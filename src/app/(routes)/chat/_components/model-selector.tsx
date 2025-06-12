"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModel } from "@/context/model-context";

const curatedModels = [
  {
    id: "openai/gpt-4o",
    name: "OpenAI GPT-4o",
  },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku" },
  { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B Instruct" },
  {
    id: "nousresearch/nous-hermes-2-mixtral-8x7b-dpo",
    name: "Nous Hermes 2 Mixtral",
  },
  { id: "openai/gpt-3.5-turbo", name: "OpenAI GPT-3.5 Turbo" },
];
interface ModelSelectorProps {
  disabled?: boolean;
}

export function ModelSelector({ disabled }: ModelSelectorProps) {
  const { selectedModel, setSelectedModel } = useModel();

  return (
    <Select
      value={selectedModel}
      onValueChange={setSelectedModel}
      disabled={disabled}
    >
      <SelectTrigger className="w-full md:w-[280px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {curatedModels.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
