import type { ValidationIssue } from "@app/contract/error-envelope";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { apiFailureCode, isValidationFailure } from "@/utils/api/api-error";
import { clientErrorCode } from "@/utils/error-copy";

const FORM_ALERT = "root.server";

/** Every error it sets, on a field or on the form-level alert, holds a code; `errorCopy()` turns it into a sentence where it is shown. */
export function applyApiFailure<Fields extends FieldValues>(
  error: unknown,
  fields: readonly Path<Fields>[],
  setError: UseFormSetError<Fields>,
) {
  const failureCode = apiFailureCode(error);
  const isField = (path: string): path is Path<Fields> => (fields as readonly string[]).includes(path);

  const email = "email";
  if (failureCode === "user.email_taken" && isField(email)) {
    setError(email, { type: "server", message: failureCode }, { shouldFocus: true });
    return;
  }

  if (isValidationFailure(error) && error.data.issues.length) {
    // The server lists every broken rule; like the form's own check, each field shows its first.
    const shown = new Set<string>();
    const fieldOf = (path: ValidationIssue["path"]) => path.join(".");
    for (const { path, code } of error.data.issues) {
      const field = fieldOf(path);
      if (!isField(field) || shown.has(field)) continue;
      setError(field, { type: "server", message: code }, { shouldFocus: shown.size === 0 });
      shown.add(field);
    }
    if (error.data.issues.some(({ path }) => !isField(fieldOf(path)))) {
      setError(FORM_ALERT, { type: "server", message: clientErrorCode.unexpected });
    }
    return;
  }

  setError(FORM_ALERT, { type: "server", message: failureCode });
}
