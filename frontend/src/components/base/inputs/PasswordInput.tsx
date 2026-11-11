import { type ComponentProps, useState } from "react";
import { Button } from "@/components/base/buttons/Button";
import { Input } from "@/components/base/inputs/Input";
import { cn } from "@/utils/cn";

type Props = Omit<ComponentProps<typeof Input>, "type">;

/** A password input with a toggle that shows what was typed. Every prop but `className` goes to the `<input>`. */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input {...props} type={visible ? "text" : "password"} className="pr-16" />
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((shown) => !shown)}
        className="absolute inset-y-0 right-0.5 my-auto h-7"
      >
        {visible ? "Hide" : "Show"}
      </Button>
    </div>
  );
}
