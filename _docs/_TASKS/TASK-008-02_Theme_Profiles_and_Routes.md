# TASK-008-02: Theme Profiles and Routes
# FileName: TASK-008-02_Theme_Profiles_and_Routes.md

**Priority:** Medium  
**Category:** CMS/Themes  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008-01  
**Status:** To Do  

---

## Overview

Theme Profiles pozwalaja tworzyc wiele wariantow wygladu (np. "Front A", "Front B")
bez duplikowania contentu. Profile mapuja ścieżki na strony i posiadają własne tokeny.

---

## DB Schema

Nowe tabele:

```ts
export const themeProfiles = pgTable("theme_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  themeName: text("theme_name").notNull(),
  tokens: jsonb("tokens").notNull().default({}),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const themeRoutes = pgTable("theme_routes", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => themeProfiles.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  pageId: uuid("page_id").references(() => pages.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Indexes/constraints:**
- Unique: `(profileId, path)`
- Only one active profile: enforce in service (transaction)

---

## Services

`core/services/themes/themeProfileService.ts`

Key actions:
- `listProfiles()`
- `createProfile()`
- `updateProfile()`
- `activateProfile(profileId)` -> sets all inactive then active
- `setProfileRoutes(profileId, routes)` -> replaces routes
- `getActiveProfile()`

**Route normalization:**
- Always leading `/`.
- Root is `/`.
- No trailing `/` except root.

---

## Testing Requirements

- Only one active profile at a time.
- Routes are normalized and unique.
- Profile deletion removes routes.

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` (profiles + routing)
- `_docs/DATA_MODEL.md` (new tables)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-theme-profiles.md`
