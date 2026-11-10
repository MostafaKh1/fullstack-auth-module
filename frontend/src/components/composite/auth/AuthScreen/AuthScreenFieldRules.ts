import { z } from "zod";

/*
 * The field rules of docs/requirements.md. The back end enforces the same rules in
 * `backend/src/auth/auth.types.ts`; change both in the same commit, and both copies of the
 * worked-examples table (`AuthScreenFieldRules.examples.ts` beside this file). Every check's error is its rule id
 * (ADR 0002), which the form turns into a sentence through the copy map.
 */

// The HTML living standard's definition of a valid e-mail address, which `<input type="email">` applies.
const EMAIL_FORMAT =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Length in characters (code points), as the back end counts it, so an emoji counts once, not twice. */
const characters = (value: string): number => [...value].length;

/** The Sign up password policy, one predicate per rule; the live checklist shows the same predicates. */
export const passwordRule = {
  longEnough: (value: string) => characters(value) >= 8,
  shortEnough: (value: string) => characters(value) <= 128,
  hasLetter: (value: string) => /\p{L}/u.test(value),
  hasNumber: (value: string) => /[0-9]/.test(value),
  hasSpecial: (value: string) => /[^\p{L}\p{N}\s]/u.test(value),
};

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
  .refine(passwordRule.longEnough, "password.too_short")
  .refine(passwordRule.shortEnough, "password.too_long")
  .refine(passwordRule.hasLetter, "password.missing_letter")
  .refine(passwordRule.hasNumber, "password.missing_number")
  .refine(passwordRule.hasSpecial, "password.missing_special");

export const signUpSchema = z.object({ email, name, password: newPassword });
export type SignUpFields = z.input<typeof signUpSchema>;

/** Sign in checks only a well-formed email and a non-empty password; the Sign up policy is not applied. */
export const signInSchema = z.object({ email, password: anyPassword });
export type SignInFields = z.input<typeof signInSchema>;
