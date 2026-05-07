# Widget Pack Matrix

Advanced module-level pack coverage contract for composite-first delivery.

## Minimum Rules

Default minimum per module pack:
- `1` page preset
- `2` section presets
- `3` composite widgets

Enforcement levels:
- `strict`: must pass runtime validation (`validateModulePackMatrix`)
- `advisory`: gaps are reported in status, but do not fail runtime

## Matrix (v1)

| Module | Enforcement | Page Presets | Section Presets | Composite Widgets | Status Intent |
|---|---|---:|---:|---:|---|
| Content | strict | 1 | 2 | 3 | Ready |
| Forms | strict | 1 | 2 | 3 | Ready |
| Listings | strict | 1 | 2 | 3 | Ready |
| Commerce | strict | 1 | 2 | 3 | Ready |
| Navigation | advisory | 1 | 2 | 2 | Needs 1 composite |
| Booking | advisory | 1 | 2 | 2 | Needs 1 composite |
| Search | advisory | 1 | 2 | 1 | Needs dedicated result composites |
| Media | advisory | 1 | 2 | 1 | Needs additional media composites |
| Engagement | advisory | 1 | 2 | 2 | Needs 1 composite |

## Runtime Contract

Core registry functions:
- `listModulePackStatus(widgets?)`
- `validateModulePackMatrix({ widgets?, strictOnly? })`

Behavior:
- strict modules fail fast on invalid coverage (`module_pack_invalid:<module>`)
- advisory modules expose explicit gaps in status for roadmap visibility
- composite widget references must exist and be registered as `complexity="composite"`

## Admin UI Behavior

Widget library module filter is pack-aware:
- strict ready modules are listed first,
- coverage gaps are labeled as `Needs coverage`,
- untracked modules are listed after tracked matrix modules.

This keeps non-technical users focused on complete module packs first.

Note:
- screen-only widgets from surface `custom-screen-builder` are excluded from the page/widget-library module pack matrix.
- assistant page-section alias resolution for `TASK-190` reuses this matrix plus
  current page-builder widget metadata; it does not add a second section
  readiness registry or separate preset counters.
