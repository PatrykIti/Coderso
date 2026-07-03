# TASK-508-01: Menu Model — Link Align, Unified Submenu Direction & Accordion Mode

# FileName: TASK-508-01-Menu-Model-Align-Direction-Accordion.md

**Parent Task:** TASK-508
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Model Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-499 (menuDocumentV2 model + `MenuDocumentError` reject-unknown), TASK-501 (per-device `responsive.{tablet,mobile}`), TASK-504 (`NavLevelStyle`/`NavLevelStyles` per-nesting-level styling, level 1/2 numeric ranges), TASK-506 (`NavChromeStyle` level-0 sub-record + its full parallel allowlist/enum/defaults family, `resolveMenuControlDefault{value,sourceLabel}`, `flyoutAnimation`/`submenuPlacement`/`containerPaddingX/Y`/`minWidth`), TASK-507 (`ControlDefaultHint` `value===undefined ⇒ null` guard — so a hint needs a REAL resolved value to display).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**508-01 is the SOLE WRITER of `core/services/menus/menuDocumentV2.ts`.** It is the model
keystone: it lands the type fields, enum partitions, reject-unknown allowlist entries,
default-hint entries, and the R1(a) resolver fix. **Nothing renders these yet** — CSS
emission (508-02), front/preview parity (508-03), and editor controls (508-04) all consume
this file and MUST land in the strict order below. This subtask makes ZERO edits to
`menuDocumentCss.ts`, `siteShell.tsx`, `MenuDesignEditor.tsx` (source), or `siteShellCss.ts`.
**In-scope caveat:** editing the editor _TEST_ file `tests/vitest/ui/menu-design-editor.test.tsx`
IS part of 508-01 — the R1(a) resolver change (`containerPaddingX/Y` no longer `undefined`) makes
`ControlDefaultHint` legitimately render a hint where a pre-existing test asserts it hidden, so
that render-test assertion is AMENDED here (no `MenuDesignEditor.tsx` SOURCE edit). See
"Pre-existing test amendments" below.

**Land order (strictly sequential — this subtask lands green FIRST):**
508-01 (model, this file) → 508-02 (CSS) → 508-03 (front/preview) → 508-04 (editor) →
508-05 (tests/docs/closure). 508-02/03/04 all depend on 508-01's exported types + consts +
allowlists; the `NAV_LEVEL_STYLE_COMPARE_KEYS` `linkAlign` compare-key addition lives in
`menuDocumentCss.ts` and is therefore **508-02's** job — its absence is a per-device
silent-drop, so 508-01's round-trip tests do NOT cover the `linkAlign` delta (508-02/508-05
do). `submenuDirection`/`submenuMode` are **base-only** structural keys and are NOT added to
`NAV_CHROME_COMPARE_KEYS` (no tablet-delta emitter — a per-device override would be dead
data); they emit only from `baseNavChrome`.

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** The document rides the existing validated `PATCH /menus/:id`
`document` envelope (`menus.settings` freeform jsonb). No new endpoint, RBAC bucket, or
method; **NO migration; NO `MENU_DOCUMENT_SCHEMA_VERSION` bump** (`menuDocumentV2.ts:91`
stays `1`). Every new field's normalizer lives in this file: unknown KEYS throw
machine-readable `MenuDocumentError` (`menu_document_invalid` + offending `path`); bad VALUES
fail-soft (OMITTED via the shared enum normalizer, matching the file's value policy — raw
stored input never reaches CSS). The stored-read normalizer stays fail-closed: each new key
added to a reject-unknown allowlist is a **fail-closed READ TRAP** — a forgotten allowlist
entry silently degrades EVERY stored doc carrying that key to empty on read ⇒ each addition
carries a round-trip persistence test. Legacy docs WITHOUT the new fields parse
byte-unchanged. The R1(a) resolver fix changes ONLY the hint/thumb, never emission or stored
shape.

---

## What this subtask ships (grounded, anchors verified fresh 2026-07-03)

