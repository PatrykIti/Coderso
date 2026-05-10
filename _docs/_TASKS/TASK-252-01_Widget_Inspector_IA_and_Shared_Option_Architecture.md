# TASK-252-01: Widget Inspector IA and Shared Option Architecture

# FileName: TASK-252-01_Widget_Inspector_IA_and_Shared_Option_Architecture.md

**Priority:** High
**Category:** Widgets + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-252
**Status:** To Do

---

## Overview

Define and implement the shared right-panel IA for widget settings before
expanding individual widget editors.

The current `BlockSettings` places helper text and slot controls above the
`Wizard / Visual / Advanced` tabs. That makes the right panel feel crowded and
reduces the space available for actual widget options. This task moves shared
guidance into compact information affordances, gives slot controls an explicit
section, and introduces reusable editor-control primitives so widget editors can
look and behave consistently.

## Business Requirements

- Preserve the existing `Wizard / Visual / Advanced` tab model.
- Replace persistent "Next: fine-tune..." style copy with an icon-triggered
  information pattern. Use the installed lucide icon package and the existing
  Radix/shadcn tooltip stack; prefer an `Info` icon affordance for the final UI.
- Keep the inspector top area compact:
  - selected widget title/type summary;
  - optional info icon;
  - no large informational cards unless there is a blocking warning.
- Move repeatable/fixed slot management out of the top-of-panel area and into a
  `Structure`, `Slots`, or `Regions` editor section.
- Standardize editor sections so every widget can use one-line rows for common
  option groups:
  - label + optional info icon;
  - control;
  - short validation/error text only when needed;
  - no duplicated long helper copy above every control.
- Add stable metadata for automation:
  - `data-widget-editor={widget.type}`;
  - `data-widget-editor-mode={wizard|visual|advanced}`;
  - `data-widget-editor-section={normalized-section-id}`;
  - `data-widget-control={stable-control-id}` for controls where role/name is
    ambiguous.
- Keep existing keyboard and screen-reader behavior:
  - every icon button has `aria-label`;
  - helper text is connected through `aria-describedby` when it explains a
    specific input;
  - tooltip content is supplementary and not the only visible label.

## Sub-Tasks

- [ ] Define the final right-inspector structure and mode ownership.
- [ ] Add or update shared editor primitives for sections, rows, labels, info
  icons, and automation metadata.
- [ ] Move generic helper copy into compact information affordances.
- [ ] Move slot/region controls into named editor sections.
- [ ] Migrate shared inspector primitives and `section` as the non-overlapping
  proof call site; `hero` and `timeline` may receive scaffold-only compatibility
  hooks here, but their full editor migrations stay owned by
  TASK-252-03-01 and TASK-252-04-01.
- [ ] Add focused UI tests for metadata, accessibility labels, and slot-control
  placement.

## Files to Change

- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/WizardPanel.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`
- `core/admin/ui/pages/builder/AdvancedPanel.tsx`
- `core/admin/ui/shared/InfoTip.tsx`
- `core/admin/ui/widgets/editors/ClearableFields.tsx`
- new optional shared helper, for example:
  - `core/admin/ui/widgets/editors/WidgetEditorControls.tsx`
- focused call-site migration in:
  - `core/admin/ui/widgets/editors/SectionEditors.tsx`
- scaffold-only compatibility checks in:
  - `core/admin/ui/widgets/editors/HeroEditors.tsx` only if shared primitive
    exports require an import-compatible placeholder before TASK-252-03-01
  - `core/admin/ui/widgets/editors/TimelineEditors.tsx` only if shared primitive
    exports require an import-compatible placeholder before TASK-252-04-01

## Implementation Pseudocode

Create shared editor primitives before touching all widgets.

```tsx
type WidgetEditorSectionProps = {
  id: string;
  title: string;
  description?: ReactNode;
  info?: ReactNode;
  children: ReactNode;
};

type WidgetControlFieldProps = {
  id: string;
  describedById?: string;
  "aria-describedby"?: string;
};

type WidgetControlRowProps = {
  id: string;
  label: string;
  help?: ReactNode;
  children: (field: WidgetControlFieldProps) => ReactNode;
};

function WidgetEditorSection(props: WidgetEditorSectionProps) {
  return (
    <section data-widget-editor-section={props.id}>
      <header>
        <h3>{props.title}</h3>
        {props.info ? <WidgetInfoTip content={props.info} /> : null}
      </header>
      {props.description ? <p id={`${props.id}-description`}>{props.description}</p> : null}
      <div>{props.children}</div>
    </section>
  );
}

