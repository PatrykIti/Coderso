# TASK-541: Canonical CSS Color Contract

# FileName: TASK-541_Canonical_CSS_Color_Contract.md

**Priority:** High
**Category:** Shared Styling / Admin UI / Menus / Widgets / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-536 (program land order)
**Status:** ⏳ To Do
**Changelog:** 1253 (pinned; create only at implementation closure)

---

## Overview

The audit confirmed that admin color controls, menu normalization, and widget
rendering accept different CSS color languages. Several widgets also carry local
regex mirrors. Values can therefore preview successfully and fail at a later
write/render boundary, or pass a structural regex without semantic range checks.

This family creates one Bun-free parser/normalizer with named policy profiles and
rolls it through the existing boundaries. It adds no route, database field,
dependency, or new color feature. The shared authoring profile is deliberately
the end-to-end intersection; broader inherited values are available only through
an explicit render profile.

TASK-539 and TASK-542 are later consumers of this landed contract; they are not
dependencies of TASK-541.

## Canonical contract

- `core/services/theme/cssColorContract.ts` owns `parseCssColorValue`,
  `normalizeCssColorValue`, and structural schema patterns.
- `authoring` accepts 3/4/6/8-digit hex, bounded comma-form RGB/RGBA and HSL/HSLA,
  `var(--color-...)`, and `transparent`.
- `inherited-render` adds canonical `currentColor` and `inherit`; callers opt in
  field by field. Named colors and unlisted CSS functions remain rejected.
- RGB is bounded to 0..255 or 0..100%; hue to 0..360; saturation/lightness to
  0..100%; alpha to 0..1 or 0..100%. Leading-dot alpha normalizes to `0.x`.
- `CSS_COLOR_VALUE_MAX_LENGTH` is exactly `128`; parser and every schema/consumer
  boundary use that one cap. Unsafe-fragment rejection, stable whitespace/case
  normalization, and deterministic `undefined` on rejection are shared by every consumer.
- Regex is only a structural prefilter. Semantic range checks live in the parser;
  no consumer reimplements them.

## Security Contract

No endpoint, auth, RBAC, CSRF, rate-limit, nonce, captcha, or persistence shape
changes. Existing internal menu/widget writes retain their strict route schemas
and permissions. The shared parser is a positive allowlist used again before CSS
emission; it never returns an unchecked author string. No unsafe fallback or
scanner exception is added.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-541-01 | Shared color parser and policy profiles | TASK-541-01-L01, L02 | ⏳ To Do |
| TASK-541-02 | Admin, menu, and widget rollout | TASK-541-02-L01..L03 | ⏳ To Do |
| TASK-541-03 | Parity, property, round-trip, and closure | TASK-541-03-L01 | ⏳ To Do |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| M-04 incompatible accepted color languages | 541-01/L01 + 541-02/L01..L03 | one corpus yields the same decision and canonical bytes at every boundary |
| M-04 unbounded functional channels | 541-01/L01 + L02 | boundary/property cases for every numeric channel and alpha form |
| M-04 widget/menu regex mirrors | 541-02/L02 + L03 | repository scan plus tests prove consumers import the owner instead of mirroring grammar |

## Ownership and land order

Land `541-01 → 541-02 → 541-03`, immediately after TASK-536 and before TASK-537
in the fixed program order (and therefore before TASK-539/TASK-542). The parser leaf
is the sole shared-contract writer. Separate rollout leaves exclusively own admin
controls, menu normalization, and widget boundaries. TASK-542 rereads the landed
menu contract and may not recreate a menu-local parser.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after every source leaf.
- The parser source leaf creates and passes its compact direct suite before landing;
  the following leaf adds a separate exhaustive/property/profile corpus without
  rebaselining that source gate.
- Targeted service, admin control, menu, and widget Vitest suites, with the shared
  table/property corpus and supported-value round trips.
- `bun --cwd core build:admin`, `bun run check:admin-boundary`, and
  `bun run check:admin-bundle` for the UI rollout.
- At least six real light/dark flows covering hex8, leading-dot RGBA, HSL,
  rejected ranges, explicit inherited values, and tokens/transparent; assert
  computed colors, persistence parity, zero console errors, and screenshots.
- Re-run a named failing file once in isolation before classifying the failure.

## Documentation Updates Required

Document the two profiles in the styling/widget/menu developer docs. At closure
create changelog 1253 and close every descendant.
