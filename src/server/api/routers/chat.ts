import { z } from "zod";
import { and, eq } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { chats, messages } from "@/server/db/schema";

import { TRPCError } from "@trpc/server";

import { generateText } from "ai";
import { getOpenRouterProvider } from "@/server/lib/openrouter";

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
    .input(z.object({ chatId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.chatId) {
        // Verify the user owns this chat
        const chat = await ctx.db.query.chats.findFirst({
          where: (chats, { and, eq }) =>
            and(
              eq(chats.id, input.chatId!),
              eq(chats.userId, ctx.session.user.id),
            ),
        });

        if (!chat) {
          return [];
        }

        const chatMessages = await ctx.db.query.messages.findMany({
          where: eq(messages.chatId, input.chatId),
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        });

        return chatMessages;
      }

      return [];
    }),

  addMessage: protectedProcedure
    .input(
      z.object({
        // The chatId is now required from the client.
        // The client will generate it on the very first message.
        chatId: z.string(),
        messageId: z.string().optional(),
        role: z.enum(["user", "assistant"]),
        messageContent: z.string(),
        model: z.string().optional(),
        parentMessageId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if a chat with the given ID already exists for the logged-in user.
      const existingChat = await ctx.db.query.chats.findFirst({
        where: and(
          eq(chats.id, input.chatId),
          eq(chats.userId, ctx.session.user.id),
        ),
      });

      // If the chat does NOT exist, create it using the ID from the client.
      if (!existingChat) {
        const openrouter = getOpenRouterProvider(ctx.session);

        const { text: title } = await generateText({
          model: openrouter("gpt-4o-mini"),
          prompt: `Summarize the following user message in 3 words or less to use as a chat title. Do not use quotes or punctuation. Message: "${input.messageContent}"`,
        });

        // Insert the new chat record with the client-provided ID.
        await ctx.db
          .insert(chats)
          .values({
            id: input.chatId,
            userId: ctx.session.user.id,
            title: title.trim(),
          })
          .onConflictDoNothing();
      }

      // Save the message to the database, associated with the chat ID.
      const message = await ctx.db
        .insert(messages)
        .values([
          {
            id: input.messageId,
            chatId: input.chatId,
            role: input.role,
            content: input.messageContent,
            model: input.role === "assistant" ? input.model : null,
            parentMessageId: input.parentMessageId ?? null,
          },
        ])
        .returning();
      return { message: message[0] };
    }),

  updateSharing: protectedProcedure
    .input(
      z.object({
        chatId: z.string(),
        isPublic: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the user owns the chat they're trying to share
      const chat = await ctx.db.query.chats.findFirst({
        where: and(
          eq(chats.id, input.chatId),
          eq(chats.userId, ctx.session.user.id),
        ),
      });

      if (!chat) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      // If they own it, update the isPublic flag
      await ctx.db
        .update(chats)
        .set({ isPublic: input.isPublic })
        .where(eq(chats.id, input.chatId));

      return { success: true };
    }),

  getShared: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db.query.chats.findFirst({
        where: and(
          eq(chats.id, input.chatId),
          eq(chats.isPublic, true), // Only return if isPublic is true
        ),

        // Fetch the messages and the owner's name
        with: {
          messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          },
          user: {
            columns: {
              name: true,
            },
          },
        },
      });

      if (!chat) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return chat;
    }),
});
