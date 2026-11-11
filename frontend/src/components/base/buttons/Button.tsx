import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

const button = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 gap-1.5 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type Props = ComponentProps<"button"> &
  VariantProps<typeof button> & {
    /** Disables the button and marks it busy; `children` should say what is in progress. */
    pending?: boolean;
  };

export function Button({ variant, size, pending = false, disabled, className, children, ...props }: Props) {
  return (
    <button
      type="button"
      data-slot="button"
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
