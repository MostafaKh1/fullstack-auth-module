import type { ComponentProps } from "react";
import { Label } from "@/components/base/labels/Label";
import { cn } from "@/utils/cn";
import { useFormField } from "./FormUseFormField";

type Props = ComponentProps<typeof Label>;

export function FormLabel({ className, ...props }: Props) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={Boolean(error)}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}
