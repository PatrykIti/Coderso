# Content List Focused Wizard/View-All Probe

- **Generated:** 2026-05-25T20:18:33.728Z
- **Admin:** http://localhost:5173/admin
- **Widget:** `content-list`
- **Probe:** selected the Content List fixture in two fresh Playwright sessions: one clicked `Run setup again` and inspected Wizard, the other selected `View all page` and inspected conditional pagination controls.

## Result

| Widget | Probe | Status | Root | Sections | Visible sections | Controls | Writable paths | Missing metadata | Raw JSON | Raw path input |
|---|---|---|---:|---:|---:|---:|---|---:|---|---|
| `content-list` | wizard | passed | 1 | 2 | 2 | 5 | `source.mode`, `source.contentTypeId`, `source.statusScope`, `source.sort`, `source.limit` | 0 | no | no |
| `content-list` | visual view-all | passed | 1 | 9 | 9 | 35 | `variant`, `style.columns`, `style.gap`, `style.cardStyle`, `filters.taxonomy`, `filters.authorId`, `filters.searchQuery`, `filters.featuredOnly`, `title`, `description`, `pagination.mode`, `pagination.pageSize`, `pagination.viewAllHref`, `pagination.viewAllLabel`, `fields.showImage`, `fields.showExcerpt`, `fields.showMeta`, `fields.showCta`, `style.imageAspect`, `style.tagMode`, `style.tagLimit`, `style.ctaLabel`, `style.backgroundColor`, `style.borderColor`, `style.textColor`, `emptyState.title`, `emptyState.description`, `layout.container`, `layout.padding.top`, `layout.padding.bottom`, `layout.margin.top`, `layout.margin.bottom`, `visibility.devices.desktop`, `visibility.devices.tablet`, `visibility.devices.mobile` | 0 | no | no |

## View-All Checks

- Page size control present: yes
- Page-first destination picker present: yes
- `pagination.viewAllHref` metadata present: yes
- `pagination.viewAllLabel` metadata present: yes
- Raw URL/path input present: no
