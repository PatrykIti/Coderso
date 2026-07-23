# TASK-541-02-L02: Roll Out Color Contract to Menu Writes

# FileName: TASK-541-02-L02-Roll-Out-Color-Contract-To-Menu-Writes.md

**Parent Subtask:** TASK-541-02
**Priority:** High
**Category:** Menus / Write Validation
**Estimated Effort:** Small
**Dependencies:** TASK-541-02-L01
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Ownership and sequencing

Own only:

- `core/services/menus/normalizeMenuAppearance.ts`;
- the TASK-520 custom-shadow color/canonicalization comment region only in
  `core/services/menus/menuDocumentV2.ts` (around the current `:900-999`);
- `tests/vitest/services/normalize-menu-appearance.test.ts`;
- `tests/vitest/services/menu-document-v2.test.ts`;
- `tests/vitest/ui/menu-color-alpha.test.tsx`;
- `tests/vitest/ui/menu-design-editor.test.tsx`;
- `tests/integration/routes/menus.test.ts`.

The current color mirror is around `normalizeMenuAppearance.ts:147-182`. These
tests move with the source-owning leaf and are updated before its gate. Do not edit
other `menuDocumentV2.ts` behavior. Land before TASK-542; TASK-542 must read this
final module and must not restore a menu-local color regex/parser.

## Implementation Pseudocode

Remove `MENU_APPEARANCE_COLOR_PATTERN` and route every menu color through the shared
authoring profile:

```ts
const normalizeColor = (value: unknown): string | null =>
  normalizeCssColorValue(value, "authoring") ?? null;

export const normalizeMenuColorValue = normalizeColor;
```

Do not invent `menuColorSchema`, a nested route JSON schema, or a duplicated
`maxLength`: `menuUpdateSchema` is deliberately shallow and strict at the route
envelope, while `normalizeMenuAppearance`/`menuDocumentV2` own deep semantics.
The canonical parser's own original-string length guard applies through
`normalizeMenuColorValue`; Menu neither restates its unit/value nor imports a cap
that it does not otherwise use.

Preserve the surrounding strict object keys, error mapping, null/absent semantics
and appearance normalization. Accepted values are stored as canonical bytes from
the shared owner. `currentColor` and `inherit` reject because Menu authoring has no
explicit inherited-render contract. Out-of-range functions reject instead of being
clamped or silently accepted.

Stored-read compatibility must remain fail-closed through the existing menu document
adapter. Do not rewrite persisted menus on read, seed defaults, or add a route/schema
fallback. No route registration, auth, RBAC, CSRF, cache, or API response changes.
The shared parser enforces its exported cap internally; do not spell a second cap or
import `CSS_COLOR_VALUE_MAX_LENGTH` when the Menu module has no independent use for it.

The shared canonical bytes also flow through TASK-520's bounded composite
`normalizeMenuBoxShadowValue`: a leading-dot alpha inside an accepted shadow color
now canonicalizes to `0.x`. Update only the stale TASK-520 comments and exact tests
that pin those bytes. The composite box-shadow grammar, its 200-byte/layer/length
limits, and the unsaved free-text preview remain separate contracts; do not claim
that a full shadow value is a single-color value and do not widen its grammar.

## Exact error/read behavior

- A bad flat field passed to `normalizeMenuAppearance` throws the existing
  `MenuAppearanceError` with its machine-readable code/field and no raw value.
- `sanitizeMenuAppearance`, `resolveStoredMenuAppearance`, and published read
  sanitization drop only the invalid flat field and never throw.
- A bad color in the flat MenuDocument appearance subset maps through the existing
  `MenuAppearanceError` catch to `MenuDocumentError` at the exact field path.
- Bad nested `brand`, level, chrome, scrolled, or custom-shadow color values remain
  fail-soft omissions while unknown keys remain reject-unknown errors.
- Accepted single colors and colors embedded in TASK-520 shadows use identical
  canonical bytes; no read rewrite, seeded default, or unchecked fallback is added.

## Source-owned test shape and validation

Update all five Vitest/route suites above before the source gate for every throw,
drop, omit, canonical-shadow, and route 400/no-persistence path. The DB-backed
route suite must load `.env`, use unique fixtures, and delete only its own rows.

Use one table built from `CSS_COLOR_VALUE_MAX_LENGTH` and pass every entry as the
original raw string, never `trim()`ed, lowercased, or otherwise rewritten by the
test. A valid terminal surrounded only by ASCII U+0020 padding at exactly the cap
must canonicalize; the same terminal with one additional U+0020 at cap + 1 must
reject before trimming. Separate entries containing representative C0 and C1
controls, NBSP (`U+00A0`), and EM SPACE (`U+2003`) around an otherwise valid
terminal must reject. Do not replace these characters with generic `\s` fixtures
or repeat the numeric cap as a literal.

Run that untouched raw-input table through every changed Menu boundary, not only
the shared helper:

- `normalizeMenuColorValue` returns canonical bytes for exact-cap input and `null`
  for every rejected input;
- strict `normalizeMenuAppearance` canonicalizes the owned color field or throws
  the existing `MenuAppearanceError` at that field;
- `sanitizeMenuAppearance`, `resolveStoredMenuAppearance`, and
  `resolvePublishedMenuAppearance` canonicalize the accepted value and drop only
  the rejected field while retaining a valid sibling;
- `normalizeMenuDocumentV2ForWrite` exercises both the strict flat appearance
  subset (accepted canonical bytes or path-specific `MenuDocumentError`) and
  representative nested brand/level/chrome/scrolled color fields (accepted
  canonical bytes or fail-soft omission); and
- `normalizeStoredMenuDocumentV2ForRead`, `resolveStoredMenuDocument`, and
  `resolvePublishedMenuDocument` prove stored and published reads never restore
  rejected raw bytes.

The route cases send the raw value in the request JSON and assert canonical DB/read
bytes for the exact-cap case and the established 400-or-omission behavior for the
corresponding strict-or-fail-soft field. Test helpers may construct padding but may
not pre-normalize the value before invoking production code.

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/services/normalize-menu-appearance.test.ts tests/vitest/services/menu-document-v2.test.ts tests/vitest/ui/menu-color-alpha.test.tsx tests/vitest/ui/menu-design-editor.test.tsx
set -a && source .env && set +a
bun test tests/integration/routes/menus.test.ts
git diff --check
```
