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
admin/
  styles/
    globals.css
  components/
    ui/
  lib/
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

Commands:

```bash
bun add -d tailwindcss@latest @tailwindcss/vite@latest
```

Update `vite.config.ts`:

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

Update `tsconfig.json` path alias:

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

Update CSS entry (v4 uses @import):

```css
@import "tailwindcss";
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `vite.config.ts` | tailwindcss() plugin + alias |
| `admin/styles/globals.css` | `@import "tailwindcss";` |
| `tsconfig.json` | `@/*` path alias |

---

### TASK-024-02_Shcdn_init_and_components_json

**Status:** To Do

Initialize shadcn/ui with Bun CLI.

Commands:

```bash
bun dlx shadcn@latest init
```

Expected `components.json` (example):

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
| `components.json` | shadcn config |
| `admin/lib/utils.ts` | `cn` helper (from shadcn) |
| `admin/components/ui/*` | generated components |

---

### TASK-024-03_Design_tokens_integration

**Status:** To Do

Map `DESIGN_TOKENS.md` to CSS variables used by shadcn and Tailwind.

Example:

```css
:root {
  --background: var(--color-bg);
  --foreground: var(--color-text);
  --primary: var(--color-primary);
  --primary-foreground: var(--color-bg);
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/styles/globals.css` | token mapping to shadcn vars |

---

### TASK-024-04_Seed_core_components

**Status:** To Do

Install baseline UI components used across Admin UI.

Commands:

```bash
bun dlx shadcn@latest add button input select dropdown-menu dialog
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/components/ui/*` | installed components |

---

## Testing Requirements

- [ ] `tests/unit/ui/button.test.tsx` renders shadcn Button.
- [ ] `tests/unit/ui/themeTokens.test.ts` validates CSS variables.

---

## New Files to Create

- `components.json`
- `admin/styles/globals.css`
- `admin/lib/utils.ts`
- `admin/components/ui/*`
- `tests/unit/ui/button.test.tsx`
- `tests/unit/ui/themeTokens.test.ts`

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
