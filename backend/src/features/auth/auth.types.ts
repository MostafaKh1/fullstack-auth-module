import { z } from "zod";

/** A User as the application sees it: never with its password hash. */
export type User = { id: string; email: string; name: string; createdAt: Date };

export type RevokedReason = "sign-out" | "reuse-detected";

/** A Session as the application sees it: never with its secret hashes (ADR 0001). */
export type Session = {
  id: string;
  userId: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  revokedReason: RevokedReason | null;
};

/*
 * The field rules of docs/requirements.md. The front end enforces the same rules in
 * `frontend/src/components/composite/screens/AuthScreen/AuthScreenFieldRules.ts`; change both in the same commit, and both copies of the
 * worked-examples table (`backend/src/test/support/field-rules.examples.ts`). Every check's error is its rule id (ADR 0002).
 */

// The HTML living standard's definition of a valid e-mail address, which `<input type="email">` applies.
const EMAIL_FORMAT =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Length in characters (code points), so an emoji counts once rather than as two UTF-16 units. */
const characters = (value: string): number => [...value].length;

const required = { error: "field.required" } as const;
const present = { error: "field.required", abort: true } as const;

const email = z
  .string(required)
  .trim()
  .toLowerCase()
  .min(1, present)
  .max(254, "email.too_long")
  .regex(EMAIL_FORMAT, "email.invalid");

const name = z
  .string(required)
  .trim()
  .min(1, present)
  .refine((value) => characters(value) >= 3, "name.too_short")
  .refine((value) => characters(value) <= 50, "name.too_long")
  .refine((value) => !/\p{Cc}/u.test(value), "name.invalid_characters");

// Passwords are never trimmed: a space is a legitimate password character.
const anyPassword = z
  .string(required)
  .min(1, present)
  .refine((value) => characters(value) <= 128, "password.too_long");

const newPassword = z
  .string(required)
  .min(1, present)
  .refine((value) => characters(value) >= 8, "password.too_short")
  .refine((value) => characters(value) <= 128, "password.too_long")
  .refine((value) => /\p{L}/u.test(value), "password.missing_letter")
  .refine((value) => /[0-9]/.test(value), "password.missing_number")
  .refine((value) => /[^\p{L}\p{N}\s]/u.test(value), "password.missing_special");

export const signUpSchema = z.object({ email, name, password: newPassword });
export type SignUpBody = z.output<typeof signUpSchema>;

/** Sign in checks only a well-formed email and a non-empty password; the Sign up policy is not applied. */
export const signInSchema = z.object({ email, password: anyPassword });
export type SignInBody = z.output<typeof signInSchema>;
