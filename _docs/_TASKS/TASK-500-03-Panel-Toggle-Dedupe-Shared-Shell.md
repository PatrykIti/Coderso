# TASK-500-03: Panel-Toggle Dedupe (Shared Shell)
# FileName: TASK-500-03-Panel-Toggle-Dedupe-Shared-Shell.md

**Parent Task:** TASK-500
**Priority:** High
**Category:** Admin UI / Custom Screens / Pages / Shared Editor Shell
**Estimated Effort:** Small
**Dependencies:** TASK-496-01 (shared `CanvasEditor` shell), TASK-496-02 (Screens on the shell), TASK-495-03 (Pages builder chrome). Independent of 500-01/02/04 — can land in parallel.
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Objective

Collapse the panel-hide affordances to **ONE control surface** in the shared editor
shell so Pages and Screens behave identically: the **top-toolbar Hide/Show toggle** plus
the **reopen "Show panel" chip** are the *sole* panel controls. Remove the redundant
**in-canvas / in-panel `PanelRight` "Hide panel"** button that each host rail head
currently hand-rolls. No a11y or `data-*` hook is lost — the surviving top toggle keeps a
labelled hide control (`aria-label="Hide panel"` while the panel is open). On **Screens**
that is literally the same label the removed rail-head closer carried
(`aria-label="Hide panel"`); on **Pages** the removed closer was a
`ToolbarIconButton tooltip={toolbarActionTooltips.hidePanel}` whose rendered `aria-label`
is `hidePanel.label = "Hide options panel"` (a distinct label), so the removal drops no
duplicate "Hide panel" label. PageEditor stays behaviour-identical in every other respect
(the legacy menu chrome's drag grip is untouched).

This is a pure **UI / client-state** dedupe: no schema, no model, no ops function, no
route, no RBAC. It intentionally does NOT touch the `ScreenDocumentV1` model, so it does
not regress TASK-498 look parity, the Bun-free vitest boundary, or the `schemaVersion:1`
/ definition-v4 no-bump rule.

---

## Verified current state (anchors re-checked against source)

The shell `core/admin/ui/shared/CanvasEditor.tsx` is **CONTROLLED, read-only**: it READS
`panelOpen` to decide whether to render `panel` and, when `!panelOpen`, the
`reopenAffordance` chip; it **never** calls `onPanelOpenChange` (docstring `:16-23`,
render `:145-155`). The shell itself renders **no** `PanelRight` close — the redundant
closer lives in each **host's** panel body (`railBody`) head row:

- **Screens — `ScreenAuthoringCanvas.tsx`:**
  - In-panel `PanelRight` close: `railBody` head row `:356-365`
    (`aria-label="Hide panel"`, `onClick={() => onPanelOpenChange(false)}`). **REMOVE.**
  - `PanelRight` is imported at `:8` and used **only** at `:364` → after removal the
    import is orphaned and MUST be dropped (else `@typescript-eslint/no-unused-vars`).
  - Top-toolbar toggle: host-supplied `panelToggle` slot, forwarded to
    `CanvasEditor toolbar` at `:461` (survives — the sole hide surface).
  - Reopen chip: host-supplied `reopenAffordance`, forwarded at `:456` (survives).
  - Head-row wrapper `data-screen-rail-head="true"` (`:355`) and `ScreenPanelToggleRail`
    (`:427`) are preserved.
- **Pages — `PageEditor.tsx`:**
  - In-panel `PanelRight` close: `railBody` head row **non-legacy (builder) branch**
    `:3023-3030` (`ToolbarIconButton tooltip={toolbarActionTooltips.hidePanel}`
    `onClick={() => setPanelOpen(false)}`). **REMOVE** (replace the ternary's else arm
    with `null`).
  - The **legacy (menu) branch** `:3016-3022` renders a **drag `GripVertical`**, NOT a
    hide button — it is a different affordance and MUST stay untouched.
  - `PanelRight` is imported at `:33` and still used at `:2606` and `:3473` → **keep the
    import** (only the `:3028` usage is removed).
  - Top-toolbar toggle: `CanvasEditor toolbar` slot `:3465-3475` (survives).
  - Reopen affordance: `builderReopen` (`:3496`) for the shell path and the inline menu
    reopen `:3535-3549` for legacy chrome (both survive).
- **Screen host — `CustomScreenEditorPage.tsx`:** `screenPanelToggle` (`:682-693`,
  top toggle, `aria-label` toggles Hide/Show, `aria-pressed={panelOpen}`) and
  `screenReopen` (`:696-705`) are the surviving surfaces; passed to the canvas at
  `:748-751`. Unchanged by this subtask.
- **Prototype** `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEditorPreview.tsx` has
  **no** in-panel PanelRight/Hide affordance at all — removing the in-canvas closer moves
  the builder *toward* prototype parity, not away.

### Why the shell edit is doc-only (not a new closer in the shell)

The shell's documented contract is "**NEVER calls `onPanelOpenChange`**" (controlled,
read-only). Adding a functional Hide button inside `CanvasEditor` would force the shell to
call the host setter, breaking that invariant and forking the single-source-of-truth. So
the shell change is a **contract-comment strengthening only** — it codifies the
single-surface invariant so future hosts don't re-add a rail-head closer — and the actual
removal happens in the two host rail heads. The invariant is *enforced by a shared
regression test* that renders BOTH hosts (see Testing Requirements).

