import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";
import { useFormField } from "./FormUseFormField";

type Props = ComponentProps<"p">;

/** Shown only while the field has an error. Pass the sentence as `children`: an error's `message` holds a code (ADR 0002). */
export function FormMessage({ className, children, ...props }: Props) {
  const { error, formMessageId } = useFormField();
  if (!error) return null;

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {children ?? error.message}
    </p>
  );
}
