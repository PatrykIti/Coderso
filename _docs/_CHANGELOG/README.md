# Changelog

Project Change Log.

## Workflow
1. Create a new changelog file in `_docs/_CHANGELOG/` using the naming rules below.
2. Add a row to the **Index** table with No., Date, Title, Type.
3. Include related task IDs in the changelog entry.

## File naming
- Format: `{N}-{YYYY-MM-DD}-short-title.md`
- Example: `1-2025-11-22-project-init-and-rpc.md`
- `N` increments by 1 and is never reused.

## Entry format (minimum)
- Title line with No. and short title.
- `Date`, `Version`, `Tasks`.
- Sections for Key Changes (grouped by area).
- Keep entries concise and user-facing.

## Reference
- See `EXAMPLE_CHANGELOG.md` for a full example.

## Index

| No. | Date | Title | Type |
|-----|------|-------|------|
| 001 | 2026-01-25 | ORM foundation and auth tables | Core/DB |
| 002 | 2026-01-25 | Pages, revisions, and preview | CMS/Pages |
| 003 | 2026-01-25 | Content types engine | CMS/Content |
| 004 | 2026-01-25 | Auth, RBAC, and admin API base | Core/Auth |
| 005 | 2026-01-25 | Media storage and uploads | CMS/Media |
| 006 | 2026-01-25 | Settings and design tokens | CMS/Settings |
| 007 | 2026-01-25 | Shadcn UI and Tailwind v4 setup | Admin/UI |
| 008 | 2026-01-25 | Menus and navigation | CMS/Menus |
| 009 | 2026-01-26 | Auth UI foundations | Admin/UI |
| 010 | 2026-01-26 | Admin shell wrappers and navigation scaffolding | Admin/UI |
| 011 | 2026-01-26 | Dashboard UI | Admin/UI |
| 012 | 2026-01-26 | Menu editor UI | Admin/UI |
| 013 | 2026-01-26 | Media library UI | Admin/UI |
| 014 | 2026-01-26 | Schema builder UI | Admin/UI |
| 015 | 2026-01-26 | Plugin store UI | Admin/UI |
| 016 | 2026-01-26 | Page list UI | Admin/UI |
| 017 | 2026-01-26 | Page editor UI | Admin/UI |
| 018 | 2026-01-26 | Design tokens UI | Admin/UI |


---
*Details of changes are in the linked files.*
