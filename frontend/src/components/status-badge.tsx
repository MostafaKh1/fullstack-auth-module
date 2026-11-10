import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";

const statusBadge = cva("inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium", {
  variants: {
    status: {
      checking: "bg-slate-100 text-slate-700",
      up: "bg-emerald-100 text-emerald-800",
      down: "bg-red-100 text-red-800",
    },
  },
});

type Props = VariantProps<typeof statusBadge> & {
  className?: string;
  children: ReactNode;
};

export function StatusBadge({ status, className, children }: Props) {
  return (
    <p role="status" className={cn(statusBadge({ status }), className)}>
      {children}
    </p>
  );
}
