import type { ComponentProps } from "react";
import { useFormField } from "@/hooks/useFormField";
import { cn } from "@/utils/cn";
import { clientErrorCode, errorCopy } from "@/utils/error-copy";

type Props = Omit<ComponentProps<"p">, "children">;

/** A field error's `message` is a code (ADR 0002), so this shows its sentence from the copy map, never the code. */
export function FormMessage({ className, ...props }: Props) {
  const { error, formMessageId } = useFormField();
  if (!error) return null;

  return (
    <p id={formMessageId} className={cn("text-sm text-destructive", className)} {...props}>
      {errorCopy(error.message ?? clientErrorCode.unexpected)}
    </p>
  );
}
