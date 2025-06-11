"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ModelContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [selectedModel, setSelectedModel] = useState(
    "anthropic/claude-3-haiku",
  );

  const value = {
    selectedModel,
    setSelectedModel,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
}
