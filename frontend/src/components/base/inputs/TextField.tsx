import { cva } from "class-variance-authority";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/utils/cn";

const input = cva(
  [
    "block h-11 w-full rounded-xl border bg-white px-3.5 text-base text-slate-900 shadow-xs transition sm:text-sm",
    "placeholder:text-slate-400 focus:outline-none focus-visible:ring-4",
    "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
  ],
  {
    variants: {
      invalid: {
        false: [
          "border-slate-300 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20",
          "dark:border-slate-700 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-400/20",
        ],
        true: [
          "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-500/20",
          "dark:border-red-500/70 dark:focus-visible:ring-red-500/25",
        ],
      },
      withTrailing: { true: "pr-24", false: "" },
    },
  },
);

type Props = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  /** Linked to the input with `aria-describedby`. */
  error?: string;
  /** Content placed inside the input's right edge, such as a show-password toggle. */
  trailing?: ReactNode;
  /** Content below the input that is not an error, such as a checklist. */
  children?: ReactNode;
};

export function TextField({ label, error, trailing, children, className, ...props }: Props) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={input({ invalid: Boolean(error), withTrailing: Boolean(trailing) })}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
