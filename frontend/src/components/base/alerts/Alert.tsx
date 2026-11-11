import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"p">;

// Destructive only: no screen needs another look.
export function Alert({ className, ...props }: Props) {
  return (
    <p
      role="alert"
      className={cn(
        "w-full rounded-lg border border-destructive/50 bg-card px-4 py-3 text-sm text-destructive",
        className,
      )}
      {...props}
    />
  );
}
