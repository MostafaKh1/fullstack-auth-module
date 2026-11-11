import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";

type Props = {
  className?: string;
  children: ReactNode;
};

/** A message assistive technology announces as soon as it appears. */
export function Alert({ className, children }: Props) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        "border-red-200 bg-red-50 text-red-800",
        "dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-current"
      >
        <span className="text-[10px] font-bold text-white dark:text-red-950">!</span>
      </span>
      <p>{children}</p>
    </div>
  );
}
