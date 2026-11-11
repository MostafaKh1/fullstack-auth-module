import { type ComponentProps, type ReactNode, useState } from "react";
import { HandRolledButton } from "@/components/base/buttons/HandRolledButton";
import { TextField } from "@/components/base/inputs/TextField";

type Props = Omit<ComponentProps<typeof TextField>, "type" | "trailing"> & {
  children?: ReactNode;
};

export function AuthScreenSignUpFormPasswordField(props: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <HandRolledButton
          variant="ghost"
          size="sm"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? "Hide" : "Show"}
        </HandRolledButton>
      }
    />
  );
}
