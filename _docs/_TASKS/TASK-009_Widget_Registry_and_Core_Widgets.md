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
  validator.ts
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
    CompareTimelineEditor.tsx
    NewsletterEditor.tsx
    ContactEditor.tsx
    NavigationEditor.tsx
    FooterEditor.tsx
  wizard/
  visual/
  advanced/

tests/unit/widgets/
  registry.test.ts
  validator.test.ts
  hero.test.tsx
  timeline.test.tsx
  compareTimeline.test.tsx
```

---

## Sub-Tasks

### TASK-009-01_Widget_registry

**Status:** To Do

Define widget contract and registration API.

Rules:
- `type` uses `kebab-case` for core widgets.
- Plugin widgets must prefix with plugin name (e.g. `seo-boost.timeline`).
- `variants` cannot be empty.
- `schema` must be JSON schema (draft-07 compatible).

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

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/registry.ts` | widget registry + lookup |

Registry sketch:

```ts
export function listWidgets() {
  return Array.from(widgetRegistry.values());
}
```

---

### TASK-009-02_Schema_validation_and_defaults

**Status:** To Do

Validate `block.data` with JSON schema per widget and merge defaults.

Rules:
- Reject unknown widget types early.
- Ensure `variant` is allowed for the widget.
- Do not persist `editor` metadata into `published_data`.

Example:

```ts
function normalizeBlock(block: Block) {
  const def = widgetRegistry.get(block.type);
  const data = { ...def.defaults, ...block.data };
  validateSchema(def.schema, data);
  return { ...block, data };
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/validator.ts` | schema validation + normalization |

Validator sketch:

```ts
export function validateBlock(block: Block) {
  const def = widgetRegistry.get(block.type);
  if (!def) throw new Error("Unknown widget");
  if (!def.variants.includes(block.variant)) throw new Error("Invalid variant");
  return normalizeBlock(block);
}
```

---

### TASK-009-03_Hero_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/HERO.md`.

Steps:
1) Define `heroSchema` and `heroDefaults`.
2) Implement renderer using tokens (colors, spacing).
3) Implement Wizard/Visual/Advanced editors.

Example registration:

```ts
registerWidget({
  type: "hero",
  variants: ["centered", "split", "media-left"],
  schema: heroSchema,
  defaults: heroDefaults,
  editor: { wizard: HeroWizard, visual: HeroVisual, advanced: HeroAdvanced },
  render: HeroBlock,
});
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/hero.tsx` | renderer + schema |
| `core/ui/widgets/editors/HeroEditor.tsx` | wizard/visual/advanced |

Hero schema sketch:

```ts
export const heroSchema = {
  type: "object",
  required: ["headline"],
  properties: {
    headline: { type: "string" },
    subhead: { type: "string" },
    primaryCta: { type: "object" },
  },
};
```

---

### TASK-009-04_Timeline_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/TIMELINE.md`.

Steps:
1) Use `steps[]` model for milestones.
2) Render horizontal/vertical variants.
3) Editor validates min items.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/timeline.tsx` | renderer + schema |
| `core/ui/widgets/editors/TimelineEditor.tsx` | wizard/visual/advanced |

---

### TASK-009-05_Compare_timeline_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/COMPARE_TIMELINE.md`.

Steps:
1) Render dual tracks with optional highlighted segments.
2) Support dashed guides and labels.
3) Editor enforces both tracks have aligned step counts.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/compareTimeline.tsx` | renderer + schema |
| `core/ui/widgets/editors/CompareTimelineEditor.tsx` | wizard/visual/advanced |

---

### TASK-009-06_Newsletter_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/NEWSLETTER.md`.

Steps:
1) Render form with validation feedback.
2) Support optional success message state.
3) Ensure accessibility (label, aria).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/newsletter.tsx` | renderer + schema |
| `core/ui/widgets/editors/NewsletterEditor.tsx` | wizard/visual/advanced |

---

### TASK-009-07_Contact_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/CONTACT.md`.

