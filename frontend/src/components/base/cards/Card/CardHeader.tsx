import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

type Props = ComponentProps<"div">;

export function CardHeader({ className, ...props }: Props) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}
