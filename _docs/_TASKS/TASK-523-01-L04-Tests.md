# TASK-523-01-L04: Page-Background Tests (round-trip / reject-unknown / gradient-safe / injection / byte-identity)

# FileName: TASK-523-01-L04-Tests.md

**Parent Task:** TASK-523
**Parent Subtask:** TASK-523-01
**Priority:** High
**Category:** Tests
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Regression tests for the page-background model (L01), root emit
(L02), and panel control (L03). Per `_docs/TESTING_STRATEGY.md` and the live layout,
model round-trips + page-shell `renderToString` assertions live in **Vitest**
(`tests/vitest/pages/*`); the admin panel goes in the Vitest `tests/vitest/admin`
lane (`tests/unit/pages/` is reserved for Bun DB/service + the Ajv
`validation.test.ts`).

## Test shape

**Vitest — `tests/vitest/pages/page-document-v2.test.ts`** (extend; model
normalize/round-trip):

```ts
it("settings.background: solid color round-trips (normalize→serialize→normalize)", () => {}); // "#0ea5e9"
it("settings.background: safe gradient round-trips verbatim", () => {}); // "linear-gradient(120deg,#0ea5e9,#a855f7)"
it("settings.background: unknown sibling key rejects (assertKnownKeys, strict mode)", () => {}); // settings.canvas throws
it("settings.background: injection-shaped value fails soft ⇒ key omitted", () => {}); // "red;}body{display:none" → dropped
it("settings.background: bare url()/expression() rejected ⇒ key omitted", () => {}); // bare "url(...)"/"expression(...)" → sanitizeAuthoringCssBackground → null
it("settings.background: url() NESTED in a gradient survives as an inert malformed gradient (no throw, no breakout)", () => {}); // "radial-gradient(circle,url(//x))" PASSES isSafeAuthoringCssGradient (charset admits (,),/) — stored+rendered verbatim; assert NO ; { } < > : reaches CSS (no declaration/style breakout); browser discards the whole gradient (no fetch). Pins the known TASK-522 sanitizer property; sanitizer tightening is a follow-up, not a 523 change.
it("no settings.background ⇒ present-only omit; legacy/post-522 settings byte-identical", () => {}); // defaultSettings unchanged
```

**Vitest — `tests/unit/pages/validation.test.ts`** (the Ajv schema lane — extend):

```ts
it("Ajv: settings.background is a valid string property; unknown settings key rejected by additionalProperties:false", () => {});
```

**Vitest — `tests/vitest/pages/page-renderer-v2.test.tsx`** (extend; `renderToString`):

```ts
it("settings.background color ⇒ <Root> inline style carries background (overriding bg-white)", () => {});
it("settings.background gradient ⇒ <Root> style carries the gradient", () => {});
it("background + spotlight ON ⇒ style carries BOTH background and --spotlight-* (neither clobbered)", () => {});
it("no background + spotlight OFF ⇒ <Root> has NO inline style (byte-identical vs post-522)", () => {});
it("no background + spotlight ON ⇒ style carries ONLY --spotlight-* (no background key)", () => {});
it("directly-mutated bad background re-sanitized at render ⇒ no background in style", () => {}); // sanitizeAuthoringCssBackground → undefined
```

**Vitest — `tests/vitest/admin/pageSettingsPanel.test.tsx`** (extend; **line 1 MUST
be `// @vitest-environment happy-dom`**):

```ts
// @vitest-environment happy-dom
it("Page background control edits pageDocument.settings.background on the live draft (not a side-state)", () => {});
it("clearing Page background drops settings.background (present-only)", () => {});
it("Page background persists on a normal draft-save/publish (live draft), not only the explicit Save-settings button", () => {});
it("reload rehydrates the Page background control from settings.background", () => {});
```

## Regression coverage (asserts the parent invariants)

- **Round-trip + reject-unknown** — L01 allowlist + Ajv `additionalProperties:false`.
- **Gradient-safe** — a safe multi-stop gradient survives write + render verbatim.
- **Injection-rejected / fail-soft** — non-safe values dropped at write AND re-dropped
  at render (defence-in-depth); no raw string reaches CSS. NOTE: `url(...)` NESTED in a
  gradient shell (`radial-gradient(circle,url(//x))`) PASSES the sanitizer's gradient
  charset (a pre-existing TASK-522 property) and is stored+rendered verbatim as an
  INERT malformed gradient — pinned by its own test above (no throw, no
  `;`/`{`/`}`/`<`/`>`/`:` breakout; the browser discards it). The bare-`url(...)`
  reject remains exact. Sanitizer tightening is a parent follow-up, not a 523 change.
- **Byte-identity** — no-background docs (model) and no-background+spotlight-off
  `<Root>` (render) are byte-identical vs post-522; the `--spotlight-*` vars are never
  clobbered when both background and spotlight are present.
- **Live-draft persistence** — the panel writes the document draft, carried on every
  save/publish (not `handleSettingsSave`-only).

## Definition of done

Vitest page-background model + render + panel tests pass; regressions to present-only
byte-identity, the allowlist/schema reject-unknown, the sanitizer write+render fail-
soft, the `bg-white` override, or the live-draft persistence fail a test.
