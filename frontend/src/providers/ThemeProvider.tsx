import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { type Theme, ThemeContext, themeStorageKey } from "@/providers/theme-context";

type Props = {
  children: ReactNode;
};

/** Light unless the User chose dark: the system's preference is ignored. */
export function ThemeProvider({ children }: Props) {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      remember(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function storedTheme(): Theme {
  try {
    return localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
  } catch {
    // Blocked storage is a first visit: light.
    return "light";
  }
}

function remember(theme: Theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The choice holds for this tab only.
  }
}
