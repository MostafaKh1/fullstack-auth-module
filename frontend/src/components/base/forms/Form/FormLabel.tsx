import type { ComponentProps } from "react";
import { Label } from "@/components/base/labels/Label";
import { useFormField } from "@/hooks/useFormField";
import { cn } from "@/utils/cn";

type Props = ComponentProps<typeof Label>;

export function FormLabel({ className, ...props }: Props) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-error={Boolean(error)}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}
