import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiErrorEnvelope, type ValidationIssue } from "../../../utils/api-error";
import { errorCopy, fallbackCopy, unreachableCopy } from "../../../utils/error-copy";

/** The form-level alert's key in React Hook Form's errors. */
export const FORM_ALERT = "root.server";

/** A field error holds a code, as the schema's own errors do; the form-level alert holds its sentence. */
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
    const fieldOf = (path: ValidationIssue["path"]) => path.join(".");
    for (const { path, code } of envelope.issues) {
      const field = fieldOf(path);
      if (!isField(field) || shown.has(field)) continue;
      setError(field, { type: "server", message: code }, { shouldFocus: shown.size === 0 });
      shown.add(field);
    }
    if (envelope.issues.some(({ path }) => !isField(fieldOf(path)))) {
      setError(FORM_ALERT, { message: fallbackCopy });
    }
    return;
  }

  setError(FORM_ALERT, { message: errorCopy(envelope.code) });
}
