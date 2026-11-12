import { z } from "zod";
import { validationIssueSchema } from "../common/error-envelope.js";
import { cookieRoute, publicRoute } from "../common/route-security.js";
import { userSchema } from "../common/user.js";
import { signInSchema, signUpSchema } from "./auth.field-rules.js";

const signedInSchema = z.strictObject({
  accessToken: z.string(),
  expiresIn: z.int().describe("Seconds until the access token expires."),
  user: userSchema,
});

/** What Sign up, Sign in and refresh answer. */
export type SignedInResponse = z.infer<typeof signedInSchema>;

// What a route with a body can answer before it runs: the body parser's refusals and the schema's.
const bodyErrors = {
  "request.validation_failed": {
    status: 400,
    data: z.strictObject({ issues: z.array(validationIssueSchema) }),
  },
  "request.malformed": { status: 400 },
  "request.too_large": { status: 413 },
} as const;

// The refresh cookie stands in for an access token on refresh and Sign out.
export const authContract = {
  signUp: publicRoute({
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

  signIn: publicRoute({
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

  refresh: cookieRoute({
    method: "POST",
    path: "/auth/refresh",
    tags: ["auth"],
    successStatus: 200,
    successDescription: "A rotated Session; the refresh cookie is replaced.",
  })
    .errors({
      "auth.session_expired": { status: 401 },
      "auth.origin_rejected": { status: 403 },
      "request.rate_limited": { status: 429 },
    })
    .output(signedInSchema),

  signOut: cookieRoute({
    method: "POST",
    path: "/auth/sign-out",
    tags: ["auth"],
    successStatus: 204,
    // oRPC describes a JSON body even for 204; the response has none.
    spec: (operation) => ({
      ...operation,
      responses: {
        ...operation.responses,
        204: { description: "The Session ended and the refresh cookie is cleared." },
      },
    }),
  })
    .errors({ "auth.origin_rejected": { status: 403 } })
    .output(z.void()),
};
