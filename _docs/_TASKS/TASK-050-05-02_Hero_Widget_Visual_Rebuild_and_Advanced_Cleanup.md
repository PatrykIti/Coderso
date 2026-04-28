# TASK-050-05-02: Hero Widget Visual Rebuild and Advanced Cleanup
# FileName: TASK-050-05-02_Hero_Widget_Visual_Rebuild_and_Advanced_Cleanup.md

**Priority:** High  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-050-05-01  
**Status:** Done (2026-02-06)

---

## Overview

Rebuild Hero editing UX to be WordPress-like and highly user-friendly:
- Wizard stays minimal.
- Visual becomes the primary, section-based editor for all user-facing content
  and style decisions.
- Advanced becomes technical/expert-only and removes duplicated controls.

This task also introduces a working `Add variant preset` flow for Hero.

---

## UX Target (Mode Responsibilities)

### Wizard
- Minimal onboarding questions and safe defaults.
- No deep style editing.

### Visual
- Single source of truth for day-to-day Hero editing.
- Full content + style editing for what users actually see.
- Variant cards, preset management, media, typography, color, border controls.

### Advanced
- Technical controls only:
  - layout tokens (container, spacing, margins)
  - visibility/responsive toggles
  - optional expert raw fields (if needed)
- No duplication of basic content/style controls already in Visual.

---

## Scope

### A) Remove Visual duplication (Hero-specific)

Current issue: duplicate variant controls are rendered by generic `VisualPanel`
and by `HeroVisualEditor`.

Required result:
- For Hero, render only one variant selector block (the descriptive cards in
  Hero editor).
- Keep generic behavior unchanged for other widgets.

Implementation approach:
- Add per-widget Visual capability flag (example: `visualOwnsVariantSelection`).
- When enabled, `VisualPanel` hides default horizontal variant picker and keeps
  only editor-defined variant section.

### B) Hero Visual IA redesign (section-based)

Required sections inside `HeroVisualEditor`:
1. Variant and Presets
2. Content (headline, subhead, body)
3. CTA (single/dual mode, labels, URLs, size/style)
4. Media (type/source, asset, ratio, overlay, frame/border)
5. Typography (sizes/weights/line-height where supported)
6. Colors and Borders (text, buttons, surfaces, media frame)
7. Background (color, gradient, image)

Rules:
- Show only controls relevant to selected variant.
- Keep microcopy explicit and non-technical.
- Use color pickers for color fields (not raw text-only inputs).

### C) Working `Add variant preset` modal

Required behavior:
- Clicking `Add variant preset` opens a modal.
- Modal allows creating a named Hero preset from current configuration.
- Preset can be applied, updated, and deleted.
- Presets include full Hero config relevant to Visual editing sections.

Persistence:
- Persist per user via `user_settings` (new key for Hero presets).
- Include validation and limits (e.g. max presets per user, unique names).

### D) Advanced cleanup

Required changes:
- Remove duplicated Visual controls from `HeroAdvancedEditor`.
- Keep only technical/expert controls.
- Keep color input UX consistent (picker + raw input if needed for precision).

### E) Renderer and schema alignment

- Extend `HeroData` schema/defaults only where required by new Visual controls.
- Ensure `HeroBlock` consumes new style fields deterministically.
- Preserve backward compatibility for existing saved blocks.

---

## Data Model and API Changes

### Hero data model (if expanded)

Potential additions under `HeroData.style` (exact final keys to be frozen during implementation):
- text color tokens
- headline/subhead/body size tokens
- button visual tokens (bg/text/border/radius/size)
- media frame tokens (border color/width/radius)

### User settings extensions

Add new user settings key for Hero presets:
- `widgets.hero.presets`

Update required layers:
- client typing and API calls
- service key allowlist + value validation
- route payload validation
- unit tests for invalid shapes and limits

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/types.ts` | add optional editor capabilities | support Hero-owned variant UI in Visual |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | conditionally hide generic variant picker | based on widget capability |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | redesign Visual into section-based editor | no duplicate variant controls |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | implement preset modal + actions | create/apply/update/delete |
| `core/admin/components/ui/*` | reuse existing dialog/popover primitives | avoid custom modal stack |
| `core/services/settings/userSettingsService.ts` | add `widgets.hero.presets` support | schema validation + limits |
| `core/admin/services/userSettingsClient.ts` | extend typed settings map | new key support |
| `core/server/routes/userSettingsRoutes.ts` | ensure route validation accepts new key | no regressions for existing keys |
| `core/widgets/core/hero.tsx` | extend schema/defaults/render mapping | style controls -> runtime output |
| `tests/unit/ui/*` | add visual panel + preset modal tests | hero-only behavior |
| `tests/unit/services/*` | add user settings validation tests | presets limits + shape |
| `tests/unit/widgets/hero.test.tsx` | add renderer tests for new style fields | backward compatibility included |

---

## Acceptance Criteria

1. Hero Visual displays a single variant selector system (no duplicated controls).
2. `Add variant preset` opens a modal and supports create/apply/update/delete.
3. Presets are persisted per user and restored on reload.
4. Visual contains all user-facing Hero content/style controls in clear sections.
5. Advanced no longer duplicates Visual content/style controls.
6. Color-related controls in Visual/Advanced provide picker-based UX.
7. Existing Hero blocks remain valid and render correctly.

---

## Testing Requirements

- Unit/UI: Hero Visual renders sections and hides generic variant picker when capability is enabled.
- Unit/UI: preset modal workflow (open/create/apply/update/delete).
- Unit: user settings validation for `widgets.hero.presets`.
- Unit: Hero schema compatibility with old and new payloads.
- Unit: Hero renderer respects new style fields.
- Run relevant suites:
  - `bun test tests/unit/widgets/hero.test.tsx`
  - `bun test tests/unit/ui/*hero* tests/unit/pageBuilder/*visual*`
  - `bun test tests/unit/services/*user*settings*`

---

## Documentation Updates Required (after completion)

### Task and board
- Update status in this file to `Done (YYYY-MM-DD)`.
- Update `_docs/_TASKS/README.md`:
  - move TASK-050-05-02 row from **To Do** to **Done**
  - update Statistics counters.

### Widget docs
- Update `_docs/_WIDGETS/HERO.md`:
  - final Visual sections
  - preset workflow
  - final Advanced scope
  - final style field list.

### Cross-doc consistency
- Update `_docs/WIDGETS.md`:
  - clarify mode responsibility split (Wizard minimal, Visual primary, Advanced technical).
- Update `_docs/PAGE_MODEL.md` if Hero data shape changed.
- Update `_docs/CMS_SPEC.md` and `_docs/ARCHITECTURE.md` if mode contract wording changes.

### Changelog
- Add new entry file:
  - `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-hero-widget-visual-rebuild-and-advanced-cleanup.md`
- Add matching index row in `_docs/_CHANGELOG/README.md`.

---

## Out of Scope

- Rebuilding Visual/Advanced IA for non-Hero widgets.
- Global preset system for all widgets (this task is Hero-only).
- Theme/token architecture redesign outside Hero.
