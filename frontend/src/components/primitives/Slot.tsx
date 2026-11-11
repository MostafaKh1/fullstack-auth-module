import { Slot as RadixSlot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof RadixSlot>;

/** Renders its one child element in its place, merging these props, handlers and ref into the child's. */
export function Slot(props: Props) {
  return <RadixSlot {...props} />;
}
