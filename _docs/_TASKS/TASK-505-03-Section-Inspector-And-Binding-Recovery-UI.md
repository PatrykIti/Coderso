# TASK-505-03

# FileName: TASK-505-03-Section-Inspector-And-Binding-Recovery-UI.md

**Parent Task:** TASK-505
**Priority:** High
**Category:** Custom-Screens — editor UX (section inspector + binding recovery)
**Estimated Effort:** Medium
**Dependencies:** TASK-505-01 (ships `ScreenSectionStyleV1`, `screenSectionColumnPresets`, `SCREEN_SECTION_COLUMN_GAP_CLAMP`, the `ScreenSectionPatch` `"style"` extension, `reconcileScreenBindings`, and the `custom_screen_definition_invalid` error whose user-message string is byte-frozen and whose offending field name(s) ride the response DETAIL — `err.details.fields`). TASK-505-02 (renderer consumes `section.style`). Rides TASK-498/500/503 surfaces. **Lands third, after 505-02 is green.**
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

Editor/UI side of both TASK-505 items — the **only** subtask that touches interactive admin components.

- **Item A (Section inspector).** Today a selected *section* has **no inspector at all** (the Inspect rail category is `disabled: !selectedBlock` — `ScreenAuthoringCanvas.tsx:319` — and `ScreenBlockInspector` early-returns "Select a block" when `!selectedBlock` — `ScreenBlockInspector.tsx:460-466`). Add a **section inspector** (a Columns `EnumRow` + a column-gap number input) shown when `selectedSectionId && !selectedBlockId`, enable the Inspect category for sections, and wire `handlePatchSection` on the host through `updateScreenSection(document, id, { style })`.
- **Item B (Binding recovery affordance).** Surface the previously-opaque un-saveable dead-end: (1) a **proactive** inline notice + a **"Remove orphaned bindings"** action that prunes client-side bindings whose `blockId` has no live block OR whose `field` root is missing from the content type — so the user recovers **without even saving**; (2) a **post-save** notice naming the field(s) the 505-01 save-path GC pruned (derived by diffing sent-vs-returned bindings — no new response shape); (3) for the residual malformed-binding 400, the static `custom_screen_definition_invalid` message plus any field name(s) from the error **DETAIL** (`err.details.fields`, from 505-01 — the user-message string stays byte-frozen) shown in the existing error `Alert`.

**Single-writer ownership (this subtask):**
`core/admin/ui/custom-screens/ScreenBlockInspector.tsx`, `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx`, `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx`. **No schema/service/renderer LOGIC edits here** (those are 505-01/02) — with **one narrow, named type-only exception:** this subtask adds the single optional field `warnings?: CustomScreenBindingWarning[]` to the ADMIN client record type `CustomScreenRecord` in `core/admin/services/customScreensClient.ts:61` (see B3). 505-01's owned files are the four **server** files (`customScreenSchemas`/`screenDocumentOps`/`customScreenService`/`customScreenRoutes`) and it explicitly does **not** touch the admin client; the server-side `CustomScreenRecord` 505-01 B5 widens is a **distinct declaration** from this admin client type. The exception is a type-field addition only — no runtime/logic change (the field is populated by the raw server response, not by any client code).

---

## Security Contract

**UI/client-state + schema-first document contract extension; the binding-GC runs in the existing definition normalize/save path — no new route/RBAC/endpoint/migration.**

Verified for THIS subtask (Read + `grep -an`):

- **No route/service/RBAC added.** All three owned files are admin React components. The save call is the unchanged `updateCustomScreen(screenId, payload)` (`CustomScreenEditorPage.tsx:647`) → the existing `PATCH /custom-screens/:id` (`content:write`-gated, `customScreenRoutes.ts:115`). This subtask adds **no** client route, method, or auth path.
- **Section-style write rides the existing envelope.** `handlePatchSection` produces a `ScreenSectionPatch` with the new `"style"` key (extension owned by 505-01, `screenDocumentOps.ts:30-32`) fed to `updateScreenSection` (`screenDocumentOps.ts:631`) → `updateEditorView` → the same `definition` PATCH payload (`CustomScreenEditorPage.tsx:632-639`). No new persisted key beyond 505-01's document contract; `schemaVersion` unchanged.
- **Client-side prune is non-destructive + local.** The "Remove orphaned bindings" action mutates only in-memory `editorView.bindings` (drops orphans, preserves source order of valid bindings) via `updateEditorView`; it persists only on the user's existing Save. It never fabricates a binding and never touches a binding with a live block + live field.
- **Post-save notice reads only data already returned.** Field names come from diffing the bindings we sent vs the bindings on the returned `CustomScreenRecord` (both already in the client), plus — on the residual malformed-binding 400 — the `err.details.fields` array from 505-01 (the error `message` string is byte-frozen). No new field is exfiltrated; no PII beyond content-type field names the author already authored.
- **Bun-free boundary preserved.** `tests/vitest/ui/custom-screen-authoring-boundary.test.ts:53-77` forbids `/@\/ui\/pages/`, `/ui\/pages\/builder/`, `/@\/ui\/widgets/`, `/ui\/widgets\/registry/`, `/WidgetRenderer/` in exactly these three files. All new imports use `@/components/ui/*` + the existing `../../../services/customScreens/*` — **no new `@/ui/pages` / widget import.**

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with the app's CSRF/session envelope; this subtask neither loosens nor adds an auth path.

