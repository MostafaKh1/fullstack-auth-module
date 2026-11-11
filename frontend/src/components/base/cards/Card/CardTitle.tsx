import type { ComponentProps } from "react";
import { Slot } from "@/components/primitives/Slot";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"div"> & {
  /** Styles the one child element, such as a page's `<h1>`, instead of rendering a `<div>`. */
  asChild?: boolean;
};

export function CardTitle({ className, asChild = false, ...props }: Props) {
  const Root = asChild ? Slot : "div";
  return <Root data-slot="card-title" className={cn("leading-none font-semibold", className)} {...props} />;
}
