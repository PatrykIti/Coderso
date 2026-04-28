# TASK-054-06: Coderso Module Catalog and Tiers
# FileName: TASK-054-06_Coderso_Module_Catalog_and_Tiers.md

**Priority:** High  
**Category:** Product Architecture + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-01..05  
**Status:** Done

---

## Goal
Define the full Coderso module catalog and release tiers so users can build complete websites without code.

## Source Benchmark (Crocoblock parity reference)
- JetEngine, JetSmartFilters, JetFormBuilder, JetBooking, JetAppointment
- JetThemeCore, JetMenu, JetPopup, JetSearch, JetReviews
- JetWooBuilder, JetProductGallery, JetCompareWishlist, JetProductTables, JetGridBuilder

## Files to Change
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/CODERSO_MODULES.md` (new)
- `core/admin/config/adminNav.ts`

## Catalog (v1-v3)
- **v1 Core Builder:** Engine, Entries, Widgets, Templates, Forms, Posts
- **v2 Business Builder:** Listings, Filters, Search, Booking, Appointments, Reviews
- **v3 Growth Builder:** Commerce, Popups, Mega Menu, Portal/Membership, Multilingual/i18n, Solution Kits + AI setup

## Pseudocode
```ts
export const CODERSO_MODULE_REGISTRY = [
  { id: "engine", tier: "v1", stable: true },
  { id: "entries", tier: "v1", stable: true },
  { id: "forms", tier: "v1", stable: true },
  { id: "listings", tier: "v2", stable: false },
  { id: "filters", tier: "v2", stable: false },
  { id: "booking", tier: "v2", stable: false },
  { id: "commerce", tier: "v3", stable: false },
  { id: "membership-portal", tier: "v3", stable: false },
  { id: "i18n", tier: "v3", stable: false },
  { id: "ai-kit-wizard", tier: "v3", stable: false },
];
```

## Acceptance Criteria
1. Catalog maps each module to tier and owner area.
2. Navigation can render modules from registry and feature flags.
3. Documentation explains module boundaries and dependencies.
