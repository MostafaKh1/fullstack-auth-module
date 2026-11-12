/**
 * The worked examples of the field rules in docs/requirements.md, one row per case.
 *
 * Both apps' suites run every row against the rules in `auth.field-rules.ts`.
 *
 * `input: undefined` means the field is left out of the request.
 * A valid row may name `stored`: the value the User is saved with.
 * An invalid row lists every rule id the value breaks, in the order the rules are listed in the requirements.
 */
type FieldExample = {
  field: "email" | "name" | "password";
  input: string | undefined;
  note: string;
} & ({ valid: true; stored?: string } | { valid: false; codes: string[] });

const local64 = "a".repeat(64);
const domain189 = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(61)}`;

export const signUpExamples: FieldExample[] = [
  {
    field: "email",
    input: "ada@example.com",
    note: "a plain address",
    valid: true,
    stored: "ada@example.com",
  },
  {
    field: "email",
    input: "  ada@example.com  ",
    note: "surrounding spaces are trimmed",
    valid: true,
    stored: "ada@example.com",
  },
  {
    field: "email",
    input: "Ada@Example.COM",
    note: "stored lowercased",
    valid: true,
    stored: "ada@example.com",
  },
  {
    field: "email",
    input: "ada@localhost",
    note: "a dotless domain, as type=email accepts",
    valid: true,
    stored: "ada@localhost",
  },
  {
    field: "email",
    input: "ada+tag@mail.example.co.uk",
    note: "plus tag and subdomains",
    valid: true,
    stored: "ada+tag@mail.example.co.uk",
  },
  { field: "email", input: `${local64}@${domain189}`, note: "exactly 254 characters", valid: true },
  {
    field: "email",
    input: `${local64}@${domain189}c`,
    note: "255 characters",
    valid: false,
    codes: ["email.too_long"],
  },
  { field: "email", input: undefined, note: "missing", valid: false, codes: ["field.required"] },
  { field: "email", input: "", note: "empty", valid: false, codes: ["field.required"] },
  { field: "email", input: "   ", note: "only spaces", valid: false, codes: ["field.required"] },
  { field: "email", input: "ada", note: "no @", valid: false, codes: ["email.invalid"] },
  { field: "email", input: "ada@", note: "no domain", valid: false, codes: ["email.invalid"] },
  { field: "email", input: "@example.com", note: "no local part", valid: false, codes: ["email.invalid"] },
  {
    field: "email",
    input: "ada lovelace@example.com",
    note: "a space inside",
    valid: false,
    codes: ["email.invalid"],
  },
  {
    field: "email",
    input: "ada@exa_mple.com",
    note: "an underscore in the domain",
    valid: false,
    codes: ["email.invalid"],
  },
  { field: "email", input: "ada@@example.com", note: "two @", valid: false, codes: ["email.invalid"] },

  { field: "name", input: "Ada", note: "exactly 3 characters", valid: true, stored: "Ada" },
  {
    field: "name",
    input: "  Ada Lovelace  ",
    note: "surrounding spaces are trimmed",
    valid: true,
    stored: "Ada Lovelace",
  },
  { field: "name", input: "李小龍", note: "a non-Latin script", valid: true, stored: "李小龍" },
  { field: "name", input: "José", note: "an accented letter", valid: true, stored: "José" },
  { field: "name", input: "n".repeat(50), note: "exactly 50 characters", valid: true },
  { field: "name", input: "n".repeat(51), note: "51 characters", valid: false, codes: ["name.too_long"] },
  { field: "name", input: "ab", note: "2 characters", valid: false, codes: ["name.too_short"] },
  {
    field: "name",
    input: "  ab  ",
    note: "2 characters once trimmed",
    valid: false,
    codes: ["name.too_short"],
  },
  { field: "name", input: undefined, note: "missing", valid: false, codes: ["field.required"] },
  { field: "name", input: "", note: "empty", valid: false, codes: ["field.required"] },
  { field: "name", input: "    ", note: "only spaces", valid: false, codes: ["field.required"] },
  {
    field: "name",
    input: "Ada\u0007Lovelace",
    note: "a control character (bell)",
    valid: false,
    codes: ["name.invalid_characters"],
  },
  {
    field: "name",
    input: "Ada\nLovelace",
    note: "a line break inside",
    valid: false,
    codes: ["name.invalid_characters"],
  },

  { field: "password", input: "Passw0rd!", note: "the requirements' valid example", valid: true },
  {
    field: "password",
    input: "Password1",
    note: "the requirements' invalid example",
    valid: false,
    codes: ["password.missing_special"],
  },
  {
    field: "password",
    input: "password!",
    note: "no number",
    valid: false,
    codes: ["password.missing_number"],
  },
  {
    field: "password",
    input: "12345678!",
    note: "no letter",
    valid: false,
    codes: ["password.missing_letter"],
  },
  { field: "password", input: "Pa0!", note: "4 characters", valid: false, codes: ["password.too_short"] },
  { field: "password", input: "Pa0!abcd", note: "exactly 8 characters", valid: true },
  { field: "password", input: `Pa0!${"x".repeat(124)}`, note: "exactly 128 characters", valid: true },
  {
    field: "password",
    input: `Pa0!${"x".repeat(125)}`,
    note: "129 characters",
    valid: false,
    codes: ["password.too_long"],
  },
  { field: "password", input: "é1234567!", note: "an accented letter counts as a letter", valid: true },
  { field: "password", input: "Passw0rd€", note: "€ counts as special", valid: true },
  { field: "password", input: "Passw0rd🙂", note: "an emoji counts as special", valid: true },
  { field: "password", input: "Passw0rd_", note: "_ counts as special", valid: true },
  {
    field: "password",
    input: "Pass w0rd",
    note: "a space is not special",
    valid: false,
    codes: ["password.missing_special"],
  },
  { field: "password", input: "Pass w0rd!", note: "a space is allowed", valid: true },
  { field: "password", input: "  Pa0!  ", note: "never trimmed: 8 characters with the spaces", valid: true },
  {
    field: "password",
    input: "Pa0🙂🙂🙂🙂",
    note: "7 characters (an emoji is one character)",
    valid: false,
    codes: ["password.too_short"],
  },
  {
    field: "password",
    input: "abc",
    note: "several rules at once",
    valid: false,
    codes: ["password.too_short", "password.missing_number", "password.missing_special"],
  },
  { field: "password", input: undefined, note: "missing", valid: false, codes: ["field.required"] },
  { field: "password", input: "", note: "empty", valid: false, codes: ["field.required"] },
];

/** Sign in checks only a well-formed email and a non-empty password of at most 128 characters. */
export const signInExamples: FieldExample[] = [
  { field: "email", input: "  Ada@Example.COM ", note: "trimmed and lowercased like Sign up", valid: true },
  { field: "email", input: "ada", note: "not an address", valid: false, codes: ["email.invalid"] },
  { field: "email", input: "", note: "empty", valid: false, codes: ["field.required"] },
  { field: "password", input: "x", note: "the Sign up policy is not applied", valid: true },
  { field: "password", input: "Password1", note: "a password the Sign up policy rejects", valid: true },
  { field: "password", input: "x".repeat(128), note: "exactly 128 characters", valid: true },
  {
    field: "password",
    input: "x".repeat(129),
    note: "129 characters",
    valid: false,
    codes: ["password.too_long"],
  },
  { field: "password", input: "", note: "empty", valid: false, codes: ["field.required"] },
  { field: "password", input: undefined, note: "missing", valid: false, codes: ["field.required"] },
];