---

## Execution-ready changes

### 1. `core/admin/ui/shared/CanvasEditor.tsx` (doc-only, no behaviour change)

Extend the top docstring (near `:16-23`) with the single-surface invariant so the
contract is explicit at the shell boundary:

```
 * SINGLE HIDE SURFACE (TASK-500-03): the ONLY panel-hide control is the host's
 * toolbar `toggle` slot; the ONLY reopen control is `reopenAffordance`. Hosts MUST
 * NOT render a second in-panel/in-canvas "Hide panel" (PanelRight) button inside the
 * `panel` body — that duplicated Pages + Screens closer was removed. The shell stays
 * controlled read-only (still NEVER calls `onPanelOpenChange`); the invariant is
 * pinned by tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx.
```

No prop, no JSX, no import change here. `panelOpen`/`reopenAffordance` render logic
(`:145-155`) is unchanged.

### 2. `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx`

Remove the rail-head closer button and drop the orphaned import.

```tsx
// DELETE the entire <Button aria-label="Hide panel"> … <PanelRight/> … </Button>
// block at :357-365 (the first child of the `data-screen-rail-head` head row).
// The head row's remaining children (PanelTop label + selection chip + the
// selectedBlock action cluster / command Search) keep their flex layout — the
// leading hide button simply disappears; no wrapper/spacing class changes needed.

// Import line :8 — remove `PanelRight,` from the lucide-react import (now unused).
```

Post-conditions: `data-screen-rail-head="true"` head row still renders; `panelToggle`
(top toggle) and `reopenAffordance` (chip) still forwarded to `CanvasEditor` unchanged.

### 3. `core/admin/ui/pages/PageEditor.tsx`

Collapse the builder-branch hide button to `null`; keep the legacy grip.

```tsx
// At :3016-3030 the head-row leader is a ternary:
//   useLegacyChrome ? <ToolbarIconButton …drag…><GripVertical/></ToolbarIconButton>
//                    : <ToolbarIconButton …hidePanel onClick={() => setPanelOpen(false)}>
//                        <PanelRight/></ToolbarIconButton>
// REPLACE the else arm with `null`:
{useLegacyChrome ? (
  <ToolbarIconButton tooltip={toolbarActionTooltips.drag} onPointerDown={startToolbarDrag}>
    <GripVertical className="h-4 w-4" />
  </ToolbarIconButton>
) : null}
```

`toolbarActionTooltips.hidePanel` may become unused **only if** no other reference
exists — verify with `grep -n "hidePanel" core/admin/ui/pages/PageEditor.tsx`; if the
only reference was `:3025`, remove the now-dead `hidePanel` tooltip entry too (else keep
it). `PanelRight` import at `:33` stays (still used at `:2606`, `:3473`). The legacy menu
branch (`:3016-3022`, `:3505-3549`) is byte-unchanged — menu chrome is behaviour-identical.

### Data flow (unchanged, single owner)

`panelOpen` remains host-owned `useState` (Screens `CustomScreenEditorPage.tsx:182`,
Pages `PageEditor.tsx:762`). Flip paths after dedupe:

