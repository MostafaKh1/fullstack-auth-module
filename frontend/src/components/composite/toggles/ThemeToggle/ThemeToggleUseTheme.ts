import { use } from "react";
import { ThemeContext } from "@/providers/theme-context";

export function useTheme() {
  const value = use(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
