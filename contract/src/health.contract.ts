import { oc } from "@orpc/contract";
import { z } from "zod";

const healthSchema = z.strictObject({ status: z.literal("ok"), database: z.literal("up") });

export type Health = z.infer<typeof healthSchema>;

export const healthContract = {
  check: oc
    .route({
      method: "GET",
      path: "/health",
      tags: ["health"],
      successStatus: 200,
      successDescription: "The database answers.",
    })
    .errors({ "server.unavailable": { status: 503 } })
    .output(healthSchema),
};
