# Audit — Cross: Canvas in-place editing + Typography tab (Page Editor V2)

## 1. Meta
- **Dimension:** Canvas in-place text interactivity (Path A) + dedicated Typography inspector tab (Path B).
- **User requirement (verbatim intent):** clicking a section must let you edit a specific spot by EITHER (A) clicking the text on the canvas and editing it in place, OR (B) using a dedicated **Typography** tab in the floating inspector — it must work **BOTH ways**.
- **Date:** 2026-06-10 · **Session:** `xcCanvas`
- **Audit HEAD:** `a06049ba` (requested). Live tree during run was at **`1fb8604a`** ("chore(pages): close task 418 validation") — a concurrent agent had advanced 418 sanity work; observations reflect that snapshot.
- **Page under test:** "Audit Canvas Inline 0610" (`/admin/pages/7176388b-04eb-4583-a01b-ecdc7a752c0c`), front slug `/audit-canvas-inline-0610`.
- **Inserted block:** Hero ("Headline, copy, and primary action") → `editorSections=1`, `editorBlocks=3` = heading + text + button. Heading text default "Build with Coderso".
- **Screenshots:** `.tmp/audit/shots/xcCanvas-heading-style-panel.png`, `.tmp/audit/shots/xcCanvas-front-rendered.png`
- **Source verified:** `core/admin/ui/pages/PageEditor.tsx`, `core/services/pages/pageEditorControlRegistry.ts`.

---

## (A) Inline canvas editing — Path A

**Verdict: NOT SUPPORTED.** Clicking the heading on the canvas only **selects** the block (shows the floating toolbar); it never enters an editable caret, and typing on the canvas does not change the text. Editing is possible **only** via the floating panel "Primary text" field.

### Evidence
- **Single-click** the heading `<H1>` ("Build with Coderso") via real mouse events:
  - `editable` (contenteditable count inside blocks) = **0**
  - `activeElement.tagName` = **BODY**, `activeElement.isContentEditable` = **false**
  - Block becomes selected: `data-selected="true"`, class `ring-2 ring-primary/20`; floating toolbar appears with 7 panels.
- **Double-click** the heading:
  - `editableAfterDbl` = **0**, `activeTag` = BODY, `activeCE` = false → no edit mode entered.
- **Type after double-click** (`ZZTYPED` via keyboard):
  - Canvas heading BEFORE = `"Build with Coderso"` → AFTER typing = `"Build with Coderso"` (unchanged). `headingHasTyped=false`. **Typing on the canvas did not mutate any block text.**
- **Control path that DOES work:** Content panel → "Primary text" `text-input` set to `"Edited Via Panel 0610"` → canvas `<h1>` immediately updated to `"Edited Via Panel 0610"`. After Save+Publish the public runtime rendered `bodyText="Edited Via Panel 0610 ..."` confirming the panel-field edit is the sole edit path and it persists.

### Source corroboration
- `PageEditor.tsx`: the only `contenteditable` reference is a **keyboard guard** at lines 492–493 (`target.closest("[contenteditable='true']")`), not an editable canvas block. No `onDoubleClick` / `onDblClick` / inline-edit handler exists on canvas blocks.
- The reference mock `_docs/UI/pages-editor-new-approach/coderso-editor-redesign.html` has **zero** `contenteditable`/`dblclick` and edits text via panel inputs (`Nagłówek`, `Opis`, `Tekst przycisku`) — so the reference does **not** satisfy Path A either; the inline-canvas requirement is target state, not parity-with-mock.

---

## (B) Typography tab — Path B

**Verdict: NO Typography tab exists.** The floating inspector has 7 panels and none is Typography. The handful of type-related bits are scattered across **Content** (level, text align) and **Style** (text color), all rendered as **native selects / raw-hex text**, never as dedicated typographic controls.

### Panel enumeration (live, heading selected)
`aria-label` buttons ending in " panel": **Layout, Content, Style, Background, Spacing, Responsive, Visibility**. `Typography panel` present = **false**.

### Typography-relevant controls PRESENT (with widget types)
| Control | Lives in panel | registry input | rendered widget | note |
|---|---|---|---|---|
| Primary text | Content | `text` | `text-input` | only way to edit the actual text |
| Level (h1–h6) | Content | `select` | `native-select[h1\|h2\|h3\|h4\|h5\|h6]` | heading semantic level, not a font control |
| Text align | Content | `segmented` | `native-select[left\|center\|right]` | renders as a native `<select>`, not segmented pills |
| Text color | Style | `color` | **`type=text` raw-hex input** (no native picker, no swatches) | falls through to default `TextField` — `color` input has no special render case in PageEditor |