Verified anchors in `core/services/menus/menuDocumentV2.ts` (2479 lines):
`MENU_DOCUMENT_SCHEMA_VERSION` @91; `NavLevelStyle` type @172-212 (`submenuPlacement` @211);
`NavChromeStyle` type @222-242; `NAV_LEVEL_STYLE_KEYS` @638-673; `NAV_LEVEL_NUMBER_RANGES`
(`minWidth {80,480}` @693); `SUBMENU_PLACEMENTS` @707; `NAV_CHROME_DEFAULTS` @731-741;
`MENU_SHELL_DEFAULT_LINK_*` consts @748-751; `NAV_LEVEL_STYLE_ENUM_FIELDS` @850-855
(`["submenuPlacement", SUBMENU_PLACEMENTS]` @854); `normalizeNavLevelStyle` enum loop @886;
`NAV_CHROME_KEYS` @923-941; `NAV_CHROME_ENUM_FIELDS` @952-955; `normalizeNavChrome` enum loop
@985; `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS` @2205-2211; `resolveNavKeyThemeDefault`
@2241-2277 (terminal `{value:undefined, sourceLabel:"Not set"}` @2276; "Not applied" branch
@2264-2265; `NAV_CHROME_DEFAULTS` branch @2266-2269); `resolveMenuControlDefault` @2341-2393.

### R1(b) — `linkAlign` on `NavLevelStyle` (per-level dropdown text centering)

```ts
// NavLevelStyle (@172-212) — add ONE field (link-level; applies at every level via the
// descendant-anchored LEVEL_LINK_SELECTORS in 508-02). NOT a navChrome/level-0 field:
export type NavLevelStyle = {
  /* …existing fields @173-211… */
  linkAlign?: "left" | "center" | "right";   // text-align on the LINK; owner's "auto padding to center"
};

// New enum option array (fresh `as const`, sibling of SUBMENU_PLACEMENTS @707):
const NAV_LINK_ALIGNS = ["left", "center", "right"] as const;

// Allowlist + value partition (BOTH required — a key in *_KEYS handled by no partition is
// silently DROPPED per the comment @654-655):
//   NAV_LEVEL_STYLE_KEYS (@638-673): append "linkAlign"
//   NAV_LEVEL_STYLE_ENUM_FIELDS (@850-855): append ["linkAlign", NAV_LINK_ALIGNS]
// normalizeNavLevelStyle's enum loop (@886 `for (const [k, options] of NAV_LEVEL_STYLE_ENUM_FIELDS)`)
//   then validates it automatically (fail-soft OMIT on bad value). No new branch needed.
```

Hint: `linkAlign` is level-agnostic and needs a resolvable default so 508-04's
`ControlDefaultHint` renders (507 guard hides `value===undefined`). Two options — **pick
the `NAV_CHROME_DEFAULTS` route** for symmetry with the other B-bundle enums: add
`linkAlign: "left"` to `NAV_CHROME_DEFAULTS` (@731-741) so `resolveNavKeyThemeDefault`'s
`hasOwnProperty(NAV_CHROME_DEFAULTS, key)` branch (@2266-2269) returns
`{value:"left", sourceLabel:"Default (Left)"}` for levels 1/2 (that branch is level-agnostic
— it already serves `submenuPlacement`/`indicator` for the level table). No new branch in
`resolveNavKeyThemeDefault` needed; do NOT add `linkAlign` to `NAV_CHROME_KEYS` (level-0
top-bar centering is explicitly out of scope — deferred).

### R3a — nav-global `submenuDirection` on `NavChromeStyle`

