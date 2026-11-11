import type { ComponentProps } from "react";
import { Slot } from "@/components/primitives/Slot";
import { useFormField } from "./FormUseFormField";

type Props = ComponentProps<typeof Slot>;

/** Gives its one child, the field's input, the id its label points at and ties it to the field's message. */
export function FormControl(props: Props) {
  const { error, formItemId, formMessageId } = useFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={error ? formMessageId : undefined}
      aria-invalid={Boolean(error)}
      {...props}
    />
  );
}
