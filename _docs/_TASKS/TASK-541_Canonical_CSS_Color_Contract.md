# TASK-541: Canonical CSS Color Contract

# FileName: TASK-541_Canonical_CSS_Color_Contract.md

**Priority:** High
**Category:** Shared Styling / Admin UI / Menus / Forms / Retained Compatibility
**Estimated Effort:** Very Large
**Dependencies:** TASK-536, TASK-538 (program-order recovery after early TASK-536 closure)
**Status:** ✅ Done
**Started:** 2026-07-11
**Completed:** 2026-07-12
**Changelog:** 1253

---

## Overview

The audit confirmed M-04 drift in a finite set of color boundaries: shared admin
color controls, Menu normalization, the Form theme bridge, and the explicitly
listed retained `core/widgets/*` read/render compatibility seams. The same audit
grounded true parser or classifier mirrors including `ClearableFields`, Hero,
Gallery Mosaic, CTA Banner, Navigation, Divider, Toggle, Footer, Newsletter,
Menu, Form, and the central retained color adapter. This parent-level list is
intentionally non-exhaustive; the source/test ownership lists in the executable
leaves are the exact finite M-04 inventory. Values can therefore preview
successfully and fail at a later declared write/render boundary, or pass a
structural regex without semantic range checks.

This family creates one Bun-free parser/normalizer with named policy profiles and
rolls it through only that leaf-owned M-04 inventory. It does not claim ownership
of every historical `resolveClearableStyleValue` field or every color-looking
string in the repository. It adds no route, database field,
dependency, generic widget type, preset, module-pack entry, or new color feature.
Pages, Forms, and Menus remain section/block-owned domain surfaces; Dashboard
widgets are out of scope. Changes under `core/widgets/*` are maintenance of
non-destructive legacy reads/rendering only and must not make those modules
selectable or configurable as a product-widget surface. The shared authoring
profile is deliberately the normal end-to-end intersection. The broader
`inherited-render` profile is opt-in per declared compatibility boundary; Form is
the existing TASK-516 exception and retains that profile end-to-end, including
its current write normalization. TASK-541 does not widen that exception.

TASK-539 is a later compatibility consumer: its Page sanitizer work must import
and rerun this shared contract after TASK-541 lands, while preserving Page's
additional seven-token allowlist (`primary`, `secondary`, `accent`, `bg`,
`surface`, `text`, `border`) in its owner-defined order. TASK-542 remains the
later technical menu consumer and must import this contract as well.

## Canonical contract

- `core/services/theme/cssColorContract.ts` owns `parseCssColorValue`,
  `normalizeCssColorValue`, and structural schema patterns.
- `authoring` accepts 3/4/6/8-digit hex, bounded comma-form RGB/RGBA and HSL/HSLA,
  `var(--color-...)`, and `transparent`. HSL hue accepts an optional `deg`
  suffix and canonical output drops it. Input `rgb`/`rgba` and `hsl`/`hsla`
  names do not decide arity: three channels canonicalize to `rgb`/`hsl`, while
  a fourth alpha canonicalizes to `rgba`/`hsla`.
- `inherited-render` adds canonical `currentColor` and `inherit`; callers opt in
  field by field. Named colors and unlisted CSS functions remain rejected.
- RGB is bounded to 0..255 or 0..100%; hue to 0..360; saturation/lightness to
  0..100%; alpha to 0..1 or 0..100%. Unsigned decimal lexemes have no signs,
  exponent, trailing dot, `NaN`, or `Infinity`; a leading dot is accepted only
  for alpha and normalizes to `0.x`.
- `CSS_COLOR_VALUE_MAX_LENGTH` is exactly `128`. Length is checked on the original,
  untrimmed JavaScript string before any parsing. Only ASCII U+0020 is whitespace;
  tabs, newlines, other controls, non-ASCII whitespace, comments, and CSS-rule
  fragments are rejected, never trimmed into validity. The accepted grammar is
  ASCII, so parser length and JSON Schema `maxLength` have the same accepted-set
  semantics.
