import { use } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { FormFieldContext } from "./FormFieldContext";
import { FormItemContext } from "./FormItemContext";

/** The ids that tie a field's label, control and message together, and the field's validation state. */
export function useFormField() {
  const field = use(FormFieldContext);
  const item = use(FormItemContext);
  if (!field || !item) throw new Error("useFormField must be used inside <FormField> and <FormItem>");

  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: field.name });

  return {
    formItemId: `${item.id}-form-item`,
    formMessageId: `${item.id}-form-item-message`,
    ...getFieldState(field.name, formState),
  };
}
