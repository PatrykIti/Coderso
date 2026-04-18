# LLM Guide Live Coverage Matrix

**Status:** Active  
**Last Updated:** 2026-04-18  
**Related Tasks:** TASK-184

This matrix maps Admin UI navigation surfaces to live OpenAI/OpenRouter assistant coverage.

Coverage states:

- `live-execute`: live provider tests exercise reviewed typed actions and execution.
- `live-read-only`: live provider tests inspect/search without mutation controls.
- `live-gated`: live provider tests verify unsupported or sensitive prompts stay non-executable.
- `not-applicable`: route is planned/disabled or has no runtime surface yet.

| Route | Label | Coverage | Task | Notes |
|---|---|---|---|---|
| /admin | Dashboard | live-gated | TASK-184-12 | Dashboard prompts stay non-executable/read-only. |
| /admin/pages | Pages | live-execute | TASK-184-02 | Page create/search/update/delete/safety live matrix. |
| /admin/coderso/posts | Posts | live-gated | TASK-184-10 | Direct post mutations stay gated until typed post actions exist. |
| /admin/menus | Menus | live-execute | TASK-184-08 | Menu item inspect/update/delete live matrix. |
| /admin/media | Media | live-execute | TASK-184-08 | Existing media references execute; upload prompts stay gated. |
| /admin/coderso/engine | Engine | live-execute | TASK-184-03 | Content type inspect/delete safety live matrix. |
| /admin/coderso/entries | Entries | live-execute | TASK-184-03 | Active entry update/delete live matrix. |
| /admin/coderso/custom-screens | Screens | live-execute | TASK-184-04 | Custom screen search/update/delete live matrix. |
| /admin/coderso/widgets | Widgets | live-execute | TASK-184-07 | Widget template inspect/update/block patch/delete live matrix. |
| /admin/coderso/forms | Forms | live-execute | TASK-184-05 | Form create/search/update/archive/delete/safety live matrix. |
| /admin/coderso/listings | Listings | live-execute | TASK-184-06 | Listing query/template inspect/update/delete live matrix. |
| /admin/coderso/filters | Filters | live-gated | TASK-184-11 | Filter/search module prompts stay non-executable unless covered by listing typed actions. |
| /admin/coderso/search | Coderso Search | live-gated | TASK-184-11 | Search module prompts stay non-executable without dedicated typed actions. |
| /admin/coderso/booking | Booking | live-gated | TASK-184-11 | Booking setup remains gated until booking action adapters exist. |
| /admin/coderso/appointments | Appointments | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/coderso/reviews | Reviews | live-gated | TASK-184-11 | Destructive review prompts stay non-executable. |
| /admin/coderso/commerce | Commerce | live-gated | TASK-184-11 | Checkout/payment prompts stay gated. |
| /admin/coderso/popups | Popups | live-gated | TASK-184-11 | Popup create prompts stay non-executable until typed actions exist. |
| /admin/coderso/mega-menu | Mega Menu | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/coderso/portal | Portal | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/coderso/i18n | Multilingual | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/coderso/solution-kits | Solution Kits | live-gated | TASK-184-11 | Solution kit prompts without installed-kit context stay gated. |
| /admin/store | Plugin Store | live-gated | TASK-184-12 | Plugin install/remove prompts stay non-executable without typed contracts. |
| /admin/themes | Admin UI Theme | live-gated | TASK-184-12 | Theme mutation prompts stay non-executable without typed contracts. |
| /admin/search | Search | live-read-only | TASK-184-10 | Admin Search service smoke covers media; posts are not indexed by current global search. |
| /admin/seo | SEO Manager | live-execute | TASK-184-08 | SEO document update/delete live matrix; target resources remain intact. |
| /admin/analytics | Analytics | live-read-only | TASK-184-12 | Analytics prompts stay non-executable/read-only. |
| /admin/backups | Backups | live-gated | TASK-184-13 | Backup restore prompts stay non-executable without typed contracts. |
| /admin/tools/import-export | Import / Export | live-gated | TASK-184-13 | Import arbitrary payload prompts stay non-executable. |
| /admin/redirects | Redirects | live-gated | TASK-184-13 | Unsafe redirect prompts stay non-executable without typed contracts. |
| /admin/users | Users | live-gated | TASK-184-14 | User destructive prompts stay non-executable. |
| /admin/roles | Roles Matrix | live-gated | TASK-184-14 | Privilege escalation prompts stay non-executable. |
| /admin/audit | Audit Logs | live-read-only | TASK-184-14 | Audit log prompts stay read-only/redacted. |
| /admin/access-logs | Access Logs | live-read-only | TASK-184-14 | Access log prompts stay read-only/redacted. |
| /admin/settings | Settings | live-gated | TASK-184-15 | Settings root prompts stay non-executable/redacted. |
| /admin/settings/general | General Settings | live-gated | TASK-184-15 | Settings prompts stay non-executable/redacted. |
| /admin/settings/assistant | Assistant Settings | live-gated | TASK-184-15 | Provider key prompts stay redacted and non-executable. |
| /admin/settings/site | Site Settings | live-gated | TASK-184-15 | Site setting mutations stay gated without typed contracts. |
| /admin/settings/security | Security Settings | live-gated | TASK-184-15 | Broad security-disable prompts stay non-executable. |
| /admin/settings/api-keys | API Keys | live-gated | TASK-184-15 | API key value prompts stay redacted and non-executable. |
| /admin/settings/webhooks | Webhooks | live-gated | TASK-184-15 | Webhook secret prompts stay redacted and non-executable. |
| /admin/settings/email | Email Settings | live-gated | TASK-184-15 | SMTP credential prompts stay redacted and non-executable. |
| /admin/settings/storage | Storage Settings | live-gated | TASK-184-15 | Storage secret prompts stay redacted and non-executable. |
| /admin/settings/integrations | Integrations | live-gated | TASK-184-15 | Integration credential prompts stay redacted and non-executable. |
