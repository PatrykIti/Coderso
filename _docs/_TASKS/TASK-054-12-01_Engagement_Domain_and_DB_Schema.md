# TASK-054-12-01: Engagement Domain and DB Schema
# FileName: TASK-054-12-01_Engagement_Domain_and_DB_Schema.md

**Priority:** High  
**Category:** DB/Domain  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-11  
**Status:** In Progress (2026-02-19)

---

## Goal
Add foundational persistence for mega-menu metadata, popups, and reviews moderation flow.

## Scope
1. Extend `menu_items` with metadata for mega-menu behavior:
   - badge label/tone,
   - visibility scope (`all`, `logged_in`, `logged_out`),
   - optional icon/description.
2. Add popup domain tables:
   - popup definition (trigger, targeting, frequency, content payload),
   - lifecycle fields (`status`, `publishedAt`).
3. Add reviews domain table:
   - entity binding (`entityType`, `entityId`),
   - rating + content,
   - moderation status + metadata.
4. Add migration SQL + snapshot + journal update.

## Files
- `core/db/schema.ts`
- `core/db/migrations/0043_*.sql` (new)
- `core/db/migrations/meta/0043_snapshot.json` (new)
- `core/db/migrations/meta/_journal.json`

## Pseudocode
```ts
menuItems.settings = {
  badge: { label, tone },
  visibility: "all" | "logged_in" | "logged_out",
  icon,
  description,
};

popup.status in ["draft", "published", "archived"];
review.status in ["pending", "approved", "rejected", "spam"];
```

## Acceptance Criteria
1. Schema supports all planned engagement fields without lossy transforms.
2. Migration artifacts are complete and deterministic.
3. DB tests confirm inserts/constraints for popup/review/menu metadata tables.