```
Hide  → top toolbar toggle onClick → setPanelOpen(false) → shell reads panelOpen=false
        → renders reopenAffordance, hides panel
Show  → reopen chip onClick → setPanelOpen(true) → shell renders panel again
```

No new state, no prop threading, no derived-state fork. `floatingToolbarVisible`
(Pages `:957`) and the canvas right-clearance (`paddingRight` — Screen
`ScreenAuthoringCanvas:480`) already derive from the same `panelOpen`, so removing a
*redundant setter caller* cannot desync them.

### Error handling / edge cases

- No throw path: this is presentational removal. The controlled `panelOpen` boolean is
  the single guard; there is no index/id/schema input to validate.
- Idempotence: hiding then showing round-trips through the surviving toggle + chip only.
- a11y preservation: on **Screens** the removed button's literal `aria-label="Hide panel"`
  (`ScreenAuthoringCanvas.tsx:361`) is **duplicated** by the surviving top toggle; on
  **Pages** the removed closer is a `ToolbarIconButton` labelled `"Hide options panel"`
  (`toolbarActionTooltips.hidePanel.label`, surfaced via `FloatingEditorToolbar.tsx:47`
  `aria-label={tooltip.label}`), not "Hide panel". In **both** hosts the surviving top
  toggle still exposes a labelled hide control (`aria-label="Hide panel"` while open) and
  adds an `aria-pressed` state the removed icon button lacked — so screen-reader users
  retain a labelled hide affordance: a net a11y improvement, not a loss.

---

## Security Contract / scope

