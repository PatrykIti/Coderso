# TASK-523-01-L01: Page-Background Model + JSON Schema + Normalize Allowlist (`settings.background`)

# FileName: TASK-523-01-L01-Model-Schema-Normalize.md

**Parent Task:** TASK-523
**Parent Subtask:** TASK-523-01
**Priority:** High
**Category:** Schema (JSON model) / Security
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the page-settings region of
`core/services/pages/pageDocumentV2.ts`: the `PageDocumentSettingsV2` type
(`:464-484`), `normalizeSettings` (`:2349-2372`), and the `settings` block of the
JSON schema (`:1669-1674`). Adds the present-only sibling `background?: string`,
normalized ONLY via `sanitizeAuthoringCssBackground` (a safe color OR gradient,
`null` otherwise ⇒ key omitted). Disjoint from the `effects` and `menuAppearance`
sub-objects (untouched).

## Grounded anchors

`PageDocumentSettingsV2` (`:464-484`: `template`, `showInNav`, `revisionRetention?`,
`collectionLink?`, `menuAppearance?`, `effects?`) — `effects?` (`:483`) is the exact
present-only additive-key precedent. `defaultSettings` (`:740` = `{ template:
"page-v2", showInNav:true }`) — do NOT add `background` (present-only ⇒
byte-identical for legacy docs). `normalizeSettings` (`:2349`) with
`assertKnownKeys(input, ["template","showInNav","revisionRetention","collectionLink","menuAppearance","effects"], "settings", mode)`
(`:2351-2356`) + the return spread (`:2364-2371`, note the `...(effects !== undefined
? { effects } : {})` present-only pattern `:2370`). `settings` JSON schema (`:1669`,
`additionalProperties:false`, properties at `:1673-1674`). `sanitizeAuthoringCssBackground`
is ALREADY imported (`:22`) from `./pageAuthoringSanitizers`; it accepts a SAFE color
OR gradient and returns `null` otherwise. Two named wrappers ALREADY exist in this same
single-writer file: `readSafeBackground` (`:1855` = `sanitizeAuthoringCssBackground(value)
?? fallback`, used at `:2440` for section style) and `readOptionalSafeBackground` (`:1858`
= `undefined→undefined`, `null→null`, else `sanitizeAuthoringCssBackground(value)`, used at
`:2610` for block style). `readOptionalSafeBackground` is almost exactly the present-only
idiom we need. Note the one shape mismatch for our present-only-OMIT spread: our guard must
yield `undefined` (not `null`) so `...(background ? { background } : {})` omits the key.
`readOptionalSafeBackground` returns `null` for an explicit-null input (and for a rejected
value), which the `...(background ? …)` spread ALSO drops (`null` is falsy), so reusing it is
functionally correct and cleaner. The pseudocode below instead hand-rolls a local inline
guard that collapses to `undefined` for absent input purely to make the present-only
intent literal at the call site; either approach is acceptable — prefer reusing
`readOptionalSafeBackground` unless the explicit `undefined`-not-`null` shape is wanted.

## Implementation pseudocode

```ts
// (1) Type — add a present-only sibling to PageDocumentSettingsV2 (:464), directly
//     mirroring the `effects?` present-only key:
export type PageDocumentSettingsV2 = {
  template: string;
  showInNav: boolean;
  revisionRetention?: number;
  collectionLink?: PageCollectionLinkV2;
  menuAppearance?: MenuAppearance;
  effects?: PageEffectsV2;
  /**
   * TASK-523-01 per-page canvas background — a safe solid color OR CSS gradient.
   * Present-only: omitted when unset so `defaultSettings` and legacy/post-522
   * documents stay byte-identical. The ONLY path a value reaches this field is
   * `sanitizeAuthoringCssBackground` (safe color/gradient, else the key is dropped),
   * mirrored at RENDER (523-01-L02) — no raw string is ever stored or rendered.
   */
  background?: string;
};

// (2) normalizeSettings (:2349) — extend the allowlist (:2351) + normalize
//     present-only. `sanitizeAuthoringCssBackground` returns a SAFE color/gradient
//     or `null`; drop the key when null/absent (spread pattern, like `effects` :2370):
assertKnownKeys(
  input,
  ["template","showInNav","revisionRetention","collectionLink","menuAppearance","effects","background"],
  "settings",
  mode
);
// …existing collectionLink / revisionRetention / menuAppearance / effects reads…
const background =
  input.background === undefined ? undefined : sanitizeAuthoringCssBackground(input.background);
return {
  template: readText(input.template, defaultSettings.template),
  showInNav: readBoolean(input.showInNav, defaultSettings.showInNav),
  ...(revisionRetention !== undefined ? { revisionRetention } : {}),
  ...(collectionLink ? { collectionLink } : {}),
  ...(menuAppearance !== undefined ? { menuAppearance } : {}),
  ...(effects !== undefined ? { effects } : {}),
  ...(background ? { background } : {}),   // present-only: null/absent ⇒ omitted
};
```

## JSON-schema mirror

