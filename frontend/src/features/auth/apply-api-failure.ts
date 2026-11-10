import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiErrorEnvelope } from "../../api/api-error";
import { errorCopy, fallbackCopy, unreachableCopy } from "../../lib/error-copy";

/** The form-level alert's key in React Hook Form's errors. */
export const FORM_ALERT = "root.server";

/**
 * Shows a failed Sign up or Sign in on the form: each validation issue on the field it names, a taken email
 * on the email field, and anything else (including an unreachable server) as the form-level alert.
 * A field error holds a code, as the schema's own errors do; the form-level alert holds its sentence.
 */
export function applyApiFailure<Fields extends FieldValues>(
  error: unknown,
  fields: readonly Path<Fields>[],
  setError: UseFormSetError<Fields>,
) {
  const envelope = apiErrorEnvelope(error);
  if (!envelope) {
    setError(FORM_ALERT, { message: unreachableCopy });
    return;
  }

  const isField = (path: string): path is Path<Fields> => (fields as readonly string[]).includes(path);

  const email = "email";
  if (envelope.code === "user.email_taken" && isField(email)) {
    setError(email, { type: "server", message: envelope.code }, { shouldFocus: true });
    return;
  }

  if (envelope.code === "request.validation_failed" && envelope.issues?.length) {
    // The server lists every broken rule; like the form's own check, each field shows its first.
    const shown = new Set<string>();
    for (const { path, code } of envelope.issues) {
      if (!isField(path) || shown.has(path)) continue;
      setError(path, { type: "server", message: code }, { shouldFocus: shown.size === 0 });
      shown.add(path);
    }
    if (envelope.issues.some(({ path }) => !isField(path))) setError(FORM_ALERT, { message: fallbackCopy });
    return;
  }

  setError(FORM_ALERT, { message: errorCopy(envelope.code) });
}
