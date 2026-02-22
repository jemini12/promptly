import { z } from "zod";

export const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
  plan: z.enum(["free", "pro"]).optional(),
  overrideEnabledJobsLimit: z.number().int().min(0).optional().nullable(),
  overrideTotalJobsLimit: z.number().int().min(0).optional().nullable(),
  overrideDailyRunLimit: z.number().int().min(0).optional().nullable(),
});
