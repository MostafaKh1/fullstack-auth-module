import { type ComponentProps, useId } from "react";
import { cn } from "@/utils/cn";
import { FormItemContext } from "./FormItemContext";

type Props = ComponentProps<"div">;

export function FormItem({ className, ...props }: Props) {
  const id = useId();

  return (
    <FormItemContext value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-2", className)} {...props} />
    </FormItemContext>
  );
}
