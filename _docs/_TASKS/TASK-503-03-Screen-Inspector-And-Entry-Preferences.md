# TASK-503-03: Screen Inspector & Entry Preferences
# FileName: TASK-503-03-Screen-Inspector-And-Entry-Preferences.md

**Parent Task:** TASK-503
**Priority:** High
**Category:** Admin UI / Custom Screens / Screen Builder / Entry View
**Estimated Effort:** Medium
**Dependencies:** TASK-503-01 (hard — exports consumed here: `ScreenBlockStyleV1`, `screenBlockWidths`, `screenBlockAligns`, `screenImageRatios`, `SCREEN_BLOCK_MIN_HEIGHT_CLAMP`, exported `normalizeScreenImageSrc`, `ScreenBlockV1.style` key), TASK-503-02 (hard — `showFieldMetadata?: boolean` prop on `ScreenRuntimeRenderer` that this subtask threads), `PAGE_BLOCK_BOX_SPACING_CLAMP` (`core/services/pages/pageDocumentV2.ts:202`, already exported), `usePostEditorPreferences` as the preferences-hook pattern (`core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts`)
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

Inspector + entry-surface + preferences half of TASK-503 scopes **A** (Layout
inspector group + dead "Background" row removal), **C(i)** (per-user
`showFieldMetadata` preference, toggle UI, `bg-dotted` drop, prop threading)
and **E** (image `ratio` EnumRow per parent decision 3, filtered `src` write per
scope E2). Sole writer of:

```
EDIT core/admin/ui/custom-screens/ScreenBlockInspector.tsx      (Layout group, Background row removal, ratio EnumRow, filtered src draft write)
EDIT core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx   ("Field metadata" Switch in the CanvasEditor sub-toolbar, bg-dotted drop, threading)
EDIT core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx   (showFieldMetadata pass-through)
ADD  core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts (NEW localStorage hook)
     core/admin/ui/custom-screens/CustomScreenPreview.tsx       (VERIFY-ONLY — no change; preview keeps badges by the 503-02 gate)
```

Out of scope here: schema/validator (`customScreenSchemas.ts` = 503-01 only),
all renderer emission/gating/drag-handle/label work
(`ScreenRuntimeRenderer.tsx` = 503-02 only), full test matrix + smoke + docs +
changelog (503-04).

**Land order:** after 503-01 AND 503-02 — this file imports 503-01's exported
types/constants and passes 503-02's new renderer prop; landing early fails
`tsc` loud, never silently.

---

## Current State (verified against `feature/visual` source, 2026-07-02 — `CustomScreenEntryEditor.tsx`/`ScreenRuntimeRenderer.tsx` can read as binary to `rg`; use `Read`/`grep -an`)

- **Dead "Background" row** — `ScreenBlockInspector.tsx:729-739`: unconditional
  free-text `Input` writing `block.variant` via
  `onPatchBlock(id, { variant: value.trim() || undefined })`. The renderer
  never reads `block.variant` (only `data.variant` for divider/button/
  related-list — those per-kind "Variant" `EnumRow`s at `:551-560`, `:635-644`,
  `:677-686` write `data.variant`, a DIFFERENT key, and are NOT touched).
  Parent decision 1: **REMOVE** the row; the `variant` key stays accepted by
  the schema (503-01 leaves the allow-list untouched) so stored documents stay
  byte-stable.
- **No layout controls** — the inspector has zero width/align/margin/padding
  controls; `handlePatchBlock` (`CustomScreenEditorPage.tsx:555-560`) merges a
  partial block patch via `updateScreenBlock`
  (`screenDocumentOps.ts:619-629`: `{ ...block, ...patch, data: patch.data ?? block.data }`)
  — so `onPatchBlock(id, { style })` replaces the `style` key wholesale;
  `{ style: undefined }` leaves an `undefined`-valued key in memory, which
  `JSON.stringify` and the 503-01 spread-emit normalizer both drop (absent-key
  byte-stability holds end-to-end).