Steps:
1) Render contact form + optional address block.
2) Map fields to submission payload.
3) Use design tokens for spacing/typography.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/contact.tsx` | renderer + schema |
| `core/ui/widgets/editors/ContactEditor.tsx` | wizard/visual/advanced |

---

### TASK-009-08_Navigation_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/NAVIGATION.md`.

Steps:
1) Resolve menu by location or menu id.
2) Support mobile toggle variant.
3) Use `menuService` to fetch tree.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/navigation.tsx` | renderer + schema |
| `core/ui/widgets/editors/NavigationEditor.tsx` | wizard/visual/advanced |

---

### TASK-009-09_Footer_widget

**Status:** To Do

Use schema and variants from `_docs/_WIDGETS/FOOTER.md`.

Steps:
1) Render columns with menu or links.
2) Support simple and multi-column variants.
3) Use tokens for background and text.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/core/footer.tsx` | renderer + schema |
| `core/ui/widgets/editors/FooterEditor.tsx` | wizard/visual/advanced |

---

### TASK-009-10_Widget_renderer_pipeline

**Status:** To Do

Render blocks with layout and visibility metadata.

Rules:
- Apply `layout.container` to wrapper width.
- Apply `layout.padding` and `layout.margin` via tokens.
- Skip render if `visibility.enabled` is false.

Example:

```ts
function WidgetRenderer({ block }: { block: Block }) {
  const def = widgetRegistry.get(block.type);
  if (!def) return <MissingWidget type={block.type} />;
  const data = normalizeBlock(block);
  return <def.render data={data} layout={block.layout} />;
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/widgets/renderers/widgetRenderer.tsx` | runtime renderer |

Renderer sketch:

```tsx
export function MissingWidget({ type }: { type: string }) {
  return <div className="border p-4">Missing widget: {type}</div>;
}
```

---

## Testing Requirements

- [ ] `tests/unit/widgets/registry.test.ts` rejects duplicates.
- [ ] `tests/unit/widgets/validator.test.ts` validates defaults.
- [ ] `tests/unit/widgets/hero.test.tsx` renders hero defaults.
- [ ] `tests/unit/widgets/timeline.test.tsx` renders timeline defaults.
- [ ] `tests/unit/widgets/compareTimeline.test.tsx` renders compare timeline.
- [ ] `tests/unit/widgets/renderer.test.tsx` renders MissingWidget fallback.

---

## New Files to Create

- `core/widgets/registry.ts`
- `core/widgets/validator.ts`
- `core/widgets/renderers/widgetRenderer.tsx`
- `core/widgets/core/hero.tsx`
- `core/widgets/core/timeline.tsx`
- `core/widgets/core/compareTimeline.tsx`
- `core/widgets/core/newsletter.tsx`
- `core/widgets/core/contact.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `core/ui/widgets/editors/HeroEditor.tsx`
- `core/ui/widgets/editors/TimelineEditor.tsx`
- `core/ui/widgets/editors/CompareTimelineEditor.tsx`
- `core/ui/widgets/editors/NewsletterEditor.tsx`
- `core/ui/widgets/editors/ContactEditor.tsx`
- `core/ui/widgets/editors/NavigationEditor.tsx`
- `core/ui/widgets/editors/FooterEditor.tsx`
- `tests/unit/widgets/registry.test.ts`
- `tests/unit/widgets/validator.test.ts`
- `tests/unit/widgets/hero.test.tsx`
- `tests/unit/widgets/timeline.test.tsx`
- `tests/unit/widgets/compareTimeline.test.tsx`
- `tests/unit/widgets/renderer.test.tsx`

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (registry contract).
- `_docs/_WIDGETS/*.md` (if schemas change).
- `_docs/PAGE_MODEL.md` (block normalization rules).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-registry-and-core-widgets.md`
- Notes: widget registry + core widgets.

---

## Additional Docs

- `_docs/ARCHITECTURE.md`
- `_docs/DESIGN_TOKENS.md`
