import { oc } from "@orpc/contract";
import { z } from "zod";

export const userSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
});

export const usersContract = {
  me: oc
    .route({
      method: "GET",
      path: "/users/me",
      tags: ["users"],
      successStatus: 200,
      successDescription: "The signed-in User.",
      spec: (operation) => ({ ...operation, security: [{ bearer: [] }] }),
    })
    .errors({ "auth.unauthenticated": { status: 401 } })
    .output(userSchema),
};
