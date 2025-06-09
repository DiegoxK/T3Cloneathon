import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chats, messages } from "@/server/db/schema";

import { TRPCError } from "@trpc/server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export const chatRouter = createTRPCRouter({
  // Procedure to get all chats for the logged-in user
  list: protectedProcedure.query(async ({ ctx }) => {
    const userChats = await ctx.db.query.chats.findMany({
      where: eq(chats.userId, ctx.session.user.id),
      orderBy: (chats, { desc }) => [desc(chats.createdAt)],
    });
    return userChats;
  }),

  // Procedure to get all messages for a specific chat
  getMessages: protectedProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the user owns this chat
      const chat = await ctx.db.query.chats.findFirst({
        where: (chats, { and, eq }) =>
          and(
            eq(chats.id, input.chatId),
            eq(chats.userId, ctx.session.user.id),
          ),
      });

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Chat not found" });
      }

      const chatMessages = await ctx.db.query.messages.findMany({
        where: eq(messages.chatId, input.chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      });

      return chatMessages;
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string().optional(),
        messageContent: z.string(),
        assistantContent: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let currentChatId = input.chatId;

      // If no chatId, it's a new chat
      if (!currentChatId) {
        const { text: title } = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `Summarize the following user message in 5 words or less to use as a chat title. Do not use quotes or punctuation. Message: "${input.messageContent}"`,
        });

        const [newChat] = await ctx.db
          .insert(chats)
          .values({
            userId: ctx.session.user.id,
            title: title.trim(),
          })
          .returning();

        if (!newChat) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        currentChatId = newChat.id;
      } else {
        // If chatId exists, verify ownership
        const chat = await ctx.db.query.chats.findFirst({
          where: and(
            eq(chats.id, currentChatId),
            eq(chats.userId, ctx.session.user.id),
          ),
        });
        if (!chat) throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // Save the messages
      await ctx.db.insert(messages).values([
        { chatId: currentChatId, role: "user", content: input.messageContent },
        {
          chatId: currentChatId,
          role: "assistant",
          content: input.assistantContent,
        },
      ]);

      return { chatId: currentChatId };
    }),
});
