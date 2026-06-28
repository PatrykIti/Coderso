import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Admin light/dark color mode.
 *
 * This is a SEPARATE axis from the admin theme-PROFILE switcher
 * (`AdminThemeSwitcher`): the profile switcher re-emits the LIGHT
 * `:root{--admin-*}` block, while this toggle flips `<html class="dark">` which
 * activates the injected `:root.dark{--admin-*}` block (emitted by `AdminApp`
 * from the shared `DEFAULT_ADMIN_THEME_TOKENS_DARK` palette). Because the admin
 * chrome reads `--admin-*` directly and the injected style wins source order,
 * toggling the class recolors the WHOLE shell (button + sidebar + topbar). See
 * TASK-479-05-L01 for the dark-mode strategy decision.
 */
export type ColorMode = "light" | "dark";

/** localStorage key. Kept in sync with the pre-paint script in `index.html`. */
export const ADMIN_COLOR_MODE_STORAGE_KEY = "coderso-admin-color-mode";

/** Read the persisted mode from storage only (no DOM), defaulting to light. */
function readStoredColorMode(): ColorMode {
  try {
    return localStorage.getItem(ADMIN_COLOR_MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    // private-mode / disabled storage
    return "light";
  }
}

/**
 * Lazy-initial mode for the React state. The pre-paint script in `index.html`
 * has already set the `dark`/`light` class on `<html>` from storage, so the DOM
 * class is the source of truth; fall back to storage (then light) when the class
 * is absent (e.g. tests / SSR import).
 */
export function readInitialMode(): ColorMode {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  return readStoredColorMode();
}

/** Toggle the `<html>` class for the given mode and persist it. */
function applyColorMode(mode: ColorMode): void {
  if (typeof document !== "undefined") {
    const el = document.documentElement;
    el.classList.toggle("dark", mode === "dark");
    el.classList.toggle("light", mode === "light");
  }
  try {
    localStorage.setItem(ADMIN_COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // private-mode / disabled storage — mode stays in-memory only
  }
}

/**
 * Apply the persisted mode to `<html>` synchronously (no React) — the TS twin of
 * the `index.html` pre-paint script, exported so the no-flash behavior can be
 * exercised in unit tests. Reads storage, sets the class; does NOT write back.
 */
export function applyStoredColorMode(): ColorMode {
  const mode = readStoredColorMode();
  if (typeof document !== "undefined") {
    const el = document.documentElement;
    el.classList.toggle("dark", mode === "dark");
    el.classList.toggle("light", mode === "light");
  }
  return mode;
}

/**
 * The single source of truth for the admin color mode: the `<html>` class +
 * `localStorage`. Lazy-inits from the DOM (set pre-paint), and the effect only
 * SYNCS the class + storage when the mode changes (no sync `setState` in an
 * effect — ESLint 9 react-hooks compliant).
 */
export function useColorMode(): {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggle: () => void;
} {
  const [mode, setMode] = useState<ColorMode>(readInitialMode);

  useEffect(() => {
    applyColorMode(mode);
  }, [mode]);

  const toggle = useCallback(() => setMode((prev) => (prev === "dark" ? "light" : "dark")), []);

  return { mode, setMode, toggle };
}

/**
 * TopBar light/dark toggle button. Matches the neighboring chrome buttons
 * (ghost icon `Button`); shows a Sun in dark mode (click → light) and a Moon in
 * light mode (click → dark).
 */
export function AdminColorModeToggle({ className }: { className?: string }) {
  const { mode, toggle } = useColorMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle dark mode"
      aria-pressed={mode === "dark"}
      onClick={toggle}
      className={className}
    >
      {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
