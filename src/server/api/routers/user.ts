import { z } from "zod";
import { eq } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema";
import { encrypt } from "@/server/lib/crypto";

export const userRouter = createTRPCRouter({
  updateApiKey: protectedProcedure
    .input(z.object({ apiKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.apiKey.length === 0) {
        await ctx.db
          .update(users)
          .set({ encryptedApiKey: null })
          .where(eq(users.id, ctx.session.user.id));
        return { success: true };
      }

      // Encryption for the key
      const encryptedKey = encrypt(input.apiKey);

      await ctx.db
        .update(users)
        .set({ encryptedApiKey: encryptedKey })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),
});