- **Ratio free-text row** — `ScreenBlockInspector.tsx:600-606`: `InspectorRow`
  + `Input` writing raw `data.ratio` (placeholder `e.g. 16/9 (optional)`);
  dead until 503-02 wires the renderer. Parent decision 3: enum
  `auto|1/1|4/3|16/9|3/2`, legacy free text displays as `auto` and is only
  rewritten on the next user change (read path untouched).
- **Unfiltered src write** — `ScreenBlockInspector.tsx:584-590`: `onChange`
  writes the raw string to `data.src`; `normalizeScreenImageSrc`
  (`customScreenSchemas.ts:427-434`, module-local today, EXPORTED by 503-01)
  runs only on save, and the builder previews an unbound static src
  immediately (`ScreenRuntimeRenderer.tsx:1033`) — unsafe schemes reach
  `<img src>` pre-save.
- **Entry-mode badges** — `ScreenRuntimeRenderer.tsx:838-846`
  ("Editable"/"Read"/"Unbound") render whenever `mode !== "builder"` (already
  absent in builder). The uppercase field-type badge `:851-855` has NO mode
  gate today (`{field ? … : null}`), so it renders in ALL modes — builder
  INCLUDED. 503-02 gates the two SEPARATELY (2-vs-1 divergence): the binding
  badges (`:838-846`) get `mode === "preview" || (mode === "entry" &&
  showFieldMetadata)`, while the field-type badge (`:851-855`) gets a SEPARATE
  gate that KEEPS it in builder (`field && (mode === "builder" ||
  showBindingBadges)`) — only its ENTRY appearance is gated. This subtask
  supplies the prop value only; it does NOT describe a uniform builder-excluding
  gate.
