import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

const button = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
    "disabled:cursor-not-allowed disabled:opacity-70",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500",
          "dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:shadow-indigo-950/50",
        ],
        ghost: [
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          "dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        ],
      },
      size: {
        md: "h-11 px-5 text-sm",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Props = VariantProps<typeof button> &
  ComponentProps<"button"> & {
    /** `children` should say what is in progress. */
    pending?: boolean;
  };

export function Button({ variant, size, pending = false, disabled, className, children, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(button({ variant, size }), className)}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}
