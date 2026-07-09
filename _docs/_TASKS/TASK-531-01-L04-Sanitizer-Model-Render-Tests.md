# TASK-531-01-L04: Sanitizer + Model + Render Tests

# FileName: TASK-531-01-L04-Sanitizer-Model-Render-Tests.md

**Parent Task:** TASK-531
**Parent Subtask:** TASK-531-01
**Priority:** High
**Category:** Security / Content (Pages) / Site Render / Testing
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. The implementation-side Vitest coverage for 531-01 (L01 sanitizer, L02
model + render, L03 controls). All lanes are **Vitest** (model/render/registry are pure —
no browser runtime needed; behavioral runtime coverage is the ≥5-scenario Playwright smoke
owned by the closure). Landed alongside L01-L03 so each leaf gates green before the next.

## Grounded anchors (existing suites to extend)

- `tests/vitest/pages/page-authoring-sanitizers.test.ts` — the multi-layer accept/reject
  corpus (L01) is ADDED here as NEW coverage. **Correction (2026-07-09):** this file has NO
  existing safe-multi-layer REJECTION assertion to re-baseline (its only bg assertions are
  `url(javascript:...)`→null `:70` and `linear-gradient(...,</style>)`→null `:71`, both of
  which STAY rejected). The real pre-531 multi-layer/url()-layer rejection contract is in
  `tests/vitest/pages/page-document-v2.test.ts:2282-2304` (TASK-523 outbound-beacon +
  url()-nested-in-gradient) — CONFIRM those stay green (all contain `url()` ⇒ still
  rejected); do NOT edit them. Add the safe-multi-layer ACCEPT + security-REJECT corpus to
  `page-authoring-sanitizers.test.ts` as additive coverage.
- `tests/vitest/pages/page-renderer-v2.test.tsx` — section gradient emit + block/section
  glow box-shadow + byte-identity (L02).
- The existing page-document model round-trip suite (grep `normalizePageDocument` /
  `page-document-v2` under `tests/vitest/pages/`) — glow round-trip / reject-unknown /
  fail-soft (L02).
- A control-registry model test — glow controls present + gradient option (L03).

## Test matrix

### Sanitizer (L01) — `page-authoring-sanitizers.test.ts` (Vitest, ADDITIVE coverage)
- ACCEPT (new): reference `.cta-card` two-layer (radial glow over linear); a color+gradient
  two-layer; all pre-531 single-layer values still accepted byte-identically.
- REJECT (→ `null`, new): trailing `url(//evil/beacon)` layer; `image-set(`/`element(`/`image(`/
  `cross-fade(` layer; `javascript:`/`data:text/html`; `@import`; `expression(`; 7+ layers
  (over `PAGE_BG_MAX_LAYERS`); a non-color/non-gradient layer.
- Paren-integrity: comma inside `radial-gradient(circle, a, b)` NOT split.
- Idempotent on the accept corpus.
- The pre-existing `url(javascript:...)`→null (`:70`) and `...</style>`→null (`:71`)
  assertions STAY green unchanged (charset/tripwire) — do NOT re-baseline them.

### Security regression gate (L01) — `page-document-v2.test.ts:2282-2304` (Vitest, CONFIRM green — do NOT edit)
- The real pre-531 multi-layer / url()-layer rejection contract (TASK-523 outbound-beacon:
  `linear-gradient(red,blue), url(//evil.com/beacon.png)` etc.; url()-nested-in-gradient)
  MUST STAY REJECTED post-531 — every case contains `url()`, caught by the whole-value
  tripwire + per-layer allowlist. This suite is the security gate for the relaxation; it is
  CONFIRMED green here, not re-baselined.

### Model (L02) — page-document round-trip suite (Vitest)
- Round-trip glow on block AND section; unset glow omits the key (present-only).
- Reject-unknown: `style.glow.wobble` → `PageDocumentError`; JSON schema
  `additionalProperties:false` rejects it.
- Fail-soft: bad `glow.color` → glow omitted; `glow.blur:9999`→120; `glow.spread:-999`→-40;
  offsets clamp to ±80; missing `color` → omitted.
- Byte-identity: a doc with no glow / no multi-layer / no section-gradient normalizes
  identical to post-530.

### Render (L02) — `page-renderer-v2.test.tsx` (Vitest)
- `composeGlowBoxShadow` exact string; `mergeShadows` enum+glow comma-join.
- Block with glow → merged boxShadow; section with glow → merged boxShadow on the section
  (and bleed) box.
- SECTION `backgroundType:"gradient"` → gradient `backgroundImage` (single AND MULTI-LAYER —
  MUST assert the reference `.cta-card` two-layer value survives to `backgroundImage`, i.e.
  the relaxed `toGradientBackground` re-gate does NOT drop it; a pre-relax `toGradientBackground`
  would return `undefined` here, so this assertion is the render-side gate for the fix);
  full-bleed section gradient bleeds on the bleed box; switching to `color`/`image` restores.
- Block gradient path (`:738`) still emits for single-layer (regression guard — call site
  unchanged) AND now emits for MULTI-LAYER (assert the same two-layer value paints on a
  block, proving the shared `toGradientBackground` relax reaches the block target too).
- No-effect doc → rendered style byte-identical to post-530.

### Controls (L03) — `page-editor-control-registry.test.ts` (Vitest)
- 5 section + 5 block glow controls present with correct `path`/`clamp`/`input`.
- `backgroundType` control still lists `"gradient"` for both targets.
- **Owned breaking-test edit (land with the L03 control append):** the two HARDCODED
  path Sets in this suite — `validSectionPaths` (`:78-103`) and `validBlockPaths`
  (`:105-150`) — gain the five `style.glow.*` entries each (`style.glow.color`,
  `.blur`, `.spread`, `.x`, `.y`), so the "universal … controls use schema-owned array
  paths" tests (`:216` section, `:266` block) that run `expectControlPath` (`:219`/`:269`)
  over EVERY universal control stay green. Without this the two tests FAIL (the ten new
  glow paths are not members of the frozen Sets). The self-referential map-based
  assertions (`:347`/`:360`/`:945`/`:1048`/`:1120`) are safe and need no edit.

## Security note

The sanitizer accept/reject corpus IS the security regression gate for the one new attack
surface (multi-layer relaxation) — it MUST keep asserting that `url()`/`javascript:`/
`data:text/html`/`expression`/`@import`/over-cap reject. The pre-existing multi-layer
url()-layer rejection contract already lives in `page-document-v2.test.ts:2282-2304`
(TASK-523 beacon suite) and MUST STAY GREEN (all `url()`-bearing ⇒ still rejected) — that
suite is CONFIRMED, not edited. New safe-multi-layer ACCEPT + additional REJECT cases are
ADDED to `page-authoring-sanitizers.test.ts`. The model tests assert glow's reject-unknown
+ fail-soft-color posture. No test weakens a security assertion; the intended contract
change (safe multi-layer accept) is new additive coverage, not a re-baseline of an existing
assertion (there is no safe-multi-layer rejection to re-baseline).

## Hard Invariants

1. All lanes Vitest (pure model/render/registry); behavioral runtime = the closure smoke.
2. Every new key ships a round-trip assertion; the sanitizer ships an explicit
   accept/reject corpus; no security assertion weakened.
3. Byte-identity assertion for a no-effect document vs post-530.
