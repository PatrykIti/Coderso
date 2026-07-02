# TASK-503-02: Screen Renderer — Style, Labels, Entry Chrome
# FileName: TASK-503-02-Screen-Renderer-Style-Labels-Entry-Chrome.md

**Priority:** High
**Category:** Admin UI / Custom Screens / Screen Runtime Renderer
**Estimated Effort:** Medium-Large
**Dependencies:** TASK-503-01 (`ScreenBlockStyleV1` on `ScreenBlockV1`, `screenBlockWidths` / `screenBlockAligns` / `screenImageRatios` enums, `SCREEN_BLOCK_MIN_HEIGHT_CLAMP`, EXPORTED `normalizeScreenImageSrc`), TASK-500 (insertion DnD + card drop targets), TASK-498 (builder graphical schema, presentation overrides)
**Status:** ✅ Done
**Completed:** 2026-07-02
**Parent Task:** TASK-503

---

## Overview

Renderer half of the TASK-503 polish set — everything that changes what
`core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx` (1606 lines) draws.
Six changes, one file:

1. **A (emission):** `wrap()` (`:570-661`) emits the new validated
   `block.style` (`ScreenBlockStyleV1` from 503-01) as inline box CSS +
   width/align class maps — ONE code path, so builder/preview/entry render the
   styling identically. Absent `style` key → byte-identical DOM to today.
2. **B (clearable labels):** field (`:779-782`, `<p>` `:793-795`) and stat
   (`:960`, `<p>` `:976-978`) switch from `readText(...) || fallback` (which
   makes an explicitly cleared `""` label indistinguishable from never-set) to
   explicit-string semantics; the label `<p>` renders only when non-empty. The
   divider label branch (`:1006-1008`) is the model and is already correct.
3. **C(i) (metadata gating):** new `showFieldMetadata?: boolean` prop (default
   `false`) gates the "Editable"/"Read"/"Unbound" badges (`:838-846`) and the
   uppercase field-type badge (`:851-855`) in ENTRY mode only. Preview keeps
   badges unconditionally; builder chrome is byte-identical to today.
4. **C(ii) (entry surface flatten):** entry-mode block wrapper
   (`:546-553`) becomes a single opaque `rounded-xl bg-card`; entry-mode
   section (`:1416-1423`) becomes `bg-transparent`. Builder + preview class
   strings stay BYTE-IDENTICAL (asserted).
5. **D (drag handle):** `draggable` + `onDragStart`/`onDragEnd` move off the
   wrapper card div (`:584-602`) onto the builder corner type Badge
   (`:648-653`, `data-screen-drag-handle`), so nested draggable children no
   longer shadow their container. ALL drop wiring (`onDragOver`/`onDrop`
   `:603-625`, gap/section/slot `dropHandlers` `:300-321`) stays where it is.
6. **E (ratio + src gate):** the image branch (`:1020-1062`) wires the
   `ratio` enum to an `aspect-*` class-map wrapper (dead prop today) and runs
   the exported `normalizeScreenImageSrc` on the authored static src at READ
   time, so an unsafe builder draft can never reach `<img src>` pre-save.

**Sole writer of `ScreenRuntimeRenderer.tsx`.** 503-03 threads
`showFieldMetadata` from the entry editor and fixes the inspector write path;
503-04 runs the closure smoke. This subtask lands after 503-01 (consumes its
types/constants) and before 503-03.

All line anchors below verified against `feature/visual` on 2026-07-02.
NOTE: this file reads as binary to `rg`/plain `grep` — use `grep -an` or Read.

---

## 1. Imports, prop, module-scope maps

