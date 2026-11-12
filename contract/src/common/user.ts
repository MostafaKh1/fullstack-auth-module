import { z } from "zod";

export const userSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
});
