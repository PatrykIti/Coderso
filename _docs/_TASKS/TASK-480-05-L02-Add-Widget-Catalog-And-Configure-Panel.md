# TASK-480-05-L02: Add-Widget Catalog + Configure Panel
# FileName: TASK-480-05-L02-Add-Widget-Catalog-And-Configure-Panel.md

**Priority:** High
**Category:** Admin UI / Dashboard / Configurable Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-480-05-L01 (builder grid + reducer) · TASK-480-04 (widget UI registry) · TASK-480-02 (widget/config schema)
**Status:** ⏳ To Do
**Started:**
**Completed:**
**Parent Subtask:** TASK-480-05

---

## Overview

Add the two authoring surfaces that feed the L01 grid: an **"Add widget" catalog**
(browse the available dashboard widget types from the product spec and insert one)
and a **per-widget configure panel** built with the **floating-panel pattern**
(title, data source / content type, range, columns, visualization, etc.). The
configure panel is **schema-driven** — its fields come from each widget type's
config descriptor in the UI registry — and renders a **live preview** of the
widget with the draft config before commit.

- **Goal:** From Edit mode the user can (1) open an **Add widget** catalog, pick a
  type, and have a new `DashboardWidgetInstance` inserted into the draft with the
  type's default config + default size; (2) open a **floating configure panel** for
  any widget, edit its config through schema-driven controls with a live preview,
  and commit changes into the draft (dirty) — all without leaving the dashboard.
- **Owning module/service:**
  - `core/admin/ui/dashboard/builder/AddWidgetCatalog.tsx` (new — catalog dialog/sheet)
  - `core/admin/ui/dashboard/builder/WidgetConfigPanel.tsx` (new — floating panel)
  - `core/admin/ui/dashboard/builder/widgetConfigForm.tsx` (new — schema → controls renderer)
- **Source-of-truth docs:**
  - Product/widget spec: `_docs/DASHBOARD_WIDGETS_SPEC.md` (catalog entries, config
    fields, defaults — seeded by TASK-480-01-L02)
  - UI registry/catalog: `core/admin/ui/dashboard/widgets/registry.tsx` — exposes
    `DASHBOARD_WIDGET_CATALOG`, where each entry includes `{ type, label,
    description, icon, category, defaultConfig, defaultSize, minSize,
    configFields }` (TASK-480-04)
  - Config schema/types: `core/services/dashboard/dashboardWidgetContract.ts`
    (`DashboardWidgetConfig` discriminated union + `normalizeDashboardWidgetConfig`) — TASK-480-02
  - Widget host for preview: `core/admin/ui/dashboard/widgets/DashboardWidgetHost.tsx`
  - Floating-panel pattern: `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx`
    (pinned popover card, `GripHorizontal` handle, close affordance); shared shell
    primitives from TASK-479-06 (`Select`, `Input`, `Tabs`, `Switch`, `SectionCard`)
  - Content-type / range source options: `core/admin/services/contentTypesClient.ts`
    (`contentTypes:list`) for the data-source selector
- **Out of scope:** The grid/arrange/resize/Save lifecycle (L01); widget renderer
  internals (TASK-480-04) + data fetching (TASK-480-03); schema (480-02) / route
  (480-03) definitions; tests (L03). No new content-type endpoints — reuse
  `contentTypes:list` cache.

---

## Security Contract

- **Endpoint visibility:** `internal` — the catalog/panel issue no writes
  themselves; they mutate the in-memory draft. Persistence happens only via the
  L01 Save path (`PUT /admin/api/dashboard/layout`). The data-source selector reads
  `contentTypes:list` (cached, `content:read`).
- **Auth model:** session (admin); reachable only inside Edit mode, which L01 gates
  on `dashboard:write`.
- **RBAC:** `dashboard:write` to author (gated upstream in L01); `content:read` for
  the cached content-type list used by selectors. The catalog must only list widget
  types the current permission set can render data for (e.g. hide a
  `totals-counters` widget surfacing user counts without `users:read`) — a
  presentational guard; the data route is the boundary.
- **CSRF / rate-limit:** n/a here (no direct writes; the `contentTypes` read is a
  cached `GET`). The eventual Save carries CSRF in L01.
