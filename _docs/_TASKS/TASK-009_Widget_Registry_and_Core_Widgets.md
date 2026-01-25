# TASK-009: Widget Registry and Core Widgets
# FileName: TASK-009_Widget_Registry_and_Core_Widgets.md

**Priority:** High
**Category:** CMS/Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-002, TASK-007
**Status:** To Do

---

## Overview

Implement the widget registry and the core widgets required for v1.
Widgets must follow the Wizard/Visual/Advanced model and validate data
against JSON schemas.

**Goals:**
- Registry for core and plugin widgets.
- Schema validation and safe defaults.
- Core widgets: hero, timeline, compare-timeline, newsletter, contact,
  navigation, footer.

---

## Architecture

```
core/widgets/
  registry.ts
  renderers/
    widgetRenderer.tsx
  core/
    hero.tsx
    timeline.tsx
    compareTimeline.tsx
    newsletter.tsx
    contact.tsx
    navigation.tsx
    footer.tsx
core/ui/widgets/
  editors/
    HeroEditor.tsx
    TimelineEditor.tsx
  wizard/
  visual/
  advanced/
```

---

## Sub-Tasks

### TASK-009-01_Widget_registry

**Status:** To Do

Define a widget contract and registration API.

Example:

```ts
type WidgetDefinition = {
  type: string;
  variants: string[];
  schema: Record<string, any>;
  defaults: Record<string, any>;
  editor: {
    wizard: React.ComponentType<any>;
    visual: React.ComponentType<any>;
    advanced: React.ComponentType<any>;
  };
  render: React.ComponentType<any>;
};

const widgetRegistry = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition) {
  if (widgetRegistry.has(def.type)) {
    throw new Error(`Widget already registered: ${def.type}`);
  }
  widgetRegistry.set(def.type, def);
}
```

---

### TASK-009-02_Schema_validation_and_defaults

**Status:** To Do

- Validate `block.data` with JSON schema per widget.
- Merge defaults on create and on schema migrations.

Example:

```ts
function normalizeBlock(block: Block) {
  const def = widgetRegistry.get(block.type);
  const data = { ...def.defaults, ...block.data };
  validateSchema(def.schema, data);
  return { ...block, data };
}
```

---

### TASK-009-03_Implement_core_widgets

**Status:** To Do

Implement renderers and editors for:
- hero
- timeline
- compare-timeline
- newsletter
- contact
- navigation
- footer

Example widget definition (hero):

```ts
registerWidget({
  type: "hero",
  variants: ["centered", "split", "media-left"],
  schema: { type: "object", properties: { headline: { type: "string" } } },
  defaults: { headline: "New headline", subhead: "" },
  editor: { wizard: HeroWizard, visual: HeroVisual, advanced: HeroAdvanced },
  render: HeroBlock,
});
```

---

### TASK-009-04_Widget_renderer_pipeline

**Status:** To Do

Render blocks with layout and visibility metadata.

Example:

```ts
function WidgetRenderer({ block }: { block: Block }) {
  const def = widgetRegistry.get(block.type);
  if (!def) return <MissingWidget type={block.type} />;
  const data = normalizeBlock(block);
  return <def.render data={data} layout={block.layout} />;
}
```

---

## Testing Requirements

- [ ] Registry rejects duplicate widget types.
- [ ] Schema validation rejects invalid data.
- [ ] Core widgets render with default data.
- [ ] Unknown widget type renders a safe fallback.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (registry contract).
- `_docs/_WIDGETS/*.md` (if widget schemas change).
- `_docs/PAGE_MODEL.md` (block normalization rules).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-registry-and-core-widgets.md`
- Notes: widget registry + core widgets.

---

## Additional Docs

- `_docs/ARCHITECTURE.md`
- `_docs/DESIGN_TOKENS.md`
