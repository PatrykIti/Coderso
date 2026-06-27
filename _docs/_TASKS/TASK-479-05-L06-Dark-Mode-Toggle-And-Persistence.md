# TASK-479-05-L06: Dark-Mode Toggle & Persistence in Admin Shell
# FileName: TASK-479-05-L06-Dark-Mode-Toggle-And-Persistence.md

**Parent Subtask:** TASK-479-05
**Priority:** Medium
**Category:** Admin UI / Design System / Theming
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05-L03
**Status:** ⏳ To Do

---

## Overview

Add a light/dark toggle to the admin TopBar that flips `<html class="dark">`
(driving the static `.dark` layer from L03), persists the choice, and applies it
before first paint to avoid a flash. No new runtime dependency — match the
prototype's class-toggle pattern.

- **Goal:** A persisted, no-flash light/dark switch in the admin shell.
- **Owning module/service:** `core/admin/index.html` (pre-paint script),
  new `core/admin/ui/shared/AdminColorModeToggle.tsx` (+ a small `useColorMode`
  hook), `core/admin/ui/shared/TopBar.tsx` (mount the toggle next to
  `AdminThemeSwitcher`). Optionally `core/admin/app/AdminApp.tsx` if the mode
  needs to coexist with the injected `coderso-theme-tokens` `<style>`.
- **Source-of-truth docs:** prototype `_docs/_PROTOTYPE/index.html`,
  `_docs/_PROTOTYPE/src/lib/theme.tsx`,
  `_docs/_PROTOTYPE/src/components/shell/ThemeToggle.tsx`.
- **Out of scope:** the `.dark` CSS values (L03), the token contract (L02). The
  admin **theme-profile** switcher (`AdminThemeSwitcher`) is unrelated — this is
  a separate light/dark axis.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Mode is a client-only `localStorage`
preference; no server state, no payloads.

---

## Implementation Pseudocode

### 1) No-flash pre-paint — `core/admin/index.html`

The admin is a client-rendered Vite SPA (`core/admin/index.html` → `main.tsx`
`createRoot`). Apply the saved mode before React mounts, exactly like the
prototype:

```html
<html lang="en" class="light">
  <head>
    …
    <script>
      // Apply saved admin color mode before paint (light default).
      (function () {
        try {
          var m = localStorage.getItem("coderso-admin-color-mode");
          var dark = m === "dark";
          var el = document.documentElement;
          el.classList.toggle("dark", dark);
          el.classList.toggle("light", !dark);
        } catch (e) {}
      })();
    </script>
  </head>
```

### 2) Hook + toggle — new `core/admin/ui/shared/AdminColorModeToggle.tsx`

Lazy-init from the DOM/localStorage (render-time derivation, NO sync setState in
an effect — ESLint 9 react-hooks compliant). The effect only syncs the class +
storage:

```tsx
type ColorMode = "light" | "dark";
const STORAGE_KEY = "coderso-admin-color-mode";

function readInitialMode(): ColorMode {
  if (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")) return "dark";
  try { return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

export function AdminColorModeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useState<ColorMode>(readInitialMode); // lazy init

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", mode === "dark");
    el.classList.toggle("light", mode === "light");
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  }, [mode]);

  const toggle = useCallback(
    () => setMode((p) => (p === "dark" ? "light" : "dark")), []);

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle dark mode"
      aria-pressed={mode === "dark"} onClick={toggle} className={className}>
      {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
```

### 3) Mount in TopBar — `core/admin/ui/shared/TopBar.tsx`

Place it in the right-hand action cluster next to the existing
`<AdminThemeSwitcher />` (the bell/help buttons there are already shadcn `Button`
`variant="ghost" size="icon"`, so it matches):

```tsx
<div className="ml-auto flex … items-center gap-2 …">
  <AdminThemeSwitcher />
  <AdminColorModeToggle />        {/* NEW */}
  {actions}
  <Button variant="ghost" size="icon"><Bell … /></Button>
  …
</div>
```

### 4) Coexistence with the injected token `<style>`

`AdminApp` injects `<style id="coderso-theme-tokens">:root{--admin-*:…}</style>`
(light DB tokens). Per L03, the `.dark` layer overrides the derived **shadcn**
vars directly, so toggling `dark` wins even while the injected `:root` still
carries the light `--admin-*`. No change needed in `AdminApp` unless you want the
mode reflected in a context — if so, expose `useColorMode()` from this module and
read it where needed; do NOT add a second source of truth for the class.

**Data flow:** pre-paint script sets class from storage → React lazy-inits
`mode` from the class → toggle flips `mode` → effect re-toggles class + persists.

**Error handling:** wrap `localStorage` in try/catch (private-mode / disabled
storage); default to light. SSR-safe `typeof document` guard (harmless in the
SPA but keeps the module importable in tests/jsdom).

**Regression-test shape (L07 + here):**

- `readInitialMode` returns "dark" when `<html class="dark">` is present.
- Clicking the toggle adds/removes `dark` on `document.documentElement` and
  writes `coderso-admin-color-mode`.
- TopBar renders the toggle alongside `AdminThemeSwitcher`.
- No-flash: a unit test asserts the inline script (or an equivalent
  `applyStoredColorMode()` helper) sets the class synchronously from a seeded
  `localStorage` value.

> Do NOT introduce sync `setState` inside `useEffect`; use the lazy initializer +
> sync-only effect above (ESLint 9 react-hooks rule).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration`
  (new `admin-color-mode-toggle.test.tsx`: lazy init, class toggle, persistence).
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/admin`
  (TopBar mounts the toggle).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + statistics on status change.
- `_docs/DESIGN_TOKENS.md` dark-mode section (toggle + `coderso-admin-color-mode`
  key + no-flash) — owned by L07; cross-link here.
- Changelog entry on closure linking **TASK-479** + this leaf.