---

## Grounded anchors (verified Read + `grep -an`)

| Anchor | Location | Role |
|---|---|---|
| `EnumRow` (flat Select row) | `ScreenBlockInspector.tsx:186-213` | reused for the Columns control |
| `InspectorRow` (label-over-control) | `ScreenBlockInspector.tsx:105-112` | reused for the gap input |
| `buildStylePatch` (read-current → merge → prune) | `ScreenBlockInspector.tsx:239-295` | pattern mirror for `buildSectionLayoutPatch` |
| `SCREEN_ALIGN_DEFAULT_OPTION` sentinel | `ScreenBlockInspector.tsx:227` | pattern for the "stacked (default)" sentinel |
| `!selectedBlock` early return | `ScreenBlockInspector.tsx:460-466` | block inspector stays untouched; section inspector is a NEW component |
| block-level Layout group | `ScreenBlockInspector.tsx:898-946` | the 503 style-authoring precedent |
| Inspect category `disabled: !selectedBlock` | `ScreenAuthoringCanvas.tsx:319` | widen to include sections |
| `railBodyContent` inspect branch | `ScreenAuthoringCanvas.tsx:333-367` | fork block vs section inspector |
| `selectTarget` (block forces `inspect`) | `ScreenAuthoringCanvas.tsx:262-277` | section branch also forces `inspect` |
| `selectedBlock` / `selection` | `ScreenAuthoringCanvas.tsx:208-219` | selection state already threaded |
| canvas props type | `ScreenAuthoringCanvas.tsx:47-91` | add `onPatchSection` |
| `handlePatchBlock` | `CustomScreenEditorPage.tsx:555-560` | pattern mirror for `handlePatchSection` |
| section-op import block (`:66` is `updateScreenBlock`; `updateScreenSection` + `type ScreenSectionPatch` are **NOT yet imported** — A4 ADDS both here) | `CustomScreenEditorPage.tsx:55-69` | host op + patch type for the section patch |
| `updateEditorView` | `CustomScreenEditorPage.tsx:274-290` | single write funnel |
| `handleSave` + error handling | `CustomScreenEditorPage.tsx:619-660` | post-save warning notice + residual-400 display (static message + `err.details.fields`) |
| `applyScreen` | `CustomScreenEditorPage.tsx:292-306` | returned record → new bindings for the diff |
| `error` state + `Alert` | `CustomScreenEditorPage.tsx:184, 833-840` | reuse for the residual 400 (static message + `err.details.fields`) |
| `screenBindings` / `contentFields` | `CustomScreenEditorPage.tsx:174, 202-205` | inputs to orphan detection |
| `<ScreenAuthoringCanvas … />` render | `CustomScreenEditorPage.tsx:860-896` | thread `onPatchSection` + orphan props |
| `ScreenSectionPatch` (gains `"style"` @505-01) | `screenDocumentOps.ts:30-32` | patch shape consumed here |
| `custom_screen_definition_invalid` map (byte-frozen message; field on DETAIL @505-01) | `customScreenRoutes.ts:44-49` | field name(s) read from `err.details.fields`; message string unchanged |
| boundary test (this file set) | `custom-screen-authoring-boundary.test.ts:53-77` | forbidden-import guard |

---

## Item A — Section inspector (execution-ready)

### A1 — New style-edit type + `buildSectionLayoutPatch` (`ScreenBlockInspector.tsx`, beside `buildStylePatch`)

Imports added from `../../../services/customScreens/customScreenSchemas` (all shipped by 505-01):
`screenSectionColumnPresets`, `SCREEN_SECTION_COLUMN_GAP_CLAMP`, `type ScreenSectionStyleV1`, `type ScreenSectionV1`.

```ts
// Sentinel for "no columns" — absent columns === today's vertical stack. Picking
// it PRUNES the key (mirrors SCREEN_ALIGN_DEFAULT_OPTION @:227) so an unset
// section stays byte-identical through save.
export const SCREEN_SECTION_COLUMNS_DEFAULT_OPTION = "__stack__";

export type ScreenSectionStyleEdit =
  | { kind: "columns"; value: string }   // sentinel / unknown preset → prune key
  | { kind: "columnGap"; value: string }; // "" / non-finite → prune; else floor+clamp 0..64

// Read the CURRENT section.style, apply ONE edit, return the FULL merged object,
// prune empty → undefined. updateScreenSection REPLACES the `style` key wholesale
// (screenDocumentOps.ts:631 spreads the patch), so we must hand back the whole object.
export const buildSectionLayoutPatch = (
  current: ScreenSectionStyleV1 | undefined,
  edit: ScreenSectionStyleEdit
): ScreenSectionStyleV1 | undefined => {
  const next: ScreenSectionStyleV1 = { ...(current ?? {}) };
  switch (edit.kind) {
    case "columns": {
      if (
        edit.value === SCREEN_SECTION_COLUMNS_DEFAULT_OPTION ||
        !(screenSectionColumnPresets as readonly string[]).includes(edit.value)
      ) {
        delete next.columns;
      } else {
        next.columns = edit.value as ScreenSectionStyleV1["columns"];
      }
      break;
    }
    case "columnGap": {
      const parsed = Number(edit.value);
      if (edit.value.trim() === "" || !Number.isFinite(parsed)) {
        delete next.columnGap;
      } else {
        next.columnGap = clampTo(                     // clampTo @:236 (floor + min/max)
          parsed,
          SCREEN_SECTION_COLUMN_GAP_CLAMP.min,
          SCREEN_SECTION_COLUMN_GAP_CLAMP.max
        );
      }
      break;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
};
```