- **Validation:** config edits pass through `normalizeDashboardWidgetConfig` (the
  schema owner, TASK-480-02) before entering the draft, so an out-of-range/unknown value
  can never reach the layout. Reject-unknown is the schema's job; the form only
  emits known fields.
- **Secret handling:** config values are ids/enums/ranges/labels only — no secrets;
  nothing secret-bearing is cached or logged.

---

## Implementation Pseudocode

### Registry entry shape consumed (owned by TASK-480-04 — referenced)

```ts
// core/admin/ui/dashboard/widgets/registry.tsx (TASK-480-04-L01 owns this)
type WidgetConfigField =
  | { key: string; kind: "text"; label: string }
  | { key: string; kind: "select"; label: string; options: { value: string; label: string }[] | "contentTypes" }
  | { key: string; kind: "range"; label: string; options: { value: "24h" | "7d" | "30d" | "90d"; label: string }[] }
  | { key: string; kind: "number"; label: string; min: number; max: number }   // e.g. columns / limit
  | { key: string; kind: "toggle"; label: string };

type DashboardWidgetCatalogEntry = {
  type: DashboardWidgetType;
  label: string; description: string; icon: ReactNode; category: "metrics" | "content" | "system" | "actions";
  defaultConfig: DashboardWidgetConfig;
  defaultSize: { w: number; h: number }; minSize: { w: number; h: number }; maxSize?: { w: number; h: number };
  configFields: WidgetConfigField[];      // drives the schema-driven form below
};
// keyed over the canonical 9 `DashboardWidgetType` values; each entry's
// `defaultConfig` is the `kind`-discriminated `DashboardWidgetConfig` from the
// TASK-480-02 owner (`core/services/dashboard`) — imported, never re-declared here.
export const DASHBOARD_WIDGET_CATALOG: Record<DashboardWidgetType, DashboardWidgetCatalogEntry>;
```

### Add-widget catalog

```tsx
// core/admin/ui/dashboard/builder/AddWidgetCatalog.tsx
export function AddWidgetCatalog({ open, onOpenChange, existing, onAdd }: AddWidgetCatalogProps) {
  const entries = useMemo(
    () => Object.values(DASHBOARD_WIDGET_CATALOG).filter((e) => canRenderForPermissions(e.type)),
    [],
  );
  const grouped = useMemo(() => groupBy(entries, (e) => e.category), [entries]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label="Add widget">
        <SectionHeader title="Add a widget" description="Pick a panel to add to your dashboard." />
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category}>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">{category}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {items.map((e) => (
                <button
                  key={e.type}
                  type="button"
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left hover:border-ring/50"
                  onClick={() => { onAdd(instantiate(e)); onOpenChange(false); }}
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">{e.icon}</span>
                  <span className="text-sm font-medium">{e.label}</span>
                  <span className="text-xs text-muted-foreground">{e.description}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}

// instantiate: new instance with default config + default size, placed at the next free slot
function instantiate(e: DashboardWidgetCatalogEntry): DashboardWidgetInstance {
  return {
    id: nanoid(),
    type: e.type,
    config: e.defaultConfig,                 // already schema-valid (kind === type)
    position: { x: 0, y: nextFreeRow(), w: e.defaultSize.w, h: e.defaultSize.h },
  };
}
// onAdd → parent dispatches { type: "addWidget", widget } into the L01 reducer (dirty=true)
```

### Floating configure panel (floating-panel pattern + live preview)

