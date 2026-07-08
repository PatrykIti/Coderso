# TASK-524-02-L04: `surfaceTint` Tests (Round-trip / Reject-unknown / Present-only / Resolver Precedence)

# FileName: TASK-524-02-L04-Surface-Tint-Tests.md

**Parent Task:** TASK-524
**Parent Subtask:** TASK-524-02
**Priority:** High
**Category:** Test / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Tests for the `surfaceTint` model (524-02-L01), resolver precedence (524-02-L02), and
control (524-02-L03): persistence round-trip (incl. alpha), reject-unknown allowlist,
present-only byte-identity, sanitize fail-soft, resolver precedence (tint wins /
background fallback / tint-no-background / no-tint byte-identical to 522), and the
control descriptor shape.

## Grounded anchors

- `tests/vitest/pages/page-document-v2.test.ts` (the normalize/round-trip suite the
  522 style fields use) — model tests.
- `tests/vitest/pages/page-composition-effects.test.ts` — resolver precedence.
- `tests/vitest/pages/page-editor-control-registry.test.ts` — control descriptor.
- `sanitizeAuthoringCssColor` behavior (accepts hex/hex8/rgba/hsl/var/transparent;
  rejects `expression(...)`/`url(javascript:...)`).

## Implementation pseudocode

```ts
// ── Model (page-document-v2.test.ts) ──────────────────────────────────────────
test("surfaceTint round-trips (incl. alpha hex8/rgba)", () => {
  const doc = normalize(mkDoc({ blockStyle: { surfaceTint: "rgba(142,232,255,.5)" } }));
  expect(getBlockStyle(doc).surfaceTint).toBe("rgba(142,232,255,.5)");
  const doc8 = normalize(mkDoc({ blockStyle: { surfaceTint: "#8ee8ff80" } }));
  expect(getBlockStyle(doc8).surfaceTint).toBe("#8ee8ff80");         // alpha preserved
});
test("surfaceTint present-only: omitted when unset → byte-identical to 522", () => {
  const doc = normalize(mkDoc({ blockStyle: { surfacePreset: "glass" } }));  // no tint
  expect("surfaceTint" in getBlockStyle(doc)).toBe(false);          // key ABSENT (not null/"")
});
test("surfaceTint fails soft on a bad color (omitted, no throw)", () => {
  const doc = normalize(mkDoc({ blockStyle: { surfaceTint: "expression(alert(1))" } }));
  expect("surfaceTint" in getBlockStyle(doc)).toBe(false);          // sanitize → undefined → omit
  const doc2 = normalize(mkDoc({ blockStyle: { surfaceTint: "url(javascript:alert(1))" } }));
  expect("surfaceTint" in getBlockStyle(doc2)).toBe(false);
});
test("unknown block-style key still rejects (allowlist intact)", () => {
  expect(() => normalize(mkDoc({ blockStyle: { wobble: 1 } }), { mode: "write" }))
    .toThrow(/PageDocumentError|unknown/i);
});
test("surfaceTint is in the block-style JSON schema (additionalProperties:false honored)", () => {
  // a doc with surfaceTint validates; the schema property exists.
  expect(validateAgainstSchema(mkDoc({ blockStyle: { surfaceTint: "#8ee8ff" } }))).toBe(true);
});

// ── Resolver precedence (page-composition-effects.test.ts) ────────────────────
test("surfaceTint wins over background for the glow", () => {
  const v = resolveBlockCompositionAttrs({ surfacePreset: "glass",
    background: "#123456", surfaceTint: "rgba(142,232,255,.5)" }).cssVars;
  expect(v["--surface-glow"]).toBe("rgba(142,232,255,.5)");         // tint, NOT #123456
  expect(v["--deco-ring"]).toBe("rgba(142,232,255,.5)");
  expect(v["--orb-color"]).toBe("rgba(142,232,255,.5)");
});
test("three different-background chips + same surfaceTint → identical glow", () => {
  const glow = (bg: string) => resolveBlockCompositionAttrs({ surfacePreset:"glass",
    background: bg, surfaceTint: "rgba(142,232,255,.5)" }).cssVars["--surface-glow"];
  expect(glow("#8ee8ff")).toBe(glow("#adffd8"));
  expect(glow("#adffd8")).toBe("rgba(142,232,255,.5)");
});
test("tint with no background still seeds the glow", () => {
  const v = resolveBlockCompositionAttrs({ surfacePreset:"glass",
    surfaceTint: "#8ee8ff" }).cssVars;
  expect(v["--surface-glow"]).toBe("#8ee8ff");
});
test("no surfaceTint → 522 background-derived glow (byte-identical)", () => {
  const v = resolveBlockCompositionAttrs({ surfacePreset:"glass", background:"#123456" }).cssVars;
  expect(v["--surface-glow"]).toBe("#123456");                       // unchanged 522 fallback
});
test("bare surfaceTint with no surface/hover/glow-deco emits no glow vars (needsGlow gate)", () => {
  const v = resolveBlockCompositionAttrs({ surfaceTint: "#8ee8ff" }).cssVars;
  expect(v["--surface-glow"]).toBeUndefined();
});

// ── Control (page-editor-control-registry.test.ts) ────────────────────────────
test("pageUniversalBlockControls has a Surface tint alpha color control", () => {
  const c = pageUniversalBlockControls.find((x) => x.id === "block.surface.tint");
  expect(c).toBeTruthy();
  expect(c!.path).toEqual(["style","surfaceTint"]);
  expect(c!.input).toBe("color");
  expect(c!.target).toBe("block");
  expect(typeof c!.responsive).toBe("boolean");
});
```

## Security note

Covers the sanitize fail-soft negatives (`expression(...)`, `url(javascript:...)` →
omitted) + the reject-unknown allowlist trap + present-only byte-identity — the three
security invariants for `surfaceTint`. Asserts the stored doc round-trips with only
sanitized/omitted values.

## Vitest test lane

- `tests/vitest/pages/page-document-v2.test.ts`
- `tests/vitest/pages/page-composition-effects.test.ts`
- `tests/vitest/pages/page-editor-control-registry.test.ts`

## Regression / breaking-test ownership

- Additive tests only. Owns the expected `pageUniversalBlockControls`-length rebaseline
  if any test asserts an exact count (control added by 524-02-L03). No 522 behavior
  assertion changes (the no-`surfaceTint` path stays byte-identical to 522).

## Hard Invariants

1. Round-trip (alpha), reject-unknown, present-only byte-identity, sanitize fail-soft,
   resolver precedence, and control-shape are ALL asserted.
2. The no-`surfaceTint` case is asserted byte-identical to 522 (background fallback).
3. Test-only — no source edit here.
</content>
