# LLM Guide Live Coverage Matrix

**Status:** Active  
**Last Updated:** 2026-06-07
**Related Tasks:** TASK-184, TASK-188, TASK-190, TASK-404, TASK-407

TASK-188 mirrors this route matrix into `assistantOperationPolicy` and validates
the checked-in markdown against generated policy coverage rows so planner/schema
work consumes policy metadata instead of duplicating route coverage heuristics.

This matrix maps Admin UI navigation surfaces to live OpenAI/OpenRouter assistant coverage.

Coverage states:

- `live-execute`: live provider tests exercise reviewed typed actions and execution.
- `live-read-only`: live provider tests inspect/search without mutation controls.
- `live-gated`: live provider tests verify unsupported or sensitive prompts stay non-executable.
- `not-applicable`: route is planned/disabled or has no runtime surface yet.

## Blueprint Composition Live Fixtures

These rows are not route-coverage rows. They record opt-in OpenAI/OpenRouter
fixture coverage for TASK-190 mixed blueprint composition.
The required five mixed-prompt and three single-preset acceptance counts are
owned by `tests/vitest/assistant/blueprint-composition-fixtures.test.ts`; this
live matrix remains opt-in provider smoke/regression coverage.
TASK-190-08-02 closes the documentation/changelog/task-board side of this
matrix, and TASK-190-08-04 records the explicit-approval second-pass live
rerun from 2026-05-11. Future live rows should stay opt-in and continue to
report provider gating without trusting provider-authored executable actions.

| Matrix | Coverage | Test | Task | Notes |
|---|---|---|---|---|
| Mixed blueprint composition | live-execute | `tests/integration/assistant-live/blueprintCompositionLiveMatrix.test.ts` | TASK-190-08-01, TASK-190-08-04 | Product catalog + inquiry + editorial hub stays local-first and returns typed actions before provider drafting can inject executable payloads; second-pass OpenAI/OpenRouter live rerun passed on 2026-05-11. |
| Gated mixed blueprint composition | live-gated | `tests/integration/assistant-live/blueprintCompositionLiveMatrix.test.ts` | TASK-190-08-01, TASK-190-08-04 | Booking and checkout/payment adjuncts are represented in metadata but return no executable actions until typed adapters exist; second-pass OpenAI/OpenRouter live rerun passed on 2026-05-11. |
| Full-service architecture studio site | live-execute | `playwright-cli -s=task404-full-service-e2e run-code --filename .tmp/task-404-full-service-e2e.js` plus targeted planner/executor suites | TASK-404 | Uses configured admin LLM Guide/OpenRouter settings, dry-runs and executes the reviewed `service-business-full-site` plan, then checks public pages, populated services/portfolio listings, detail routes, navigation/footer, SEO basics, and mobile layout. |
| Guided Basic local-service site-builder intake | live-execute | `playwright-cli -s=task407-basic-e2e run-code --filename .tmp/task-407-07-l02-basic-e2e.js` plus targeted compiler/static-actions/site-kit installer suites | TASK-407-07-L02 | Uses configured admin LLM Guide/OpenRouter settings and a nontechnical Polish prompt, completes Basic intake, confirms review, dry-runs and executes `local-service-business`, then checks public `/`, `/contact`, `/services`, `/portfolio`, `/faq`, contact form presence, SEO basics, desktop/mobile layout, and console/page errors. This row does not claim personalized media/image coverage. |
| Guided Advanced local-service site-builder intake | live-execute | `playwright-cli -s=task407-basic-e2e run-code --filename .tmp/task-407-07-l03-advanced-e2e.js` plus targeted compiler/schema/executor/site-kit installer suites | TASK-407-07-L03 | Uses configured admin LLM Guide/OpenRouter settings and a nontechnical Polish prompt, switches to Advanced mode, completes reviewed menu/hero/section/design/reference choices, proves unreviewed reference text stays gated, dry-runs and executes `local-service-business`, then checks public navigation menu source, mobile drawer, CTA target, supported section variants, contact form, SEO basics, desktop/mobile layout, and console/page errors. This row covers bounded registry-derived runtime overrides only; it does not claim prompt-specific copy/branding, arbitrary theme-token, reference, upload, video, or personalized media generation. |
| Guided follow-up refinement and fail-closed behavior | live-execute + live-gated | `playwright-cli -s=task407-l04-follow-up-e2e run-code --filename .tmp/task-407-07-l04-follow-up-e2e.js` plus targeted planner/resolver/executor suites | TASK-407-07-L04 | Uses configured admin LLM Guide/OpenRouter settings against the generated site, asks a beginner target question for a projects/gallery follow-up on an active page, plans/dry-runs/executes/restores a scoped published `page.update`, checks `/contact` on desktop/mobile, and proves stale, ambiguous, unsupported family, unsupported operation, poisoned target text, unsafe media/reference text, unknown context field, console/page-error, and broken-image cases fail closed without executable actions or secret echo. |
| Guided scoped cleanup and second-theme rebuild | live-execute | `playwright-cli -s=task407-l05-cleanup-theme-r9 run-code --filename .tmp/task-407-07-l05-scoped-cleanup-second-theme-e2e.js` plus solution-kit catalog regression tests | TASK-407-07-L05 | Uses configured admin LLM Guide/OpenRouter settings and two beginner Polish prompts. The first selects `medical-clinic`, records apply run `8de2bf41-7fef-4f17-bf29-bf68355663f1`, then cleanup calls rollback with that explicit `sourceRunId` and verifies 4 created resources removed, 3 updated resources restored, and an unrelated `about` page unchanged. After clearing assistant state, the second selects `beauty-salon` and verifies public `/`, `/offers`, `/contact`, menu/footer links, booking form, SEO basics, curated media registry URLs, desktop/mobile screenshots, no prior-kit/default-widget copy bleed, and zero console/page errors. |