> i.e. of a real typography group, only `textAlign` (mislabelled location, in Content) and `textColor` (raw hex, in Style) exist. `Level` is HTML semantics, not typography.

### Typography controls MISSING vs §8.C target group
- **fontFamily** — missing (no control in registry; `typographyPreset` exists only in unrelated `core/services/pages/layoutSettings.ts`).
- **fontSize** (`font.size.*`) — missing.
- **fontWeight** — missing.
- **lineHeight** — missing.
- **letterSpacing** — missing.
- (textAlign present but lives under Content as a native select; textColor present but raw hex under Style.)

Type styling that DOES render on the canvas (`font-semibold leading-tight`, color via `var(--coderso-block-text,...)`) is **baked into Tailwind classes**, not surfaced as any editable control.

### Source corroboration
- `pageEditorControlRegistry.ts`: `heading` controls = `text` (Primary text), `level` (select), `align` (segmented). `block.style.textColor` = `input: "color"`. No `fontFamily`/`fontSize`/`fontWeight`/`lineHeight`/`letterSpacing` anywhere.
- `PageEditor.tsx` block-control render switch handles `number`, `select`/`segmented` (both → `SelectField` native select), `switch` (→ `SelectField yes/no`), and **default → `TextField`**. There is **no** `color` case, so `Text color` renders as a plain text input.
- Reference `Wygląd` (Appearance) panel in the mock = Kolor akcentu (swatches), Zaokrąglenie (radius slider), Cień (shadow segmented) — also **no** font family/size/weight/line-height/letter-spacing. The mock does not satisfy Path B either.

---

## Two-way requirement scorecard

| Path | Requirement | Present? | Evidence |
|---|---|---|---|
| **A** | Click text on canvas → edit in place | **NO** | contenteditable=0 on single+double click; typing on canvas left heading unchanged; only `contenteditable` ref is the kbd guard (PageEditor.tsx:492–493) |
| **B** | Dedicated **Typography** tab in inspector | **NO** | 7 panels, none "Typography"; only scattered `level`/`align` (native selects, Content) + `textColor` (raw hex, Style); fontFamily/fontSize/fontWeight/lineHeight/letterSpacing all absent |

**Both paths absent → the user's "edit a spot BOTH ways" requirement is 0/2 satisfied.**

---

## Severity

**HIGH.** Neither half of the explicit two-way requirement is met. Today the only way to change any text or its appearance is the floating panel's text fields plus a raw-hex color box — no in-place canvas editing and no typography grouping. This directly blocks the stated UX. Maps to original report §8.C (desired per-block Typography group: `fontFamily, fontSize (font.size.*), fontWeight, lineHeight, letterSpacing, textAlign`) and §8.D/E (per-block inspector generated from one declarative descriptor) — both still unimplemented.

---

## Remediation (concrete)

### Path A — inline canvas editing
1. Add a `contentEditable` (or controlled inline editor) to text-bearing leaf blocks (`heading`, `text`, `button` label) inside the `EditableWrapper`. Wire `onInput`/`onBlur` to the existing block-prop update cycle (the same `updateBlock(blockId, 'props', {text})` path the "Primary text" field already drives), so canvas edits and panel edits write to one source of truth.
2. Gate it behind selection: single-click selects (current behaviour), double-click (or Enter on a selected block) enters edit mode and focuses the caret; Escape/blur commits. Reuse the keyboard guard at PageEditor.tsx:492–493 so editor hotkeys don't fire while typing.
3. Sanitize on commit (strip markup, keep plain text for `heading`/`button.label`; respect `text.format` for the `text` block).

### Path B — Typography control group + (optional) tab
1. Add a **Typography** control group to `pageEditorControlRegistry.ts` per §8.C, on text-capable blocks: `fontFamily` (token select), `fontSize` (`font.size.*` token steps), `fontWeight` (select), `lineHeight` (number/select), `letterSpacing` (number), and relocate `textAlign` here (de-dup with the current Content `align`). Back each with token refs, not raw strings (§8.C mapping via `core/render/tokens.ts`).
2. Extend `PageBlockStyleV2` schema + normalizer + defaults + renderer for the new fields in the same leaf (per the §9 contract note) so UI and validation cannot drift.
3. Render real widgets: add a `color` case (native color input + token swatches) and dedicated typography widgets, instead of the current fall-through to a plain `TextField`. Either surface a **Typography** panel tab (add to `toolbarPanelOptions`) or group these under a relabelled Content/Style section — but they must be a coherent typographic group, not scattered native selects.
