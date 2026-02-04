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
| 019 | 2026-01-26 | Users and roles UI | Admin/UI |
| 020 | 2026-01-26 | Page builder UI | Admin/UI |
| 021 | 2026-01-27 | Content types admin UI | Admin/UI |
| 022 | 2026-01-27 | Media library admin UI | Admin/UI |
| 023 | 2026-01-27 | Search and indexing | CMS/Search |
| 024 | 2026-01-27 | Audit logs | CMS/Security |
| 025 | 2026-01-27 | Plugin runtime loader and registry | Core/Plugins |
| 026 | 2026-01-27 | SDK package and plugin API | Core/SDK |
| 027 | 2026-01-27 | Store client and update policy | Core/Store |
| 028 | 2026-01-27 | Plugin store admin UI | Admin/UI |
| 029 | 2026-01-27 | Users and roles admin UI | Admin/UI |
| 030 | 2026-01-27 | Auth UI wiring | Admin/UI |
| 031 | 2026-01-27 | Core HTTP server and admin bootstrap | Core/Platform |
| 032 | 2026-01-27 | Auth advanced endpoints (CSRF/OTP/Reset) | Core/Auth |
| 033 | 2026-01-28 | Form builder UI | Admin/UI |
| 034 | 2026-01-28 | API Keys UI | Admin/UI |
| 035 | 2026-01-28 | Audit Logs UI | Admin/UI |
| 036 | 2026-01-28 | Content Entries List UI | Admin/UI |
| 037 | 2026-01-28 | Content Entry Editor UI | Admin/UI |
| 038 | 2026-01-28 | Settings Security UI | Admin/UI |
| 039 | 2026-01-28 | Webhooks UI | Admin/UI |
| 040 | 2026-01-28 | Analytics UI | Admin/UI |
| 041 | 2026-01-28 | Backups UI | Admin/UI |
| 042 | 2026-01-28 | Global Search UI | Admin/UI |
| 043 | 2026-01-28 | Media Details UI | Admin/UI |
| 044 | 2026-01-28 | Permissions Matrix UI | Admin/UI |
| 045 | 2026-01-28 | Plugin Details UI | Admin/UI |
| 046 | 2026-01-28 | SEO Manager UI | Admin/UI |
| 047 | 2026-01-28 | Themes UI | Admin/UI |
| 048 | 2026-01-28 | Theme Editor UI | Admin/UI |
| 049 | 2026-01-28 | Widget Library UI | Admin/UI |
| 050 | 2026-01-28 | Access Logs UI | Admin/UI |
| 051 | 2026-01-28 | Email Settings UI | Admin/UI |
| 052 | 2026-01-28 | General Settings UI | Admin/UI |
| 053 | 2026-01-28 | Integrations UI | Admin/UI |
| 054 | 2026-01-28 | Invite Users UI | Admin/UI |
| 055 | 2026-01-28 | IP Allowlist UI | Admin/UI |
| 056 | 2026-01-28 | Redirects UI | Admin/UI |
| 057 | 2026-01-28 | Security Sessions UI | Admin/UI |
| 058 | 2026-01-28 | Storage Settings UI | Admin/UI |
| 059 | 2026-01-28 | Import & Export UI | Admin/UI |
| 060 | 2026-01-28 | Login Alerts UI | Admin/UI |
| 061 | 2026-01-28 | Admin UI Integration | Admin/UI |
| 062 | 2026-01-28 | Admin UI interactions and drawers | Admin/UI |
| 063 | 2026-01-28 | Admin UI mobile navigation | Admin/UI |
| 064 | 2026-01-28 | Pages revisions and preview enhancements | CMS/Pages |
| 065 | 2026-01-28 | Pages UI wiring | Admin/UI |
| 066 | 2026-01-28 | Content UI wiring | Admin/UI |
| 067 | 2026-01-28 | Auth UI wiring | Admin/UI |
| 068 | 2026-01-28 | Media storage and wiring | CMS/Media |
| 069 | 2026-01-28 | Storage settings runtime | CMS/Media |
| 070 | 2026-01-29 | Settings UI wiring | Admin/UI |
| 071 | 2026-01-29 | Themes registry | CMS/Themes |
| 072 | 2026-01-29 | Theme profiles and routes | CMS/Themes |
| 073 | 2026-01-29 | Template resolution | CMS/Themes |
| 074 | 2026-01-29 | Themes admin API | CMS/Themes |
| 075 | 2026-01-29 | Themes UI wiring | Admin/UI |
| 076 | 2026-01-29 | Admin UI theme templates | Admin/UI |
| 077 | 2026-01-29 | Admin UI theme tabs | Admin/UI |
| 078 | 2026-01-30 | Widget registry and core widgets | CMS/Widgets |
| 079 | 2026-01-30 | Security middleware and settings | Core/Security |
| 080 | 2026-01-30 | Plugin safe mode in security settings | Core/Security |
| 081 | 2026-01-30 | Session limits in security settings | Core/Security |
| 082 | 2026-01-30 | Search UI wiring | Admin/UI |
| 083 | 2026-01-30 | SEO manager core and UI | CMS/SEO |
| 084 | 2026-01-30 | Analytics core and UI wiring | CMS/Analytics |
| 085 | 2026-01-30 | Backups core and UI wiring | CMS/Backups |
| 086 | 2026-01-30 | Import / export core and UI wiring | CMS/Tools |
| 087 | 2026-01-30 | Redirects core and UI wiring | CMS/SEO |
| 088 | 2026-01-31 | Admin sessions API and UI wiring | Admin/Security |
| 089 | 2026-01-31 | Audit logs UI wiring | Admin/Security |
| 090 | 2026-01-31 | Access logs core and UI wiring | Admin/Security |
| 091 | 2026-01-31 | IP allowlist core and UI wiring | Admin/Security |
| 092 | 2026-01-31 | Login alerts settings | Admin/Security |
| 093 | 2026-01-31 | Login alerts UI wiring | Admin/UI |
| 123 | 2026-02-01 | Content labels update | Admin/UI |
| 124 | 2026-02-01 | Content type relation metadata | CMS/Content |
| 125 | 2026-02-01 | Relation field UX improvements | Admin/UI |
| 126 | 2026-02-02 | Storage URL autoderive | CMS/Media |
| 127 | 2026-02-02 | Media library previews | Admin/UI |
| 128 | 2026-02-02 | Media display name | Admin/UI |
| 129 | 2026-02-02 | Widget templates core + UI wiring | Admin/UI |
| 130 | 2026-02-02 | Widget details configuration preview | Admin/UI |
| 131 | 2026-02-02 | Widget template preview | Admin/UI |
| 132 | 2026-02-02 | Widget template revisions and library fixes | Admin/UI |
| 133 | 2026-02-03 | Widget nesting support | CMS/Widgets |
| 134 | 2026-02-03 | Public site CSS pipeline | CMS/Site |
| 135 | 2026-02-03 | Site runtime settings model | CMS/Site |
| 136 | 2026-02-03 | Public content routes and preview | CMS/Site |
| 137 | 2026-02-03 | Content entry templates | CMS/Site |
| 138 | 2026-02-03 | Public SSR cache | CMS/Site |
| 139 | 2026-02-03 | Site settings UI | Admin/UI |
| 140 | 2026-02-03 | Site settings relocation | Admin/UI |
| 142 | 2026-02-03 | Field schema meta | CMS/Content |
| 143 | 2026-02-03 | Relation field UX | CMS/Content |
| 144 | 2026-02-04 | Media field picker | CMS/Media |
| 145 | 2026-02-04 | Taxonomy system | CMS/Content |
| 146 | 2026-02-04 | Content editor help and tooltips | Admin/UI |
| 147 | 2026-02-04 | Content modeling docs | Docs |
| 148 | 2026-02-04 | Field layout and grouping UX | Admin/UI |
| 149 | 2026-02-04 | Entry workflow validation UX | Admin/UI |
| 150 | 2026-02-04 | Entry list bulk actions | Admin/UI |
| 151 | 2026-02-04 | Widgets catalog API | CMS/Widgets |
| 152 | 2026-02-04 | Widget favorites user settings | CMS/Settings |
| 153 | 2026-02-04 | Widget library catalog wiring | Admin/UI |
| 141 | 2026-02-03 | Site settings steps & errors | Admin/UI |
| 094 | 2026-01-31 | Forms core | CMS/Forms |
| 095 | 2026-01-31 | Forms UI wiring | Admin/UI |
| 096 | 2026-01-31 | API keys service | Core/Security |
| 097 | 2026-01-31 | API keys API | Core/Security |
| 098 | 2026-01-31 | API keys UI | Admin/UI |
| 099 | 2026-01-31 | Webhooks schema and service | Core/Integrations |
| 100 | 2026-01-31 | Webhooks delivery | Core/Integrations |
| 101 | 2026-01-31 | Webhooks API and UI | Admin/UI |
| 102 | 2026-01-31 | Email settings service | Core/Email |
| 103 | 2026-01-31 | Email settings API | Core/Email |
| 104 | 2026-01-31 | Email settings UI | Admin/UI |
| 105 | 2026-01-31 | Integrations service | Core/Integrations |
| 106 | 2026-01-31 | Integrations API | Core/Integrations |
| 107 | 2026-01-31 | Integrations UI | Admin/UI |
| 108 | 2026-01-31 | Search history + categories | Admin/Search |
| 109 | 2026-01-31 | Search UX refinements | Admin/Search |
| 110 | 2026-01-31 | Entries filters and authors | CMS/Content |
| 111 | 2026-01-31 | Entry metadata integration | CMS/Content |
| 112 | 2026-02-01 | User settings preferences | Core/Settings |
| 113 | 2026-02-01 | Pages delete endpoint | CMS/Pages |
| 114 | 2026-02-01 | Public pages rendering and preview | CMS/Pages |
| 115 | 2026-02-01 | Admin/public base URLs | Core/Platform |
| 116 | 2026-02-01 | Admin access path and redirect | Core/Platform |
| 117 | 2026-02-01 | Page editor UX fixes | Admin/UI |
| 118 | 2026-02-01 | Content type editor layout refinements | Admin/UI |
| 119 | 2026-02-01 | Content type fields search | Admin/UI |
| 120 | 2026-02-01 | Admin input controls theming | Admin/UI |
| 121 | 2026-02-01 | Menus editor wiring | Admin/UI |
| 122 | 2026-02-01 | Menus editor validation | Admin/UI |
| 123 | 2026-02-02 | Widgets library UI refresh | Admin/UI |
| 124 | 2026-02-02 | Widget template editor drag-and-drop | Admin/UI |


---
*Details of changes are in the linked files.*
