import type { z } from "zod";
import { object, string } from "zod";

export const healthResponseSchema: z.ZodObject<{
  status: z.ZodString;
  timestamp: z.ZodString;
  commit: z.ZodString;
}> = object({
  status: string(),
  timestamp: string(),
  commit: string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