```ts
// NavChromeStyle (@222-242) — nav-wide submenu direction governing EVERY flyout depth:
export type NavChromeStyle = {
  /* …existing 506 fields @223-242… */
  submenuDirection?: "right" | "down" | "up" | "left";  // level-1 first dropdown AND level-2/3+ nested
  submenuMode?: "flyout" | "accordion";                 // R3b — see below
};

const SUBMENU_DIRECTIONS = ["right", "down", "up", "left"] as const;

// Allowlist + partition + hint:
//   NAV_CHROME_KEYS (@923-941): append "submenuDirection"
//   NAV_CHROME_ENUM_FIELDS (@952-955): append ["submenuDirection", SUBMENU_DIRECTIONS]
//     (normalizeNavChrome enum loop @985 validates it → fail-soft OMIT on bad value)
//   NAV_CHROME_DEFAULTS (@731-741): submenuDirection: "down"
//     → resolveNavKeyThemeDefault hasOwnProperty branch (@2266) → {value:"down","Default (Down)"}
```

**Home rationale (navChrome, NOT `MenuAppearance`):** `NavChromeStyle` is explicitly "NOT a
`MenuAppearance` key set" (comment @215-221) with its OWN reject-unknown family. Keeping the
key out of `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS` means `buildSiteShellCss(null)` never
sees it ⇒ trivially byte-identical (HARD INVARIANT 2). It is genuinely menu-global (one
control governs all depths ⇒ "everything opens down" trivially), so a nav-global home is
coherent. **The default `"down"` is HINT-ONLY** — present-only emission means an unset
`submenuDirection` emits ZERO bytes (508-02), so `dropdownDirection` (level-1 top|bottom) +
per-level `submenuPlacement` (level-2 right|bottom|left) keep behaving EXACTLY as today
(byte-identity). The existing implicit behavior is split (first dropdown below, nested right);
the `"down"` default is only the *recommended* unified value surfaced in the editor hint.

### R3b — `submenuMode` on `NavChromeStyle`

```ts
// (declared above alongside submenuDirection)
const SUBMENU_MODES = ["flyout", "accordion"] as const;

// Allowlist + partition + hint:
//   NAV_CHROME_KEYS (@923-941): append "submenuMode"
//   NAV_CHROME_ENUM_FIELDS (@952-955): append ["submenuMode", SUBMENU_MODES]
//   NAV_CHROME_DEFAULTS (@731-741): submenuMode: "flyout"
//     → resolveNavKeyThemeDefault hasOwnProperty branch (@2266) → {value:"flyout","Default (Flyout)"}
```

Default `"flyout"` is HINT-ONLY / present-only: a doc with `submenuMode` unset OR
`==="flyout"` emits ZERO accordion bytes (508-02). Accordion is strictly opt-in.

### R1(a) — fix the misleading dropdown-container default hints (`minWidth`, `containerPaddingX/Y`)

```ts
// Base-sheet mirror consts (do NOT edit siteShellCss.ts; mirror its line 151
//   `.site-nav-sublist{…padding:6px;…min-width:180px}` — sibling of MENU_SHELL_DEFAULT_LINK_* @748-751):
export const MENU_SHELL_SUBLIST_MIN_WIDTH = 180 as const;   // .site-nav-sublist{min-width:180px}
export const MENU_SHELL_SUBLIST_PADDING   = 6   as const;   // .site-nav-sublist{padding:6px}

// 1) REMOVE containerPaddingX + containerPaddingY from MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS
//    (@2205-2211) so they no longer hit the "Not applied" branch (@2264-2265).
//    KEEP navPillRadius/navPillPaddingX/navPillPaddingY gated (the level-0 pill genuinely has
//    NO base-sheet default — only the sublist container does).
const MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS = [
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
] as const;

// 2) In resolveNavKeyThemeDefault (@2241-2277) add explicit branches BEFORE the terminal
//    "Not set" (@2276) — order them near the paddingX/paddingY/radius branches (@2247-2261):
  if (key === "minWidth")
    return { value: MENU_SHELL_SUBLIST_MIN_WIDTH, sourceLabel: `Default ${MENU_SHELL_SUBLIST_MIN_WIDTH}px` };
  if (key === "containerPaddingX" || key === "containerPaddingY")
    return { value: MENU_SHELL_SUBLIST_PADDING, sourceLabel: `Default ${MENU_SHELL_SUBLIST_PADDING}px` };
```

