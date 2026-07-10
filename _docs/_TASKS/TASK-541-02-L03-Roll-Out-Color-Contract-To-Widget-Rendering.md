# TASK-541-02-L03: Roll Out Color Contract to Widget Rendering

# FileName: TASK-541-02-L03-Roll-Out-Color-Contract-To-Widget-Rendering.md

**Parent Subtask:** TASK-541-02
**Priority:** High
**Category:** Widgets / Schema / Render Security
**Estimated Effort:** Large
**Dependencies:** TASK-541-01-L01, TASK-541-02-L01
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at TASK-541 closure)

---

## Ownership

Own the color-contract regions only in:

- `core/widgets/core/clearableStyle.ts`
- `core/widgets/core/toggleBlock.tsx`
- `core/widgets/core/divider.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/gridColumns.tsx`
- `core/widgets/core/footer.tsx`
- `core/widgets/core/newsletter.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- `core/admin/ui/widgets/editors/DividerEditors.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/admin/ui/widgets/editors/FooterEditors.tsx`

Do not change widget defaults, unrelated schema keys, rendering structure, runtime
scripts, pack matrix, or persistence APIs.

## Implementation Pseudocode

Refactor the central boundary first:

```ts
export function resolveClearableCssColorValue(
  value: unknown,
  profile: CssColorProfile = "authoring"
): string | undefined {
  return normalizeCssColorValue(value, profile);
}
```

Remove its local keyword/rgb/hsl/semantic regex logic. Every widget authoring field
uses `authoring`; only a field whose existing semantic contract intentionally supports
CSS inheritance passes `inherited-render`. Make those calls explicit—do not make all
widgets inherited by default.

Replace confirmed schema mirrors at:

- toggle `:92-107`;
- divider `:34-49`;
- navigation `:127-141`;
- grid columns `:56-58`;
- footer `:694-705`;
- newsletter `:187-192,641-648`.

Import `CSS_COLOR_SCHEMA_PATTERNS.authoring` or
`CSS_COLOR_SCHEMA_PATTERNS["inherited-render"]` instead of defining regex fragments.
Every affected widget string schema also sets
`maxLength: CSS_COLOR_VALUE_MAX_LENGTH` from the same owner; no widget repeats `128`.
The pattern is only a structural prefilter; each normalizer/render
path still calls the shared semantic parser. Do not accept then silently persist an
out-of-range value merely because it matched JSON Schema.

Use `inherited-render` only for the existing toggle/divider/navigation/footer fields
that explicitly supported `currentColor`/`inherit`; use `authoring` for ordinary
stored overrides such as grid columns/newsletter. Remove arbitrary named-color
acceptance from the lax footer boundary—it was never part of the canonical end-to-end
contract. Existing rejected legacy values fail closed at render and remain unmodified
in storage until explicitly edited.

Update only the four enumerated `SharedColorControl` editor files for inherited-capable
fields, passing the same explicit profile used by their schema/render boundary. This
closes the optimistic preview gap without widening unrelated fields. A newly discovered
production mirror or inherited-capable editor is contract drift: stop, assign it to one
leaf explicitly, and re-audit rather than expanding this ownership wildcard.

Run a repository search for remaining copies of the same hex/rgb/hsl/currentColor
grammar under `core/widgets`; any true mirror must import the owner or be recorded as
a deliberately narrower non-color token contract. Do not mechanically replace SVG
`fill="currentColor"` or unrelated fixed CSS literals.

## Error and compatibility behavior

- Render rejection returns `undefined`, causing the existing cleared/theme fallback;
  never return raw input.
- Unauthored/cleared fields and widget default emission remain byte-identical.
- No migration, schema version, route, or new CSS format is introduced.

## Test Handoff and Validation

TASK-541-03-L01 owns tests, including the four exact editor-callsite suites:
`toggle-block-editor-wave.test.tsx`, `divider-editor-wave.test.tsx`,
`navigation-editor-wave.test.tsx`, and `footer-editor-wave.test.tsx`. Each suite must
exercise the changed editor component and prove that every inherited-capable field passes
the same explicit profile as its schema/render boundary. These editors intentionally keep
`showValueInput={false}`; tests load stored `currentColor`/`inherit`, prove recognized
inherited state without mount mutation, then replace through the existing native picker/
clear interaction. They do not invent a hidden-value text-authoring UX. Generic
`SharedColorControl` coverage alone is insufficient.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/widgets/clearableStyle.test.ts tests/vitest/widgets/toggleBlock.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/footer.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/ui/toggle-block-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/ui/footer-editor-wave.test.tsx
git diff --check
```