| Route | Label | Coverage | Task | Notes |
|---|---|---|---|---|
| /admin | Dashboard | live-gated | TASK-184-12 | Dashboard prompts stay non-executable/read-only. |
| /admin/pages | Pages | live-execute | TASK-184-02 | Page create/search/update/delete/safety live matrix. |
| /admin/posts | Posts | live-gated | TASK-184-10 | Direct post mutations stay gated until typed post actions exist. |
| /admin/menus | Menus | live-read-only | TASK-184-08 | List-first Menus surface; choose a menu before entering the editor. |
| /admin/menus/:id | Menus Editor | live-execute | TASK-184-08 | Route-selected menu item inspect/update/delete live matrix after choosing a menu from `/admin/menus`. |
| /admin/media | Media | live-execute | TASK-184-08 | Existing media references execute; upload prompts stay gated. |
| /admin/advanced/engine | Engine | live-execute | TASK-184-03 | Content type inspect/delete safety live matrix. |
| /admin/advanced/entries | Entries | live-execute | TASK-184-03 | Active entry update/delete live matrix. |
| /admin/advanced/custom-screens | Screens | live-execute | TASK-184-04 | Custom screen search/update/delete live matrix. |
| /admin/advanced/widgets | Widgets | live-execute | TASK-184-07 | Widget template inspect/update/block patch/delete live matrix. |
| /admin/advanced/forms | Forms | live-execute | TASK-184-05 | Form create/search/update/archive/delete/safety live matrix. |
| /admin/advanced/listings | Listings | live-execute | TASK-184-06 | Listing query/template inspect/update/delete live matrix. |
| /admin/advanced/filters | Filters | live-gated | TASK-184-11 | Filter/search module prompts stay non-executable unless covered by listing typed actions. |
| /admin/advanced/search | Advanced Search | live-gated | TASK-184-11 | Search module prompts stay non-executable without dedicated typed actions. |
| /admin/advanced/booking | Booking | live-gated | TASK-184-11 | Booking setup remains gated until booking action adapters exist. |
| /admin/advanced/appointments | Appointments | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/advanced/reviews | Reviews | live-gated | TASK-184-11 | Destructive review prompts stay non-executable. |
| /admin/advanced/commerce | Commerce | live-gated | TASK-184-11 | Checkout/payment prompts stay gated. |
| /admin/advanced/popups | Popups | live-gated | TASK-184-11 | Popup create prompts stay non-executable until typed actions exist. |
| /admin/advanced/mega-menu | Mega Menu | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/advanced/portal | Portal | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/advanced/i18n | Multilingual | not-applicable | TASK-184-16 | Planned/disabled module; no runtime route coverage claimed. |
| /admin/advanced/solution-kits | Solution Kits | live-gated | TASK-184-11 | Solution kit prompts without installed-kit context stay gated. |
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
| /admin/settings/security/sessions | Security Sessions | live-gated | TASK-184-15 | Session inspection and revoke prompts stay redacted and non-executable. |
| /admin/settings/security/login-alerts | Login Alerts | live-gated | TASK-184-15 | Login alert configuration prompts stay redacted and non-executable. |
| /admin/settings/security/ip-allowlist | IP Allowlist | live-gated | TASK-184-15 | IP allowlist mutations stay redacted and non-executable without typed contracts. |
| /admin/settings/api-keys | API Keys | live-gated | TASK-184-15 | API key value prompts stay redacted and non-executable. |
| /admin/settings/webhooks | Webhooks | live-gated | TASK-184-15 | Webhook secret prompts stay redacted and non-executable. |
| /admin/settings/email | Email Settings | live-gated | TASK-184-15 | SMTP credential prompts stay redacted and non-executable. |
| /admin/settings/storage | Storage Settings | live-gated | TASK-184-15 | Storage secret prompts stay redacted and non-executable. |
| /admin/settings/integrations | Integrations | live-gated | TASK-184-15 | Integration credential prompts stay redacted and non-executable. |
