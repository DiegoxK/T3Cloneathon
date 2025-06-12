import type { z } from "zod";
import { type RouterOutputs } from "@/trpc/react";

import { type users } from "@/server/db/schema";

export type User = typeof users.$inferSelect;