**UI/client-state only; no route/RBAC/endpoint change.** This subtask removes duplicated
client-side JSX affordances and adds a doc comment; it touches no API route, endpoint
visibility, auth, CSRF, rate limit, schema, normalizer, or persisted document. No
`ScreenDocumentV1.schemaVersion` bump, no definition-version change, no DB migration.
`panelOpen` is ephemeral view state that is never persisted. There is no input-
sanitization surface in this change.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` — Vitest Bun-free lane)

All suites run in the **Vitest (Bun-free)** lane (pure React chrome; no Bun runtime, no
route handler, no service module).

**New — `tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx`**
(authored here; referenced by the 500-05 consolidated matrix):

1. **Screens — exactly one hide surface.** Render the Screen editor with a selection and
   `panelOpen=true`; assert `html.match(/aria-label="Hide panel"/g)` has length **exactly
   1** (the top toggle), and that the rail head (`data-screen-rail-head`) contains **no**
   `PanelRight` "Hide panel" button. Assert the surviving toggle still carries
   `aria-pressed="true"`.
2. **Pages (builder chrome) — exactly one hide surface.** Render PageEditor in
   non-legacy/builder chrome with a section selected + `panelOpen=true`. **Pin the removal**
   with the rail-head clause: assert the builder rail head
   (`data-page-editor-toolbar-row="head"`) no longer contains a `PanelRight` closer **nor**
   an `aria-label="Hide options panel"` control (the removed Pages closer was a
   `ToolbarIconButton tooltip={toolbarActionTooltips.hidePanel}`, whose rendered `aria-label`
   is `hidePanel.label = "Hide options panel"`, NOT "Hide panel"; its old branch is now
   `null`). Treat exactly **1** `aria-label="Hide panel"` (the relocated top toolbar toggle
   at `PageEditor.tsx:3470`) as a **supporting post-condition only** — it does not by itself
   pin the Pages removal, because that count is already **1** before removal: the removed
   closer was labelled "Hide options panel", and the legacy topbar toggle at `:2603` is gated
   out of builder chrome via `topbarActions={useLegacyChrome ? topbarActions : undefined}`
   (`:2686`), so the count is 1→1 across the change.
3. **Pages (legacy menu chrome) — grip untouched.** Render PageEditor legacy/menu chrome;
   assert the head-row leader is still the drag `GripVertical` (via
   `data-page-editor-toolbar-dragging` presence) and that no in-panel Hide button was
   introduced or removed there — menu chrome unchanged.
4. **Reopen round-trip (both hosts).** With `panelOpen=false`, assert the reopen chip
   (`aria-label="Show panel"`) renders and the panel body does not; the chip is the sole
   reopen path for both Screens and Pages.

**Regression — must stay green, MUST NOT be weakened:**

- `tests/vitest/ui/page-editor.test.tsx` (`:33`) and
  `tests/vitest/ui/page-editor-floating-panel.test.tsx` (`:18`) assert
  `toContain('aria-label="Hide panel"')` — still pass (one surviving toggle satisfies
  `toContain`). Confirm they are NOT tightened to a specific count except in the new
  dedupe suite.
- `tests/vitest/ui-integration/custom-screen-editor-restyle.test.tsx` (`:99`
  `toContain("Hide panel")`) — still passes on the top toggle.
- `tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx` — shell slot/behaviour
  tests (`:95`,`:110`,`:186`) unchanged; the shell contract (controlled read-only, reopen
  chip only when `!panelOpen`) is preserved by this subtask.
**Must update — the one currently-passing suite that asserts the removed button's presence:**

- `tests/vitest/ui/page-editor-v2-flow.test.tsx` — test *"PageEditor toolbar panel icons
  expose metadata tooltips and toggle a single subpanel"* (`:3409`) asserts the **presence**
  of the removed Pages closer: the label array at `:3435`
  (`for (const label of ["Hide options panel", "Collapse toolbar", "Duplicate section"])`)
  expects each control's `data-slot` to be `"tooltip-trigger"`, and the removed builder
  closer renders exactly `aria-label="Hide options panel"` (via
  `toolbarActionTooltips.hidePanel` → `hidePanel.label`). Once the else-arm is replaced with
  `null`, `querySelector` returns null and `expect(undefined).toBe("tooltip-trigger")`
  **fails**. Update: **drop `"Hide options panel"` from the `:3435` array** (keep
  `"Collapse toolbar"` and `"Duplicate section"`, which survive), and revise the `:3432`–`:3434`
  comment (which currently records the TASK-495-02 decision this removal reverses — *"the
  builder chrome (page host) replaces the legacy drag handle with a header 'Hide options
  panel' close button"*) to note the closer was removed by TASK-500-03. Do NOT weaken the
  two `"Collapse toolbar"`/`"Duplicate section"` assertions.

- All other `page-editor-*` suites (floating-panel, and the rest of v2-flow) stay green —
  the refactor cannot reach Pages behaviour beyond removing the one duplicate closer; the
  single `page-editor-v2-flow.test.tsx` presence-assertion above is the lone exception and is
  updated in lockstep with the removal.

**Gate:** `bun --cwd core lint`, `bun --cwd core lint:types`, `bun --cwd core test:bun`,
full vitest, the repo gate alias, and a real-input playwright smoke on `:5173==200`
(light + dark): open both the Screen entry-view builder and a Page, confirm the panel
hides via the top toggle only, reopens via the chip, and no in-canvas PanelRight closer is
present — live side-by-side vs the prototype.

---

## Acceptance criteria

1. The in-canvas / in-panel `PanelRight` "Hide panel" button is removed from BOTH
   `ScreenAuthoringCanvas` and the PageEditor builder rail head; the orphaned `PanelRight`
   import is dropped from `ScreenAuthoringCanvas` (kept in PageEditor, still used).
2. The top-toolbar Hide/Show toggle + the reopen "Show panel" chip are the sole panel
   controls in both Pages and Screens; hide/reopen round-trips work in both.
3. The legacy Pages menu chrome (drag `GripVertical`, inline bottom-right reopen) is
   byte-unchanged; PageEditor is otherwise behaviour-identical.
4. Every retained a11y/`data-*` hook is intact (`data-screen-rail-head`,
   `data-page-editor-toolbar-row="head"`, `data-screen-editor-panel`,
   `data-page-editor-floating-toolbar`, the top toggle's `aria-label`/`aria-pressed`, the
   reopen chip's `aria-label="Show panel"`); no net a11y loss.
5. The new dedupe suite pins "exactly one hide surface" for Pages + Screens; all existing
   panel/toggle suites stay green (not weakened); full gate + playwright smoke pass.
6. No schema/model/route/RBAC change; TASK-498 look parity and `schemaVersion:1` hold.
</content>
</invoke>
