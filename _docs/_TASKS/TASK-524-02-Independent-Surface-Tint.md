# TASK-524-02: Independent Surface Tint (Decouple Glass Glow From `block.background`)

# FileName: TASK-524-02-Independent-Surface-Tint.md

**Parent Task:** TASK-524
**Priority:** High
**Category:** Content (Pages) / Site Render / Admin UI / Schema (JSON model) / Security
**Estimated Effort:** Medium
**Status:** ⏳ To Do
**Depends on:** TASK-524-01 (co-location — so the seeded tint reaches the animating
surface node).

---

## Scope

Add a present-only `PageBlockStyleV2 surfaceTint?: string` (alpha-capable, via
`sanitizeAuthoringCssColor`) that lets an author set the glass/glow tint
INDEPENDENTLY of `block.background`. In `resolveBlockCompositionAttrs` the tint
seeds `--surface-glow`/`--deco-ring`/`--orb-color` FIRST; the 522 background-derived
value stays a FALLBACK only when no `surfaceTint` is authored. Add a "Surface tint"
control to `pageUniversalBlockControls` mirroring an existing alpha color control.

## Leaves

- **524-02-L01** — model + allowlist + JSON schema + normalizer
  (`pageDocumentV2.ts`).
- **524-02-L02** — resolver uses `surfaceTint` (background fallback)
  (`pageCompositionEffects.tsx` `resolveBlockCompositionAttrs` — DISJOINT from
  524-01's CSS-string edit).
- **524-02-L03** — "Surface tint" control
  (`pageEditorControlRegistry.ts` `pageUniversalBlockControls`).
- **524-02-L04** — tests (round-trip / reject-unknown / present-only / resolver
  precedence).

## Hard Invariants (subtask)

1. `surfaceTint` is present-only (omitted when unset — never `null`/`""`); joins the
   reject-unknown allowlist + JSON schema + a round-trip test in lockstep.
2. Color ONLY via `sanitizeAuthoringCssColor` at write; render reads the sanitized
   value.
3. Resolver precedence: `surfaceTint` seeds the glow when present; else the 522
   plain-color-background fallback (byte-identical to 522 when no `surfaceTint`).
4. No migration, no schemaVersion bump, no dependency.

## Definition of done

`surfaceTint` sets the glass glow independently of `block.background`, persists,
round-trips (incl. alpha), rejects unknown keys, fails soft on a bad color; the
resolver seeds the glow from `surfaceTint` with background as fallback; the control
authors it; gates green; no-`surfaceTint` docs byte-identical to 522.
</content>