- Canonical decimal serialization is string-based and never emits exponent
  notation. Literal metadata contains integer RGB bytes: numeric RGB uses
  `Math.round(channel)`, percentage RGB uses
  `Math.round(percent * 255 / 100)`, and HSL uses the standard HSL-to-sRGB
  conversion followed by `Math.round`. Bounds are checked first; no channel is
  clamped. Hue `360` stays `360` in canonical HSL bytes but is `0` for RGB
  metadata conversion.
- Function identifiers and policy keywords are ASCII case-insensitive and emit
  stable lowercase function names plus `transparent`, `currentColor`, or
  `inherit`. `var` emits lowercase with no padding; the custom-property name is
  case-sensitive and must already match lowercase `--color-[a-z0-9-]+`.
- Regex is only a structural prefilter. Semantic range checks live in the parser;
  no consumer reimplements them.
- `resolveClearableCssColorValue` requires or receives an explicit profile at
  every production caller. The implementation may keep an `authoring` default
  only after the exhaustive caller test proves every call site is classified;
  no inherited behavior may change because a caller was missed.

## Security Contract

No endpoint, auth, RBAC, CSRF, rate-limit, nonce, captcha, or persistence shape
changes. At the boundaries declared by this family, existing internal Menu and
Form writes retain their route/domain validation and permissions; this statement
does not claim to audit or change unrelated repository boundaries. Menu route
schemas remain shallow orchestration schemas and deep color validation stays in
the domain normalizers. Form retains its explicit TASK-516
`inherited-render` write/read compatibility exception. The shared parser is a
positive allowlist used again before CSS emission and never returns an unchecked
author string. No unsafe fallback or scanner exception is added.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-541-01 | Shared color parser and policy profiles | TASK-541-01-L01, L02 | ✅ Done |
| TASK-541-02 | Admin, Menu, Form, and Compatibility Rollout | TASK-541-02-L01..L03 | ✅ Done |
| TASK-541-03 | Parity, property, round-trip, and closure | TASK-541-03-L01 | ✅ Done |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| M-04 incompatible accepted color languages | 541-01/L01 + 541-02/L01..L03 | one corpus yields the same decision and canonical bytes at every boundary |
| M-04 unbounded functional channels | 541-01/L01 + L02 | boundary/property cases for every numeric channel and alpha form |
| M-04 Menu/Form/retained-compatibility parser and classifier mirrors | 541-02/L01..L03 | the exact finite leaf inventory, including Toggle/Footer schema seams and Hero/Gallery Mosaic/CTA Banner admin classifiers, imports parsed metadata instead of mirroring grammar |

## Ownership and land order

Land leaves strictly in this exact order:
`541-01-L01 → 541-01-L02 → 541-02-L01 → 541-02-L02 →
541-02-L03 → 541-03-L01`, immediately after TASK-536 and before TASK-537 in
the audited dependency map. The parser leaf is the sole shared-contract writer.
Separate rollout leaves exclusively own shared/Page admin controls, Menu
normalization, and Form/retained compatibility boundaries together with the
tests changed by their source. Hero/Gallery Mosaic/CTA Banner admin mirrors and
their existing UI suites belong to L03 beside their retained renderer contract,
not to the shared-control L01 leaf. TASK-542 rereads the landed Menu contract and may not recreate a
menu-local parser. TASK-541 reruns the landed TASK-535 Page color/control baseline
without changing Page sanitizer/model contracts. TASK-539-02-L01 later consumes
the shared parser in `pageAuthoringSanitizers.ts` and applies Page's seven-token
allowlist after shared parsing; it must not recreate the grammar.

## Testing Requirements

- `bun --cwd core lint:types` and `bun --cwd core lint` after every source leaf.
- The parser source leaf creates and passes its compact direct suite before landing;
  the following leaf adds a separate exhaustive/property/profile corpus without
  rebaselining that source gate.
