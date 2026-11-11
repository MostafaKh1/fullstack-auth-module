import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"div">;

export function CardHeader({ className, ...props }: Props) {
  return <div className={cn("grid auto-rows-min items-start gap-2 px-6", className)} {...props} />;
}
