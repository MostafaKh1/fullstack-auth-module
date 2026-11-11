import { use } from "react";
import { ThemeContext } from "@/providers/theme-context";

export function ThemeToggleUseTheme() {
  const value = use(ThemeContext);
  if (!value) throw new Error("ThemeToggleUseTheme must be used inside ThemeProvider");
  return value;
}
