import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chats, messages } from "@/server/db/schema";

import { TRPCError } from "@trpc/server";

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

  create: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
        initialMessage: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create a new chat session in the database
      const [newChat] = await ctx.db
        .insert(chats)
        .values({
          userId: ctx.session.user.id,
          title: input.initialMessage.substring(0, 100),
        })
        .returning();

      if (!newChat) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create chat",
        });
      }

      // Save the messages to the newly created chat
      await ctx.db.insert(messages).values(
        input.messages.map((message) => ({
          chatId: newChat.id,
          role: message.role,
          content: message.content,
        })),
      );

      return newChat;
    }),
});
