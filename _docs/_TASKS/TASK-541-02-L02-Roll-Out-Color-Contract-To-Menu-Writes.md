# TASK-541-02-L02: Roll Out Color Contract to Menu Writes

# FileName: TASK-541-02-L02-Roll-Out-Color-Contract-To-Menu-Writes.md

**Parent Subtask:** TASK-541-02
**Priority:** High
**Category:** Menus / Write Validation
**Estimated Effort:** Small
**Dependencies:** TASK-541-01-L01
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

---

## Ownership and sequencing

Sole source writer: `core/services/menus/normalizeMenuAppearance.ts`. Current mirror
is around `:147-182`. Land before TASK-542; TASK-542 must read this final module and
must not restore a menu-local color regex/parser.

## Implementation Pseudocode

Remove `MENU_APPEARANCE_COLOR_PATTERN` and route every menu color through the shared
authoring profile:

```ts
const normalizeColor = (value: unknown): string | null =>
  normalizeCssColorValue(value, "authoring") ?? null;

export const normalizeMenuColorValue = normalizeColor;

// Every menu JSON-schema color string uses both shared structural constraints.
const menuColorSchema = {
  type: "string",
  maxLength: CSS_COLOR_VALUE_MAX_LENGTH,
  pattern: CSS_COLOR_SCHEMA_PATTERNS.authoring,
};
```

Preserve the surrounding strict object keys, error mapping, null/absent semantics and
appearance normalization. Accepted values are stored as canonical bytes from the
shared owner. `currentColor` and `inherit` reject because menu authoring has no
explicit inherited-render contract. Out-of-range functions reject instead of being
clamped or silently accepted.

Stored-read compatibility must remain fail-closed through the existing menu document
adapter. Do not rewrite persisted menus on read, seed defaults, or add a route/schema
fallback. No route registration, auth, RBAC, CSRF, cache, or API response changes.
Do not spell `128` or a second maxLength at the menu boundary; import the owner constant.

## Error behavior

Keep the existing domain error shape at the menu normalization boundary. A rejected
color follows the existing invalid-field behavior; do not surface raw values in error
messages/logs.

## Test Handoff and Validation

TASK-541-03-L01 owns test edits.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/normalize-menu-appearance.test.ts tests/vitest/services/menu-document-v2.test.ts tests/vitest/ui/menu-color-alpha.test.tsx
git diff --check
```
