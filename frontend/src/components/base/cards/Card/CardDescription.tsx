import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"p">;

export function CardDescription({ className, ...props }: Props) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
