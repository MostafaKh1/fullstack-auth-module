import { Controller, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";
import { FormFieldContext } from "@/providers/form-field-context";

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext>
  );
}