- Reuses the existing `clampTo` (`:236`). Junk/unknown preset → prune (harmless), matching 505-01's coerce-not-throw normalizer. Empty → `undefined` → **never persists for an unset section** (byte-stable guard, mirrors `buildStylePatch`).
- Human-labelled Columns options (label maps the fr intent for the author; `value` stays the raw preset so the round-trip is loss-free):

```ts
const screenSectionColumnOptions: ReadonlyArray<{ value: string; label: string }> = [
  { value: SCREEN_SECTION_COLUMNS_DEFAULT_OPTION, label: "Stacked (default)" },
  { value: "1", label: "1 column" },
  { value: "2", label: "2 equal" },
  { value: "3", label: "3 equal" },
  { value: "4", label: "4 equal" },
  { value: "1-1", label: "2 · equal (1:1)" },
  { value: "1-2", label: "2 · 1:2" },
  { value: "2-1", label: "2 · 2:1" },
  { value: "1-3", label: "2 · 1:3 (¼ · ¾)" },
  { value: "3-1", label: "2 · 3:1 (¾ · ¼)" },   // owner's Bathrooms label-left / value-right
  { value: "2-3", label: "2 · 2:3" },
  { value: "3-2", label: "2 · 3:2" },
  { value: "1-1-1", label: "3 · equal" },
  { value: "1-1-1-1", label: "4 · equal" },
];
```

### A2 — New exported `ScreenSectionInspector` component (`ScreenBlockInspector.tsx`)

