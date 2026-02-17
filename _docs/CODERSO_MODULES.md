# Coderso Modules Catalog

Source of truth for Coderso module scope, tiering, and navigation rollout.

## Registry Contract
- Runtime registry lives in `core/admin/ui/navigation/codersoModules.ts`.
- Every module defines:
  - `id`, `label`, `tier`, `ownerArea`, `lifecycle`
  - `description`, `dependencies`
  - optional `nav` config (`href`, `icon`, `defaultEnabled`, `badge`)
- Sidebar group `Coderso` is generated from registry via `buildCodersoNavItems(flags)`.

## Tier Overview

### v1 Core Builder
| Module | Owner | Lifecycle | Default Nav |
|---|---|---|---|
| Engine | content | stable | Yes |
| Entries | content | stable | Yes |
| Widgets | design | stable | Yes |
| Templates | design | stable | No (managed inside Widgets flows) |
| Forms | forms | stable | Yes |
| Posts | content | planned | Yes (`Soon`) |

### v2 Business Builder
| Module | Owner | Lifecycle | Default Nav |
|---|---|---|---|
| Listings | operations | planned | No |
| Filters | operations | planned | No |
| Search | operations | planned | No |
| Booking | operations | planned | No |
| Appointments | operations | planned | No |
| Reviews | operations | planned | No |

### v3 Growth Builder
| Module | Owner | Lifecycle | Default Nav |
|---|---|---|---|
| Commerce | growth | planned | No |
| Popups | marketing | planned | No |
| Mega Menu | design | planned | No |
| Portal | platform | planned | No |
| Multilingual | platform | planned | No |
| Solution Kits | growth | planned | No |

## Navigation Rollout Rules
1. `defaultEnabled=true` modules appear in sidebar by default.
2. `defaultEnabled=false` modules are hidden unless enabled by feature flags.
3. Feature flags are passed as `CodersoFeatureFlags` to `buildDefaultNavSections(flags)`.
4. Planned modules should keep badge `Soon` when exposed before full delivery.

## Feature Flag Example

```ts
import { buildDefaultNavSections } from "@/ui/navigation/sidebarConfig";

const sections = buildDefaultNavSections({
  listings: true,
  filters: true,
  search: true,
});
```

## Dependency Notes
- Listings/Filters/Search depend on Engine + Entries foundation.
- Booking/Appointments/Reviews depend on Forms + Listings.
- Growth modules depend on v2 data/query modules and kits/templates contracts.
