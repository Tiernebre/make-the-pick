import type { z } from "zod";
import { object, string } from "zod";

export const healthResponseSchema: z.ZodObject<{
  status: z.ZodString;
  timestamp: z.ZodString;
}> = object({
  status: string(),
  timestamp: string(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