```tsx
// core/admin/ui/dashboard/builder/WidgetConfigPanel.tsx
// Pinned popover card mirroring _docs/_PROTOTYPE CanvasEditor floating panel:
// GripHorizontal title bar, scrollable body, close button. NOT a full-screen modal.
export function WidgetConfigPanel({ widget, previewState, onClose, onApply }: WidgetConfigPanelProps) {
  const entry = DASHBOARD_WIDGET_CATALOG[widget.type];
  // local draft config so typing doesn't thrash the global reducer; commit on change (debounced) or on "Apply"
  const [config, setConfig] = useState(widget.config);

  const setField = useCallback((key: string, value: unknown) => {
    setConfig((prev) => normalizeDashboardWidgetConfig(widget.type, { ...prev, [key]: value })); // schema clamp
  }, [widget.type]);

  // push committed config into the L01 draft (dirty). No sync setState in effects.
  useEffect(() => { onApply(config); }, [config, onApply]);

  return (
    <div className="absolute right-4 top-4 z-20 w-[300px] overflow-hidden rounded-2xl border border-border bg-popover shadow-pop">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <GripHorizontal className="size-4 cursor-grab text-muted-foreground/60" />
        <span className="flex-1 text-xs font-semibold">{entry.label} settings</span>
        <button type="button" aria-label="Close settings" onClick={onClose}>{/* X */}</button>
      </div>
      <div className="max-h-[58vh] space-y-3 overflow-y-auto p-3">
        {/* LIVE PREVIEW with the draft config */}
        <div className="rounded-xl border border-dashed border-border p-2">
          <DashboardWidgetHost
            widget={{ ...widget, config }}
            state={previewState ?? { status: "loading" }}
          />
        </div>
        {/* SCHEMA-DRIVEN CONTROLS */}
        <WidgetConfigForm fields={entry.configFields} config={config} onChange={setField} />
      </div>
    </div>
  );
}
```

### Schema-driven control renderer

```tsx
// core/admin/ui/dashboard/builder/widgetConfigForm.tsx
export function WidgetConfigForm({ fields, config, onChange }: WidgetConfigFormProps) {
  const contentTypes = useContentTypeOptions(); // listContentTypesCached({ force:false }) → cached options
  return (
    <div className="space-y-2.5">
      {fields.map((f) => {
        const id = `cfg-${f.key}`;
        switch (f.kind) {
          case "text":   return <Field id={id} label={f.label}><Input value={config[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} /></Field>;
          case "select": {
            const options = f.options === "contentTypes" ? contentTypes : f.options;
            return <Field id={id} label={f.label}><Select value={config[f.key]} onChange={(e) => onChange(f.key, e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>;
          }
          case "range":  return <Field id={id} label={f.label}><SegmentedRange value={config[f.key]} options={f.options} onChange={(v) => onChange(f.key, v)} /></Field>;
          case "number": return <Field id={id} label={f.label}><NumberStepper value={config[f.key]} min={f.min} max={f.max} onChange={(v) => onChange(f.key, v)} /></Field>;
          case "toggle": return <Field id={id} label={f.label}><Switch checked={Boolean(config[f.key])} onCheckedChange={(v) => onChange(f.key, v)} /></Field>;
        }
      })}
    </div>
  );
}
```

**Data flow:** Add → `instantiate(registry[type])` → reducer `addWidget` (dirty).
Configure → open `WidgetConfigPanel` for the selected instance → each control calls
`setField` → `normalizeDashboardWidgetConfig` clamps to schema → local `config` updates →
`DashboardWidgetHost` re-renders the **live preview** with an explicit
`WidgetDataState` (`previewState` from the current widget-data cache, or loading
while data revalidates) → committed config flows to the L01 reducer via
`configureWidget` (dirty). Persistence only on the L01 Save.

**Error handling:** `normalizeDashboardWidgetConfig` guarantees a valid config at every
keystroke, so the preview never receives an invalid shape; if a host preview throws
on bad data, wrap it in the existing widget error boundary (TASK-480-04) so the panel
stays usable. The content-type selector degrades to an empty/"no content types"
option when the cache read fails, without blocking other fields.

**Regression-test shape (delivered in L03):**

- Catalog lists registry entries grouped by category; clicking one dispatches
  `addWidget` with default config + size.
- Configure panel renders the schema-driven controls for the selected type and a
  live `DashboardWidgetHost` preview.
- Editing a control routes through `normalizeDashboardWidgetConfig` and updates the draft
  (dirty) — out-of-range input is clamped, unknown keys never appear.
- Content-type select sources from the cached `contentTypes:list`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/dashboard-builder.test.tsx`
  (catalog + configure-panel cases authored in L03)
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/DASHBOARD_WIDGETS_SPEC.md` — Add-widget catalog + configure-panel UX
  (floating-panel pattern, schema-driven fields, live preview, per-type config table).
- `_docs/_TASKS/README.md` — board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — entry on closure linking `TASK-480` + `TASK-480-05-L02`.
