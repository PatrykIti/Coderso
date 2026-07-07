# TASK-521-01-L02: Page-Settings Effects Model (`settings.effects`)

# FileName: TASK-521-01-L02-Page-Settings-Effects-Model.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-01
**Priority:** High
**Category:** Schema (JSON model)
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the page-settings region of
`core/services/pages/pageDocumentV2.ts`: the `PageDocumentSettingsV2` type
(`:346-360`), `normalizeSettings` (`:1990-2011`), and the `settings` block of
`pageDocumentV2JsonSchema` (`:1364-…`). Adds the present-only `effects?`
sub-object + its dedicated `normalizeEffects` sub-normalizer. Disjoint from L01
(section style) and L03 (block types).

## Grounded anchors

`PageDocumentSettingsV2` `:346-360` (`template`, `showInNav`, `revisionRetention?`,
`collectionLink?`, `menuAppearance?`) — `menuAppearance?` (`:359`) is the exact
present-only additive-sub-object precedent (its sub-normalizer
`normalizeSettingsMenuAppearance` `:1970`, spread `...(menuAppearance !== undefined
? { menuAppearance } : {})` `:2009`). `normalizeSettings` `:1990` with
`assertKnownKeys(input, ["template","showInNav","revisionRetention","collectionLink","menuAppearance"], "settings", mode)`
(`:1992-1997`); `settings` JSON schema `:1364-1366` (`additionalProperties:false`).
Helpers `readBoolean` (`:1546`), `readNumber` (`:1549`), `readSafeColor` (`:1516`),
`requireRecord` (`:1643`).

## Implementation pseudocode

```ts
// (1) Shared clamp (top-of-file const region):
export const PAGE_SPOTLIGHT_SIZE_CLAMP = { min: 120, max: 900 } as const;

// (2) Types:
export type PageEffectsV2 = {
  cursorSpotlight?: boolean;   // enable cursor-follow radial spotlight (present-only)
  spotlightColor?: string;     // readSafeColor (alpha OK via TASK-519)
  spotlightSize?: number;      // 120..900 px radius
};
export type PageDocumentSettingsV2 = { /* …existing… */ effects?: PageEffectsV2; };

// (3) Dedicated sub-normalizer (mirror normalizeSettingsMenuAppearance:1970):
const PAGE_EFFECTS_KEYS = ["cursorSpotlight","spotlightColor","spotlightSize"] as const;
const normalizeEffects = (value: unknown, mode: NormalizeMode): PageEffectsV2 | undefined => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, "settings.effects", mode);
  assertKnownKeys(input, PAGE_EFFECTS_KEYS, "settings.effects", mode);
  const result: PageEffectsV2 = {};
  if (input.cursorSpotlight !== undefined)
    result.cursorSpotlight = readBoolean(input.cursorSpotlight, false);
  if (input.spotlightColor !== undefined)
    result.spotlightColor = readSafeColor(input.spotlightColor, "var(--primary)");
  if (input.spotlightSize !== undefined)
    result.spotlightSize = readNumber(input.spotlightSize, 400,
      PAGE_SPOTLIGHT_SIZE_CLAMP.min, PAGE_SPOTLIGHT_SIZE_CLAMP.max);
  // present-only: return undefined if nothing meaningful was set OR spotlight off with no styling
  return Object.keys(result).length ? result : undefined;
};

// (4) In normalizeSettings — extend allowlist + wire:
assertKnownKeys(input,
  ["template","showInNav","revisionRetention","collectionLink","menuAppearance","effects"],
  "settings", mode);
const effects = normalizeEffects(input.effects, mode);
return {
  template: readText(input.template, defaultSettings.template),
  showInNav: readBoolean(input.showInNav, defaultSettings.showInNav),
  ...(revisionRetention !== undefined ? { revisionRetention } : {}),
  ...(collectionLink ? { collectionLink } : {}),
  ...(menuAppearance !== undefined ? { menuAppearance } : {}),
  ...(effects !== undefined ? { effects } : {}),   // present-only
};
```

## JSON-schema mirror

In the `settings` schema object (`:1364`), add:
```jsonc
effects: {
  type: "object", additionalProperties: false,
  properties: {
    cursorSpotlight: { type: "boolean" },
    spotlightColor:  { type: "string" },
    spotlightSize:   { type: "number", minimum: 120, maximum: 900 },
  },
},
```

## Regression-test shape (delegated to L05, asserted here)

- Round-trip: `settings.effects = { cursorSpotlight:true, spotlightColor:"#0ea5e988", spotlightSize:420 }`
  survives normalize→serialize→normalize identically; an empty `effects:{}` → omitted
  (present-only); `spotlightColor:"url(x)"` → falls back to `var(--primary)`;
  `spotlightSize:99999` → clamped to 900; unknown key `settings.effects.glow` throws;
  a legacy `settings` (no `effects`) is byte-identical.

## Hard Invariants

1. Present-only (`effects` omitted when empty; `defaultSettings` unchanged).
2. `readSafeColor` is the ONLY path for `spotlightColor` (no raw color to CSS).
3. Allowlist + JSON-schema updated in lockstep; unknown key rejects; bad value
   fails soft.
