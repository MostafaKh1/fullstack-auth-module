import { type ComponentProps, useState } from "react";
import { Button } from "@/components/base/buttons/Button";
import { Icon } from "@/components/base/icons/Icon";
import { Input } from "@/components/base/inputs/Input";
import { cn } from "@/utils/cn";

type Props = Omit<ComponentProps<typeof Input>, "type">;

/** A password input with a toggle that shows what was typed. Every prop but `className` goes to the `<input>`. */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
      <Button
        variant="ghost"
        size="icon"
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((shown) => !shown)}
        className="absolute inset-y-0 right-0.5 my-auto size-7"
      >
        <Icon>
          {visible ? (
            <>
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <path d="m2 2 20 20" />
            </>
          ) : (
            <>
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </Icon>
      </Button>
    </div>
  );
}