- Targeted service, admin control, Menu, Form, and retained-compatibility Vitest
  suites, with the shared immutable table/property corpus, structural-pattern
  parity proof, and supported-value round trips.
- `bun --cwd core build:admin`, `bun run check:admin-boundary`, and
  `bun run check:admin-bundle` for the UI rollout.
- At least seven real light/dark flows on supported Menu, Page, and Form
  section/block surfaces covering hex8, leading-dot RGBA, HSL/HSLA, rejected
  ranges, Page's seven tokens/transparent/clear, and one Form Design → runtime
  preview/public-render flow that proves the existing TASK-516
  `inherited-render` exception through a visible computed inheritance effect;
  assert computed colors, persistence parity, zero console errors, and
  screenshots. Retained `core/widgets/*` `currentColor`/`inherit` compatibility
  remains a Vitest/SSR proof and must not be smoke-tested by inserting, saving,
  publishing, or templating a historical non-Dashboard widget.
- Re-run a named failing file once in isolation before classifying the failure.

## Documentation Updates Required

Document the two profiles in styling, Menu, Form, and retained-compatibility
developer docs. At closure create changelog 1253 and close every descendant.

## Completion evidence

- The six leaves landed in the declared order and share one Bun-free parser,
  explicit `authoring`/`inherited-render` profiles, canonical metadata, and one
  parity inventory across shared admin controls, Menu, Form, and the finite
  retained compatibility seams. No endpoint, migration, dependency, generic
  widget, preset, or module-pack surface was added. Dashboard remains the only
  configurable widget surface, and production `formRuntimeScript.ts` is
  byte-identical to HEAD.
- Final stabilized validation passed core lint/type lint, root TypeScript,
  55 Vitest files / 1,428 tests, 40 DB-backed Menu/Form route tests / 392
  expectations, Admin build (2,637 modules), the 776-file browser-boundary
  check, bundle budgets (34.94/192.42/218.79 KiB gzip), and all five Coderso
  release gates. The parity inventory now caches immutable source/AST reads so
  its assertions remain unchanged without the confirmed under-load timeout.
  The no-theme Form Embed regression pins the real pre-task HEAD length and
  SHA-256 rather than comparing current output with itself.
- The strict security scan ran and remained non-green only for the exact
  unchanged TASK-545-owned finding in `_docs/_workflows/task-522-author.mjs`;
  Bun audit, Trivy, and Gitleaks were clean. TASK-541 had zero findings, and no
  scanner rule, suppression, baseline, or allowlist changed.
- Five fresh final lenses report 0 High/Medium/Low findings after fixing every
  verified drift. The first visual reconcile correctly rejected Design-canvas
  evidence as a Runtime Preview and later exposed the missing dialog
  description. The existing copy is now a layout-neutral `DialogDescription`
  with a real `aria-describedby` regression, and the workflow requires the
  actual role/name/resolved description, exact validation counts, warning-free
  evidence, cleanup identity, and pre-closure visual audit.
- The canonical seven-flow smoke used `wf541smoke`; corrective evidence used
  separately documented task-scoped sessions. The final post-repair Flow 7 used
  `wf541flow7final` on the current source and proved one Form through
  save/reopen, the actual described Runtime Preview, the supported Page Form
  block, publish, and front with
  `background-color === color === rgb(12, 34, 56)`. Across the audit history,
  21 regular PNGs have unique paths, inodes, and SHA-256 hashes. The final
  dialog/front had zero console errors, console warnings, and page errors; all
  task fixtures/routes, theme/front/site-shell state, browser sessions, ports,
  and helper processes were independently verified cleaned or restored.
- Owner commit scope is the TASK-541-owned source, tests, documentation,
  workflow/evidence, this family, board row, and changelog 1253 only. Agents did
  not stage or commit.
