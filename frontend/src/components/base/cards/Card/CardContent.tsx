import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"div">;

export function CardContent({ className, ...props }: Props) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}
