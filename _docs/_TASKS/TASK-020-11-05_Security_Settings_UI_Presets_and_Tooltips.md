# TASK-020-11-05: Security Settings UI + Presets
# FileName: TASK-020-11-05_Security_Settings_UI_Presets_and_Tooltips.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-020-11-04  
**Status:** To Do  

---

## Overview

Redesign Settings → Security into user-friendly sections with presets and tooltips. Provide “WordPress-like” defaults for non-technical users.

---

## Goals

1. Use vertical tabs layout (same as Settings → Site).
2. Split settings into clear sections/tabs.
2. Add longer, non-technical descriptions and tooltips (WordPress-like).
3. Provide presets: `WordPress-like`, `Strict`, `Relaxed`.
4. Preserve advanced control for power users.
5. Add a reCAPTCHA v3 section with thresholds per action (disabled by default until keys are provided).

---

## Pseudocode

```ts
const PRESETS = {
  wordpress: { rateLimit: { ... }, csrf: { enabled: true }, cors: {...} },
  strict: { rateLimit: { ... }, botProtection: { enabled: true } },
  relaxed: { rateLimit: { enabled: false } }
};

function applyPreset(name) {
  setForm(PRESETS[name]);
}
```

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/admin/ui/settings/SecuritySettingsPage.tsx` | Use SettingsShell + vertical tabs; add sections, tooltips, presets UI |
| `core/admin/ui/settings/*` | Reusable helper components for sections |
| `tests/unit/ui/security-settings.test.tsx` | Preset apply + sections render |

---

## Open Questions

1. Which labels/tooltips do you want (short text vs long help)?
2. Presets are apply-only; allow switching to `Custom` after edits.

---

## Documentation Updates Required

- `_docs/SETTINGS.md`