In the `settings` schema object (`:1669`, alongside `template`/`showInNav` `:1673-1674`),
add:
```jsonc
background: { type: "string" },
```
(A plain `string` type at the schema layer — deep color/gradient validation is owned
by `sanitizeAuthoringCssBackground` in `normalizeSettings`, exactly as
`menuAppearance`'s deep validation is owned by `normalizeMenuAppearance` while its
schema mirrors only the shape. `additionalProperties:false` at `:1671` still rejects
any key not in the allowlist.)

## Security

Colors/gradients reach `settings.background` ONLY through
`sanitizeAuthoringCssBackground` (write). A value that is not a safe color/gradient
(e.g. a BARE `url(x)`, `expression(...)`, a `;`-delimited injection, a `</style>`
breakout) returns `null` ⇒ the key is OMITTED (fail-soft, present-only). The render
boundary (523-01-L02) re-sanitizes the SAME way (defence-in-depth), so even a
directly-mutated stored value cannot inject CSS. No raw string reaches a CSS
declaration. This is the identical write+render discipline used for section/block
backgrounds (`pageRendererV2.tsx:347`) and the spotlight color (521-05-L03).

**Known sanitizer property (do NOT over-claim `url(...)` always → `null`).** The
`url(...)` reject is exact for the BARE-color path and a bare top-level `url(...)`
value, but NOT for `url(...)` NESTED inside a gradient shell. `isSafeAuthoringCssGradient`
(`pageAuthoringSanitizers.ts:59-60`) gates gradients on a charset regex
`gradientCharsetPattern = /^(?:linear|radial|conic)-gradient\([0-9a-z #%,.()/\s-]*\)$/i`
plus balanced parens only — and that charset includes `(`, `)`, and `/` (and excludes
`:`), so `radial-gradient(circle,url(//evil.example/x))` and
`radial-gradient(circle,url(/a/b.png))` PASS sanitization and are stored + emitted
verbatim into the inline `style.background`. This is a PRE-EXISTING TASK-522
`sanitizeAuthoringCssBackground` property that 523 newly exposes on the page canvas;
523's L01 does NOT (and must not — single-writer scope is `pageDocumentV2.ts`, not the
sanitizer file) tighten it. **Why this stays MEDIUM (not an active exploit):** the
charset excludes `;`, `{`, `}`, `<`, `>`, `:` — so no declaration/`</style>`/CSS
breakout is possible — AND CSS `linear/radial/conic-gradient()` does not accept `url()`
as a valid argument, so a conforming browser discards the whole malformed gradient and
paints nothing (no network fetch, no injection). The residual is a latent
parser-quirk / future-CSS surface, not an active injection. **Contract obligation:**
L04 pins this behavior with a regression (`settings.background =
"radial-gradient(circle,url(//x))"` survives write+render as an inert malformed
gradient — no throw, no breakout) so the property is documented, not silently relied
on; the sanitizer tightening (reject any `url(` / `image-set(` / `element(` substring
in `isSafeAuthoringCssGradient`) is filed as a follow-up in the parent (out of 523's
single-writer scope) rather than widening L01's blast radius.

## Vitest test lane

`tests/vitest/pages/page-document-v2.test.ts` (model round-trip lane — NOT
`tests/unit/pages/`, which is reserved for Bun DB/service + the Ajv
`validation.test.ts`). Delegated to 523-01-L04; asserted here.

## Regression-test shape (delegated to L04, asserted here)

- Round-trip: `settings.background = "#0ea5e9"` and a gradient
  `"linear-gradient(120deg,#0ea5e9,#a855f7)"` each survive normalize→serialize→
  normalize identically.
- Reject-unknown: an unknown `settings` key (e.g. `settings.canvas`) throws via
  `assertKnownKeys` (strict) / drops (sanitize); Ajv rejects it via
  `additionalProperties:false`.
- Gradient-safe: a safe multi-stop gradient is preserved verbatim.
- Injection-rejected / fail-soft: `settings.background = "red;} body{display:none"` /
  bare `"url(javascript:alert(1))"` / `"expression(alert(1))"` → sanitizer returns
  `null` ⇒ the `background` key is OMITTED (not stored, no throw in lenient read mode).
- Gradient-nested-`url()` property (known sanitizer behavior, pinned so it is not
  silently relied on): `settings.background = "radial-gradient(circle,url(//x))"`
  PASSES `isSafeAuthoringCssGradient` (charset admits `(`/`)`/`/`) and is stored +
  round-trips as an inert MALFORMED gradient — assert it does NOT throw and does NOT
  break out (no `;`/`{`/`}`/`<`/`>`/`:` reaches CSS); a conforming browser discards
  the whole gradient (no fetch, no injection). The sanitizer-file tightening is a
  follow-up (see parent), not an L01 change.
- Present-only byte-identity: a legacy/post-522 `settings` with NO `background`
  normalizes to a byte-identical object (no `background` key materialized;
  `defaultSettings` unchanged).

## Hard Invariants

1. Present-only (`background` omitted when unset/rejected; `defaultSettings`
   unchanged ⇒ byte-identical legacy/post-522 docs).
2. `sanitizeAuthoringCssBackground` is the ONLY path for `background` (no raw
   color/gradient to CSS); mirrored at render (523-01-L02).
3. Allowlist + JSON schema updated in lockstep; unknown key rejects; bad value fails
   soft (key dropped).
4. No `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), no migration, no dep.
