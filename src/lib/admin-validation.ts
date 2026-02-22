import { z } from "zod";

export const adminUserUpdateSchema = z.object({
  role: z.enum(["user", "admin"]).optional(),
});
