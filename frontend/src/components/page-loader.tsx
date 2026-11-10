import type { ReactNode } from "react";
import { cn } from "../lib/cn";

type Props = {
  className?: string;
  /** What is being loaded, announced to assistive technology. */
  children: ReactNode;
};

/** A full-page loading state, shown instead of a page that is not ready, so the wrong page never flashes. */
export function PageLoader({ className, children }: Props) {
  return (
    <div role="status" className={cn("grid min-h-dvh place-items-center p-6", className)}>
      <div className="flex flex-col items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-[3px] border-indigo-500 border-r-transparent"
        />
        {children}
      </div>
    </div>
  );
}
