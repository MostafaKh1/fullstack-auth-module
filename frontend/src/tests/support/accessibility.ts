import axe from "axe-core";

/** Each axe violation in `container` as `<rule id>: <selector>`, so a failing test names the element to fix. */
export async function accessibilityViolations(container: Element) {
  // jsdom computes no colours, so contrast is left to the browser.
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`),
  );
}
