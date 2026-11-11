import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/**
 * Focuses the field labelled `label`, pastes `value` into it (nothing for an empty or missing value) and
 * leaves it, as a User tabbing through the form would. Returns the field.
 */
export async function enterField(user: UserEvent, label: string, value: string | undefined) {
  const field = screen.getByLabelText(label);
  await user.clear(field);
  if (value) await user.paste(value);
  await user.tab();
  return field;
}

export async function fillForm(user: UserEvent, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    await enterField(user, label, value);
  }
}
