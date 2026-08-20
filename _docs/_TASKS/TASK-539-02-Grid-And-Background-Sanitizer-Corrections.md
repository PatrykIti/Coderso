# TASK-539-02: Grid and Background Sanitizer Corrections

# FileName: TASK-539-02-Grid-And-Background-Sanitizer-Corrections.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / CSS Security / Pure Domain
**Estimated Effort:** Medium
**Dependencies:** TASK-539-01, TASK-541
**Status:** ⏳ To Do
**Changelog:** 1318 (pinned; create only at TASK-539 closure)

---

## Goal

Keep Page author-controlled CSS behind one positive grammar: only numeric zero may be
unitless in grid lengths, and background input is parsed into an exact validated image
substring plus an optional canonical final color before any consumer emits it.

TASK-541's Bun-free `parseCssColorValue(raw, "authoring")` remains the single semantic
color parser. Page applies only its existing seven-token policy afterward and never
pretrims, lowercases, regex-classifies, or recreates color syntax.

## Leaves and land order

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-02-L01 | Sole sanitizer source and existing compatibility-suite writer | ⏳ To Do |
| TASK-539-02-L02 | One new immutable security-corpus suite only | ⏳ To Do |
| TASK-539-02-L03 | Regenerate kit demo artifact + re-baseline kit color expectations (downstream of L01's TASK-541 delegation) | ⏳ To Do |

Land `TASK-539-02-L01 -> TASK-539-02-L02`. `TASK-539-02-L03` is an independent
mechanical re-baseline discovered during implementation: L01's contract-mandated
canonicalization changed the emitted bytes of the kit generator, and the checked-in
artifact plus three kit suites still pinned the legacy compact spelling. L03 may
land any time after L01; it must land before any combined gate that runs the kit
suites (aggregate TASK-539-08-L01 runs `bun run test`).

## Single-writer ownership

- L01 is the sole TASK-539 writer of
  `core/services/pages/pageAuthoringSanitizers.ts` and
  `tests/vitest/pages/page-authoring-sanitizers.test.ts`.
- L02 creates only
  `tests/vitest/pages/page-authoring-sanitizers-security-corpus.test.ts`.
  It never edits/rebaselines L01's suite.
- TASK-541 sources and tests are read-only. Both leaves run its exact contract,
  corpus, and consumer-parity tests.
- Renderer/responsive leaves import `parseAuthoringCssBackgroundPaint`; they do not
  duplicate splitting, tripwires, color filtering, or grid grammar.
- Neither leaf edits consumers, model files, routes, DDL, dependencies,
  parents/indexes/changelogs, or scanner configuration/suppressions.

## Locked sanitizer contract

- Preserve all existing sanitizer export names. `sanitizeAuthoringCssColor` and
  `isSafeAuthoringCssColor` delegate the untouched raw argument to TASK-541, then
  accept tokens only from
  `primary|secondary|accent|bg|surface|text|border`.
- `parseAuthoringCssBackgroundPaint` validates the bounded whole value once and
  returns `{image:string|null,color:string|null}`. `image` is the exact outer-trimmed
  source substring spanning the validated gradient layers, including original
  spelling and separators. `color` is TASK-541 canonical output.
- Before any trim, split, regex, or parenthesis walk, the parser rejects C0/C1
  controls (`U+0000..U+001F`, `U+007F..U+009F`) and every Unicode whitespace code
  point other than ASCII space (`U+0020`), including BOM (`U+FEFF`), anywhere in the
  raw whole value.
- The grid sanitizer applies that same raw code-point guard before `.trim()`, its
  metacharacter check, or its top-level tokenizer. ASCII space is its only accepted
  whitespace; TAB/newline controls, C1 controls, every Unicode/ECMAScript whitespace
  code point, and `U+FEFF` reject even at an outer edge.
- A color is legal only as the single final layer. Colors before/between gradients,
  multiple colors, non-gradient image functions, unsafe protocols/functions,
  controls/non-ASCII whitespace, empty layers, imbalance, layer overflow, and length
  overflow reject.
- One internal analysis owns the grammar and returns the paint plus its top-level
  `layerCount`. The public structured parser exposes the paint. The legacy boolean
  helper delegates to that same analysis and preserves its historical cardinality:
  it is `true` only for a valid 2..`PAGE_BG_MAX_LAYERS` stack, and `false` for a
  valid single color or single gradient. `sanitizeAuthoringCssBackground` delegates
  to the same analysis and returns exact image bytes for image-only, canonical color
  for color-only, or `${image}, ${color}` for a split result.
- Grid lengths accept unitless `0`, `0.0`, and any all-zero decimal spelling only.
  Every nonzero number requires `fr|px|%|rem|em`, including inside
  `minmax`/`repeat`.

## Security Contract

- No route or public write is added. Existing internal Page writes keep auth, RBAC,
  CSRF, strict Page validation, and the `admin_write` rate limit.
- Whole-value length, balanced-parenthesis, top-level layer, layer-count, unsafe
  function/protocol/at-rule, positive gradient, and exact color-policy guards stay in
  the shared pure boundary.
- Raw responsive `<style>` consumers may emit only the structured validated members.
- No scanner exception, suppression, or allowlist change is permitted. Any strict-scan
  nonzero result blocks this family.
- Nonce/HMAC and captcha do not apply because no public write is added.

## Acceptance

- Existing export names compile and delegate to one owner.
- Exact image bytes and canonical final-color bytes are independently pinned.
- Legal single colors and gradients parse and sanitize successfully while the legacy
  multi-layer predicate stays false for either one-layer form and true only at the
  valid 2..`PAGE_BG_MAX_LAYERS` boundaries.
- The immutable TASK-541 corpus reaches both Page color adapters and embedded-final
  background parsing without preprocessing, including exact raw-length/control/
  Unicode-space boundaries.
- Zero-only unitless grid rules are covered at every nested position.
- The final L02 gate reruns every split Page model suite read-only after the sanitizer
  change; L02 cannot rebaseline TASK-539-01's canonical TASK-541 color fixtures.
- Each leaf runs lint/types, exact targeted tests, the baseline-to-final TASK-539 line
  gate, and `git diff --check`; every touched production/test file is at most 1,000
  lines.
