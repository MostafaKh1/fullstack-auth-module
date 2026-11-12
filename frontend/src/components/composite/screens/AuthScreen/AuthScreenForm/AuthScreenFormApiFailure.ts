import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiErrorEnvelope, apiFailureCode, type ValidationIssue } from "@/utils/api/api-error";
import { clientErrorCode } from "@/utils/error-copy";

const FORM_ALERT = "root.server";

/** Every error it sets, on a field or on the form-level alert, holds a code; `errorCopy()` turns it into a sentence where it is shown. */
export function applyApiFailure<Fields extends FieldValues>(
  error: unknown,
  fields: readonly Path<Fields>[],
  setError: UseFormSetError<Fields>,
) {
  const envelope = apiErrorEnvelope(error);
  if (!envelope) {
    setError(FORM_ALERT, { type: "server", message: apiFailureCode(error) });
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
      setError(FORM_ALERT, { type: "server", message: clientErrorCode.unexpected });
    }
    return;
  }

  setError(FORM_ALERT, { type: "server", message: apiFailureCode(error) });
}