```ts
// ScreenRuntimeRenderer.tsx imports (extend the existing schema import :9-13):
import type { CSSProperties, ... } from "react";
import {
  normalizeScreenImageSrc,                       // exported by 503-01
  type ScreenBlockStyleV1,
  type ScreenBlockV1, type ScreenDocumentV1, type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";

// ScreenRuntimeRendererProps (:27-69) gains:
  /**
   * TASK-503-02 C(i): entry-mode-only chrome gate for the binding badges
   * ("Editable"/"Read"/"Unbound") and the uppercase field-type badge.
   * DEFAULT OFF — a published entry view is clean unless the user opts in
   * (503-03 threads the per-user localStorage preference). Preview ALWAYS
   * shows the badges; builder chrome is untouched by this prop.
   */
  showFieldMetadata?: boolean;
// destructure (:252-278): showFieldMetadata = false,

// Module scope (next to presentationToneClassMap :131-143) — parent-normative maps:
const screenBlockWidthClass: Record<string, string> = {
  auto: "", full: "w-full", half: "w-1/2", third: "w-1/3", "two-thirds": "w-2/3",
};
const screenBlockAlignClass: Record<string, string> = {
  start: "mr-auto", center: "mx-auto", end: "ml-auto", stretch: "w-full",
};
const screenImageRatioClass: Record<string, string> = {
  "1/1": "aspect-square", "4/3": "aspect-[4/3]", "16/9": "aspect-video", "3/2": "aspect-[3/2]",
};

// Pure module-scope helper — inline box CSS from the VALIDATED style record.
// Values are already clamped ints (503-01 validator); the renderer still
// type-guards (typeof number) so a hand-crafted document can only ever emit
// numbers into style={} — never strings/raw input.
const screenBoxSides = ["top", "right", "bottom", "left"] as const;
const resolveScreenBlockBoxStyle = (
  style: ScreenBlockStyleV1 | undefined
): CSSProperties | undefined => {
  if (!style) return undefined;
  const out: CSSProperties = {};
  if (typeof style.minHeight === "number") out.minHeight = style.minHeight;
  for (const side of screenBoxSides) {
    const cap = side[0].toUpperCase() + side.slice(1);           // Top/Right/Bottom/Left
    const m = style.margin?.[side];
    if (typeof m === "number") (out as Record<string, number>)[`margin${cap}`] = m;
    const p = style.padding?.[side];
    if (typeof p === "number") (out as Record<string, number>)[`padding${cap}`] = p;
  }
  return Object.keys(out).length ? out : undefined;              // undefined = no style attr
};
```

## 2. A — `wrap()` style emission (`:533-661`)

Compute beside `wrapperClass` (`:533`), inside `renderBlock` so every kind
gets it; apply on the `wrap()` root div (`:570-573`):

```ts
const blockStyle = block.style;                                  // ScreenBlockStyleV1 | undefined
const widthClass = blockStyle?.width ? (screenBlockWidthClass[blockStyle.width] ?? "") : "";
// Determinism rule 1 (parent-normative): explicit horizontal margins WIN over
// the align preset — mx-auto etc. would lose to inline margin anyway, so the
// class is suppressed entirely (no inline-vs-class fight).
const hasHorizontalMargin =
  blockStyle?.margin?.left !== undefined || blockStyle?.margin?.right !== undefined;
// Determinism rule 2 (this file): a width preset WINS over align:"stretch" —
// "stretch" only emits w-full when no width class is present (two width
// utilities in one class list would resolve by stylesheet order, not intent).
const alignClass =
  blockStyle?.align && !hasHorizontalMargin
    ? blockStyle.align === "stretch"
      ? widthClass ? "" : "w-full"
      : (screenBlockAlignClass[blockStyle.align] ?? "")
    : "";
const boxStyle = resolveScreenBlockBoxStyle(blockStyle);

// wrap() root div (:571-573) — the ONLY emission point, shared by all 3 modes:
<div
  key={block.id}
  className={cn(wrapperClass, widthClass, alignClass)}
  style={boxStyle}
  ...
```

**Byte-stability guard (named): absent-style DOM identity.** When
`block.style` is undefined: `widthClass === ""`, `alignClass === ""`,
`boxStyle === undefined` → `cn(wrapperClass, "", "")` equals `wrapperClass`
and no `style` attribute is emitted — the rendered DOM is byte-identical to
today for every stored screen. Asserted in tests (§8).

