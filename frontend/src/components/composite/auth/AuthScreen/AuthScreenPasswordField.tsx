import { type ComponentProps, type ReactNode, useState } from "react";
import { Button } from "../../../base/buttons/Button";
import { TextField } from "../../../base/inputs/TextField";

type Props = Omit<ComponentProps<typeof TextField>, "type" | "trailing"> & {
  children?: ReactNode;
};

/** A password input with a toggle that shows what was typed. */
export function AuthScreenPasswordField(props: Props) {
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
