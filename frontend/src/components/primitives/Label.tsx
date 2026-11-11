import { Label as RadixLabel } from "@radix-ui/react-label";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof RadixLabel>;

/** A native `<label>` that does not select its text when double-clicked. */
export function Label(props: Props) {
  return <RadixLabel {...props} />;
}
