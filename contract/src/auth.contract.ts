import { oc } from "@orpc/contract";
import { z } from "zod";
import { signUpSchema } from "./field-rules.js";

const userSchema = z.strictObject({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
});

const signedInSchema = z.strictObject({
  accessToken: z.string(),
  expiresIn: z.int().describe("Seconds until the access token expires."),
  user: userSchema,
});

/** `path` is the keys from the body down to the field; `code` is a rule id such as `password.missing_number`. */
const validationIssueSchema = z.strictObject({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
});

export const authContract = {
  signUp: oc
    .route({
      method: "POST",
      path: "/auth/sign-up",
      tags: ["auth"],
      successStatus: 201,
      successDescription: "A new Session; the refresh cookie is set.",
    })
    .errors({
      "request.validation_failed": {
        status: 400,
        data: z.strictObject({ issues: z.array(validationIssueSchema) }),
      },
      "request.malformed": { status: 400 },
      "user.email_taken": { status: 409 },
      "request.too_large": { status: 413 },
      "request.rate_limited": { status: 429 },
    })
    .input(signUpSchema)
    .output(signedInSchema),
};