- **Entry canvas noise** — `CustomScreenEntryEditor.tsx:1302`: the canvas
  scroller carries `bg-dotted` (builder affordance leaked into the record
  view). The `CanvasEditor` shell (`core/admin/ui/shared/CanvasEditor.tsx`)
  exposes a `toolbar?: ReactNode` slot (`:43-48` — "host control cluster
  rendered VERBATIM on the right of the sub-toolbar") that
  `CustomScreenEntryEditor` does not use yet.
- **Presentation panel is CONDITIONAL** — `presentationPanel`
  (`CustomScreenEntryEditor.tsx:994-995`) renders `null` unless
  `screen && canEditInScreen && !isCreateMode && selectedPresentationTarget`
  (i.e. a block with a resolvable presentation target is selected).
- **Threading path** — `CustomScreenEntryCanvas.tsx:28-63` is a thin
  pass-through to `<ScreenRuntimeRenderer mode="entry" …>`;
  `CustomScreenPreview.tsx:48-58` renders `mode="preview"` and needs no prop
  (preview keeps badges).
- **Preferences precedent** — `usePostEditorPreferences.ts`: storage-key
  constant + `normalize*` + storage-injectable resolver + `useState`
  initializer + persist effect. The post hook also syncs `userSettingsClient`;
  parent contract pins the screen hook to **local-only v1** (no server sync).

### Placement decision (normative for this subtask)

The "Show field metadata" toggle goes in the **CanvasEditor sub-toolbar
(`toolbar` prop)** of the entry editor — NOT inside the Presentation panel.
Justification: the Presentation panel is `null` until a presentation-capable
block is selected (`:994-995`), which would make a default-OFF preference
unreachable on a fresh record view; parent smoke scenario 3 requires toggling
on a FRESH entry view, and the parent phrasing ("entry editor header /
Presentation panel") explicitly allows the header chrome. One placement only —
no duplicate control in the panel.

---

## Implementation (execution-ready)

### 1. NEW `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts`

`usePostEditorPreferences` pattern, local-only v1 (no `userSettingsClient`
sync — conscious deviation pinned by the parent contract). Whole file:

```ts
import { useCallback, useEffect, useState } from "react";

// TASK-503-03: per-user, per-browser entry-view preferences (localStorage only,
// v1 — no userSettingsClient sync; the usePostEditorPreferences pattern minus
// the server round-trip). Client state only: no route/RBAC/endpoint surface.
export const SCREEN_ENTRY_PREFERENCES_STORAGE_KEY =
  "coderso.screens.entry.preferences.v1";

export type ScreenEntryPreferences = {
  /** Entry-view field badges ("Editable"/"Read"/"Unbound" + field type). DEFAULT OFF. */
  showFieldMetadata: boolean;
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = {
  showFieldMetadata: false,
};

export type ScreenEntryPreferencesStorage = Pick<Storage, "getItem" | "setItem">;

// Coerce-not-throw: non-record / array / non-boolean member → defaults.
export const normalizeScreenEntryPreferences = (raw: unknown): ScreenEntryPreferences => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
  const record = raw as Record<string, unknown>;
  return {
    showFieldMetadata:
      typeof record.showFieldMetadata === "boolean"
        ? record.showFieldMetadata
        : DEFAULT_SCREEN_ENTRY_PREFERENCES.showFieldMetadata,
  };
};

// Storage-injectable for tests (fake storage), parse/storage errors swallowed.
export const resolveStoredScreenEntryPreferences = (
  storage: ScreenEntryPreferencesStorage
): ScreenEntryPreferences => {
  try {
    const raw = storage.getItem(SCREEN_ENTRY_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_SCREEN_ENTRY_PREFERENCES;
    return normalizeScreenEntryPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
};

const resolveInitialScreenEntryPreferences = (): ScreenEntryPreferences =>
  typeof window === "undefined"
    ? DEFAULT_SCREEN_ENTRY_PREFERENCES
    : resolveStoredScreenEntryPreferences(window.localStorage);

type UseScreenEntryPreferencesResult = {
  preferences: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
};

export function useScreenEntryPreferences(): UseScreenEntryPreferencesResult {
  const [preferences, setPreferencesState] = useState<ScreenEntryPreferences>(
    resolveInitialScreenEntryPreferences
  );

  const setPreferences = useCallback((next: ScreenEntryPreferences) => {
    setPreferencesState(normalizeScreenEntryPreferences(next));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SCREEN_ENTRY_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences)
      );
    } catch {
      // Quota/blocked storage is non-fatal — the toggle still works this session.
    }
  }, [preferences]);

  return { preferences, setPreferences };
}
```

### 2. `CustomScreenEntryEditor.tsx` — toggle + surface flatten + threading

```tsx
// Imports (add):
import { Switch } from "@/components/ui/switch";
import { useScreenEntryPreferences } from "./hooks/useScreenEntryPreferences";

// Component body (near the other hooks):
const { preferences: entryPreferences, setPreferences: setEntryPreferences } =
  useScreenEntryPreferences();

// CanvasEditor (:1274-1328) gains the sub-toolbar control cluster
// (renders whenever the entry canvas renders — no selection required):
toolbar={
  <label
    className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
    data-screen-entry-metadata-toggle="true"
  >
    <span>Field metadata</span>
    <Switch
      size="sm"
      checked={entryPreferences.showFieldMetadata}
      onCheckedChange={(checked) =>
        setEntryPreferences({ ...entryPreferences, showFieldMetadata: checked })
      }
      aria-label="Show field metadata"
    />
  </label>
}

// Canvas scroller (:1302) — drop the builder-only dotted texture, everything
// else (overflow, padding, data attribute, panel padding, click-to-deselect)
// byte-identical:
- className="min-h-0 flex-1 overflow-auto overscroll-contain bg-dotted p-6 lg:p-8"
+ className="min-h-0 flex-1 overflow-auto overscroll-contain p-6 lg:p-8"

// Threading (:1310-1324):
<CustomScreenEntryCanvas
  …existing props unchanged…
  showFieldMetadata={entryPreferences.showFieldMetadata}
/>
```

The `CustomScreenPreview` fallback branch (`:1333-1341`, non-writable screens)
passes nothing — preview mode always shows badges (503-02 gate). The
Presentation panel body (`:994-1166`) is untouched.

### 3. `CustomScreenEntryCanvas.tsx` — pass-through

```tsx
type CustomScreenEntryCanvasProps = {
  …existing…
  // TASK-503-03: entry-view badge gating (per-user preference, default off).
  showFieldMetadata?: boolean;
};

export function CustomScreenEntryCanvas({ …existing…, showFieldMetadata }: …) {
  return (
    <ScreenRuntimeRenderer
      …existing props unchanged…
      showFieldMetadata={showFieldMetadata}
    />
  );
}
```

### 4. `ScreenBlockInspector.tsx` — Layout group + `buildStylePatch`

**Imports (add):**

```ts
import {
  normalizeScreenImageSrc,   // exported by 503-01
  screenBlockAligns,
  screenBlockWidths,
  screenImageRatios,
  SCREEN_BLOCK_MIN_HEIGHT_CLAMP,
  type ScreenBlockStyleV1,
} from "../../../services/customScreens/customScreenSchemas";
import { PAGE_BLOCK_BOX_SPACING_CLAMP } from "../../../services/pages/pageDocumentV2";
```

(Services import, NOT `@/ui/pages` — the boundary suite
`tests/vitest/ui/custom-screen-authoring-boundary.test.ts` forbids only
`@/ui/pages` / page-builder / widget-runtime imports for custom-screens UI;
`menuDocumentV2.ts` is the services-constant-import precedent. Do NOT import
anything from `@/ui/pages/*`.)

**Pure helper (module-scope, EXPORTED for unit tests):**

```ts
const screenBoxSides = ["top", "right", "bottom", "left"] as const;
type ScreenBoxSide = (typeof screenBoxSides)[number];

/** Sentinel for "no align key" — align "start" (mr-auto) is NOT a no-op, so it
 *  persists explicitly; only the sentinel prunes. Width "auto" IS the no-op
 *  default (empty class in the 503-02 map), so "auto" prunes. */
export const SCREEN_ALIGN_DEFAULT_OPTION = "__default__";

export type ScreenBlockStyleEdit =
  | { kind: "width"; value: string }      // "auto" or unknown → prune key
  | { kind: "align"; value: string }      // sentinel or unknown → prune key
  | { kind: "minHeight"; value: string }  // "" / non-finite → prune; else floor+clamp 0..640
  | { kind: "box"; box: "margin" | "padding"; side: ScreenBoxSide; value: string };
                                          // "" / non-finite → prune side; else floor+clamp 0..240

const clampTo = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(value)));

export const buildStylePatch = (
  current: ScreenBlockStyleV1 | undefined,
  edit: ScreenBlockStyleEdit
): ScreenBlockStyleV1 | undefined => {
  const next: ScreenBlockStyleV1 = { ...(current ?? {}) };
  switch (edit.kind) {
    case "width": {
      if (edit.value === "auto" || !(screenBlockWidths as readonly string[]).includes(edit.value)) {
        delete next.width;
      } else {
        next.width = edit.value as ScreenBlockStyleV1["width"];
      }
      break;
    }
    case "align": {
      if (
        edit.value === SCREEN_ALIGN_DEFAULT_OPTION ||
        !(screenBlockAligns as readonly string[]).includes(edit.value)
      ) {
        delete next.align;
      } else {
        next.align = edit.value as ScreenBlockStyleV1["align"];
      }
      break;
    }
    case "minHeight": {
      const parsed = Number(edit.value);
      if (edit.value.trim() === "" || !Number.isFinite(parsed)) {
        delete next.minHeight;
      } else {
        next.minHeight = clampTo(
          parsed,
          SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min,
          SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max
        );
      }
      break;
    }
    case "box": {
      const record = { ...(next[edit.box] ?? {}) };
      const parsed = Number(edit.value);
      if (edit.value.trim() === "" || !Number.isFinite(parsed)) {
        delete record[edit.side];
      } else {
        record[edit.side] = clampTo(
          parsed,
          PAGE_BLOCK_BOX_SPACING_CLAMP.min,
          PAGE_BLOCK_BOX_SPACING_CLAMP.max
        );
      }
      if (Object.keys(record).length === 0) delete next[edit.box];
      else next[edit.box] = record;
      break;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
};
```

Sparse-and-pruned by construction: clearing the last control returns
`undefined` → `onPatchBlock(id, { style: undefined })` → the in-memory
`undefined` key is invisible to `JSON.stringify` and to the 503-01
spread-emit normalizer, so a document whose Layout controls were touched and
fully reverted still saves byte-identical (guarded by a test below). Inputs
are the ONLY untrusted surface and every path through `buildStylePatch` ends
in an allow-listed enum member or a clamped int — plus the save-path 503-01
validator re-clamps everything (defense-in-depth).

**Layout group JSX** — rendered UNCONDITIONALLY for every selected block
(exactly like the Background row it replaces; `style` applies via the 503-02
`wrap()` so every kind, including `legacy-widget`, honors it). Placed exactly
where the Background row was (after the `legacy-widget` note, end of body);
the Background row `:729-739` is DELETED:

```tsx
{/* TASK-503-03: block-level Layout (ScreenBlockStyleV1). Replaces the dead
    free-text "Background" row (block.variant — never read by the renderer;
    parent decision 1: removed, key still accepted by the schema). */}
<div className="flex flex-col gap-4" data-screen-layout-group="true">
  <EnumRow
    label="Width"
    value={selectedBlock.style?.width ?? "auto"}
    options={[
      { value: "auto", label: "Auto" },
      { value: "full", label: "Full" },
      { value: "half", label: "Half" },
      { value: "third", label: "Third" },
      { value: "two-thirds", label: "Two thirds" },
    ]}
    onChange={(value) => commitStyle({ kind: "width", value })}
  />
  <EnumRow
    label="Align"
    value={selectedBlock.style?.align ?? SCREEN_ALIGN_DEFAULT_OPTION}
    options={[
      { value: SCREEN_ALIGN_DEFAULT_OPTION, label: "Default" },
      { value: "start", label: "Start" },
      { value: "center", label: "Center" },
      { value: "end", label: "End" },
      { value: "stretch", label: "Stretch" },
    ]}
    onChange={(value) => commitStyle({ kind: "align", value })}
  />
  <InspectorRow label="Min height (px)">
    <Input
      type="number"
      inputMode="numeric"
      min={SCREEN_BLOCK_MIN_HEIGHT_CLAMP.min}
      max={SCREEN_BLOCK_MIN_HEIGHT_CLAMP.max}
      value={selectedBlock.style?.minHeight ?? ""}
      placeholder="Auto"
      onChange={(event) => commitStyle({ kind: "minHeight", value: event.target.value })}
    />
  </InspectorRow>
  <BoxSpacingRow box="margin" label="Margin" style={selectedBlock.style} onEdit={commitStyle} />
  <BoxSpacingRow box="padding" label="Padding" style={selectedBlock.style} onEdit={commitStyle} />
</div>
```

with the local helpers:

```tsx
// inside ScreenBlockInspector body:
const commitStyle = (edit: ScreenBlockStyleEdit) => {
  onPatchBlock(selectedBlock.id, { style: buildStylePatch(selectedBlock.style, edit) });
};

// module scope:
const boxSideLabels: ReadonlyArray<[ScreenBoxSide, string]> = [
  ["top", "Top"], ["right", "Right"], ["bottom", "Bottom"], ["left", "Left"],
];

function BoxSpacingRow({ box, label, style, onEdit }: {
  box: "margin" | "padding";
  label: string;
  style: ScreenBlockStyleV1 | undefined;
  onEdit: (edit: ScreenBlockStyleEdit) => void;
}) {
  return (
    <InspectorRow label={`${label} (px)`}>
      <div className="grid grid-cols-4 gap-2">
        {boxSideLabels.map(([side, sideLabel]) => (
          <Input
            key={side}
            type="number"
            inputMode="numeric"
            min={PAGE_BLOCK_BOX_SPACING_CLAMP.min}
            max={PAGE_BLOCK_BOX_SPACING_CLAMP.max}
            aria-label={`${label} ${sideLabel.toLowerCase()}`}
            value={style?.[box]?.[side] ?? ""}
            placeholder={sideLabel}
            onChange={(event) => onEdit({ kind: "box", box, side, value: event.target.value })}
          />
        ))}
      </div>
    </InspectorRow>
  );
}
```

Rationale for including "Min height": `minHeight` is part of the 503-01
`ScreenBlockStyleV1` contract and the 503-02 emission; shipping the schema key
without a control would create a write-orphaned prop — the exact "dead
control/prop" class this task exists to eliminate.

### 5. `ScreenBlockInspector.tsx` — image `ratio` EnumRow + filtered `src` write

**Ratio (`:600-606` free-text row → EnumRow, parent decision 3):**

```tsx
<EnumRow
  label="Ratio"
  value={
    (screenImageRatios as readonly string[]).includes(readString(selectedBlock.data.ratio))
      ? readString(selectedBlock.data.ratio)
      : "auto" // legacy free text (e.g. "16:9") DISPLAYS as Auto; the stored
               // value is only rewritten when the user changes the control
  }
  options={[
    { value: "auto", label: "Auto" },
    { value: "1/1", label: "Square (1:1)" },
    { value: "4/3", label: "4:3" },
    { value: "16/9", label: "16:9" },
    { value: "3/2", label: "3:2" },
  ]}
  onChange={(value) => patchData({ ratio: value })}
/>
```

**Src (`:584-590` raw write → draft + prefix filter, scope E2):** the raw text
lives in a LOCAL draft so typing `https://…` character-by-character is not
destroyed, while `data.src` only ever receives the filtered value — the same
`normalizeScreenImageSrc` the save path runs (single source of truth,
exported by 503-01). Extract a small component (local state is per-block via
the id check):

```tsx
function ImageSrcRow({ block, onPatchBlockData }: {
  block: ScreenBlockV1;
  onPatchBlockData: ScreenBlockInspectorProps["onPatchBlockData"];
}) {
  const committed = readString(block.data.src);
  const [draft, setDraft] = useState<{ blockId: string; value: string } | null>(null);
  const value = draft && draft.blockId === block.id ? draft.value : committed;
  return (
    <InspectorRow label="Image URL">
      <Input
        value={value}
        placeholder="https://… or /media/… — used when no field is bound"
        onChange={(event) => {
          const raw = event.target.value;
          setDraft({ blockId: block.id, value: raw });
          // Unsafe/incomplete → "" (placeholder renders); safe → verbatim.
          onPatchBlockData(block.id, { src: normalizeScreenImageSrc(raw) });
        }}
      />
    </InspectorRow>
  );
}
```

Replace the inline `:584-590` row with `<ImageSrcRow block={selectedBlock}
onPatchBlockData={onPatchBlockData} />`. Behavior notes (documented, tested):
- typing `/media/next.png` or `https://x/y.png` commits verbatim on every
  keystroke once the safe prefix is complete (existing test
  `custom-screen-image-inspector.test.tsx` "typing … patches data.src" stays
  green unchanged — safe values are idempotent through the filter);
- typing `javascript:alert(1)` or a partial `https:/` keeps the DRAFT visible
  in the input while `data.src` holds `""` — no unsafe scheme ever reaches the
  document, and (with the 503-02 builder-preview gate) never reaches
  `<img src>` either (two independent layers);
- selecting a different block drops the draft (id mismatch → committed value
  shows); placeholder copy is byte-identical (pinned by the existing test).

`useState` is added to the react import of `ScreenBlockInspector.tsx`
(currently type-only `ReactNode` import — becomes
`import { useState, type ReactNode } from "react";`).

---

## Error handling

- `buildStylePatch`: never throws — empty/NaN input prunes, floats floor,
  out-of-range clamps; unknown enum strings prune (coerce-not-throw, matching
  the screen module style). The 503-01 save-path validator is the hard gate.
- Hook: `JSON.parse` failures, missing keys, junk shapes, and
  `localStorage` get/set exceptions (quota, blocked third-party storage) are
  all swallowed to defaults — a broken storage never breaks the record view.
- `ImageSrcRow`: `normalizeScreenImageSrc` never throws (returns `""`); the
  input itself is uncontrolled-in-spirit (draft), so there is no focus loss.

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration.** The one input surface = (a) the
`ScreenBlockStyleV1` validator clamps (every Layout control commits through
`buildStylePatch` → allow-listed enum member or clamped int, re-validated by
the 503-01 normalizer on save; raw text can never reach a style emission) and
(b) the `normalizeScreenImageSrc` prefix filter (`/`, `http://`, `https://`;
everything else → `""`), now enforced on the inspector WRITE path in addition
to the existing save path (and the 503-02 builder-preview gate). Preferences
are localStorage-only client state — no server surface, no PII (one boolean).
Non-destructive / byte-stability guards (named): absent `style` stays absent
(prune-to-`undefined` + spread-emit); `variant` stays accepted on read/write
(only the dead control is removed); legacy `ratio` free text is rewritten on
user WRITE only, never on read; stored-V4 byte-stability suite untouched; NO
schemaVersion bump. Cross-cutting no-regress: TASK-498 presentation-override
surface untouched (`presentationPanel` body not edited), Bun-free boundary
(no `@/ui/pages` imports — the new hook file joins the boundary guard in
503-04), palette/insertion behavior and `PaletteChip` dead-code guard
untouched.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` — Vitest Bun-free lanes; this subtask's slice, 503-04 owns the full matrix + smoke)

**NEW `tests/vitest/ui/use-screen-entry-preferences.test.ts`** (Admin/UI lane,
happy-dom):
- default OFF when storage is empty; storage-key constant pinned to
  `"coderso.screens.entry.preferences.v1"`;
- `normalizeScreenEntryPreferences`: non-record / array / string /
  `{ showFieldMetadata: "yes" }` → defaults; `{ showFieldMetadata: true }`
  round-trips;
- `resolveStoredScreenEntryPreferences` with a fake storage: valid JSON reads
  back, invalid JSON + throwing `getItem` swallow to defaults;
- hook persist: toggle → `localStorage` holds the serialized preferences;
  remount reads it back (reload survival).

**EXTEND `tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx`**
(reuse its existing `mount`/`renderInspector` harness — this is the single home
for the Layout-group + `buildStylePatch` coverage; no new inspector test file):
- the three existing tests stay green UNCHANGED (safe src verbatim, image-only
  row, bound+static coexistence);
- Layout group (`[data-screen-layout-group]`) renders for a `field` block AND
  a `columns` container (unconditional, replaces Background);
- the string "Background" is ABSENT for field/text/image kinds, while the
  divider/button/related-list per-kind "Variant" `EnumRow`s (writing
  `data.variant`) still render — the removal did not overshoot;
- `buildStylePatch` unit block (exported): width `"half"` sets / `"auto"`
  prunes; align `"center"` sets / sentinel prunes / `"start"` PERSISTS
  (explicit, not pruned); minHeight `"9999"` → 640, `"12.7"` → 12, `""` and
  `"abc"` prune; box margin top `"999"` → 240, clearing the only side prunes
  the record; clearing the last key returns `undefined`;
- margin-top input commit → `onPatchBlock("id", { style: { margin: { top: 24 } } })`
  (spy assertion, exact shape); full revert → `{ style: undefined }`;
- Ratio is now a select: options exactly `auto|1/1|4/3|16/9|3/2`, choosing
  `16/9` → `onPatchBlockData("image-1", { ratio: "16/9" })`; a stored legacy
  `"16:9"` displays as Auto and fires NO write until changed;
- src filter: typing `javascript:alert(1)` → commit `{ src: "" }` while the
  input keeps showing the draft; partial `https:/` → `{ src: "" }`; completed
  `https://x/y.png` → verbatim commit.

**EXTEND `tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`**
(the suite that mounts `CustomScreenEntryEditor`):
- the sub-toolbar toggle (`[data-screen-entry-metadata-toggle]`) renders on
  the entry view with the Switch unchecked by default;
- the canvas scroller (`[data-screen-editor-canvas-scroller]`) no longer
  carries `bg-dotted`; other scroller classes byte-identical;
- toggling ON writes the preference to `localStorage` AND flips the badge
  visibility through the threaded prop (integration with the 503-02 gate:
  badges absent by default, present after toggle);
- `CustomScreenPreview` path untouched: preview mode still renders badges
  with no prop passed.

**Regression pins (verify green, not edited here):**
`tests/vitest/ui/custom-screen-authoring-boundary.test.ts` (503-04 extends the
guard to the hook file; this subtask must not introduce `@/ui/pages` imports),
stored-V4 byte-stability suite, `custom-screen-editor-binding-flow.test.tsx`.

**Smoke coverage (executed in 503-04, owner mandate):** parent scenarios 1
(style end-to-end with computed-style asserts), 3 (metadata toggle on/off +
reload survival + clean surface) and 5 (ratio + unsafe src) exercise this
subtask's surfaces — keep the `data-screen-entry-metadata-toggle` /
`data-screen-layout-group` hooks stable for it.

**Gates before hand-off:** `bun --cwd core lint`, `bun --cwd core lint:types`,
root `tsc -p tsconfig.json --noEmit` (tests are OUTSIDE core's tsconfig —
known gotcha), the suites above.

---

## Acceptance Criteria

1. Inspector shows the Layout group (Width/Align/Min height/Margin/Padding)
   for every block kind; committing width `half` + margin.top `24` writes
   `{ style: { width: "half", margin: { top: 24 } } }` through `onPatchBlock`;
   reverting all controls yields `{ style: undefined }` and the saved document
   is byte-identical to the pre-edit document.
2. The free-text "Background" row is gone; `variant` still round-trips through
   the schema; divider/button/related-list `data.variant` controls unaffected.
3. Fresh entry view: no badges, no `bg-dotted`; the sub-toolbar "Field
   metadata" Switch (default OFF) turns badges on, survives a reload via
   `coderso.screens.entry.preferences.v1`, and turns them off again; builder
   and preview chrome untouched from this file (renderer gating is 503-02's).
4. Image Ratio is an enum select writing only allow-listed values; legacy free
   text reads as Auto without a stealth write. Typing an unsafe scheme into
   Image URL never commits it (`data.src` = `""`) while the draft stays
   visible; safe URLs commit verbatim per keystroke.
5. All suites in Testing Requirements green; no new `@/ui/pages` import
   anywhere in `core/admin/ui/custom-screens/**`.

---

## Notes for 503-04 (closure hand-off)

- Test ids introduced here: `data-screen-entry-metadata-toggle`,
  `data-screen-layout-group` (+ existing `data-screen-editor-canvas-scroller`).
- Boundary guard extension target: `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts`.
- Docs: preference storage key + default OFF; Layout group clamps/enums;
  ratio legacy-free-text display rule; the "clear the legacy record-header
  copy" authoring note (parent decision 2) is 503-04's doc item, but the
  eyebrow/subtitle inputs this file already exposes
  (`ScreenBlockInspector.tsx:370-381`) are the authoring path it documents.