function WidgetControlRow({ id, label, help, children }: WidgetControlRowProps) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div data-widget-control={id}>
      <label htmlFor={id}>{label}</label>
      {help ? <WidgetInfoTip content={help} label={`${label} info`} /> : null}
      {children({ id, describedById: helpId, "aria-describedby": helpId })}
      {help ? <p id={helpId} className="sr-only">{help}</p> : null}
    </div>
  );
}
```

Do not implement `WidgetControlRow` as a blind `cloneElement` wrapper. Current
widget editors use composite shadcn/Radix controls such as `Select`,
`SelectTrigger`, `Switch`, repeated-item editors, and media pickers. The shared
row must expose a render-prop/control-props contract so each composite can place
`id` and `aria-describedby` on the actual focusable trigger or input without
losing accessibility. Simple `Input`/`Textarea` call sites can pass the props
directly; composite controls must wire the generated ids explicitly.
Existing TASK-252 leaf snippets that show a direct `<Input />` child should be
treated as shorthand for this render-prop API during implementation.

Refactor `BlockSettings` so slot controls are rendered by a dedicated component:

```tsx
function resolveBuilderSlotMap(block: Block): Record<string, Block[]> {
  if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
    return block.slots as Record<string, Block[]>;
  }
  return Array.isArray(block.children) ? { default: block.children } : {};
}

function WidgetSlotControls({ widget, block, onChange }: WidgetSlotControlsProps) {
  const slotMap = resolveBuilderSlotMap(block);
  const slotDefinitions = widget.slots ?? [];
  const slotTargets = resolveWidgetSlotTargets(widget.slots ?? [], slotMap);
  if (slotTargets.length === 0) return null;

  const isAtRepeatableSlotMaximum = (definition: WidgetSlotDefinition, count: number) =>
    Number.isFinite(definition.maxItems)
      ? count >= Math.max(0, Math.floor(definition.maxItems ?? 0))
      : false;

  const isAtRepeatableSlotMinimum = (definition: WidgetSlotDefinition, count: number) =>
    count <= (Number.isFinite(definition.minItems)
      ? Math.max(0, Math.floor(definition.minItems ?? 0))
      : 0);

  function addRepeatableSlot(definitionId: string) {
    const definition = slotDefinitions.find((slot) => slot.id === definitionId);
    if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
    const existing = getRepeatableSlotIds(definition, slotMap);
    if (isAtRepeatableSlotMaximum(definition, existing.length)) return;
    const slotId = buildRepeatableSlotId(
      definitionId,
      getNextRepeatableSlotInstanceId(definitionId, slotMap),
    );
    onChange({ ...block, slots: { ...slotMap, [slotId]: [] }, children: undefined });
  }

  function removeRepeatableSlot(slotId: string) {
    const parsed = parseRepeatableSlotId(slotId);
    if (!parsed) return;
    const definition = slotDefinitions.find((slot) => slot.id === parsed.definitionId);
    if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
    if (isAtRepeatableSlotMinimum(definition, getRepeatableSlotIds(definition, slotMap).length)) return;
    const nextSlots = { ...slotMap };
    delete nextSlots[slotId];
    onChange({ ...block, slots: nextSlots, children: undefined });
  }

  return (
    <WidgetEditorSection id="slots" title="Slots" info="Manage nested widget regions.">
      {/* Render slotTargets plus addRepeatableSlot/removeRepeatableSlot controls. */}
    </WidgetEditorSection>
  );
}
```

Then wire this component into `VisualPanel` or a builder-owned wrapper that
already receives `widget`, `block`, and `onChange`. Do not rely on
`WidgetEditorContext` for widget metadata: the current context only exposes
surface and binding helpers, not the active `WidgetDefinition`. The slot
component must preserve the existing `children -> slots.default` compatibility
path and clear `children` only when writing a new `slots` map, matching the
current `BlockSettings` behavior.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: no new endpoint; existing authenticated page/template save flow.
- RBAC: unchanged existing page/template/widget-template write permissions.
- CSRF: unchanged existing admin CSRF handling.
- Rate-limit bucket: unchanged admin write buckets.
- Reject-unknown validation: unchanged; metadata attributes must not affect save
  payloads.
- Anti-abuse: no public write endpoint; nonce/HMAC/reCAPTCHA not applicable.
- Accessibility safety: tooltip content cannot be the only label for a control.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this task family `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/ui/page-editor.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/widget-editors-wave-1.test.tsx`
- Focused editor waves after the proof call-site migration:
  - `tests/vitest/ui/section-editor-wave.test.tsx`
- Run hero/timeline editor waves only for scaffold-only compatibility touched in
  this task; full hero/timeline editor coverage is owned by TASK-252-03-01 and
  TASK-252-04-01.

## Documentation Updates Required

- `_docs/WIDGETS.md` mode ownership and inspector IA section.
- `_docs/_TASKS/TASK-252*.md` status notes.
- Widget docs touched by the first migration wave if visible editor behavior
  changes.
- `_docs/_CHANGELOG/README.md` and a new changelog entry listing
  `TASK-252-01` when this leaf is marked `Done`.

## Acceptance Criteria

- The right inspector top area is compact and no longer permanently shows large
  helper cards above the tabs.
- Slot controls are available inside a named section and remain fully keyboard
  accessible.
- Shared editor sections/rows can be reused by per-widget editors without
  weakening React Hooks lint rules.
- Playwright CLI can identify migrated controls through accessible names or
  stable `data-widget-*` attributes.
