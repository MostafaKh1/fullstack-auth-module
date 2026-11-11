import { Button } from "@/components/base/buttons/Button";
import { ThemeToggleUseTheme } from "./ThemeToggleUseTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = ThemeToggleUseTheme();
  const dark = theme === "dark";

  return (
    <Button variant="ghost" size="icon" aria-label="Dark mode" aria-pressed={dark} onClick={toggleTheme}>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dark ? (
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        )}
      </svg>
    </Button>
  );
}
