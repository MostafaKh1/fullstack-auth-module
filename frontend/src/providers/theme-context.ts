import { createContext } from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

/** The inline script in `index.html` reads this same key before the first paint. */
export const themeStorageKey = "theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);