**Align/width coupling (documented, not hidden — decision (a)).** The align
enum emits margin-auto classes (`start:mr-auto` / `center:mx-auto` /
`end:ml-auto`); a block wrapper at width `auto` or `full` fills its container,
so those auto-margins have ZERO visual effect unless a narrower width preset
(`half`/`third`/`two-thirds`) is also set. This task keeps the class-map
emission (it is correct and byte-stable) and SURFACES the coupling rather than
hiding it: align only takes visible effect with `width < full`.
- Renderer test (§8.2) exercises align-alone-with-width-`auto` to pin that the
  class IS emitted but produces no horizontal offset (documented no-op) — the
  emission model above stands on its own and this subtask's correctness does
  NOT depend on any downstream control-state change.
- 503-03 cross-reference (non-normative): the inspector renders Align as a
  plain, always-enabled enum (`503-03:398-412`, no width-coupled disable or
  hint); its only align logic is the `buildStylePatch` prune. This subtask
  places NO requirement on that control — it is recorded here only so the two
  files describe the same emission model. If the owner later wants to hide the
  `width ∈ {auto, full}` no-op from the user, that is a separate 503-03
  control-state follow-up, not a precondition of this renderer contract.

Error handling: unknown enum values cannot arrive from the save path (503-01
coerces), but a defensive map miss (`?? ""`) means a hand-edited document can
only degrade to "no class", never crash or emit raw text.

## 3. D — drag source moves to the corner type Badge

**Wrapper div (`:584-602`): DELETE** the `draggable` prop and the
`onDragStart`/`onDragEnd` handlers. **KEEP** `onDragOver`/`onDrop`
(card-midpoint drop targets, `:603-625`), `onClick`/`onKeyDown` select,
`role`/`tabIndex`, and all `data-*` attributes.

**Badge (`:648-653`, builder-only block `:646-658`): ADD** (Badge is a `span`
that spreads `...props` — verified `core/admin/components/ui/badge.tsx:31-45`):

```tsx
<Badge
  variant="outline"
  data-screen-drag-handle={canDrag ? block.id : undefined}
  draggable={canDrag ? true : undefined}
  onDragStart={
    canDrag
      ? (event) => {
          // Belt-and-braces: no ancestor drag source remains after this task,
          // but a nested badge's dragstart must never leak upward.
          event.stopPropagation();
          event.dataTransfer?.setData("text/plain", block.id);
          if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
          setDraggingBlockId(block.id);
        }
      : undefined
  }
  onDragEnd={
    canDrag
      ? () => {
          setDraggingBlockId(null);
          setDragHoverTarget(null);
        }
      : undefined
  }
  className={cn(
    "absolute -top-2 left-3 z-10 px-1.5 py-0 text-[10px] font-medium",
    canDrag && "cursor-grab active:cursor-grabbing"
  )}
>
  {screenBlockLabels[block.type as ScreenBlockKind] ?? block.type}
</Badge>
```

- `canDrag` (`:296`) is already builder-only (`mode === "builder" && Boolean(onDragMove)`);
  hosts that pass no `onDragMove` keep a plain, non-draggable badge.
- `setDraggingBlockId` still drives the suppressed-subtree context (`:525-528`)
  and the force-revealed gaps (`:336`) — payload and state flow are UNCHANGED,
  only the DOM element that starts the drag moves.
- Keyboard/a11y move flows live in `renderBuilderActions` (`:654-656`,
  host-provided Move up/down) — unaffected.
- Every card at every depth now drags by its own badge; container cards can no
  longer be shadowed by nested draggable children (the card surface is drop-only).

## 4. B — clearable labels (field + stat; divider is the model)

**Field branch — replace `:779-782`:**

