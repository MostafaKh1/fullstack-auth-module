import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"svg">;

/** A 24-unit stroke icon hidden from assistive technology: its button carries the name. `children` are the paths. */
export function Icon({ className, children, ...props }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={cn("size-4", className)}
    >
      {children}
    </svg>
  );
}
