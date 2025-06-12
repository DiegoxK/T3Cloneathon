import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { openai } from "@ai-sdk/openai";
import { experimental_generateImage as generateImage } from "ai";
import { TRPCError } from "@trpc/server";

export const imageRouter = createTRPCRouter({
  generate: publicProcedure
    .input(
      z.object({
        prompt: z.string().min(1, "Prompt cannot be empty"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const { image } = await generateImage({
          model: openai.image("dall-e-3"),
          prompt: input.prompt,
          size: "1024x1024",
          n: 1,
        });

        return { base64: image.base64 };
      } catch (error) {
        console.error("tRPC Image Generation Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to generate image",
        });
      }
    }),
});