A distinct, co-located component (the block inspector's `!selectedBlock` early-return stays untouched — no section/block branch tangling). It renders ONLY the section-layout group.

```ts
export function ScreenSectionInspector({
  section,                                   // ScreenSectionV1 | null
  onPatchSection,                            // (patch: { style?: ScreenSectionStyleV1 | undefined }) => void
}: {
  section: ScreenSectionV1 | null;
  onPatchSection: (patch: { style?: ScreenSectionStyleV1 | undefined }) => void;
}) {
  if (!section) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        Select a section on the canvas to edit its column layout.
      </div>
    );
  }
  const commitLayout = (edit: ScreenSectionStyleEdit) =>
    onPatchSection({ style: buildSectionLayoutPatch(section.style, edit) });

  return (
    <div className="flex flex-col gap-4" data-screen-section-layout-group="true">
      <EnumRow
        label="Columns"
        value={section.style?.columns ?? SCREEN_SECTION_COLUMNS_DEFAULT_OPTION}
        options={screenSectionColumnOptions}
        onChange={(value) => commitLayout({ kind: "columns", value })}
      />
      <InspectorRow label="Column gap (px)">
        <Input
          type="number"
          inputMode="numeric"
          min={SCREEN_SECTION_COLUMN_GAP_CLAMP.min}
          max={SCREEN_SECTION_COLUMN_GAP_CLAMP.max}
          value={section.style?.columnGap ?? ""}
          placeholder="16"
          // gap only takes visible effect once columns is set (renderer default 16 @505-02);
          // authoring it while stacked is harmless (pruned/ignored) — do NOT disable it.
          onChange={(event) => commitLayout({ kind: "columnGap", value: event.target.value })}
        />
      </InspectorRow>
      <p className="text-xs text-muted-foreground">
        Blocks flow left-to-right into the columns in canvas order. Pick “Stacked” to return to a
        single vertical column.
      </p>
    </div>
  );
}
```

- `section.style` is a **new** channel (505-01). Reads default to the sentinel/blank so an unset section shows "Stacked" + empty gap and writes nothing until the user changes a control (byte-stable).
- `EnumRow`/`InspectorRow`/`Input` already imported — zero new UI dependency, zero `@/ui/pages` import.

### A3 — Canvas: enable Inspect for sections + fork the inspect body (`ScreenAuthoringCanvas.tsx`)

1. **New prop** on `ScreenAuthoringCanvasProps` (`:47-91`), destructured in the signature (`:171-201`):
   ```ts
   onPatchSection: (sectionId: string, patch: ScreenSectionPatch) => void;
   ```
   Import `ScreenSectionPatch` type from `../../../services/customScreens/screenDocumentOps` (extend the existing `import type { … }` block `:30-35`).

2. **Resolve the selected section** (near `selectedBlock` `:208`):
   ```ts
   const selectedSection =
     document.sections.find((s) => s.id === selectedSectionId) ?? null;
   const sectionInspectActive = !!selectedSectionId && !selectedBlockId;
   ```

3. **Enable the Inspect category for sections** (`:314-321`):
   ```ts
   disabled: !selectedBlock && !selectedSection,   // was: !selectedBlock
   ```

4. **Force `inspect` when a section is selected** — add to `selectTarget`'s section branch (`:268-272`, after `onSelectSection(target.id)`):
   ```ts
   setActivePanel("inspect");   // parity with the block branch @:276 — section inspector shows on click
   ```

5. **Fork the inspect body** (`railBodyContent`, `:333-367`) — the `else` (inspect) branch becomes:
   ```ts
   ) : selectedBlock ? (
     <ScreenBlockInspector … />        // UNCHANGED block path
   ) : (
     <ScreenSectionInspector
       section={selectedSection}
       onPatchSection={(patch) =>
         selectedSection ? onPatchSection(selectedSection.id, patch) : undefined
       }
     />
   );
   ```
   Import `ScreenSectionInspector` from `./ScreenBlockInspector` (co-located export).

6. **Rail HEAD label (optional polish)** (`:386-390`): show the section label + a "Section" chip when `sectionInspectActive` (currently falls through to "Screen"/"Entry view"):
   ```ts
   {selectedBlock ? blockLabel(selectedBlock) : selectedSection ? (sectionLabel(selectedSection)) : "Screen"}
   … chip: selectedBlock ? selectedBlock.type : selectedSection ? "Section" : "Entry view"
   ```
   (`sectionLabel` = the same title/label/"Section" fallback already used by `buildLayerNodes` `:130-134`; factor a tiny local helper.)

### A4 — Host: `handlePatchSection` + thread the prop (`CustomScreenEditorPage.tsx`)

Add beside `handlePatchBlock` (`:555-560`), mirroring it exactly:

```ts
const handlePatchSection = (sectionId: string, patch: ScreenSectionPatch) => {
  const current = definitionRef.current;
  updateEditorView({
    document: updateScreenSection(current.editorView.document, sectionId, patch),
  });
};
```

- **Import add (both symbols):** neither `updateScreenSection` nor `type ScreenSectionPatch` is imported yet — `:66` is `updateScreenBlock`, and the section CRUD handlers use only `renameScreenSection`/`moveScreenSection`/`removeScreenSection`. ADD **both** `updateScreenSection` and `type ScreenSectionPatch` to the `../../../services/customScreens/screenDocumentOps` import block (`:55-69`). `ScreenSectionPatch` currently lacks the `"style"` key (`screenDocumentOps.ts:30-32`) — that extension is 505-01's (a declared dependency of this subtask). `updateEditorView` (`:274`) is the single write funnel → `definition` → PATCH on Save. No other pathway changes.
- Thread `onPatchSection={handlePatchSection}` into `<ScreenAuthoringCanvas … />` (`:860-896`).

### A5 — The "Bathrooms: 2" composition (no editor code beyond the above)

Author sets section `Columns = "3:1 (¾ · ¼)"` (`"3-1"`), block 1 = a Text block "Bathrooms" (a 503 clearable label), block 2 = the bound field-value block. 505-02 auto-flow places them label-left / value-right. **No new block kind, no binding change.**

---

## Item B — Binding recovery affordance (execution-ready)

### B1 — Orphan detection helper (`CustomScreenEditorPage.tsx`, pure, module-scope)

```ts
type ScreenBindingOrphans = {
  blockOrphans: ScreenFieldBinding[];   // blockId matches NO live block in the document
  fieldOrphans: ScreenFieldBinding[];   // field ROOT missing from the content type (+ system fields)
};

// System roots the binding validator always allows (mirror systemFieldOptions in ScreenBlockInspector).
const SCREEN_SYSTEM_FIELD_ROOTS = new Set([
  "title", "slug", "status", "createdAt", "updatedAt", "publishedAt",
]);

const detectScreenBindingOrphans = (
  document: ScreenDocumentV1,
  bindings: ScreenFieldBinding[],
  fields: ContentField[]
): ScreenBindingOrphans => {
  const liveIds = new Set<string>();
  const walk = (blocks: readonly ScreenBlockV1[]) =>
    blocks.forEach((b) => {
      liveIds.add(b.id);
      if (b.children) walk(b.children);
      if (b.slots) Object.values(b.slots).forEach(walk);
    });
  document.sections.forEach((s) => walk(s.blocks));
  // Mirror the server EXACTLY: getAllowedBindingFieldRoots returns `null` when the
  // content type has NO schema properties (schemaFields.size === 0 —
  // customScreenSchemas.ts:274-278), and normalizeScreenFieldBinding then SKIPS
  // field-root validation entirely (customScreenSchemas.ts:826 `if (allowedFieldRoots && …)`)
  // — i.e. a schemaless content type legitimately allows ANY field name. So field-root
  // orphan detection MUST be allow-all when fields is empty; flagging here would falsely
  // mark valid bindings and let the one-click prune DESTROY them (data-loss trap).
  const allowAllFields = fields.length === 0;
  const allowedRoots = new Set<string>([
    ...SCREEN_SYSTEM_FIELD_ROOTS,
    ...fields.map((f) => f.name),
  ]);
  const blockOrphans: ScreenFieldBinding[] = [];
  const fieldOrphans: ScreenFieldBinding[] = [];
  for (const binding of bindings) {
    if (!liveIds.has(binding.blockId)) { blockOrphans.push(binding); continue; }
    if (allowAllFields) continue;   // schemaless type → server allows every field root
    const root = binding.field.split(".")[0] ?? binding.field;   // dotted-path root
    if (!allowedRoots.has(root)) fieldOrphans.push(binding);
  }
  return { blockOrphans, fieldOrphans };
};
```

- **Determinism / non-destructiveness:** pure, source-order preserved, touches only orphaned bindings. Mirrors 505-01's block-orphan predicate (`assertScreenFieldBindingsTargetDocument`, `customScreenSchemas.ts:1267-1268`, itself gated on `blockIds.size > 0`) so client + server agree on what is pruned (no surprise divergence).
- **Field-orphan predicate is server-mirrored (no data-loss trap):** the field-root check reproduces the server's `getAllowedBindingFieldRoots` (`customScreenSchemas.ts:274-278`), which returns **`null` when the content type has no schema properties** (`schemaFields.size === 0`), and `normalizeScreenFieldBinding` then **skips** field-root validation (`customScreenSchemas.ts:826` — `if (allowedFieldRoots && …)`). So when `fields.length === 0` the helper flags **zero** field-orphans (allow-all) — it is **NOT** "identical to the save path" via `fields.map((f) => f.name)` alone; without the `allowAllFields` short-circuit a schemaless content type's legitimate entry bindings would ALL be flagged and the one-click prune would DESTROY them. `contentFields = selectedContentType ? fieldsFromSchema(…) : []` (`CustomScreenEditorPage.tsx:202-205`), so `[]` occurs both **permanently** (a schemaless type — which the server explicitly supports via the `size === 0` branch) and **transiently** (before `contentTypes`/`selectedContentType` resolve); the `allowAllFields` guard makes allow-all the safe, server-faithful answer in both cases (block-orphans, which don't depend on `fields`, stay accurate throughout). For extra safety the proactive notice (B2) may also be suppressed until `selectedContentType` has resolved.

### B2 — Proactive notice + "Remove orphaned bindings" action (`CustomScreenEditorPage.tsx`)

```ts
const bindingOrphans = useMemo(
  () => detectScreenBindingOrphans(screenDocument, screenBindings, contentFields),
  [screenDocument, screenBindings, contentFields]
);
const orphanCount = bindingOrphans.blockOrphans.length + bindingOrphans.fieldOrphans.length;

const handleRemoveOrphanBindings = () => {
  const current = definitionRef.current;
  const orphanIds = new Set(
    [...bindingOrphans.blockOrphans, ...bindingOrphans.fieldOrphans].map((b) => b.id)
  );
  if (orphanIds.size === 0) return;
  updateEditorView({
    document: current.editorView.document,   // document unchanged — bindings-only prune
    bindings: current.editorView.bindings.filter((b) => !orphanIds.has(b.id)),
  });
};
```

Rendered as a **non-destructive warning** (NOT the destructive error `Alert`) in the notice stack (`:833-853`), only when `orphanCount > 0`.

> **WIDEN the notice-stack outer gate (REQUIRED — else the amber notice never renders).** The existing wrapper div is gated `{error || remoteUpdatePending ? (<div className="shrink-0 space-y-3 px-6 pt-4">…) : null}` (verified `:833`). On the **primary recovery flow** — reopen a saved screen carrying orphaned bindings (Acceptance #5 / SMOKE #5) — there is **no** `error` and **no** `remoteUpdatePending`, so an Alert nested inside that gated div would **not render at all**. Widen the outer condition to `error || remoteUpdatePending || orphanCount > 0 || saveNotice` (equivalently, give the orphan/save notices their **own** top-level wrapper div OUTSIDE the `error` gate). The per-notice inner gates (`orphanCount > 0` here, `saveNotice != null` in B3) still decide which Alert shows; the outer widen only ensures the stack container mounts on the reopen (no-current-error) path.

The amber warning itself (inside the widened stack):

```tsx
<Alert>   {/* default (amber) variant, not "destructive" */}
  <AlertTitle>Orphaned field bindings</AlertTitle>
  <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <span>
      {orphanCount} binding(s) reference{" "}
      {bindingOrphans.fieldOrphans.length > 0
        ? `deleted field(s): ${uniqueFieldNames(bindingOrphans.fieldOrphans).join(", ")}`
        : "removed blocks"}
      . They block saving until removed.
    </span>
    <Button variant="outline" size="sm" onClick={handleRemoveOrphanBindings}>
      Remove orphaned bindings
    </Button>
  </AlertDescription>
</Alert>
```

- Gives the user a recovery path **before** hitting Save — the previously-opaque dead-end becomes a one-click fix.
- `uniqueFieldNames` = a tiny local helper de-duping `binding.field` roots for a readable message.

### B3 — Post-save pruned-field notice (consume 505-01's transient `warnings`)

The 505-01 save-path GC prunes field-orphans and the save **succeeds**; the returned record carries a **transient** `warnings?: CustomScreenBindingWarning[]` (505-01 B5 — `{ code, fields }`, computed at normalize time, NOT persisted) naming the pruned field(s). Surface it directly in `handleSave` (`:619-660`), around `applyScreen(updated)` (`:648`) — no client-side diff:

```ts
const updated = await updateCustomScreen(screenId, payload);       // returns { ...screen, warnings? }
const prunedFields = uniqueFieldNames(
  (updated.warnings ?? [])
    .filter((w) => w.code === "binding_field_removed")             // 505-01 field-orphan code
    .flatMap((w) => w.fields),
);
applyScreen(updated);
if (prunedFields.length > 0) {
  setSaveNotice(`Removed binding(s) for deleted field(s): ${prunedFields.join(", ")}.`);
} else {
  setSaveNotice(null);
}
```

- New host state `const [saveNotice, setSaveNotice] = useState<string | null>(null)` — a **non-blocking** success-adjacent notice (rendered as a default `Alert` in the same stack **behind its own `saveNotice != null` gate**, cleared by `markDirty` alongside `setError(null)` `:262`). It reads the server's authoritative `warnings` carry (505-01 B5); no new response contract beyond that transient field, and no client-side sent-vs-returned diff.
- **Same notice-stack outer-gate widen applies (see B2):** a successful save has **no** `error` and **no** `remoteUpdatePending`, so the `saveNotice` Alert would be swallowed by the existing `{error || remoteUpdatePending ? … : null}` wrapper (`:833`) unless that outer condition is widened to include `saveNotice` (`error || remoteUpdatePending || orphanCount > 0 || saveNotice`) or the notices get their own wrapper div outside the `error` gate. Do the widen once for both B2 and B3.
- **Client-record `warnings` type carry (REQUIRED — else `updated.warnings` is a TS2339 build break).** `updateCustomScreen` (`customScreensClient.ts:412-429`) is typed `apiRequest<CustomScreenRecord>` and `return updated` hands back the **raw** parsed record — but the ADMIN client `CustomScreenRecord` (`customScreensClient.ts:61`) is a **distinct declaration** from the server record 505-01 B5 widens and carries **no** `warnings` field (grep confirms none). So `updated.warnings` above fails the root `tsc -p tsconfig.json --noEmit` this subtask's Testing mandates. Add the one optional field `warnings?: CustomScreenBindingWarning[]` to that client type, importing `import type { CustomScreenBindingWarning } from "../../services/customScreens/customScreenSchemas"` — the **client's own two-level depth** (`core/admin/services/…`); note the UI-component files import the same type via `../../../services/customScreens/customScreenSchemas` (three-level depth). This is the narrow, named type-only exception declared in the ownership block above. **Runtime is already correct — no logic change:** `isCustomScreenRecord` (`:143-166`) validates only required keys and does **not** reject extra keys, `normalizeCustomScreenRecord` (`:176-195`) spreads `...item` (never strips `warnings`), and `updateCustomScreen` returns the **un-normalized** raw `updated`, so the transient field survives to `handleSave`. No explicit annotation on `w` is needed in the code below — it types as `CustomScreenBindingWarning` transitively through the extended record.

### B4 — Residual 400 field name on the error DETAIL (genuinely-malformed bindings)

For genuinely-malformed input the route still returns `400 custom_screen_definition_invalid` with a **byte-frozen** user-message string (`"Custom screen definition is invalid"`); when a field name is known it rides the response **DETAIL** (`err.details.fields`, from 505-01 §B6), NOT the message string (which stays unchanged so the pinned `customScreensRoutes.test.ts:103-108` map test stays green). The existing catch surfaces `err.message` into the destructive `Alert` (`:651-656, 833-840`); extend it to also append the `err.details.fields` name(s) when present:

```ts
// The existing catch (`:651-656`) ALREADY narrows via `if (isApiClientError(err)) { setError(err.message) }`.
// Inside that guard `err` is an `ApiClientError` whose `details` is typed `unknown` (apiClient.ts:27) — cast
// THAT (not `err`) to the 505-01 §B6 shape `{ fields }`. Under Option A the message is STATIC; append the
// DETAIL field names when present:
const detailFields = (err.details as { fields?: string[] } | undefined)?.fields;
setError(
  detailFields?.length
    ? `${err.message} (field(s): ${detailFields.join(", ")})`
    : err.message
);
```

In practice genuinely-malformed bindings carry no field name, so usually only the static message shows. The prune-recoverable field-orphan case does NOT 400 (505-01 decision: prune + warn), so the dead-end is gone.

### Error-message shape (surfaced by this subtask)

| Case | Surface | Shape |
|---|---|---|
| Field-orphan (recoverable) | proactive amber `Alert` (B2) + post-save amber `Alert` (B3) | `"Removed binding(s) for deleted field(s): bathrooms, sqft."` |
| Block-orphan | proactive amber `Alert` (B2) | `"N binding(s) reference removed blocks. They block saving until removed."` |
| Genuinely-malformed | destructive `Alert` (B4) | static `err.message` (`"Custom screen definition is invalid"`) + `err.details.fields` name(s) when known (from 505-01) — message string byte-frozen |

---

## Data flow (this subtask)

```
Section select (canvas/layers)
  → selectTarget section branch → onSelectSection + setActivePanel("inspect")
  → railBodyContent inspect → ScreenSectionInspector(selectedSection)
    → EnumRow "Columns" / Input "gap" → buildSectionLayoutPatch(section.style, edit)
    → onPatchSection(sectionId, { style }) → handlePatchSection
    → updateScreenSection(document, id, patch) → updateEditorView → definition
    → (Save) updateCustomScreen PATCH  [505-02 renders the grid]

Binding orphan lifecycle
  detectScreenBindingOrphans(document, bindings, fields)  [memo]
    → proactive amber Alert + "Remove orphaned bindings" → updateEditorView(bindings-only prune)
  handleSave → read updated.warnings (505-01 binding_field_removed) → setSaveNotice(prunedFields)
  malformed → catch → setError(err.message + err.details.fields)  [static message; field on DETAIL from 505-01]
```

---

## Acceptance Criteria (measured live)

1. **Section inspector appears.** Selecting a section (canvas or Layers) switches the rail to Inspect and shows the **Columns** control + **Column gap** input; the Inspect category is no longer disabled for a section-only selection.
2. **Columns write round-trips + takes visible effect.** Setting Columns to `2` then `3:1` writes `section.style.columns` and (via 505-02) the block-list container computes `grid-template-columns: 1fr 1fr` / `3fr 1fr` (DevTools). Picking **Stacked** prunes `columns` → the container returns to `space-y-4` (byte-stable).
3. **Gap write.** Changing Column gap updates `section.style.columnGap` (clamped 0..64); blank prunes it → renderer default gap.
4. **Bathrooms: 2.** `"3-1"` section + Text "Bathrooms" + bound value → label-left / value-right on one row (needs only the shipped 503 block style + clearable labels).
5. **Proactive recovery.** With a binding whose field was deleted on the content type, an amber notice names the field and a **"Remove orphaned bindings"** button prunes it client-side; the screen then saves cleanly. **Reopen path is proven:** on the primary flow (reopen a saved screen carrying the orphan) there is **no** current `error` and **no** `remoteUpdatePending`, yet the amber notice **still renders** — i.e. the notice-stack outer gate was widened to `error || remoteUpdatePending || orphanCount > 0 || saveNotice` (B2), not left at `error || remoteUpdatePending`. The `saveNotice` post-save notice (B3) likewise renders on a clean save with no current error.
6. **Post-save recovery.** If the author saves with a field-orphan still present, the save **succeeds** (505-01 GC) and a notice names the pruned field — no opaque 400.
7. **Residual 400.** A genuinely-malformed binding surfaces a 400 in the destructive `Alert`; its user-message string is the static `"Custom screen definition is invalid"` (byte-frozen) and any known field name(s) come from `err.details.fields` (from 505-01), never the message string.
8. **No regressions.** Block inspector unchanged (503 style group intact); absent `section.style` → byte-identical doc + `space-y-4` DOM; Bun-free boundary intact (no `@/ui/pages`/widget import in the three files); insertion-targeting / section-CRUD / PaletteChip dead-code guard from 500/503 untouched; no schemaVersion bump.

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`. This subtask ships the **editor** slice; the exhaustive schema/route/Bun-integration suites + the parent SMOKE matrix are consolidated in **505-04**. Land these here green:

### Vitest — Bun-free custom-screens UI suites (run together, green)

- **`ScreenBlockInspector` — section layout unit** (`tests/vitest/ui/custom-screen-section-inspector.test.tsx`, new):
  - `buildSectionLayoutPatch`: `columns` sentinel/unknown → prune; valid preset → set; `columnGap` "" / non-finite → prune, in-range → clamp 0..64; **empty style → `undefined`** (byte-stable guard); read-current merge (setting gap keeps a prior `columns`).
  - `ScreenSectionInspector` renders the Columns `EnumRow` + gap `Input`; changing Columns calls `onPatchSection({ style: { columns } })`; **null section → dashed placeholder** (no controls); an unset section shows "Stacked" + blank gap and emits **no** patch on mount.
- **`ScreenAuthoringCanvas` — inspect fork** (extend the existing canvas test):
  - Inspect category enabled when `selectedSectionId && !selectedBlockId` (was disabled); the inspect body renders `ScreenSectionInspector` for a section and `ScreenBlockInspector` for a block; selecting a section forces `activePanel==="inspect"`; `onPatchSection` is threaded to the host with the section id.
- **`CustomScreenEditorPage` — host wiring + orphan recovery** (extend `tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx` or a sibling):
  - `handlePatchSection` → `updateScreenSection` → `updateEditorView` writes `section.style` and marks dirty; a Stacked patch prunes back to no-style (dirty, byte-stable payload).
  - `detectScreenBindingOrphans`: flags a block-orphan (blockId not in doc) and a field-orphan (field root ∉ fields ∪ system), **preserves valid-binding order**, is a pure function; a **schemaless content type (`fields=[]`) yields ZERO field-orphans** (server allow-all parity — `getAllowedBindingFieldRoots` returns `null`; no data-loss on valid entry bindings); "Remove orphaned bindings" prunes only orphans (valid set byte-identical) via `updateEditorView`.
  - Post-save notice: a returned record carrying a `binding_field_removed` warning (505-01's transient `warnings`) sets the pruned-field notice naming the field; a record with no warnings sets no notice.
  - Residual 400: `updateCustomScreen` rejecting with the static `custom_screen_definition_invalid` message + a `details.fields` array renders the static message AND the field name(s) from `err.details.fields` in the destructive `Alert` (the message string stays byte-frozen — no `err.message` enrichment asserted).
- **Boundary** (`tests/vitest/ui/custom-screen-authoring-boundary.test.ts:53-77`): the guard already covers all three owned files; confirm the new imports add **no** `@/ui/pages` / `@/ui/widgets` / `WidgetRenderer` string.

### Bun — custom-screen route/integration (owned by 505-04)

The save/error round-trip (section-`style` byte-stable PATCH; field-orphan prune-and-succeed returning the field name; unknown `style` KEY rejected `400`; genuinely-malformed still `400`) lives in the **505-04** Bun custom-screen route/integration suite (`bun test` scope) so the whole-flow assertion sits with closure. This subtask's Vitest suites are **Bun-free** (`bun --cwd core lint:types` + root `tsc -p tsconfig.json --noEmit` to catch the `onPatchSection` prop-signature change in `tests/`). The root `tsc` also covers the B3 client-record `warnings?: CustomScreenBindingWarning[]` extension (`customScreensClient.ts:61`) — without that one type-field addition `updated.warnings` is a TS2339 error; with it the raw-record carry typechecks.

### SMOKE (editor real-flow, ≥5 DISTINCT scenarios — assert VISIBLE EFFECT)

Real-input playwright against the running admin (`coderso-a.localhost:5173`; start `coderso-dev-core-host` if the page is white). Each asserts a **visible effect**, not just a passing call. (The full parent SMOKE matrix — auto-flow ordering, drop-zones-in-grid, absent-style byte-stability spot-check — is consolidated in 505-04; these five exercise THIS subtask's surfaces end-to-end.)

1. **Section inspector opens + Columns takes effect.** Click a section → assert the rail switches to Inspect and the Columns/gap controls render; set Columns to `2` then `3:1` → assert the live block-list container's **computed `grid-template-columns`** is `1fr 1fr` then `3fr 1fr` and the blocks sit side-by-side (not stacked).
2. **Stacked restores byte-stable DOM.** From a gridded section pick **Stacked** → assert the container returns to `space-y-4` with **no inline grid style** (visible re-stack), and Save then reload shows no `section.style` persisted.
3. **Column gap visible change.** Set gap to `40` on a 2-column section → assert the computed `gap`/`column-gap` is `40px` and the visible inter-column spacing widens; blank it → assert the default gap returns.
4. **Bathrooms: 2 composition.** Build `"3-1"` + Text "Bathrooms" + bound value; assert the label renders left and the value renders right on one row (cell positions / screenshot).
5. **Binding recovery from the dead-end.** Bind a block to a content-type field, delete that field on the content type, reopen the screen → assert the amber "Orphaned field bindings" notice **names the deleted field**; click **Remove orphaned bindings** → assert the notice clears and **Save succeeds** (record persists, no opaque 400). Then reproduce the same via save-through: with the orphan present, click Save → assert the screen **still saves** and a notice names the pruned field.

**Named guards:** schema-first + reject-unknown (unknown section-style KEY throws / Ajv `additionalProperties:false` — verified in 505-01/04 suites; the editor never emits an unknown key because `buildSectionLayoutPatch` only writes `columns`/`columnGap`); **absent-`style` byte-stability** (Stacked/blank prune → no persisted key, `space-y-4` DOM); **binding-GC determinism + non-destructiveness** (client `detectScreenBindingOrphans` + prune preserve valid-binding order, orphans-only); **Bun-free boundary** (no `@/ui/pages` in the three files); **PaletteChip dead-code guard** (unchanged); **no schemaVersion bump**.

---

## Deferred (not in this subtask)

A visual column-ratio picker / SegmentedControl (v1 uses the plain `EnumRow`); per-block `columnSpan`/`columnStart` inspector controls; custom (non-preset) fr ratios; responsive per-breakpoint column controls; a bulk "orphan bindings" management panel (v1 is a single Remove-all action).

---

## Affected Files (grounded, this subtask)

- `core/admin/ui/custom-screens/ScreenBlockInspector.tsx` — `ScreenSectionStyleEdit` + `buildSectionLayoutPatch` + `SCREEN_SECTION_COLUMNS_DEFAULT_OPTION` + `screenSectionColumnOptions` + new exported `ScreenSectionInspector`. (Block inspector body unchanged.)
- `core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx` — `onPatchSection` prop; enable Inspect for sections; fork the inspect body (block vs section); force `inspect` on section select; optional section HEAD label.
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` — `handlePatchSection` + thread `onPatchSection`; `detectScreenBindingOrphans` + proactive amber notice + "Remove orphaned bindings"; post-save pruned-field diff notice (`saveNotice` state); **widen the notice-stack outer gate (`:833`) from `error || remoteUpdatePending` to `error || remoteUpdatePending || orphanCount > 0 || saveNotice`** (or move the orphan/save notices to their own wrapper outside the `error` gate) so the amber/reopen + post-save notices render when there is no current error; residual-400 field name read from `err.details.fields` (existing `Alert`; the `err.message` string is byte-frozen).
- `core/admin/services/customScreensClient.ts` — **type-only, narrow named exception (see ownership block):** add `warnings?: CustomScreenBindingWarning[]` to the admin `CustomScreenRecord` type (`:61`) + `import type { CustomScreenBindingWarning } from "../../services/customScreens/customScreenSchemas"`, so B3's `updated.warnings` typechecks under root `tsc`. No logic/runtime change (`isCustomScreenRecord`/`normalizeCustomScreenRecord` keep it; `updateCustomScreen` returns the raw record). 505-01 owns only the 4 **server** files and does not touch this client.
