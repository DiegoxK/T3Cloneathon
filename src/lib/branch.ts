import type { Message } from "@/types";

export const findMostRecentLeaf = (
  startMessage: Message,
  childrenByParentId: Map<string | null, Message[]>,
): Message => {
  let current = startMessage;

  while (true) {
    const children = childrenByParentId.get(current.id) ?? [];
    if (children.length === 0) {
      return current;
    }
    const mostRecentChild = children.reduce((latest, child) =>
      new Date(child.createdAt) > new Date(latest.createdAt) ? child : latest,
    );
    current = mostRecentChild;
  }
};

export const getBranchForMessage = (
  leafMessageId: string,
  messagesById: Map<string, Message>,
): Message[] => {
  const branch: Message[] = [];
  let currentId: string | null = leafMessageId;
  while (currentId) {
    const message = messagesById.get(currentId);
    if (!message) break;
    branch.push(message);
    currentId = message.parentMessageId;
  }
  return branch.reverse();
};
