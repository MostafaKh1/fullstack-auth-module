import axe from "axe-core";

/**
 * Runs axe over `container` and returns each violation as `<rule id>: <selector>`, so a failing test names what to
 * fix. Contrast is left to the browser: jsdom computes no colours.
 */
export async function accessibilityViolations(container: Element) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(" ")}`),
  );
}
