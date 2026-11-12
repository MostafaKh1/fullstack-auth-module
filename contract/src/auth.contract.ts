import { oc } from "@orpc/contract";
import { z } from "zod";
import { signInSchema, signUpSchema } from "./field-rules.js";

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

// What a route with a body can answer before it runs: the body parser's refusals and the schema's.
const bodyErrors = {
  "request.validation_failed": {
    status: 400,
    data: z.strictObject({ issues: z.array(validationIssueSchema) }),
  },
  "request.malformed": { status: 400 },
  "request.too_large": { status: 413 },
} as const;

// The refresh cookie stands in for an access token on refresh and Sign out; `cookie` is its security scheme.
const withCookieSecurity = <Operation extends object>(operation: Operation) => ({
  ...operation,
  security: [{ cookie: [] }],
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
      ...bodyErrors,
      "user.email_taken": { status: 409 },
      "request.rate_limited": { status: 429 },
    })
    .input(signUpSchema)
    .output(signedInSchema),

  signIn: oc
    .route({
      method: "POST",
      path: "/auth/sign-in",
      tags: ["auth"],
      successStatus: 200,
      successDescription: "A new Session; the refresh cookie is set.",
    })
    .errors({
      ...bodyErrors,
      "auth.invalid_credentials": { status: 401 },
      "request.rate_limited": { status: 429 },
    })
    .input(signInSchema)
    .output(signedInSchema),

  refresh: oc
    .route({
      method: "POST",
      path: "/auth/refresh",
      tags: ["auth"],
      successStatus: 200,
      successDescription: "A rotated Session; the refresh cookie is replaced.",
      spec: withCookieSecurity,
    })
    .errors({
      "auth.unauthenticated": { status: 401 },
      "auth.session_expired": { status: 401 },
      "auth.origin_rejected": { status: 403 },
      "request.rate_limited": { status: 429 },
    })
    .output(signedInSchema),

  signOut: oc
    .route({
      method: "POST",
      path: "/auth/sign-out",
      tags: ["auth"],
      successStatus: 204,
      // oRPC describes a JSON body even for 204; the response has none.
      spec: (operation) => ({
        ...withCookieSecurity(operation),
        responses: {
          ...operation.responses,
          204: { description: "The Session ended and the refresh cookie is cleared." },
        },
      }),
    })
    .errors({
      "auth.unauthenticated": { status: 401 },
      "auth.origin_rejected": { status: 403 },
    })
    .output(z.void()),
};
