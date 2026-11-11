import type { ComponentProps } from "react";
import { Label as LabelPrimitive } from "@/components/primitives/Label";
import { cn } from "@/utils/cn";

type Props = ComponentProps<typeof LabelPrimitive>;

export function Label({ className, ...props }: Props) {
  return (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
