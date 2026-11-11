import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"div">;

/** A failure message assistive technology announces as soon as it appears. */
export function Alert({ className, children, ...props }: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border border-destructive/50 bg-card px-4 py-3 text-sm text-destructive",
        className,
      )}
      {...props}
    >
      <p>{children}</p>
    </div>
  );
}