**Why truthful, not misleading:** the base sheet ALWAYS paints
`.site-nav-sublist{min-width:180px;padding:6px}` regardless of override
(`siteShellCss.ts:151`), so the effective unset value genuinely IS 180 / 6 — surfacing it is
honest. This changes ONLY the hint (`ControlDefaultHint`) and the slider-thumb fallback
(`MenuDesignEditor.tsx:1517` `resolved ?? providerValue ?? range.min`, level-2 walk unchanged
in `resolveMenuControlDefault` case-2 @2374). It does NOT change CSS emission:
`levelContainerDecls` (508-02, `menuDocumentCss.ts:732-751`) is present-only gated on
`s.minWidth != null` / `s.containerPaddingX != null` reading the STORED value, so no-override
docs stay byte-identical.

**Emission-nuance FLAG for 508-02 (NOT this subtask's edit):** `levelContainerDecls`
(`menuDocumentCss.ts:747-749`) completes an UNAUTHORED padding axis to `0` (`?? 0`), not 6 —
so once ONE axis is set, "Default 6px" is honest only for the fully-unset state. This subtask
keeps the fix **HINT-ONLY** (byte discipline); 508-02 decides whether to switch the `?? 0`
completion to `?? 6` (still no-override-byte-safe, but must be pinned in a golden test).
Recorded here so the resolver default and the emission fallback do not silently disagree.

---

## Error handling

- Structural (non-object level style / navChrome, unknown KEY) ⇒ throw `MenuDocumentError`
  with the exact `path` (existing `normalizeNavLevelStyle` @857-897 / `normalizeNavChrome`
  @966-995 throw sites — the new keys ride the SAME KEYS-allowlist reject-unknown guard;
  no new throw site).
- Bad VALUE (`linkAlign:"top"`, `submenuDirection:"sideways"`, `submenuMode:"drawer"`) ⇒
  fail-soft OMIT via the existing enum loop (`NAV_LEVEL_STYLE_ENUM_FIELDS` @886 /
  `NAV_CHROME_ENUM_FIELDS` @985) — the field is silently dropped, the rest of the record
  survives. Never throws on a bad value; raw input never reaches CSS.
- Empty record after normalization ⇒ prune to `undefined` (existing prune-empty behavior in
  `normalizeNavLevelStyle`/`normalizeNavChrome`), so a doc that only carried a bad value is
  byte-identical to one that never had it.

---

## Regression-test shape (this subtask's Vitest additions; full matrix in 508-05)

`tests/vitest/services/menu-document-v2.test.ts` (Bun-free, pure model):

1. **Fail-closed READ-trap round-trip per new key.** For each of `linkAlign` (on
   `levelStyles[1]` and `[2]`), `submenuDirection`, `submenuMode` (on `navChrome`):
   write a doc carrying the key → `normalizeMenuDocumentV2` → assert the re-read value
   EQUALS the input (a stored doc carrying the key SURVIVES read, not degraded to empty).
2. **Reject-unknown KEY throws.** An unknown key under `levelStyles[1]` / `navChrome`
   throws `MenuDocumentError` with the offending `path` (`isMenuDocumentError` true).
3. **Fail-soft VALUE OMIT.** `linkAlign:"top"` / `submenuDirection:"sideways"` /
   `submenuMode:"drawer"` are OMITTED (field absent post-normalize; sibling fields survive;
   no throw).
4. **R1(a) resolver values.** `resolveMenuControlDefault(section,"desktop",1,"minWidth")`
   (unset) ⇒ `{value:180, sourceLabel:"Default 180px"}`;
   `containerPaddingX`/`containerPaddingY` ⇒ `{value:6, sourceLabel:"Default 6px"}`; assert
   they are NO LONGER `"Not applied"`; assert `navPillRadius`/`navPillPaddingX`/
   `navPillPaddingY` STILL resolve `{value:undefined, sourceLabel:"Not applied"}` (stay gated).
5. **Hint entries for the new enums.** `resolveMenuControlDefault(...,0,"submenuDirection")`
   ⇒ `{value:"down", sourceLabel:"Default (Down)"}`; `...,"submenuMode"` ⇒
   `{value:"flyout", sourceLabel:"Default (Flyout)"}`; `...,1,"linkAlign"` ⇒
   `{value:"left", sourceLabel:"Default (Left)"}`.
6. **Byte-identity / prune-empty.** A legacy doc WITHOUT any new field normalizes
   byte-unchanged; a `navChrome` / `levelStyle` that carried ONLY a bad (omitted) new value
   prunes to `undefined` (identical to never-set).
7. **No schemaVersion bump.** `normalizeMenuDocumentV2` output `schemaVersion` stays `1`.

### Pre-existing test amendments (land in the SAME commit as the R1(a) resolver change)

The R1(a) resolver change (`containerPaddingX/Y` ⇒ `{value:6, sourceLabel:"Default 6px"}` +
their removal from `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`) DIRECTLY flips two assertions
that are green today. Because "508-01 lands green FIRST" (Land order above), these MUST be
amended in the same landing as the model change — otherwise an implementer who follows the
"new tests only, no editor touch" reading lands with 2 RED tests:

- **`tests/vitest/services/menu-document-v2.test.ts:2219-2222`** — the "GATED present-only
  numerics ⇒ … Off/Not applied" test asserts `containerPaddingX ⇒ {value:undefined,
  sourceLabel:"Not applied"}`. AMEND: MOVE the `containerPaddingX`/`containerPaddingY`
  assertion OUT of the GATED test and into case 4 above (they now resolve `{value:6,
  sourceLabel:"Default 6px"}`), leaving `navPillRadius`/`navPillPaddingX`/`navPillPaddingY`
  as the remaining GATED `"Not applied"` cases (Hard Invariant 5). `indicatorThickness`
  (`{value:undefined,"Off"}`) and the `itemDividerWidth != range.min` guard in that test stay.
- **`tests/vitest/ui/menu-design-editor.test.tsx:2069-2078`** — the "TASK-507 FIX B: gated
  present-only numerics render NO default hint when unset" loop asserts the level-1
  `containerPaddingX`/`containerPaddingY` hints are HIDDEN (`findHint===null`). AMEND: REMOVE
  `containerPaddingX`/`containerPaddingY` from that "hint must be hidden" loop (they now
  legitimately render `"Default 6px"`); keep `itemDividerWidth`/`indicatorThickness`/
  `transitionMs`/`hoverLift` in the loop. **508-01 ALSO authors (once, here) the POSITIVE
  assertion** that the level-1 container hints now render `"Default 6px"` (and level-1 `minWidth`
  renders `"Default 180px"`) — this is the SOLE owner of the R1(a) hint-region test edits in
  `menu-design-editor.test.tsx`; 508-04 does NOT re-author it (avoids a duplicate). This is a
  TEST-file edit only — `MenuDesignEditor.tsx` SOURCE stays untouched (508-04 owns the source
  comment @593-598, which 508-01 does not touch).

The `minWidth` half of R1(a) breaks nothing (no pre-existing resolver assertion pins level-1
`minWidth` to `"Not set"`/`"Not applied"`); only the two above need amending.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure model):** the 7 cases above in
`tests/vitest/services/menu-document-v2.test.ts` (per-key round-trip, reject-unknown throw,
fail-soft OMIT, R1(a) resolver values incl. the still-gated pill negatives, new-enum hint
entries, prune-empty legacy byte-identity, `schemaVersion===1`).

**Bun lane (route/runtime — asserted at 508-05 but this subtask's write path is the target):**
`tests/integration/routes/menus.test.ts` — a `document` PATCH carrying `linkAlign` /
`submenuDirection` / `submenuMode` persists per-key without dropping siblings; an invalid
payload 4xx's with `menu_document_invalid` + `path`.

**Byte-identity guards (unchanged by this subtask; asserted at 508-02/03/05):**
`tests/unit/pages/siteShellCss.test.ts` ZERO edits (`siteShellCss.ts` untouched — only its
`180`/`6` consts MIRRORED); `tests/unit/site/menu-document-render.test.tsx` no-override
byte-identity (present-only emission ⇒ zero new bytes when unauthored).

> The ≥5-scenario SMOKE (owner mandate — perceptible flyout motion, "down everywhere"
> cohesive column, accordion cohesive block, centered dropdown text + correct 180/6 default
> hints, cross-device + publish→front parity) is authored in **508-05**, not here (508-01
> ships no renderer). This subtask's Named guards feed it: fail-closed READ-trap round-trip
> per new key (byte-identity on re-read); reject-unknown throw; fail-soft OMIT; R1(a)
> hint/thumb 180/6 (never `range.min`); `NAV_CHROME_DEFAULTS` hint entries; NO `schemaVersion`
> bump; new keys stay OUT of `MenuAppearance` so `buildSiteShellCss(null)` is byte-identical.

---

## Hard Invariants (owned by this subtask)

1. **Fail-closed READ-trap.** Each new key joins its reject-unknown allowlist
   (`linkAlign`→`NAV_LEVEL_STYLE_KEYS`; `submenuDirection`/`submenuMode`→`NAV_CHROME_KEYS`)
   AND exactly ONE value partition (`NAV_LEVEL_STYLE_ENUM_FIELDS` / `NAV_CHROME_ENUM_FIELDS`)
   AND a `NAV_CHROME_DEFAULTS` hint entry — with a round-trip persistence test each. A key in
   `*_KEYS` with no partition is silently dropped (comment @654-655).
2. **`buildSiteShellCss(null)` byte-identical.** All new keys stay OUT of `MenuAppearance` /
   `SHELL_APPEARANCE_DEFAULTS`; `siteShellCss.ts` untouched (only its `180`/`6` consts
   mirrored as `MENU_SHELL_SUBLIST_MIN_WIDTH` / `MENU_SHELL_SUBLIST_PADDING`).
3. **No-override docs byte-identical.** Present-only: the R1(a) fix changes only hint/thumb,
   not emission; new fields carry a resolution default only for the HINT
   (`NAV_CHROME_DEFAULTS`), never seeded into emission.
4. **NO `MENU_DOCUMENT_SCHEMA_VERSION` bump; NO route/RBAC/endpoint/migration.**
5. **Keep 504/505/506/507 intact** — `dropdownDirection`, the level-2-only `submenuPlacement`
   (`SUBMENU_PLACEMENTS` @707) and its "Not applied"/gated numerics stay; `navPillRadius`/
   `navPillPaddingX`/`navPillPaddingY` remain gated after `containerPaddingX/Y` are removed
   from the "Not applied" list.

**Deferred (state in 508-05 changelog residuals):** JS-driven flyout edge-collision/flip;
click-to-open; mega-menu multi-column; mobile drawer; per-level (not nav-global)
`submenuDirection`/`submenuMode`; level-0 top-bar link centering (`linkAlign` on navChrome).

---

## Documentation Updates Required (authored at 508-05 closure)

- `_docs/PAGE_MODEL.md` — `NavLevelStyle.linkAlign`; `NavChromeStyle.submenuDirection` /
  `submenuMode`; the base-sheet mirror consts + R1(a) default-hint fix.
- `_docs/CONTENT_TYPES_SPEC.md` — link alignment (per-device, per-level), unified submenu
  direction (all depths incl. `up`) + accordion inline mode (enums, present-only; both
  nav-global **base-only**, no per-device fork), corrected container hints.
- `_docs/_CHANGELOG/` — new entry, **next free number = 1217** (verified fresh 2026-07-03;
  highest present = 1216 `task-507`; verify again at closure).
- `_docs/_TASKS/README.md` — board + child rows / Statistics (owner-managed; do NOT edit here).
