import { type ComponentProps, type ReactNode, useState } from "react";
import { Button } from "../../components/button";
import { TextField } from "../../components/text-field";

type Props = Omit<ComponentProps<typeof TextField>, "type" | "trailing"> & {
  children?: ReactNode;
};

/** A password input with a toggle that shows what was typed. */
export function PasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? "Hide" : "Show"}
        </Button>
      }
    />
  );
}