```ts
const defaultLabel =
  field?.label ?? (fieldName ? (systemFieldLabels.get(fieldName) ?? fieldName) : "Field");
const rawLabel = block.data.label;
const label = typeof rawLabel === "string" ? rawLabel.trim() : defaultLabel;
// Builder {{ token }} stand-in: the binding stays visible with a cleared label.
// (Refines the parent sketch's fieldName-only chain: same intent, but the
// stand-in reuses defaultLabel so a cleared label shows the same token text
// as a never-set one — field.label before raw fieldName.)
const tokenLabel = label || defaultLabel;
```

Semantics table (regression-pinned in §8):
| stored `data.label` | rendered label `<p>` | builder token |
|---|---|---|
| absent / non-string | `defaultLabel` (today's chain — stored screens identical) | `{{ defaultLabel }}` |
| `"Custom X"` | `"Custom X"` | `{{ Custom X }}` |
| `""` or `"   "` | **none** (cleared) | `{{ defaultLabel }}` |

- Label `<p>` (`:793-795`) → `{label ? <p className="...">{label}</p> : null}`.
- Builder token (`:800`) → `` {`{{ ${tokenLabel} }}`} ``.
- `InlineEditWrapper` `ariaLabel` (`:808`) → `tokenLabel` (an accessible name
  must never be empty).

**Stat branch — replace `:960` (same shape, `"Stat"` never-set default):**

```ts
const rawLabel = block.data.label;
const label = typeof rawLabel === "string" ? rawLabel.trim() : "Stat";
const tokenLabel = label || "Stat";
```

- Token (`:967`) → `tokenLabel`; label `<p>` (`:976-978`) → render only when
  `label` non-empty.

**Not touched:** heading (label only feeds the builder token `:906/:914` — no
entry leak), record-header (renders `null` for empty `:738`), divider
(`:1006-1008` already correct), image `label` (alt/placeholder text only —
keeps its `"Image"` default). `readText` (`:172-175`) itself is unchanged
(other call sites rely on its trim-or-fallback contract).

## 5. C(i) — `showFieldMetadata` gating (field branch)

```ts
// Once, beside canEdit (:788):
const showBindingBadges = mode === "preview" || (mode === "entry" && showFieldMetadata);
```

- Binding badges (`:838-846`): `{showBindingBadges ? (binding ? <Badge …>{writable ? "Editable" : "Read"}</Badge> : <Badge …>Unbound</Badge>) : null}`
  — builder already rendered `null` here, so `showBindingBadges === false` in
  builder preserves today's output exactly.
- Field-type badge (`:851-855`) renders in builder TODAY, so its gate must
  keep builder: `{field && (mode === "builder" || showBindingBadges) ? <Badge …uppercase…>{fieldTypeLabels[…] ?? field.type}</Badge> : null}`.
- Helper text (`:848-850`), missing-field warning (`:856-860`) and field
  errors (`:861-863`) are content, not chrome — untouched, all modes.
- Net behavior: **entry default = zero badges; entry + toggle = today's
  badges; preview/builder byte-identical always.**

## 6. C(ii) — entry-mode surface flatten

- **Block wrapper (`:546-553`)** — entry branch of `wrapperClass` only:
  `cn("bg-background/90", selectionBorder({...}))` →
  `cn("rounded-xl bg-card", selectionBorder({...}))` (single opaque card
  surface; selection/interaction ring kept — entry blocks stay clickable for
  the floating-panel select). Preview (`:536`) and builder (`:538-545`)
  branches CHARACTER-IDENTICAL to today.
- **Section (`:1412-1424`)** — split the non-preview branch by mode:

```ts
mode === "preview"
  ? "rounded-2xl border bg-background/80"                        // unchanged
  : mode === "builder"
    ? cn("bg-background/60", selectionBorder({ level: "container", selected, interactive: isInteractive }))
    : cn("bg-transparent", selectionBorder({ level: "container", selected, interactive: isInteractive }))
```

  (`isInteractive` is already builder-only at the section level `:1399`, so the
  entry `selectionBorder` renders its inert form — kept for class-shape parity.)
- `bg-dotted` on the entry canvas scroller is `CustomScreenEntryEditor.tsx:1302`
  → **503-03's file, not this task.**

## 7. E — image `ratio` wiring + static-src read gate (`:1020-1062`)

```ts
// after fit (:1023):
const ratioValue = typeof block.data.ratio === "string" ? block.data.ratio : "auto";
const ratioClass = screenImageRatioClass[ratioValue];  // undefined for "auto"/legacy "16:9" free text
// :1028 — the ONE static-src read, now filtered at read time (defense-in-depth:
// idempotent no-op for saved docs — the save path already normalized — but it
// gates the builder's live preview of a raw inspector draft pre-503-03):
const staticSrc = normalizeScreenImageSrc(readText(block.data, "src"));
// src chain (:1029-1030) + showImage (:1033) UNCHANGED — an unsafe draft now
// yields staticSrc "" → placeholder, never an <img> with a javascript:/data: src.
```

Image markup (`:1035-1046`): ratio applies via a wrapper div; the no-ratio
path stays byte-identical to today:

```tsx
{ratioClass ? (
  <div className={cn("relative w-full overflow-hidden rounded-lg", ratioClass)}>
    <img src={src} alt={label}
      className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")} />
  </div>
) : (
  <img src={src} alt={label}
    className={cn("w-full rounded-lg", fit === "contain" ? "object-contain" : "object-cover")} />
)}
```

Placeholder branch (`:1050`): make the authored ratio visible even before a
src/binding resolves — `"flex aspect-video w-full …"` → the same class list
with `aspect-video` replaced by `cn(ratioClass ?? "aspect-video", …)`; rest of
the placeholder untouched.

Error handling: `ratio` reaches the renderer as an allow-listed enum after a
503-01-era write; a stored legacy free-text value (`"16:9"`) misses the class
map → renders as today (`auto`), no crash, no raw text in `className`
(class-map lookup only).

## 8. Testing Requirements (per `_docs/TESTING_STRATEGY.md` — Vitest lane, Bun-free)

**This subtask writes exactly two test files** (503-04 extends, never rewrites):

`tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx` — add:
1. **A:** a field block with `style: { width: "half", align: "center", margin: { top: 24 }, padding: { top: 16 } }`
   renders `w-1/2 mx-auto` on the wrapper + inline `margin-top: 24px` /
   `padding-top: 16px` — asserted for `mode="builder"`, `"preview"` AND
   `"entry"` (same emission, one loop).
2. **A determinism + align/width coupling:** `align: "center"` + `margin:
   { left: 8 }` → NO `mx-auto` (horizontal margin wins); `width: "half"` +
   `align: "stretch"` → `w-1/2` without a second `w-full`. ALSO pin the
   coupling decision (a): `align: "center"` with `width: "auto"` (or
   absent) DOES emit `mx-auto` (the class is present) but carries no width
   class — a documented visible no-op; the renderer must not silently drop the
   class. (503-03 leaves Align as a plain always-enabled enum; this contract
   places no disable/hint requirement on it.)
3. **A byte-stability guard (named):** a block WITHOUT `style` renders a
   wrapper whose `className` equals THAT MODE'S current `wrapperClass`
   (i.e. `cn(wrapperClass, "", "") === wrapperClass` — post-C(ii) for entry,
   which is `rounded-xl bg-card …`, NOT a pre-task DOM snapshot) and emits no
   `style` attribute (absent-style DOM identity: the style path adds nothing).
   Only builder + preview additionally assert equality to their pre-change
   snapshots (§8.6) — entry deliberately differs under C(ii), so the absent-
   style guard there compares to the post-C(ii) wrapperClass, never a pre-task
   baseline.
4. **B:** field with `data.label: ""` → no label `<p>` in entry; the value
   still renders ("text left + value right" clean composition); builder still
   shows `{{ <field label> }}`; `data.label` ABSENT → today's default chain
   (extend the existing `:606`/`:632` field tests). Same pair for stat
   (`""` → no `<p>`, absent → `"Stat"`). Whitespace-only label behaves as `""`.
5. **C(i):** entry mode default → ZERO `Editable`/`Read`/`Unbound`/field-type
   badges; `showFieldMetadata` → all badges back (text-identical to today);
   preview renders badges with the prop unset; builder output unchanged
   (keeps its type badge, never binding badges).
6. **C(ii):** entry block wrapper carries `rounded-xl bg-card` (not
   `bg-background/90`); entry section carries `bg-transparent` (not
   `bg-background/60`); builder + preview wrapper/section class strings equal
   their pre-change snapshots (byte-identical guard, named).
7. **D:** the wrapper card div has NO `draggable` attribute; the builder badge
   has `draggable` + `data-screen-drag-handle={block.id}`; `dragstart` fired
   on the badge sets the `text/plain` payload to the block id and reveals the
   insert gaps (`data-drag-hover` flow intact).
8. **E:** `ratio: "16/9"` → `aspect-video` wrapper div with an `h-full w-full`
   img (builder + entry); `ratio` absent/legacy `"16:9"` → today's exact img
   markup (no wrapper); placeholder honors the ratio class; a block with
   `data.src: "javascript:alert(1)"` renders the placeholder and NO `<img>`
   in builder (read-gate), while `/media/x.jpg` renders the `<img>`.

`tests/vitest/ui-integration/screen-editor-insertion-targeting.test.tsx` — update:
- Re-point EVERY `fireDnd(container.querySelector('[data-screen-block-id="…"]'), "dragstart", …)`
  occurrence at `'[data-screen-drag-handle="…"]'` — grep every `fireDnd(…,
  "dragstart")`: SEVEN today (`:395`, `:430`, `:464`, `:506`, `:561`, `:570`,
  `:612`, incl. the cycle-guard pair `:561`/`:570` and the container drag
  `:612`; re-grep at implementation time, do NOT trust the hardcoded anchors) —
  miss one and it fires on a now-non-draggable card and throws. The TWO
  `fireDnd(…, "dragend")` calls (`:539`/`:622`) ALSO re-point to the handle
  (onDragEnd moved to the badge with draggable/onDragStart — §3). Assertions on
  drop resolution are PRESERVED, not weakened.
- NEW: a `columns`/`field-group` container reorders when dragged by ITS badge
  while a draggable child sits on its surface (non-shadowing); dragging the
  NESTED child by its own badge moves only the child, container stays.
- NEW: `dragstart` fired on the card body (old drag surface) does NOT set a
  block payload / start a move (regression pin for D).

**Cross-cutting pins (verify green, owned elsewhere):** stored-V4
byte-stability suite (503-01), `custom-screen-authoring-boundary.test.ts`
no-`@/ui/pages`-imports + `PaletteChip` dead-code guards, TASK-498
presentation-override tests (`:116` presentation className survives — the new
`cn(wrapperClass, widthClass, alignClass)` must not disturb it).

**Gates:** `bun --cwd core lint`, `bun --cwd core lint:types`, AND root
`tsc -p tsconfig.json --noEmit` (core-only typecheck skips `tests/` — a prop
addition without the root pass has blocked commits before), then the two
named vitest files (re-run named files on suite-glob timeout flakes).

**SMOKE:** the ≥5-scenario real-flow playwright smoke (style end-to-end with
computed-style asserts, cleared-label composition, metadata toggle +
clean-surface, container drag BY THE HANDLE + nested non-shadowing, image
ratio/unsafe-src) is owned by **503-04** — this subtask's renderer changes are
its subject in every scenario; do not duplicate it here.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration.** This subtask is render-only — it adds no
input surface of its own and CONSUMES the parent's one input surface:
(a) the 503-01 `ScreenBlockStyleV1` validator (enums coerce, ints clamp,
unknown keys throw) — the renderer emits ONLY `typeof number`-guarded clamped
ints into `style={}` and class-map lookups into `className` (a map miss
degrades to no class); raw stored text can never reach CSS or class output;
(b) the exported `normalizeScreenImageSrc` prefix filter (`/`, `http://`,
`https://`, else `""`), now ALSO applied at the renderer's static-src read so
no unsafe scheme reaches `<img src>` at any point in the authoring session.

**Schema-first / reject-unknown:** no schema writes here; contract lives in
503-01; `schemaVersion` stays 1 / definition v4.
**Non-destructive / byte-stability guards (named):** absent-style DOM identity
(§2, tested §8.3); builder/preview class-string identity for the entry flatten
(§8.6); no-ratio img markup identity (§8.8); NO read-path mutation of stored
data anywhere (label/ratio/src changes are render-time only).
**Cross-cutting no-regress:** TASK-498 presentation overrides, TASK-500
insertion targeting/drop resolution (payload + state flow unchanged, only the
drag-source element moves), Bun-free boundary (no `@/ui/pages` import — the
new import is the existing `services/customScreens` module).

---

## Acceptance Criteria

1. `style: { width: "half", align: "center", margin.top: 24, padding.top: 16 }`
   visibly halves/centers the block with computed `margin-top: 24px` /
   `padding-top: 16px` in builder, preview AND entry; a style-less document
   renders byte-identical DOM. Align couples to width by design (decision (a)):
   the auto-margin class emits regardless, but only offsets when `width < full`;
   the §8.2 test pins this as a documented no-op. This renderer contract makes
   no demand on 503-03's align control (it stays a plain always-enabled enum) —
   the coupling is documented here, not delegated to a downstream fix.
2. Clearing a field/stat label removes the label element (clean
   text-left/value-right composition); builder keeps the `{{ token }}` with
   the default stand-in; never-set labels render exactly as today.
3. Entry view: zero binding/type badges by default, all back with
   `showFieldMetadata`; preview always badged; block = one opaque
   `bg-card rounded-xl` surface, section transparent; builder/preview chrome
   byte-identical.
4. Containers drag by the corner badge; nested children never shadow them;
   card body no longer starts drags; every existing drop-resolution assertion
   still passes.
5. `ratio: "16/9"` yields a computed-aspect wrapper in builder and entry;
   `javascript:`/`data:` static src never renders an `<img>` in any mode.
6. Both named vitest files green + `lint`, `lint:types`, root
   `tsc -p tsconfig.json --noEmit` green.

---

## Verified anchors (feature/visual, 2026-07-02)

`ScreenRuntimeRenderer.tsx`: props `:27-69` / destructure `:252-278` / `canDrag` `:296`;
`readText` `:172-175`; `dropHandlers` `:300-321`; `wrapperClass` `:533-554`
(entry `:546-553`); `wrap()` `:570-661` (drag source `:584-602`, card drop
`:603-625`, Badge `:648-653`, actions `:654-656`); field `:774-866` (label
`:779-782`, `<p>` `:793-795`, token `:800`, ariaLabel `:808`, binding badges
`:838-846`, type badge `:851-855`); stat `:958-994` (label `:960`, token
`:967`, `<p>` `:976-978`); divider label model `:1006-1008`; image
`:1020-1062` (staticSrc `:1028`, showImage `:1033`, img `:1037-1044`,
placeholder `:1048-1061`); section className `:1412-1424`.
`customScreenSchemas.ts`: `ScreenBlockV1` `:112-124`; image allow-list w/
`ratio` `:405`; `coerceScreenEnum` `:411`; `clampScreenInt` `:417`;
`normalizeScreenImageSrc` `:427-434` (local today — 503-01 exports it).
`badge.tsx` (admin/components/ui) `:31-45`: span, spreads `...props`.
Entry consumer: `CustomScreenEntryCanvas.tsx:44-53` (`mode="entry"`, 503-03
threads the new prop). Tests: `fireDnd(…, "dragstart")` currently fired on
`[data-screen-block-id]` — SEVEN occurrences at
`screen-editor-insertion-targeting.test.tsx:395/:430/:464/:506/:561/:570/:612`
(re-grep at implementation time), all re-pointed to `[data-screen-drag-handle]`;
the two `fireDnd(…, "dragend")` calls (`:539`/`:622`) re-point to the handle too.
