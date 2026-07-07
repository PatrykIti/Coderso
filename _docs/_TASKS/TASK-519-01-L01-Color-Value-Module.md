# TASK-519-01-L01: Color-Value Helper Module

# FileName: TASK-519-01-L01-Color-Value-Module.md

**Parent Subtask:** TASK-519-01
**Priority:** High
**Category:** Admin UI / Editor Controls (shared helper) / Security (CSS-value validation)
**Estimated Effort:** Small
**Dependencies:** none — foundation leaf; lands first in TASK-519.
**Status:** ⏳ To Do

---

## Single-writer file

**Creates & solely owns `core/admin/ui/shared/colorValue.ts` (NEW).** No other
leaf/subtask writes this file. Imported read-only by 519-02-L01, 519-03-L01,
519-03-L02, and by the test leaf 519-01-L02.

## What to implement

A pure, framework-free module (NO React, NO services import) exposing the exact
primitives the alpha-capable controls need. Full signatures + body sketch are in the
parent subtask (TASK-519-01 §"Pseudocode"). Exports (exact names — downstream leaves
import by these names, they MUST NOT drift):

- `type ParsedColor` — discriminated union `hex | rgb | keyword | token | unknown`.
- `parseColorValue(value: string | null | undefined): ParsedColor` — never throws.
- `composeHexColor(baseHex: string, alpha: number): string` — emits `#rrggbb`
  (alpha≥1) or `#rrggbbaa`; alpha clamped `[0,1]`, invalid→opaque.
- `colorAlpha(parsed: ParsedColor): number` — slider position `0..1` (1 for
  token/keyword/unknown).
- `pickerHexFor(parsed: ParsedColor, fallback?: string): string` — `#rrggbb` for the
  native picker (fallback for non-representable).
- `isAlphaPickerRepresentable(value): boolean` — true only for `hex`/`rgb` kinds.
- `normalizeAdminColorValue(value): string | undefined` — read-only whitelist mirror
  that CANONICALIZES alpha on emit (leading-dot `.84`→`0.84`, `.06`→`0.06` in rgba/hsla)
  so the output passes the RENDER boundary too; fail-soft `undefined` for unknown/unsafe.

## Accepted-set (read-only mirror; MUST stay a subset of the boundary)

Re-declare (do NOT import from services) the patterns mirroring:
- `core/widgets/core/clearableStyle.ts` `cssHexColorPattern` (:15,
  `^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$`), `cssRgbColorPattern`
  (:17-18), `cssHslColorPattern` (:19), `cssColorTokenPattern` (:16);
- keywords `transparent | currentColor | inherit`.

The 519-01-L02 parity test proves the CANONICAL emit stays a subset of
`resolveClearableCssColorValue`. **Render-boundary asymmetry (verified):** the render
`cssRgbColorPattern` (:17-18) alpha group requires a leading `0` — it REJECTS the
leading-dot `.84`/`.06` that `MENU_APPEARANCE_COLOR_PATTERN` accepts. So the RGBA/HSLA
mirror patterns MAY accept leading-dot as input (to read the owner's tokens), but
`normalizeAdminColorValue` MUST rewrite `.84`→`0.84` on emit. Do NOT loosen the render
boundary; canonicalize here.

## Data flow

`stored string` → `parseColorValue` → `{ baseHex, alpha }` drives (a) native picker
value (`pickerHexFor`) and (b) alpha slider (`colorAlpha`). On a picker or slider
change the control recomposes via `composeHexColor(baseHex, alpha)` and calls its
`onChange`. Non-representable safe values (`var(--color-*)`, `hsla`) keep the raw text
field and show the swatch as a fallback (`kind: token`).

## Error handling

Pure functions; no throws. Blank/unknown/unsafe → `{ kind:"unknown" }` /
`undefined`. Alpha always `clampAlpha` → `[0,1]`, NaN→1. `composeHexColor` guards a
malformed `baseHex` to `#000000`.

## Security

`composeHexColor` can only produce `#` + lowercase hex digits — structurally incapable
of emitting `url(`/`expression(`/`javascript:`/`;{}<>`. `normalizeAdminColorValue`
returns `undefined` for anything outside the mirrored whitelist. This leaf adds NO
route/RBAC/schema/migration.

## Regression tests

Owned by sibling leaf **519-01-L02** (`tests/vitest/ui/color-value.test.ts`, Vitest
pure lane) — see parent subtask §"Test shape". This leaf ships the module; L02 ships
the assertions (parse/compose/clamp/round-trip/keyword/token/whitelist-parity/injection-reject).
