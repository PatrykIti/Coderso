# TASK-024: Shadcn UI and Tailwind v4 Setup
# FileName: TASK-024_ShadcnUI_and_Tailwind_v4_Setup.md

**Priority:** High
**Category:** Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-007
**Status:** To Do

---

## Overview

Set up shadcn/ui with Tailwind CSS v4 for the Admin UI. This establishes
our UI component baseline and integrates design tokens.

**Goals:**
- Tailwind v4 via `@tailwindcss/vite` plugin.
- shadcn/ui initialized with `components.json`.
- Alias and CSS variables aligned with `DESIGN_TOKENS.md`.

---

## Architecture

```
/core
  /admin
    /styles
      globals.css
    /components
      /ui
    /lib
      utils.ts
  components.json
  vite.config.ts

tests/unit/ui/
  button.test.tsx
```

---

## Sub-Tasks

### TASK-024-01_Tailwind_v4_install_and_config

**Status:** To Do

Install Tailwind v4 with Vite plugin (docs).

Steps:
1) Install `tailwindcss@latest` and `@tailwindcss/vite@latest`.
2) Add `tailwindcss()` plugin to `core/vite.config.ts`.
3) Add alias `@` -> `./admin` in `core/vite.config.ts` and `core/tsconfig.json`.
4) Add Tailwind import to `core/admin/styles/globals.css`.
5) Verify dev server compiles without PostCSS config.

Commands:

```bash
bun add -d tailwindcss@latest @tailwindcss/vite@latest
```

Update `core/vite.config.ts`:

```ts
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./admin"),
    },
  },
});
```

Update `core/tsconfig.json` path alias:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./admin/*"]
    }
  }
}
```

Update CSS entry (v4 uses @import) in `core/admin/styles/globals.css`:

```css
@import "tailwindcss";
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/vite.config.ts` | tailwindcss() plugin + alias |
| `core/admin/styles/globals.css` | `@import "tailwindcss";` |
| `core/tsconfig.json` | `@/*` path alias |
| `core/admin/styles/globals.css` | base layer + tokens |

---

### TASK-024-02_Shcdn_init_and_components_json

**Status:** To Do

Initialize shadcn/ui with Bun CLI.

Rules:
- Use latest CLI: `bun dlx shadcn@latest`.
- `rsc` must be `false` (Admin UI is client-only).
- `cssVariables` must be `true` to align with design tokens.

Commands:

```bash
bun dlx shadcn@latest init
```

Expected `core/components.json` (example).
Note: paths are relative to `/core` (so `admin/styles/globals.css` lives in `core/admin/styles/globals.css`).

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "admin/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/components.json` | shadcn config |
| `core/admin/lib/utils.ts` | `cn` helper (from shadcn) |
| `core/admin/components/ui/*` | generated components |

---

### TASK-024-03_Design_tokens_integration

**Status:** To Do

Map `DESIGN_TOKENS.md` to CSS variables used by shadcn and Tailwind.

Rules:
- Map core tokens to shadcn variables in `:root`.
- Keep mapping minimal and stable (do not rename variables in UI code).
- Use `@layer base` for CSS variables and body defaults.

Example:

```css
@layer base {
:root {
  --background: var(--color-bg);
  --foreground: var(--color-text);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-bg);
}
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/styles/globals.css` | token mapping to shadcn vars |

---

### TASK-024-04_Seed_core_components

**Status:** To Do

Install baseline UI components used across Admin UI.

Core components (v1):
- button, input, select, dropdown-menu, dialog
- textarea, checkbox, tabs, sonner, tooltip

Commands:

```bash
bun dlx shadcn@latest add button input select dropdown-menu dialog textarea checkbox tabs sonner tooltip
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/components/ui/*` | installed components |

---

### TASK-024-05_Core_ui_helpers_and_styles

**Status:** To Do

Add shared UI helpers and base styles for Admin UI.

Example `core/admin/lib/utils.ts` (cn helper):

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Example `core/admin/styles/globals.css` (minimal base):

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: var(--color-bg);
    --foreground: var(--color-text);
    --primary: var(--color-primary);
    --primary-foreground: var(--color-bg);
  }

  body {
    background: var(--background);
    color: var(--foreground);
  }
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/lib/utils.ts` | `cn` helper |
| `core/admin/styles/globals.css` | base styles + tokens |

---

### TASK-024-06_Verify_component_usage

**Status:** To Do

Add a simple admin UI screen to verify components render correctly.

Example `core/admin/ui/debug/UiPreview.tsx`:

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UiPreview() {
  return (
    <div className="space-y-4 p-6">
      <Button>Primary</Button>
      <Input placeholder="Type here" />
    </div>
  );
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/debug/UiPreview.tsx` | preview screen |

---

## Testing Requirements

- [ ] `tests/unit/ui/button.test.tsx` renders shadcn Button.
- [ ] `tests/unit/ui/themeTokens.test.ts` validates CSS variables.
- [ ] `tests/unit/ui/utils.test.ts` validates `cn` helper output.
- [ ] `tests/integration/ui/preview.test.tsx` renders UI preview page.

---

## New Files to Create

- `core/components.json`
- `core/admin/styles/globals.css`
- `core/admin/lib/utils.ts`
- `core/admin/components/ui/*`
- `core/admin/ui/debug/UiPreview.tsx`
- `tests/unit/ui/button.test.tsx`
- `tests/unit/ui/themeTokens.test.ts`
- `tests/unit/ui/utils.test.ts`
- `tests/integration/ui/preview.test.tsx`

---

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (shadcn variable mapping).
- `_docs/CMS_SPEC.md` (admin UI stack notes).
- `_docs/ARCHITECTURE.md` (admin UI uses shadcn).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-shadcn-tailwind-setup.md`
- Notes: Tailwind v4 + shadcn/ui init.

---

## Additional Docs

- `_docs/SDK_SPEC.md` (if shared UI components are later exposed).
