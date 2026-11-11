import type { ComponentProps } from "react";
import { Label as LabelPrimitive } from "@/components/primitives/Label";
import { cn } from "@/utils/cn";

type Props = ComponentProps<typeof LabelPrimitive>;

export function Label({ className, ...props }: Props) {
  return (
    <LabelPrimitive
      className={cn("flex items-center gap-2 text-sm leading-none font-medium select-none", className)}
      {...props}
    />
  );
}
