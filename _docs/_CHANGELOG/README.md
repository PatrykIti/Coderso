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
- Changelog numbers 1034-1090 are consumed by the 31-05 Admin Tools,
  Admin UI, TASK-361 through TASK-398 widget remediation waves, and the
  2026-06-03 assistant policy coverage fix.
Ordinary new entries continue at 1195.

## Entry format (minimum)
- Title line with No. and short title.
- `Date`, `Version`, `Tasks`.
- Sections for Key Changes (grouped by area).
- Keep entries concise and user-facing.

## Reference
- See `EXAMPLE_CHANGELOG.md` for a full example.

## Index

Numbers 1034-1090 are consumed by the 31-05 Admin Tools, Admin UI,
TASK-361 through TASK-398 widget remediation waves, and the 2026-06-03
assistant policy coverage fix. 1229/1230 are reserved (pinned) for the
in-flight TASK-511/517; 1231 is consumed by the completed TASK-518 admin-role migration family; TASK-519 took its pinned 1232; TASK-520 took 1233.
Changelogs 1248, 1249, 1250, 1253, 1255, and 1256 are consumed by the completed
TASK-536, TASK-537, TASK-538, TASK-541, TASK-543, and TASK-544 families.
Changelog 1258 is consumed by the terminal TASK-9999-01-L02 re-triage and supersession
by completed TASK-540-02-L01.
Changelog 1259 is consumed by the completed TASK-546 family.
Changelog 1260 is consumed by the completed TASK-547 family.
Changelog 1252 is consumed by the completed TASK-540 family. Changelogs 1251 and 1254 remain reserved for the implementation closure of
TASK-539 and TASK-542, respectively. Changelog 1257 is consumed by the completed
TASK-545 workflow/evidence/task-graph family.
Changelog 1261 is reserved for the implementation closure of TASK-548.
Changelog 1262 is consumed by the completed TASK-550 docs/process task.
Changelog 1263 is reserved for the implementation closure of TASK-551.
Changelog 1264 is consumed by the completed TASK-552 runtime-smoke performance
family. Its earlier fast-only closure remains superseded; final evidence is the
native TASK-540 migration, shared widget Playwright/process adoption, exact
legacy deletion, and fresh final-tree fast/certification validation.
Changelog 1265 is consumed by the completed TASK-553 runtime-smoke authoring
cookbook family.
Changelog 1266 remains reserved for TASK-414 Guide/Agent/Designer completion.
Changelog 1267 is consumed by completed TASK-554 Post Metadata Publish RBAC
Hardening (surviving variant; the root Repair variant is superseded by it).
Changelog 1268 is reserved for rewritten TASK-489, 1269 for TASK-555, and 1270
for TASK-556. These are closure-only cross-worktree reservations; their rows and
files remain absent until each physical family closes.
These remaining numbers are contract reservations only: do not add index
rows or changelog files before the corresponding family is complete.
If a completed family is reopened after its changelog draft was already authored, that draft
may remain only with an explicit `Draft` status that supersedes its closure evidence; keep its
index row absent until fresh reclosure validation succeeds.
Changelog 1271 is consumed by the completed TASK-557 Bun Test Lane Remote Parallel Speedup
family. Changelog 1272 is consumed by the completed TASK-486 popups public-runtime family.
Changelog 1273 is consumed by the completed TASK-558 popup visual theming family. Changelog 1274 is consumed by the completed TASK-559 Bun Lane C-Split family. Changelog 1275 is consumed by the completed TASK-490 forms submissions export family. Changelog 1276 is consumed by the completed TASK-492 login alert delivery family. Changelog 1277 is consumed by the completed TASK-487 entries revision history family. Changelog 1278 is consumed by the completed TASK-488 commerce variant/collections UI family. Changelog 1279 is consumed by the completed TASK-491 integrations runtime wiring family. Changelog 1280 is consumed by the completed TASK-517 entry visibility family. Changelog 1281 is consumed by the completed TASK-511 backup v2 family. Changelog 1282 is consumed by the completed TASK-560 runtime smoke modular migration / evidence backfill / legacy verification family (incl. the task-547 rollback verification fix). Use 1283 for the next unreserved changelog entry.

| No. | Date | Title | Type |
|-----|------|-------|------|
| 1280 | 2026-08-14 | TASK-517 Entry Visibility — Public Front Enforcement — fail-closed `public`/`private`/`password` gate on the public render path (uniform anonymous 404 for private, no existence leak via detail/list/search/listing blocks), `POST /entries/:id/unlock` with Argon2id verify + timing-equalized dummy path + reject-unknown + `public_write` rate-limit + stateless HMAC unlock cookie (SameSite=Strict, HttpOnly, Secure), full read+write cache exemption for gated routes, docs + closure. 3 subtasks + 10 leaves terminal. | Content/Security/Public Runtime/Testing/Docs/Task Board |
| 1281 | 2026-08-15 | TASK-511 Backup v2 — Scalable, Compressed, Encrypted, Importable — streaming NDJSON+tar `.cbk` export, gzip + AES-256-GCM/scrypt envelope, media byte streaming, opt-in users/RBAC, import pipeline with confirm-gated transactional restore, scheduler + migration 0072 + additive admin UI; 5-scenario smoke. 7 subtasks terminal. | Backups/Data/Security/Streaming/Media/Admin UI/Schema/API/Testing/Docs/Task Board |
| 1282 | 2026-08-17 | TASK-560 task-547 rollback verification fix — `currentResourceResolver` page branch reads the full `PageLifecycleNativeSnapshot` via new read-only `readPageLifecycleNativeSnapshot` and projects it from the template, eliminating null lifecycle fields and `task_547_resource_restore_mismatch` on `/kontakt`; task-547 fast smoke r13 18/18 PASS. | CMS/Kits/Runtime/Testing/Docs/Task Board |
| 1279 | 2026-08-15 | TASK-491 Integrations Runtime Wiring (GA / Slack / Zapier / Sentry) — GA4 head-tag injection, post-commit Slack/Zapier event dispatch, Sentry server init (7-day-policy-compliant dep), health service + admin UI; post-audit fixes (split, tests, cleanup ownership); 5-scenario smoke. 4 subtasks + 7 leaves terminal. | Integrations/Public Runtime/Security/Testing/Docs/Task Board |
| 1278 | 2026-08-15 | TASK-488 Commerce: Variant Editor & Collections CRUD UI — variant authoring card (SKU pricing/stock/attributes) via pure draft-model helpers, collections CRUD page at a literal-first route with AdminApp split below 1000 lines, cached client + cache-bus, docs; 5-scenario runtime smoke. 3 subtasks + 6 leaves terminal. | Commerce/Admin UI/Testing/Docs/Task Board |
| 1277 | 2026-08-14 | TASK-487 Entries: Revision History & Restore — author-joined PII-redacted revisions read + confirm-gated restore with cache-aware invalidation, EntryRevisionDrawer filling the 514-03 seam, Tags input + SEO fields riders; 6-scenario runtime smoke. 3 subtasks + 6 leaves terminal. | Engine/Entries/Admin UI/Testing/Docs/Task Board |
| 1276 | 2026-08-14 | TASK-492 Login Alert Delivery (Email + Webhook) & Recipient Settings — fire-and-forget email + HMAC-signed webhook delivery on new-device/new-location login, recipients/webhookUrl/webhookSecret (encrypted, `{configured}` only) + service-writable deliveryError contract, `security_settings_invalid`→400, additive admin editor; 46 Bun + 28 Vitest green, 5-scenario smoke. 3 subtasks + 6 leaves terminal. | Settings/Security/Public Runtime/Testing/Docs/Task Board |
| 1275 | 2026-08-14 | TASK-490 Forms: Submissions Export (CSV/JSON) — internal `forms:read` export route (strict query, csv|json), pure builder with formula-injection guard, PII-minimal (ip/userAgent omitted), additive admin export buttons, docs; 5-scenario runtime smoke. 2 subtasks + 5 leaves terminal. | Forms/Admin API/Security/Testing/Docs/Task Board |
| 1274 | 2026-08-15 | TASK-559 Bun Lane C-Split — two parallel serial C workers (manifest v2 conflictKeys/cWriteGlobal, lane-aware guard), full test:bun 22m15s → 9.98 min exit 0; pre-existing A-lane test repairs recorded. | Toolchain/Testing/DB/Performance/Task Board |
| 1273 | 2026-08-14 | TASK-558 Popup Visual Theming — present-only fixed-preset theme (card/backdrop/close/z-index 9999), viewport clamping, focus/ESC/Tab-trap/reduced-motion, byte-identical no-override; 7-scenario runtime smoke (wf558smoke). One executable task terminal. | Engagement/Popups/Public Runtime/Accessibility/Testing/Docs/Task Board |
| 1231 | 2026-08-14 | TASK-518 Seed Default Admin Role via Migration — stable DEFAULT_ADMIN_ROLE_ID, idempotent migration 0071 (fresh db:migrate has exactly one admin role), createFirstAdmin/seedAdmin aligned, legacy random-id role untouched. Admin-only; no privilege change. | Auth/RBAC/Data/Installer/Migration/Testing/Task Board |
| 1272 | 2026-08-14 | TASK-486 Popups: Public Runtime Delivery & Trigger/Targeting Engine — public read endpoint (published-only, server-side targeting, PII-free DTO), client trigger/targeting/frequency runtime, render + script injection, lane-correct tests, docs, and 8-scenario runtime smoke. 4 subtasks + 11 leaves terminal. | Engagement/Popups/Public Runtime/Security/Testing/Docs/Task Board |
| 1271 | 2026-08-14 | TASK-557 Bun Test Lane Remote Parallel Speedup (direct 5432) — per-worker schemas + FK-rewriting migration applier, weighted parallel runner with retry-once, DB-free A lane, serial perf lane, fence isolation; full-lane acceptance PASS 2414 tests in 22m15s (2.3x speedup). 8 children + 18 leaves terminal. | Toolchain/Testing/DB/Performance/Docs/Task Board |
| 1257 | 2026-08-14 | TASK-545 Workflow, Smoke Evidence, and Task-Graph Integrity — all-results guard, canonical workflow drivers, durable smoke-evidence manifest/checkpoint/closure/TASK-548-bootstrap family, bounded historical graph/index repair (TASK-528/529/530 parents, TASK-533 changelog 1247, normalized statuses), and the whole-inventory taskGraphIntegrity gate. 4 children + 13 leaves terminal; board statistics recalculated from physical files. | Workflow/Task Graph/Docs/Testing/Task Board |
| 1265 | 2026-08-06 | TASK-553 Runtime Smoke Authoring Cookbook — one source-grounded contributor recipe for static suite registration, thin adapters, lifecycle, persistent Bun/DB workers, transactional batches, Playwright segmentation, evidence, truthful checkpoint scope, reports, focused tests, and shared-wrapper reuse | Testing/Developer Experience/Documentation/Task Board |
| 1267 | 2026-08-11 | TASK-554 Post Metadata Publish RBAC Hardening — conditional all-of publish authorization, present-only metadata, exact calendar validation, race-safe Admin cache/editor hydration, and seven-flow shared smoke | Posts/RBAC/Security/Admin UI/Caching/Testing/Docs/Task Board |
| 1264 | 2026-08-06 | TASK-552 Runtime Smoke Harness Performance — native TASK-540 migration, exact legacy deletion, shared persistent workers/Playwright/dev-host lifecycle, and final 5:49 fast plus 11:22 certification proof | Testing/Developer Experience/Performance/Reliability/Security/Docs/Task Board |
| 1262 | 2026-07-24 | TASK-550 Database Query and Server Cache Engineering Rules — mandatory bounded-query, schema/index, transaction, retention, pool, measured-performance, local-first cache, optional Redis, post-commit invalidation, and cache-security rules; TASK-551 implementation program prioritized | Docs/Process/Database/Queries/Caching/Performance/Task Board |
| 1260 | 2026-07-23 | TASK-547 Full-Site Package and FormaDom Installer — strict native package/reference contract, crash-safe lifecycle and rollback, seven-page Polish example site, strict CLI, shared-runner acceptance, and clean 18/18 certification | Solution Kits/Pages/Content/Forms/Installer/Reliability/Testing/Docs/Task Board |
| 1259 | 2026-07-22 | TASK-546 Node 26 and Full Dependency Upgrade — Node 26.5/Bun 1.3.14, latest admitted dependency graph, `fast-uri` CVE removal, Node/React/Vite compatibility, workflow/Forms scanner remediation, complete gates, and `/peri` production smoke | Toolchain/Dependencies/Supply Chain/Security/CodeQL/Runtime/UI Compatibility/Testing/QA/Docs/Task Board |
| 1258 | 2026-07-18 | TASK-9999-01-L02 Superseded by TASK-540-02-L01 — current evidence shows `baseLabel` is read to invalidate stale Tab-label drafts while the commit-stable input preserves keyboard focus. The old value-only cleanup would regress visible UX/accessibility, so L02 left the deferred backlog as `⏭️ Superseded`; TASK-540-02-L01 remains active under its existing repair receipt. TASK-9999-01 stays To Do for L01 and the sentinel parent stays In Progress. | Custom Screens/Admin UI/Accessibility/Task Board/Docs |
| 1256 | 2026-07-12 | TASK-544 Media Folder Reliability and Error Recovery — exact owned PostgreSQL slug races now map to the existing bounded 409; rejected and overlapping folder-list promises recover through generation-safe canonical six-field caching; load/create/rename/reorder/delete retain visible state and immutable Retry behavior with success-only cache events. Validation passed targeted Bun 36/36, targeted Vitest 78/78, full Bun 1,687 pass / 1 optional live skip / 0 fail, full Vitest 6,794/6,794, precommit, Admin build/boundary/bundle, and release gates 5/5; final audits were 0 H/M/L. Five real light/dark and wide/narrow CLI flows passed with distinct valid PNGs, zero canonical console/page errors, and complete cleanup. Strict scan's sole residual is exact, unchanged, and TASK-545-owned; no suppression, endpoint, migration, RBAC, security-contract, or Dashboard/widget expansion. | Media/Admin UI/DB Reliability/Cache/Accessibility/Security/Testing/Docs/Task Board |
| 1255 | 2026-07-13 | TASK-543 Posts Exit Safety and List Accessibility — Close now awaits the newest exact durable draft across route epochs, propagates save failures, restores exact metadata after potential partial writes, and coalesces navigation. Posts rows are passive; title, checkbox, and contextual actions keep native keyboard semantics; status/author/date remain singly visible at 390/768/900/1024 px. Validation passed the 159/159 targeted matrix, full Bun 1,687 pass / 1 intentional opt-in skip / 0 fail, full Vitest 836 files / 6,880 tests, precommit, Admin build/boundary/bundle, and release gates 5/5. Seven real light/dark CLI flows produced 11 distinct PNGs with zero console/page errors and complete cleanup. Strict scan's sole residual is exact, unchanged, and TASK-545-owned; no endpoint, migration, RBAC, security-contract, or widget expansion. | Posts/Admin UI/Autosave/Reliability/Accessibility/Testing/Docs/Task Board |
| 1253 | 2026-07-12 | TASK-541 Canonical CSS Color Contract — one Bun-free parser with explicit authoring/inherited-render profiles now owns the finite Admin, Menu, Form, and retained read/render color inventory. Dashboard remains the only configurable widget surface; production `formRuntimeScript.ts` stayed byte-identical, and no endpoint, migration, dependency, generic widget, preset, template, or module-pack entry was added. Validation passed 55 Vitest files / 1,428 tests, 40 DB route tests / 392 expectations, core/root static checks, Admin build/boundary/bundle budgets, release gates 5/5, and five clean final lenses. The current-source corrective Flow 7 proved save/reopen, the actual accessible Runtime Preview dialog, and public Page/Form computed-color parity; 21 unique valid PNGs were retained and all runtime state was cleaned/restored. Strict scan remains truthfully non-green only for the exact unchanged TASK-545-owned workflow finding, without suppression. | Shared Styling/Admin UI/Menus/Forms/Retained Compatibility/Accessibility/Security/Testing/Docs/Task Board |
| 1252 | 2026-07-14 | TASK-540 Custom Screens Functional and Data-Integrity Remediation — strict document/binding integrity, accessible nested Tabs and Button links, dirty-navigation/cache recovery, responsive canvas behavior, per-user preferences, targeted validation, and a green seven-flow runtime smoke with complete cleanup | Custom Screens/Admin UI/API/Reliability/Accessibility/Security/Testing/Docs/Task Board |
| 1250 | 2026-07-11 | TASK-538 Custom SVG Layout Isolation — one immutable closed SVG policy, write/render class/style removal, bounded safe-node conversion, raw author-markup sink removal, trusted/clamped root geometry, clipped pointer-transparent Page-block rendering, public/preview parity, and redacted defensive docs. No route, migration, dependency, schema bump, scanner suppression, or non-dashboard widget surface. Validation: targeted Vitest 423/423; Page runtime 19/19 with the named TASK-538 case executed; targeted Semgrep 0; release gates 5/5; five post-audit lenses clean; real browser smoke 6/6 with light/dark + wide/narrow, visible geometry/DOM/click assertions, zero console/page errors, and scoped cleanup. The strict scan's sole residual is unchanged and TASK-545-owned. | Pages/Custom SVG/Sanitization/Security/Renderer/Accessibility/Runtime/Testing/Docs/Task Board |
| 1249 | 2026-07-12 | TASK-537 Entry Mutation Atomicity and Secret-Minimal Projections — one locked transaction now owns entry status/revision, taxonomy, visibility/password/schedule, tags, and SEO; rejectable state is prepared before the first write; audited mutations use hash-free projections and one joined RBAC snapshot; cache effects run only after commit. Full Bun 1,680 pass / 1 optional live skip / 0 fail, full Vitest 836 files / 6,746 tests, precommit and release gates 5/5 passed; fresh final audits reported 0 H/M/L. Live smoke passed 6/6 canonical flows across light/dark and wide/narrow with eight screenshots, zero canonical console/page errors, and complete cleanup. Strict scan's sole residual is unchanged and TASK-545-owned. | Content Entries/DB Transactions/Security/RBAC/Cache/Testing/Docs/Task Board |
| 1248 | 2026-07-11 | TASK-536 Forms File Upload and Media Trust Boundary — byte-authoritative media identity/storage, provider-neutral `nosniff` delivery, functional upload-before-submit for existing Form blocks/sections, strict nested Forms schemas, one write-rate owner, late status/access revalidation, and fixed unknown-error redaction. POST-M-07 marks the hidden Widget compatibility route `legacy-maintenance`, removes create/insert advertising, and retains exact-row maintenance only; no endpoint, DB migration, dependency, or non-dashboard widget surface. Final validation: Bun 1633 pass / 1 opt-in live skip / 0 fail, Vitest 6552/6552, precommit pass, release gates 5/5, 7/7 real-browser flows with zero console errors; the only full strict-scan findings remain the unchanged TASK-538/TASK-545-owned blockers, without suppression. | Forms/Media/Public Runtime/Security/Assistant Policy/Validation/Accessibility/Testing/Docs/Task Board |
| 1247 | 2026-07-09 | TASK-533 Layout — Grid Row/Col Span, Asymmetric Column Ratios, Per-Edge Section Border & Native Timeline Axis — three layout-fidelity gaps on Page v2, all **present-only / jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; a page with no `colSpan`/`rowSpan`/`columnTemplate`/`border` and no `timeline` section normalizes AND renders byte-identical to post-530). All additions live in labelled `// ── TASK-533 ──` regions so the 531/532/534 sibling bundles merge additively. **Gap 1 — grid span + asymmetric ratio (533-01):** present-only block `colSpan?`/`rowSpan?` (`readOptionalClampedNumber`+`Math.trunc`, `PAGE_BLOCK_SPAN_CLAMP` 1..4) emit ONLY `gridColumn/gridRow: "span N"` on the block FRAME (reproduces `.project-card.large{grid-row:span 2}`), emitted on the auto-flow path only + SUPPRESSED inside per-column composition; present-only section `columnTemplate?` OVERRIDES the symmetric `pageSectionGridClass(columns)` with an inline `gridTemplateColumns` (reproduces intro 1/1.2fr + realizacje 1.15/.85fr). **SECURITY-CRITICAL — restricted grid-template sanitizer (`pageAuthoringSanitizers.ts`):** `columnTemplate` (the only author STRING reaching a CSS value position) goes through the NEW strict-ALLOWLIST `sanitizeAuthoringGridTemplate` (DISJOINT from 531's gradient surface), failing CLOSED: length ≤200 → up-front metachar reject (`;{}\<>@` backtick `/*` `url(` `expression(` + any `:` outside function parens) → paren-depth-aware TOP-LEVEL whitespace split (keeps `minmax(0, 1fr)`/`repeat(3, 1fr)` intact) → `GRID_MAX_TRACKS`=12 grammar (`<num>fr|px|%|rem|em`, `auto`, `minmax(min,max)`, `repeat(<int>,…)`) → minmax/repeat INNER re-validation (`GRID_MAX_REPEAT`=12, rejects `repeat(999,1fr)`) → canonical re-emit; rejection ⇒ OMIT (never raw). Curated `pageColumnTemplatePresets` back the "Column ratio" control. **Gap 2 — per-edge section border (533-02):** present-only `PageSectionBorderV2 {top?,right?,bottom?,left?}` each `{color?,width?,style?}` (min top+bottom = `border-block`, full four-edge supported; reproduces `.intro-strip{border-block:1px solid …}`) — colors via `sanitizeAuthoringCssColor`, widths clamped `PAGE_SECTION_BORDER_WIDTH_CLAMP` 0..16, style enum-validated; emits fixed `border-{edge}-color/-width/-style` on the content box AND the `100vw` bleed box (NOT the paint-empty full-bleed content box); the nested length-4 `style.border.<edge>.color` optimistic path routed through `sanitizeAuthoringCssColor` in `pageEditorMutationActions.ts`. **Gap 3 — native timeline axis (533-03):** the `timeline` section had dots but NO connecting line; added (vertical `default`/`compact` variants) a CONTINUOUS per-item axis segment (`data-page-timeline-axis`/`-axis-line`) hoisted into the `relative` item box, `inset-y-0` full-height (py inside the segment, no intra-item break), bottom-bled by the section row gap so segment N meets N+1, last item flush at its dot (reproduces `.timeline:before` aqua→fade + glow dots `.timeline article:before`); ADDITIVE DOM (item/marker/content hooks retained; `horizontal` unchanged); NO model field, NO author value (fixed structure off the sanitized `--coderso-section-accent`). All new keys join their allowlist + `additionalProperties:false` schema (both section-style mirrors) in lockstep + round-trip tests. **Audit-remediation (2026-07-09):** tightened span suppression inside per-column composition + hoisted the timeline axis to a full-height per-item segment (was a marker-column dot-row span that left a ~24px break at each item's py padding). Tests: `page-authoring-sanitizers`, `page-document-v2`, `page-editor-control-registry`, `page-renderer-v2`. Docs: `PAGE_MODEL.md` synced (layout/border/timeline); `DESIGN_TOKENS.md` unchanged (no new token). All gates green (core lint, core lint:types, root tsc, test:bun [1495 pass / 1 skip / 0 fail], test:vitest [broad `tests/vitest/pages/` 23 files 667/667 incl. the 4 changed suites], gates:coderso 5/5). Live ≥5-per-area light+dark Playwright smoke deferred to the orchestrator post-merge (dev host serves the MAIN tree) | Pages/Site Render/Schema (jsonb, no migration)/Security (grid-template allowlist, per-edge border color/width sanitizer)/Admin Editor UI/Accessibility/Present-only (no migration, no schema bump)/Testing/Docs/Task Board |
| 1244 | 2026-07-09 | TASK-531 Premium Backgrounds & Glow (Multi-Layer Background, Section Gradient, Colored Glow) — two premium-fidelity Page v2 surfaces on BOTH blocks AND sections (a **safe multi-layer background** = glow-over-gradient, the reference `.cta-card`/`art-*` look; an **arbitrary colored glow box-shadow**) + the missing SECTION `backgroundType:"gradient"` render branch. All **present-only / jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; the single-layer background fast path + unset glow are byte-identical to post-530). **SECURITY-CRITICAL — multi-layer background allowlist (`pageAuthoringSanitizers.ts`):** `sanitizeAuthoringCssBackground` accepts a comma-separated list of safe gradient/color layers via the new exported `isSafeAuthoringCssBackgroundLayers` — an ALLOWLIST applied PER top-level comma-split layer (`isSingleGradientLayer` UNCHANGED, now called per layer), failing CLOSED: (1) a whole-value tripwire pre-pass rejects any `url(`/`image-set(`/`image(`/`element(`/`cross-fade(`/`@import`/`expression(`/`behavior:`/`-moz-binding`/`javascript:`/`vbscript:`/`data:`; (2) depth-0 comma split (never a naive `split(",")`); (3) EACH layer must be a safe color or safe single gradient; (4) `PAGE_BG_MAX_LAYERS`=6 cap. ReDoS hardening: new `PAGE_CSS_VALUE_MAX_LENGTH`=512 pre-guard + a redundant-`\s*` catastrophic-backtracking removal in `functionalColorPattern`. Single-layer fast path byte-identical; the TASK-523 outbound-beacon `url()` rejection contract stays green. **Glow (`pageDocumentV2.ts` + new Bun-free `pageGlow.ts`):** present-only `PageGlow{color,blur?,spread?,x?,y?}` on block + section — `color` REQUIRED + sanitized at write (invalid ⇒ whole glow omitted, fail-soft), numerics clamped (`PAGE_GLOW_BLUR_CLAMP` 0..120, `PAGE_GLOW_SPREAD_CLAMP` -40..80, `PAGE_GLOW_OFFSET_CLAMP` ±80), reject-unknown, joins `pageBlockStyleKeys` + section `assertKnownKeys` + ALL THREE `additionalProperties:false` style schemas in lockstep (incl. the inlined top-level section schema). Shared `composeGlowBoxShadow`/`mergeShadows` compose the spec into a FIXED `"<x>px <y>px <blur>px <spread>px <color>"` template (re-sanitized/re-clamped at render, never a raw string; appended after the enum `shadow`). **Render (BOTH boundaries relax in lockstep on the SAME validator):** SSR inline `toGradientBackground` (`pageRendererV2.tsx`) re-check → `isSafeAuthoringCssGradient||isSafeAuthoringCssBackgroundLayers` so multi-layer PAINTS; NEW SECTION gradient branch on the content box + `100vw` bleed box; per-device RAW `<style>` path (`pageResponsiveCss.ts`, un-escaped `dangerouslySetInnerHTML` — the tripwire is load-bearing) keeps `isSafeCssGradient` single-layer + routes multi-layer through a NEW `isSafeCssBackgroundValue` (with a FORBIDDEN-re-bind code-comment), adds a section gradient override branch + relaxes the block re-gate + composes per-device glow (fires on shadow OR glow; device-only glow emits). **Controls (`pageEditorControlRegistry.ts`):** 5 section + 5 block `glow.*` controls (existing color/number inputs, `responsive:true`), the two frozen path Sets updated in lockstep; gradient TYPE reuses the existing `backgroundType` select. **Editor client guard (`pageEditorMutationActions.ts`):** nested length-3 `style.glow.color` routed through `sanitizeAuthoringCssColor` (finding #4, defence-in-depth for optimistic preview). Tests: `page-authoring-sanitizers`, `page-document-v2`, `page-renderer-v2`, `page-responsive-css`, `page-editor-control-registry`. Docs: `SECURITY_SPEC.md`/`PAGE_MODEL.md`/`DESIGN_TOKENS.md` synced. All gates green (core lint, core lint:types, root tsc, test:vitest [changed pages 377/377 + broad pages 635/635], test:bun, gates:coderso 5/5 incl. security). Live ≥5-per-area light+dark Playwright smoke deferred to the orchestrator post-merge (dev host serves the MAIN tree) | Pages/Site Render/Schema (jsonb, no migration)/Security (multi-layer background allowlist + tripwire, structured glow)/Admin Editor UI/Present-only (no migration, no schema bump)/Testing/Docs/Task Board |
| 1245 | 2026-07-09 | TASK-534 Declarative Interactivity — Tabs/Switcher Block, Filterable Gallery, Polish (Noise Overlay / Scroll-Hint / Magnetic) — Bundle D of the page-toolkit fidelity program (absorbs TASK-527), a cohesive family of DECLARATIVE interactivity closing `_TMP-cms-ograniczenia.md` §1 ("Brak interaktywności JS") + §4.9 #9, reproducing `_docs/projekty-domow-wow-site`. Everything is **present-only** (zero bytes when unauthored ⇒ byte-identical to the post-530/535 document + HTML), joins a **reject-unknown allowlist** (`assertKnownKeys` + strict JSON schema `additionalProperties:false` + round-trip test), rides the **ONE existing** `pageEffectsRuntime` `<script>` as static dependency-free IIFE clauses, is `prefers-reduced-motion` + keyboard + aria-tablist safe, and needs **NO npm dependency, NO DB migration, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump (stays `2`), NO new route/RBAC**. **(A) Segmented SWITCHER/TABS block (absorbs TASK-527):** NEW `pageBlockTypes` member `"switcher"` added the customSvg way — ATOMICALLY across every exhaustive `Record<PageBlockType,…>` surface (`pageBlockTypes`/`pageBlockPropKeys`/`pageBlockDefaultProps`/`realRuntimeBlockTypes`/`editorInsertableBlockTypes`/`layoutBlockTypes`/`pageBlockRenderDefaults.ts`/`pageEditorOptions.ts`/`pageEditorControlRegistry.ts` + the test-tree `pageEditorBlockLabels`) so root `tsc` stays green; N labelled panels live in SIX new `panel:1..panel:6` `pageBlockSlotKeys` slots (`switcher` joins `layoutBlockTypes` → `getPageBlockActiveSlotKeys` returns its panel slots). Renderer emits a real `role="tablist"` with N `role="tab"` (roving `tabindex`, `aria-selected`, `aria-controls`) + N `role="tabpanel"` (`aria-labelledby`, resting `hidden` for no-JS progressive enhancement); tab labels render as escaped React TEXT nodes. Runtime clause: click toggles the active panel, ArrowLeft/Right/Up/Down/Home/End rove selection; placed BEFORE the reduced-motion whole-IIFE early-return (works for reduce users, crossfade CSS `motion-safe:`-guarded). **(B) FILTERABLE gallery/portfolio:** present-only `filterable` + `filterCategories` on the EXISTING `gallery` block + optional per-item `category` (SPACE-SEPARATED SET of single kebab tokens `^[\w-]{1,48}$`); renderer emits a `role="tablist"` chip bar (`[data-gallery-filter]`, `[data-filter]`) + stamps figures `[data-filter-item]`/`data-category`; runtime show/hides via `cat.split(" ").indexOf(f)` (token-split, no substring FP, no `innerHTML`/`eval`). Unset ⇒ `renderGallery` byte-identical; `gallery` is now editor-insertable (`gallery-editor-controls-pending` cleared). **(C) POLISH:** noise/grain overlay (present-only `PageEffectsV2.noiseOverlay` page + `PageSectionStyleV2.noiseOverlay` section — STATIC self-generated SVG-turbulence data-URI in `pageInteractivityGlyphs.tsx`, no asset/author-color); NEW `pageBlockTypes` member `"scrollHint"` (CSS-keyframe-only `aria-hidden` dot/chevron `glyph` enum + optional `sr-only` `label`, no runtime); magnetic button (present-only `PageBlockStyleV2.magnetic` — NEW clause after the 522 `[data-block-tilt]`, attracts `[data-magnetic]` toward the pointer, transforms only, rAF + `passive`, clamped ±14px, placed AFTER the reduced-motion early-return + `pointer:fine` gated). **Runtime — ONE `<script>`, split placement:** all three clauses in the single `PAGE_EFFECTS_RUNTIME_SOURCE`; SINGLE emit in `PageDocumentRender`, its `anyMotion` predicate OR-widened (append-only) by a new `usesInteractivityRuntime(document)` resolver (`pageCompositionEffects.tsx`, RUNTIME-BEARING surfaces only — switcher/filterable-gallery/magnetic; scrollHint+noise are CSS/static and do NOT widen it); toggles (switcher/filter) BEFORE the reduced-motion early-return, magnetic AFTER it; idempotent via the 535 per-window init flag; STATIC literals (no `${`/`eval`/`Function(`/`innerHTML`). **CSS** `PAGE_INTERACTIVITY_CSS` (present-only): tab bar (mobile horizontal-scroll), pill/underline selected states via `var(--primary)`, panel crossfade + filter fade + magnetic transition inside `prefers-reduced-motion: no-preference`, FUNCTIONAL `[hidden]`/`.is-hidden` `display:none` OUTSIDE the guard so tabs/filters WORK for reduce users. **Security:** no new route/RBAC/method; enums `normalizeEnum` fail-CLOSED on write; `magnetic`/`noiseOverlay`/`filterable` `readBoolean` present-only; `activeIndex` clamped; free-text labels escaped TEXT nodes; category strings single-token `^[\w-]{1,48}$` allowlisted (out-of-pattern DROPPED fail-soft) at BOTH write+render (no `data-category`/`data-filter` breakout); every new key joins `assertKnownKeys` + JSON schema in lockstep with a round-trip test (unknown prop throws `PageDocumentError`). **Docs:** `PAGE_MODEL.md`/`WIDGETS.md`/`SECURITY_SPEC.md` each gain a TASK-534 section (tabs/filter/polish + runtime + fail-closed boundary). **Tests (owned):** `task-534-interactivity-model`/`-render`/`-css`/`-runtime` + extended `pageEffectsRuntime`/`page-editor-control-registry`/`page-document-v2*`/`page-editor-v2-flow`; the two Ajv-schema tests now share ONE memoized validator (fixes a 31.3s double-compile timeout flake); `pages-runtime.test.ts` parity fixture gains switcher+scrollHint blocks (both now insertable). **Gates:** core lint / core lint:types / root tsc all exit 0; test:vitest changed 364/364 (9 files) + broad pages/content 712/712 (39 files); gates:coderso functional/ux/performance/security/reliability ALL PASS (5/5); test:bun 1489 pass / 1 skip / 6 fail = the documented shared-remote-DB cache-timing/timeout/settings-pollution transient (vary per run, green in isolation, 534-independent). Live ≥5-per-area light+dark Playwright smoke deferred to the orchestrator post-merge (dev host serves the MAIN tree) | Pages/Site Render/Interactivity (declarative tabs/filter/polish)/Accessibility (aria-tablist, reduced-motion, pointer:fine)/Security (escaped labels, allowlisted tokens, static runtime source)/Present-only (no migration, no schema bump, no route)/Testing/Docs/Task Board |
| 1246 | 2026-07-09 | TASK-532 Typography Fidelity — Fluid Font-Size, Heavier Weights, Text-Transform, Decorative Eyebrow Rule & TextColor-On-Text (Bundle B) — Bundle B of the four additive page-toolkit-fidelity bundles (531 gradients / **532 typography** / 533 shadows-glow / 534 tokens); all **present-only / jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; post-530 / no-effect docs normalize AND render byte-identical); every shared-seam edit in a labelled `// ── TASK-532 ──` region for additive parallel merge with 531/533/534. **(1) Fluid font-size** — present-only `PageBlockStyleV2.fontSizeCustom` string that WINS over the discrete `fontSize` token at render (`toPageBlockTypographyStyle`), validated by a NEW strict numeric-unit-clamp grammar `isSafeAuthoringCssLength`/`sanitizeAuthoringCssFontSize` (`pageAuthoringSanitizers.ts`, reuses `hasBalancedParens`): bare number + allowlisted unit (`rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`) OR one `clamp()`/`min()`/`max()` of such lengths — 64-char cap, fail-closed reject of `url(`/`expression(`/`;`/`{`/`}`/`<`/`\`/`:`/comment escapes ⇒ omitted; control "Fluid size" (`input:"text"`, `responsive:true`). **(2) Heavier weights** — `pageTypographyFontWeights` +`extrabold`/`black`, css-values +`800`/`900` (paint INLINE via the css-values map, not a baked class). **(3) Text-transform** — present-only enum `pageTypographyTextTransforms` (`none`/`uppercase`/`lowercase`/`capitalize`), `none` resets ⇒ omitted; control `block.style.textTransform`. **(4) Decorative eyebrow RULE** — EXTENDS the existing `divider` block (no new type) with present-only `width` (px `PAGE_DIVIDER_WIDTH_CLAMP` 8..400, default 34), `align` (`pageDividerAligns`), `gradient` (bool): `gradient:true` swaps `<hr>`→ slim `<span>` `linear-gradient(90deg,<tone-color>,transparent)` (tone from `pageDividerToneBorderColor` whitelist), positioned via auto margins; unset ⇒ legacy `<hr>` byte-identical. **(5) TextColor on `text` (rich-path fix)** — the PLAIN `<p>` already honored `style.textColor` via `--coderso-block-text`, but the RICH (`format:"rich"`) wrapper `<div>` rendered colorless; `renderTextBlock` now threads the `sanitizeAuthoringCssColor`-validated color as inline `color` + `[&_*]:text-[color:inherit]` child hint ONLY when authored (unset ⇒ byte-identical). **Security:** no new route/RBAC; `fontSizeCustom` grammar-validated at write (only new free-text CSS surface, fail-closed); colors ride `sanitizeAuthoringCssColor`; enums fail closed (`PageDocumentError` on unknown value); every new key joins the `pageBlockStyleKeys` allowlist + `$defs/pageBlockStyle` `additionalProperties:false` (`$ref`-shared inline+responsive, one edit) + a round-trip test. **Tests (owned):** `page-authoring-sanitizers`, `page-document-v2`, `page-renderer-v2`, `page-editor-control-registry`, `page-editor-control-ui-model`; FOUR DECLARED re-baselines, none weakening a behavior assertion (4-member weight literal→6-member; invalid-token fixture moved outside the grown enum; exhaustive `Record<PageTypographyFontWeight,…>` +`extrabold:null,black:null` + widened regex in `page-block-render-defaults`; typography-panel raw-text-input `0`→`1` pinned by "Fluid size" label + "Text transform" segmented in `page-editor-v2-flow`); `page-editor-control-registry` compares weight `options` by REFERENCE ⇒ no re-baseline. `PAGE_MODEL.md` + `DESIGN_TOKENS.md` synced. All gates green (core lint, core lint:types, root tsc, test:bun [clean re-run 1495 pass / 1 skip / 0 fail across 1496 tests; an earlier run's 7 fails were the known slow-remote-DB 15s-timeout transient, each green isolated at 45s, e.g. `site-shell-runtime` 8/8], test:vitest [changed 7 owned + broad `tests/vitest/pages/`+`ui/page-editor-v2-flow` 711/711 at 30s timeout; 3 Ajv-schema-compile 5s flakes all TASK-522/525, green isolated], gates:coderso 5/5). **Residual (orchestrator-run post-merge):** the `.prose` textColor LIVE computed-color smoke (acceptance #5) + the full ≥5-scenario-per-area light+dark Playwright smoke vs the prototype (dev host serves the MAIN tree) | Pages/Admin UI/Site Render/Schema (jsonb, no migration, no schema bump)/Security (length grammar, color whitelist, reject-unknown)/Accessibility/Present-only/Testing/Docs/Task Board |
| 1243 | 2026-07-09 | TASK-535 Audit Remediation for TASK-522…530 (Page v2 Composable Effects) — post-merge audit remediation of the whole 522…530 program, all **present-only / jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; every no-effect path normalizes AND renders byte-identical; `prefers-reduced-motion` gates unchanged). **HIGH (correctness) — tilt + layer containing-block regression:** a block authoring BOTH `tilt` AND `style.layer` placed its layered chip wrong, because 528's `[data-tilt-parent]` `perspective:1200px` wrapper establishes a CONTAINING BLOCK so the absolutely-positioned frame resolved `--layer-*` against the wrapper, not `.cx-layered-canvas` (regressed 522-05-L02). Fix (`pageRendererV2.tsx` `splitBlockComposition`/`renderPageBlockWithFrame`): hoist the LAYER PLACEMENT (`data-layer`+`data-layer-anchor`+base `--layer-x/y/z`) onto the wrapper ONLY when tilt AND layer are both authored, so the WRAPPER is the layered child (offsets resolve against the canvas, the 524 anchor `translate:` rides it) while tilt stays on the inner frame; per-device `--layer-*` retargets to the wrapper via new `PAGE_TILT_PARENT_LAYER_ATTRIBUTE=data-tilt-parent-for` (`pageResponsiveCss.ts`, since custom props inherit downward only) — layer-only case byte-identical. **MEDIUM:** reveal `--reveal-delay` inheritance double-bind fixed by a per-frame `--reveal-delay:0ms` reset (authored inline var still wins) so un-delayed nested children don't inherit an ancestor's stagger; full-bleed `100vw` bleed pushed a spurious horizontal scrollbar → present-only `overflowX:"clip"` root guard (`clip` not `hidden`, keeps sticky-nav working); `baseSectionClassName` gutter routed off the SAME `isPageSectionFullBleed` predicate as the bleed box (a `style.fullBleed`-only section no longer keeps a doubled `px-4 py-6`); stale `not_css_expressible` diagnostic dropped now that 525 decoupled bleed from the content cap (full-bleed `maxWidth` override emits `width`+`max-width`); two-document (main+footer) spotlight overlay DOUBLE-STACK collapsed to a single emit via new `documentRole`/`peerSpotlightOn` props + `documentUsesSpotlight` export (idempotent stylesheets stay per-document so footer-only effects are still styled); runtime double-init guarded by `PAGE_EFFECTS_RUNTIME_INIT_FLAG` window flag (2nd `<script>` no-op). **SVG hygiene (`svgSanitizer.ts`, defence-in-depth):** case-insensitive root vs case-sensitive walk (`ALLOWED_TAG_CANONICAL` canonical re-emit; uppercase `<SVG>` no longer leaks children unwrapped), self-closing-root + trailing-junk fail-closed, valueless/boolean-attr drop + quote-balanced `TAG_REEMIT_RE` (unbalanced-quote tag trips the fail-closed residual guard). **Render-parity re-sanitize (`pageCompositionEffects.tsx`):** glow sources (`surfaceTint`/`background`/`accent`) re-sanitized at RENDER with `sanitizeAuthoringCssColor` (parity with spotlight/canvas-bg); dead `[data-tilt-parent]{perspective:1200px}` CSS removed. **Doc-truth:** 522…530 board rows renumbered to true post-merge changelog numbers (523→1237, 524→1239, 525→1238, 528→1241); `DESIGN_TOKENS.md`/`PAGE_MODEL.md` `PAGE_LAYER_Z_CLAMP`→`0..20`; `revealDelay`/`resolveSliderStep` scope comments. **Tests (owned):** `page-renderer-v2`, `page-responsive-css`, `pageEffectsRuntime`, `page-composition-effects`, `svg-sanitizer`, `cursorSpotlight`, `sectionScrollEffect`, `page-editor-v2-flow`. All gates green (core lint, core lint:types, root tsc, test:bun [1495 pass / 1 skip / 0 fail], test:vitest [changed 8 files 408/408 + broad pages/content 646/646], gates:coderso 5/5). Live ≥5-per-area light+dark Playwright smoke deferred to the orchestrator post-merge (dev host serves the MAIN tree) | Pages/Site Render/Bug Fix/Security (SVG sanitizer, render-parity re-sanitize)/Accessibility (reduced-motion)/Present-only (no migration, no schema bump)/Testing/Docs/Task Board |
| 1242 | 2026-07-08 | TASK-530 Page Editor Sliders — Fine ±1 Step for Every Numeric Range (One Place) — owner mandate: every numeric SLIDER in the page editor that has options steps by 1 (fine control), not the coarse span-derived buckets (2/4/10). Changed in ONE place (`resolveSliderStep` in `core/services/pages/pageEditorControlUiModel.ts`, the sole producer of the derived step feeding both `slider` and `sliderStepper` via `resolveNumberModel`) so it applies uniformly to the page editor, page templates, and the block/section option panels that share the same control UI model. **Present-only** (NO model/schema/normalizer change, NO DB migration, NO npm dependency, NO route/RBAC change); clamping and the `sliderStepper` vs `slider` span-threshold split are unchanged (wide ranges still pair with steppers, now stepping ±1). `resolveSliderStep` now returns `clamp.max <= 1 ? 0.05 : 1` — the FRACTIONAL branch is KEPT (line-height 0..2, letter-spacing, opacity 0..1 can't step by 1 and stay fine), every numeric (px, `max > 1`) range now steps by 1; the old span buckets are removed. Dropped the sole explicit integer registry step `section.parallaxIntensity` `step: 2` in `pageEditorControlRegistry.ts` so parallax intensity falls through to the now-1 default; the intentional FRACTIONAL registry steps (`block.style.lineHeight` `0.05`, `block.style.letterSpacing` `0.5`) are UNTOUCHED. **MenuDesignEditor step side-effect note (owner-requested):** the menu design sliders in `core/admin/ui/menus/MenuDesignEditor.tsx` do NOT flow through `resolveSliderStep` — that file renders `<SliderControl step={1}>` with a hardcoded step on all 17 sliders (verified), so menu design sliders were ALREADY ±1 and are UNAFFECTED by this change (NO functional side-effect); the grounding's "menu side-effect" is therefore benign/no-op, documented here for traceability. **Tests (owned):** `page-editor-control-ui-model.test.ts` rebaselines the coarse span-derived assertions to 1 (`section.layout.maxWidth` 320..1920 `10→1`, padding/margin/spacer 0..240 `4→1`, gap 0..120 `2→1`) + a dedicated TASK-530 test (wide integer range models `step:1` while staying `sliderStepper`, `section.parallaxIntensity` derives `1`, fractional ranges stay fine: opacity `0.05`, line-height `0.05`, letter-spacing `0.5`). All gates green (core lint, core lint:types, root tsc, test:bun [2 fails = known slow-remote-DB 15s-timeout transient — TASK-459-03 pagination green 18/18 in isolation at 45s], test:vitest [changed `page-editor-control-ui-model` + `page-editor-v2-flow` 128/128; broad glob 5793/5798 with 5 jsdom parallel-contention timeout flakes all green re-run isolated], gates:coderso 5/5). Live ≥5-per-area Playwright smoke deferred to the orchestrator post-merge | Pages/Admin Editor UI/Present-only (no migration, no schema bump)/Testing/Docs/Task Board |
| 1241 | 2026-07-08 | TASK-528 Whole-Card Tilt — Tilt Transform on the Surface Frame, Perspective on an Ancestor — direct FOLLOW-UP fix to TASK-522/524, **present-only, jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO model/schema/normalizer/control change, NO route/RBAC; a block with no `tilt` normalizes AND renders **byte-identical** to post-524; `prefers-reduced-motion` unchanged). Completes the 524 co-location for the last un-co-located transform: with a glass surface the whole CARD stayed FLAT while only the inner content tilted, because 522/524 left TILT as the SOLE inner effect on a DESCENDANT (CSS `perspective` must sit on an ancestor of the transformed node, and the frame carried `data-tilt-parent`). Fix (`pageRendererV2.tsx`): `splitBlockComposition` no longer routes `data-block-tilt` to the inner wrapper — it stays on the FRAME co-located with `data-surface` + the 524 `translate:`-property anchor offset, so the WHOLE glass card tilts; `effectToInner` is empty for tilt; a new `tiltParent` flag replaces stamping `data-tilt-parent` on the frame. `renderPageBlockWithFrame` wraps the frame (both the custom `renderBlockFrame` and default `PageBlockFrame` paths) in a present-only `withTiltParent` `<div data-tilt-parent style="perspective:1200px">` ONLY when tilt is authored (else byte-identical, no wrapper). The `[data-block-tilt]` runtime (`pageEffectsRuntime.ts`, untouched) writes `el.style.transform` on the frame + reads its `.cx-glare` child, both still resolving on the frame; the anchor `translate:` property (524-01) composes with the tilt `transform` without clobber. KNOWN rare untested combo: tilt AND a transform-decoration on one block contend on the frame `transform` (reference never combines them). **Owned test rebaseline:** the three flip-signature tilt placement assertions (generic tilt+glare, `finding 4` anchor+tilt, 522-04-L02 tilt "strong") moved to the new placement (`data-block-tilt` on the FRAME; `data-tilt-parent` an ancestor in the HTML, not the frame) + a NEW owner-bug test asserts `surfacePreset:"glass" + tilt:"strong"` puts both `data-surface="glass"` and `data-block-tilt="strong"` on the SAME node — declared rebaselines, not drift. **Security:** no new field/markup/URL/interpolation; `perspective:1200px` static literal, tilt strength the validated `pageTiltStrengths` enum, reject-unknown fail-closed unchanged. `PAGE_MODEL.md` synced. All gates green (core lint/lint:types, root tsc, test:vitest [changed `page-renderer-v2.test.tsx` 133/133 + broad `tests/vitest/pages/` 546/546], test:bun, gates:coderso 5/5). Live ≥5-per-area light+dark Playwright smoke deferred to the orchestrator post-merge | Pages/Site Render/Schema (jsonb, no migration)/Accessibility (reduced-motion)/Security (static literal, no new sink)/Bug Fix/Testing/Docs/Task Board |
| 1240 | 2026-07-08 | TASK-529 Cursor Spotlight Follows the Pointer After Scrolling (Viewport-Coord Fix) — direct FOLLOW-UP bug fix to the per-page cursor spotlight (introduced TASK-521, exposed by TASK-523's screen-blend `z-30` overlay), **present-only, source-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump, NO route/RBAC; spotlight-off pages emit byte-identically; `prefers-reduced-motion: reduce` + `(pointer:fine)` gates and rAF batching unchanged). **Owner bug (confirmed on live DOM):** after scrolling to the 3rd section the spotlight glow "fell to the bottom" and stopped following the mouse — at `scrollY=577` a `mousemove(640,500)` set `--spotlight-y="1077px"` (= `500+577`). **Root cause (`core/services/pages/pageEffectsRuntime.ts` spotlight handler):** it read `var r=sp.getBoundingClientRect()` where `sp=[data-page-spotlight]` is the ROOT/main element (full page height; after scroll `r.top=-scrollY`) then computed `sx=ev.clientX-r.left;sy=ev.clientY-r.top` — subtracting the NEGATIVE root `r.top` ADDED `scrollY` → PAGE coords; but those vars feed the `[data-page-spotlight-overlay]` element which is `position:fixed inset:0` (viewport `0..innerHeight`), so its `radial-gradient` at `y=1077` painted BELOW the visible viewport (glow off-screen). Latent since 521 (invisible while the overlay sat at `z-0` behind opaque sections); 523's screen-blend `z-30` overlay exposed it. **Fix:** use pure VIEWPORT coords `sx=Math.round(ev.clientX);sy=Math.round(ev.clientY);` and drop the now-unused root-rect read — `clientX/clientY` are already viewport-relative, exactly what a `position:fixed` overlay's gradient needs; the glow now tracks the pointer at any scroll depth. **Tests:** `cursorSpotlight.test.tsx` gains a behavioral test mocking the root rect `top:-577` + `pointermove(640,500)` asserting `--spotlight-x/y === clientX/clientY` (`640px`/`500px`) and NOT the pre-fix `1077px`; `pageEffectsRuntime.test.ts` gains a static-source assertion that the handler uses raw `ev.clientX/ev.clientY`, no longer subtracts the root rect, and reads NO `sp.getBoundingClientRect()` inside pointermove. **Security:** no new attacker-influenceable surface (drops a rect read, uses browser-supplied `clientX/clientY`); the runtime source stays a STATIC literal (no `${` interpolation, no `eval`/`Function`/`innerHTML` sink — existing invariants still assert). All gates green (core lint/lint:types, root tsc, changed vitest 22/22). Live ≥5-scenario-per-area light+dark Playwright smoke (glow tracks pointer after scrolling to sections 2/3/N; reduced-motion no-op; coarse-pointer no-op; spotlight-off byte-identity) deferred to the orchestrator post-merge | Pages/Site Render/Bug Fix/Accessibility (reduced-motion, pointer:fine)/Security (static runtime source)/Testing/Docs/Task Board |
| 1239 | 2026-07-08 | TASK-524 Composable Effects — Single-Node Surface+Transform Co-location & Independent Surface Tint — direct FOLLOW-UP fix to TASK-522 (branched from post-523 HEAD), all **present-only, jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; legacy/no-effect docs normalize AND render **byte-identical** to post-522/523; `prefers-reduced-motion` unchanged): **(524-01) surface floats with its content** — 522 routed a transform-writing effect (decoration float/drift/pulse/orbit, hover lift/lift-glow/scale) onto an INNER wrapper while `data-surface` stayed on the frame, so only inner content animated ("only the text floats, not the glass"); root cause = the `[data-layer-anchor]` self-offset was `transform:translate(…)` which an effect `transform` would clobber. Fix switches the nine anchor rules to the independent CSS **`translate:` property** (separate composited channel, identical offsets) and reworks `splitBlockComposition` so a transform decoration/hover **co-locates with `data-surface`/`data-layer` on the SAME frame node** (whole glass card floats/lifts, matching the reference `.floating-chip`); TILT stays the SOLE inner effect (needs a perspective PARENT); glass/glass-grid gain `overflow:hidden` (524-03 radius-clip) so the node clips to its inline radius through the transform (anchored `[data-layer]` chips are `.cx-layered-canvas` SIBLINGS, never clipped). **(524-02) independent surface tint** — new present-only `PageBlockStyleV2.surfaceTint?: string` (alpha-capable, `readOptionalSafeColor`/`sanitizeAuthoringCssColor`) joined to the `pageBlockStyleKeys` allowlist + block-style JSON schema (`additionalProperties:false`) + normalizer in lockstep; `resolveBlockCompositionAttrs` seeds `--surface-glow`/`--deco-ring`/`--orb-color` from it FIRST with **precedence**, the 522 `style.background`-derived value staying a FALLBACK only (chip w/ background & no tint stays byte-identical), gradient/url left out. New `block.surface.tint` "Surface tint" control (`input:"color"`, `responsive:true`); `pageResponsiveCss.ts` retargets those three frame custom props per breakpoint (`!important`, gated on plain non-gradient tint + active surface/effect). **Owned breaking-test rebaseline (524-01-L03):** 522's four flip-signature placement assertions (A/B/F/C) moved to the new correct placement + a new "glass+float move together" render test (`data-surface` on the SAME node as `data-deco`). **Security:** the only new surface is the `surfaceTint` color, sanitized at write + read only as the validated custom props at render (never a raw declaration); `expression(...)`/`url(javascript:...)` omitted → CSS literal fallback; reject-unknown fail-closed round-trip. `PAGE_MODEL.md`/`DESIGN_TOKENS.md`/`SECURITY_SPEC.md` synced. Live ≥5-per-area light+dark Playwright smoke (side-by-side vs the reference wow-site hero) deferred to the orchestrator post-merge | Pages/Admin UI/Site Render/Schema (jsonb, no migration)/Accessibility (reduced-motion)/Security (color whitelist, static anchor rewrite)/Testing/Docs/Task Board |
| 1238 | 2026-07-08 | TASK-525 Full-Bleed Background with Width-Constrained Content & Per-Block Staggered Reveal — fixes two live-surfaced Page v2 section-render gaps vs the reference wow-site, both **present-only, jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; legacy/no-effect docs normalize AND render **byte-identical**). **525-01 — full-bleed background decoupled from the content cap:** the prior `3eac13f9` bleed painted the section background edge-to-edge (correct) but the `full-width` variant ALSO dropped the content cap (`maxWidth:"none"`), spreading CONTENT to the viewport edges. `pageRendererV2.tsx` now DECOUPLES the two via `isPageSectionFullBleed` — the content node (`toPageSectionStyle`) is always capped/centered at `layout.maxWidth` (`width:min(maxWidth, calc(100% - 40px));margin:0 auto`, fixed 20px gutter mirroring the reference `.container`), while the new exported `toPageSectionBleedStyle` puts a FIXED-literal `100vw` background box (`width:100vw;margin-left/right:calc(50% - 50vw)`, carrying sanitized bg color/URL + clamped radius/shadow) on the OUTER `<section>` (`undefined`→byte-identical for non-full-bleed). Added present-only `PageSectionStyleV2.fullBleed?: boolean` (`pageDocumentV2.ts`: allowlist + both `additionalProperties:false` JSON schemas + normalizer, emitted only when `=== true`) so ANY section (not just the `full-width` variant) can bleed with contained content, + the `section.style.fullBleed` switch control (`responsive:false`). The two old `maxWidth:"none"` full-width assertions in `page-renderer-v2.test.tsx` were rebaselined (declared, not drift). **525-02 — per-block staggered reveal:** added present-only `PageBlockStyleV2.revealDelay?: number` (ms, clamped `PAGE_REVEAL_DELAY_CLAMP {0,4000}` via `readNumber` — NaN/Infinity fail-soft, out-of-range clamps; allowlist + JSON schema + normalizer, round-trip tested) emitting a bounded `--reveal-delay: ${n}ms` on the `[data-block-id]` frame; `PAGE_REVEAL_MOTION_CSS` gains per-CHILD reveal rules (state-independent `transition:opacity/transform .7s;transition-delay:var(--reveal-delay,0ms)` + `:not([data-revealed])`/`[data-revealed]` visual states) INSIDE the existing `motion-safe:`/`[data-reveal-armed]` gate, so a revealing section's blocks CASCADE (each fades on its own delay) reusing 521's runtime/attrs with NO new runtime/keyframe. Added the `block.style.revealDelay` number control (`unit:"ms"`, `responsive:false`). **Security/a11y:** only bounded literals reach CSS (`${n}ms`, static `100vw`/20px), reject-unknown fail-closed, `prefers-reduced-motion` unchanged (transition-delay inert under reduced-motion; `pageEffectsRuntime.ts`/`hero.tsx`/`PageEditor.tsx` untouched). `PAGE_MODEL.md`/`DESIGN_TOKENS.md` synced. All gates green (core lint/lint:types, root tsc, test:bun [8 fails = known `starterContent` shared-DB seed-count transient, 3/3 isolated], test:vitest pages 508/508, gates:coderso 5/5). Live ≥5-per-area light+dark Playwright smoke deferred to the orchestrator post-merge. Optional section/page auto-stagger convenience scoped OPTIONAL, not shipped | Pages/Admin UI/Site Render/Schema (jsonb, no migration)/Accessibility (reduced-motion)/Security (bounded number + boolean, static literals)/Bug Fix/Testing/Docs/Task Board |
| 1236 | 2026-07-08 | TASK-526 Page Editor Layers Popover — Vertical Scroll Containment — fixes the owner-reported "unscrollable Layers window" in Page Editor v2 (a tall block tree grew past its container so the lower layers were unreachable). Pure **className/structure** change — NO logic/model/API/route/prop-signature/behavioral change, NO migration/DDL/schema bump. A read-only ground audit of every list/tree file under `core/admin/ui/pages/editor/` + `.../builder/` found **exactly ONE** panel missing a scroll container: the `absolute`-positioned Layers popover in `PageEditor.tsx` (host of `LayerBlockRows`), which had **no `max-h`/`overflow`/height bound** (an absolute box is out of its parent's flex flow, so the `flex-1`/`h-full` host-bound chain cannot engage). Every other candidate is already correctly scroll-contained (TASK-197: `LibraryPanel`/`WidgetPicker`/`FormPicker`/`PageEditorCommandPalette`) or is host-scrolled inner content that must NOT be modified (`VisualPanel`/`AdvancedPanel`/`WizardPanel`/`LayoutPanel`). The fix mirrors the in-file host-appearance popover idiom (proven 3×): the container self-bounds with `flex max-h-[min(72vh,calc(100dvh-8rem))] flex-col overflow-hidden`, the header gets `shrink-0`, and the section-list (`pageDocument.sections.map` stack) becomes the ONE scroll region — `min-h-0 flex-1 overflow-y-auto overscroll-contain` (no wheel-chaining into the sibling canvas; `shadow-pop`/`rounded-2xl` paint intact). `PageEditorLayers.tsx`/`LayerBlockRows` stays **byte-identical** (no nested scroll box, no dead `LayerBlockTree` wrapper). Structural class-assertion test drives the LIVE `PageEditor` (opens Layers, asserts container `max-h`+`overflow-hidden`, list classes, exactly one `overflow-y-auto`; no `scrollHeight`); `PAGE_MODEL.md` synced. Live light+dark Playwright smoke deferred to the orchestrator post-merge | Admin UI/Pages (Page Editor v2)/Accessibility/Bug Fix/Structure-only (no migration)/Testing/Docs/Task Board |
| 1237 | 2026-07-08 | TASK-523 Page Canvas Background & Occlusion-Proof Cursor Spotlight — Per-Page `settings.background` + Additive Screen-Blend Spotlight — two owner deliverables riding the EXISTING TASK-521 page-settings + page-render seams, both **present-only, jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; a page with neither a canvas background nor the cursor spotlight normalizes AND renders **byte-identical** to post-522): (D1) **page canvas background** — a NEW present-only sibling key `settings.background` (safe solid color OR CSS gradient) added to `PageDocumentSettingsV2` + the `assertKnownKeys` reject-unknown allowlist + strict `pageDocumentV2JsonSchema` `additionalProperties:false`, validated by the SINGLE `sanitizeAuthoringCssBackground` path at write AND render (defence-in-depth), emitted as inline `style.background` on the page `<Root>` (overrides `bg-white`) only when authored; a compact **Design → "Page background"** control (color-only `ColorSwatchControl`, alpha via 519) writes it onto the LIVE document draft via `setDocumentDraft` (mirrors the spotlight color, persisted on every save/publish, clearing drops the key), gradients model/import-only. (D2) **occlusion-proof cursor spotlight** — `PAGE_SPOTLIGHT_CSS` overlay lifted from `z-0` to a NON-gated base rule `position:fixed;inset:0;z-index:30;mix-blend-mode:screen;pointer-events:none` (visible over opaque sections, ADDS light, click-through), STRICTLY BELOW the sticky nav (`z-40`) so screen-blend never tints the menu bar; the moving `radial-gradient` stays inside `@media (prefers-reduced-motion: no-preference)` (reduce users get a layered but MOTIONLESS overlay); `PAGE_LAYER_Z_CLAMP.max` lowered 40→20 so no authored layer reaches the overlay (invariant `20 < 30 < 40`, held in a test). **Gradient hardening (TASK-523 FU-1, landed):** `isSafeAuthoringCssGradient` now rejects any `url(` token + top-level multi-layer form (`isSingleGradientLayer`), closing the `linear-gradient(...), url(//evil/beacon)` outbound-fetch layer + nested `radial-gradient(circle,url(//x))` for ALL `sanitizeAuthoringCssBackground` callers. `PAGE_MODEL.md`/`DESIGN_TOKENS.md`/`SECURITY_SPEC.md` synced; Vitest model/SSR/render + NEW `pageSettingsPanel.test.tsx` added. Live ≥5-per-area Playwright smoke deferred to the orchestrator post-merge | Pages/Admin UI/Site Render/Schema (jsonb, no migration)/Accessibility (reduced-motion)/Security (CSS color/gradient whitelist + `url()`-layer hardening, additive nav-safe overlay)/Testing/Docs/Task Board |
| 1235 | 2026-07-08 | TASK-522 Composable Hero Toolkit & Premium Effects — Custom-SVG Block, Floating-Drift Decorations, Tilt-On-Any-Block, Layered Canvas, Glass/Glow + Hover Presets & Ticker — adds the composable TOOLKIT to build a rich premium hero inside Page Editor v2 (NOT a one-off hero widget), building ON TASK-521 and sharing its invariants, all **present-only, jsonb-only** (NO npm dependency [hand-rolled SVG sanitizer + inline CSS keyframes + 521's runtime], NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; legacy/no-effect docs normalize AND render **byte-identical** to post-521): (A) **custom-SVG block** — the ONE new `pageBlockType` `customSvg` (`svg`/`drawIn`/`drawSpeed`/`label`) with an **allowlist sanitizer** (NEW `svgSanitizer.ts`, isomorphic, applied at write AND render: fail-closed comment/CDATA pre-pass + `<script>`/`<foreignObject>`/XXE/`on*=`/`javascript:`/`expression(`/non-local-`href`/over-cap tripwires + allowlist tag/attr walk [`style` dropped] + residual-`<`/unbalanced-quote post-check → neutral fallback) + optional stroke draw-in; (B) **floating-drift decoration** — present-only `block.style.decoration` (`float`/`drift`/`pulse`/`radiate`/`orbit`) turning any block into a layered decoration; (C) **tilt-on-any-block** — present-only `block.style.tilt`+`tiltGlare` generalizing 521's hero tilt via a `[data-block-tilt]` runtime binding appended to `pageEffectsRuntime.ts` (own `pointer:fine` gate, reuses reduced-motion early-return); (D) **layered canvas** — `section`/layout-block `style.composition:"layered"` + per-child `style.layer` (x/y/z per device via `pageResponsiveCss.ts` `--layer-*` deltas, anchor base-only); (E) **glass/glow surface presets** (`style.surfacePreset` glass/glass-grid/radial-glow/ambient-orbs) + **hover-effect presets** (`block.style.hoverEffect` glow-reveal/lift/scale/lift-glow); (F) **ticker/marquee** (`group` block `style.marquee`, seamless loop). Every effect respects **`prefers-reduced-motion`** (CSS `@media (prefers-reduced-motion: no-preference)` gate + `matchMedia` runtime early-return); composition `<style>` + block-tilt runtime emitted front/preview-only (`PageDocumentRender`, only when authored). Reject-unknown allowlist + round-trip per key; enums `normalizeEnum` fail-closed, numbers clamped, colors `readSafeColor` (author retint → `--surface-glow`). `PAGE_MODEL.md`/`WIDGETS.md`/`DESIGN_TOKENS.md`/`SECURITY_SPEC.md` synced. Live ≥5-per-area Playwright smoke (composed side-by-side vs the reference wow-site hero) deferred to the orchestrator post-merge | Pages/Admin UI/Site Render/Widgets/Schema (jsonb, no migration)/Accessibility (reduced-motion)/Security (SVG allowlist sanitizer + color/enum/clamp whitelist, static runtime)/Testing/Docs/Task Board |
| 1234 | 2026-07-08 | TASK-521 Page Motion & Interaction Effects — Section Scroll/Parallax/Reveal, Animated-Icon Block, Hero Mouse-Tilt & Per-Page Effects (Compact Side-Inspector Panel) — adds one cohesive motion/interaction family to Pages v2, all **present-only, jsonb-only** (NO npm dependency, NO DB migration/DDL, NO `PAGE_DOCUMENT_SCHEMA_VERSION` bump [stays `2`], NO route/RBAC; legacy/no-effect docs normalize AND render **byte-identical**): (A) **section scroll effects** — present-only `PageSectionStyleV2.scrollEffect` (`none`/`reveal-fade`/`reveal-up`/`parallax`) + `parallaxIntensity` (0..40 px), IntersectionObserver reveal + rAF parallax on the FRONT/preview only (builder canvas at rest, Hard Invariant 7); (B) **animated-icon block** — the previously non-functional `icon` PAGE block implemented from a curated **inline-SVG + CSS-keyframes** set (NEW `animatedIconGlyphs.tsx`, no Lottie/dependency, CSP-safe) with `name` (allowlist `animatedIconNames` → fail-soft `sparkles`)/`animation`/`size`/`color`/`speed` props, NO new `pageBlockTypes` member (existing `icon` promoted to insertable/runtime), NO widget-pack row; (C) **hero mouse-tilt** — present-only `hero.style.tilt` (`none`/`subtle`/`strong`) 3D parallax-on-hover via CSS `perspective` + `mousemove` runtime, fail-SOFT `resolveHeroTilt`, off for reduced-motion/coarse pointer; (D) **per-page effects** — `settings.effects` (`PageEffectsV2`: `cursorSpotlight`/`spotlightColor`[519 alpha]/`spotlightSize` 120..900) cursor-follow spotlight on `PageDocumentRender`, PLUS page settings RELOCATED from the full-height drawer into a **compact side-inspector panel** (reusing `Settings2`) with a new **Effects** section. Every effect respects **`prefers-reduced-motion`** (CSS `motion-safe:`/`motion-reduce:` + `matchMedia` runtime early-return); runtime scripts are STATIC dependency-free IIFEs (no stored data interpolated, semgrep-clean) emitted front/preview-only. Reject-unknown allowlist + round-trip per key; colors via `readSafeColor`, icon name allowlist-resolved, numbers clamped, enums `normalizeEnum` fail-closed (hero `tilt` fail-soft). `PAGE_MODEL.md`/`WIDGETS.md`/`DESIGN_TOKENS.md` synced. Live ≥5-per-area Playwright smoke deferred to the orchestrator post-merge | Pages/Admin UI/Site Render/Widgets/Schema (jsonb, no migration)/Accessibility (reduced-motion)/Security (color + icon-name whitelist, static scripts)/Testing/Docs/Task Board |
| 1233 | 2026-07-07 | TASK-520 Menu Design — Scrolled-State Colors, Card Radius, Custom Shadow & Brand Icon/Combo — closes three owner-reported Menu Design gaps as present-only, additive, **jsonb-only** extensions (NO DDL/migration, NO `MENU_DOCUMENT_SCHEMA_VERSION` bump, NO route/RBAC, NO dependency; legacy/no-override docs + `buildSiteShellCss(null)` byte-identical): (1) **scrolled/floating-state colors** — new `MENU_BAR_EXTRA_KEYS` bar keys `surfaceColorScrolled`/`borderColorScrolled`/`borderWidthScrolled`/`shadowScrolled`/`shadowCustomScrolled` (each unset variant falls back to its base key) driven on the FRONT by a dependency-free idempotent inline IIFE that toggles `data-scrolled` past a threshold (respects `prefers-reduced-motion`; emitted ONLY when a scrolled variant is authored on a sticky bar) + a `[data-scrolled="true"]` CSS block; (2) **menu-bar card radius** (`radius` 0..40 px, per-device) + **custom box-shadow** (`shadowCustom`/`shadowCustomScrolled`, validated by the NEW bracket-aware `normalizeMenuBoxShadowValue` — ≤4 lengths + one validated color token + ≤4 layers + ≤200 chars, rejects `url(`/`expression(`/`;{}<>@`/backslash; OVERRIDES the none\|sm\|md enum); (3) **brand icon mode** (`mode:"icon"` + allowlisted lucide `icon` via `normalizeBrandIconName` + `iconColor`[519 alpha]/`iconSize`) + **graphic-with-text combo** (`showText`). Split `normalizeMenuBarLayout` (appearance subset vs extra keys) keeps reject-unknown fail-closed; new bar keys are held out of `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS` so their editor controls render NO `ControlDefaultHint`. `BrandRender` extended img-XOR-text → icon + combo; admin Design tab adds the scrolled group (gated on sticky, alpha `ColorSwatchControl`), radius/custom-shadow controls, a preview `data-scrolled` toggle, and the brand icon picker + combo toggle. `PAGE_MODEL.md`/`CONTENT_TYPES_SPEC.md` synced; route-lane + per-key round-trip + security-negative + `ControlDefaultHint`-absent tests added. Live ≥6-scenario Playwright smoke deferred to the orchestrator post-merge | Admin UI/Menus/Navigation/Site Render/Schema (jsonb, no migration)/Security (CSS-value + icon-name whitelist)/Testing/Docs/Task Board |
| 1232 | 2026-07-07 | TASK-519 Alpha-Capable Color Input Across All Admin Editors — everywhere a color is authored in the admin (menu/page `ColorSwatchControl`, widget-editor `SharedColorControl`/`ClearableFields`) the user can now enter AND round-trip **alpha-capable** values (8-digit hex `#rrggbbaa`, `rgba()`, `hsla()`, incl. leading-dot `rgba(8,17,31,.84)`) via a base-color picker + **opacity/alpha slider** + free-text, while keeping transparent / palette / `var(--color-*)` token UX. New pure `core/admin/ui/shared/colorValue.ts` helper — a read-only SUBSET of the authoritative whitelist (parity-tested against `resolveClearableCssColorValue`) that CANONICALIZES leading-dot alpha `.84`→`0.84` on emit (the render boundary rejects `.84`; the ONLY normalization — hex round-trips byte-identically, alpha clamped `[0,1]`). Both controls route committed values through it; the 9 direct menu sites + `swatch()` wrapper + `MenuAppearancePanel` + 27 widget editors verified schema-valid + round-tripping (verification-first, no re-impls). Widening count **2** (not 0): `footer.tsx`/`newsletter.tsx` carried bespoke hex-only render regexes → present-only widened to accept 4/8-digit alpha hex matching `resolveClearableCssColorValue`. **NO schema/DDL/migration/dependency** (jsonb string fields, legacy values byte-identical); server-write + render boundaries UNCHANGED (security surface intact). `DESIGN_TOKENS.md` synced; 4 legacy assertions re-baselined (intended contract change). Live ≥5-scenario alpha-authoring playwright smoke deferred to the orchestrator post-merge | Admin UI/Editor Controls/Color Authoring/Design Tokens/Security (CSS-value validation)/Widgets/Menu/Schema (jsonb, no migration)/Testing/Docs/Task Board |
| 1228 | 2026-07-06 | TASK-516 Forms Editor — Prototype Fidelity, Whole-Form Styling & File Field — brings the Forms editor to prototype fidelity (in-page `PageHeader` + `EditorFrame` replacing `EditorShell`, `EditorRailGroup`/`EditorRailItem` FIELDS rail incl. **Phone**, functional desktop/mobile device toggle, render-only disabled undo/redo, **Publish** action, canvas-click selection replacing the Fields/Library tab split), fixes the enumerated broken/hidden field controls (B1 phone reachable, B2 real `<select>` preview, B3 type-specific `date`/`time`/`number`/`phone`/`email` affordances, B4 `time` increment control, B5 `rating` scale not slider + no inert Minimum, B6 inline `hidden` defaultValue required-hint), and adds a **whole-form style/theme model** in the existing `forms.settings` **jsonb** (**NO DB migration**): new `theme` sub-record (layout/surface/typography/input/submit) normalized present-only + reject-unknown, `formTheme.ts` single-source enum unions + `resolveFormTheme` + token→class maps + `buildFormThemeStyleVars`, colors policy-checked via `resolveClearableCssColorValue` at write + render, edited via a new Design inspector tab (`FormDesignPanel`) and applied across builder canvas + runtime preview + public `form-embed` (form theme = base, per-embed `FormEmbedStyle` overrides per token; `pageRendererV2` `mapFormBindingToEmbedData` present-only theme passthrough); plus the **`file` field type** — new public nonce-gated `POST /forms/:id/uploads` reusing the form's own submission access gate + `public_write` rate-limit + bot protection (not `media:write`), `mediaService.uploadMedia` `constraints` (accept/maxSize) + content-sniff, new `mimeMatchesAccept`/`formAttachment` leaves, submitted values validated as owned media references (`verifyFileReferences` DB backstop), `"submission"` media-usage tracking; CMS_API/SECURITY_SPEC/FORM_EMBED synced | Forms/Admin UI/Page Builder/Runtime/Schema (jsonb)/Media/API/Security/Prototype Fidelity/Testing/Docs/Task Board |
| 1227 | 2026-07-06 | TASK-514 Entries Editor — Prototype Fidelity & Entry Visibility — brings the Entries list + single-entry editor to prototype fidelity (in-page `PageHeader` + `[1fr_320px]` grid + Content/Media `SectionCard` grouping driven by authored `layout.tab`/`section`, Publish/Taxonomy/**Metadata** cards, list/grid view toggle) AND adds entry Visibility (public/private/password): new `content_entries.visibility` + write-only argon2 `access_password` (migration `0069`), derived `hasPassword` boolean surfaced (secret never selected/echoed/logged), visibility-keyed hash write/keep/clear with `entry_password_required` reject-before-write atomicity + reject-unknown 400, duplicate downgrades password→private, client cache round-trip, non-public visibility Badge + real short-id list rows; publish checklist/taxonomy/SEO/preview/duplicate preserved and re-homed; History trigger + `revisionsSlot` seam left for TASK-487; front enforcement deferred to TASK-517; DATA_MODEL synced | Content (Entries)/Admin UI/DB/API/Security/Cache/Prototype Fidelity/Testing/Docs/Task Board |
| 1226 | 2026-07-06 | TASK-513 Engine (Content Type Editor) — Prototype Fidelity & Config/Field-Type Extension — brings the content-type editor to prototype fidelity + extends the model: new `content_types.config` jsonb (migration `0068`) carrying `singularName`/`pluralName`/`draftsEnabled`/`versioning`/per-role `permissions`, normalized present-only + reject-unknown in the db-free `contentTypeConfig.ts` (400 `content_type_config_invalid`); new `date`/`slug` field types end-to-end (`FieldType` widening, `xFieldType` no-`format` mapping, declarative `unique`, per-property `xFieldConfig.order` field-order persistence); in-page `PageHeader` + underline Tabs incl. Permissions + `[1fr_300px]` Fields grid + Type-settings card (mono API ID) + drag-reorder row list; UI-side permissions minimizer + role×capability panel; functional visual schema builder; Cmd/Ctrl+S + leave-guard + last-saved; DATA_MODEL/CMS_API/CONTENT_TYPES_SPEC synced | Content (Engine)/Admin UI/DB/API/RBAC/Schema/Prototype Fidelity/Testing/Docs/Task Board |
| 1225 | 2026-07-06 | TASK-512 Media Library — Prototype Fidelity & Schema Extension — reproduces the admin Media Library to prototype fidelity + extends the model: new `media_folders` table (nesting, slug-unique, `onDelete:set null` un-file) + `media.folder_id/tags/focal_x/focal_y/description/credit` (migration `0067`), `mediaFoldersService` CRUD/reorder, present-only reject-unknown media PATCH (focal clamped `[0,1]`, tag caps), folder routes registered from inside `registerMediaRoutes` behind `media:read`/`media:write`, settings-only storage quota (`storage.quota.totalBytes/.planLabel`), `mediaFoldersClient` + cache key + client shapes, prototype-faithful UI (StorageQuotaCard/FolderRail/FilterPanel/TagInput/FocalPointPicker + top-left type-badge grid card), DATA_MODEL/CMS_API/MEDIA_SPEC synced | Media/Admin UI/DB/API/RBAC/Cache/Prototype Fidelity/Testing/Docs/Task Board |
| 1224 | 2026-07-06 | TASK-515 Screens Admin Left-Menu Visibility Fix — pinned Active custom screens now appear in the admin sidebar regardless of editor capability: removed the undocumented `supportsDedicatedCustomScreenEditor` gate from `buildCustomScreenShortcutNavItems` (`sidebarConfig.ts`) and the mirrored `"requires_editor_setup"` state from `resolveCustomScreenSidebarShortcutState` (`customScreenListModel.ts`) — both had over-filtered against the documented ADMIN_NAVIGATION.md:10-14 contract (status=active AND showInSidebar); dashboard/collection-only pinned screens + list-card "In sidebar" badge now render; regression tests + docs affirmed. NO schema/route/RBAC/migration change | Admin UI/Navigation/Custom Screens/Bug Fix/Testing/Docs/Task Board |
| 1223 | 2026-07-05 | TASK-480 Dashboard Widgets & Configurable Panels — admin Dashboard-only configurable panels: `DashboardLayout` v1 + 9 panel types, traffic-aware widget data via TASK-483 aggregates, per-user `dashboard_layouts` migration `0066`, internal layout/widget-data routes with `content:read` + `dashboard:write`/CSRF/admin buckets, cached client + uncached draft preview, builder UI, docs/cache/RBAC/data-model sync | Dashboard/Admin UI/API/DB/RBAC/Cache/Analytics/Testing/Docs/Task Board |
| 1222 | 2026-07-05 | TASK-484 Backups: Scheduler, Retention, Restore & Remote Storage — makes backups real: env-gated in-process scheduler (system actor, advisory-lock single-flight) that runs due backups + advances next_run_at, retention pruning (POST /backups/prune), transactional confirmation-gated destructive restore (fail-closed version:1 artifact parse before any write, removes the backup_restore_unsupported stub), remote s3/azure artifact storage via reused media adapters (public URL + server-internal artifact_key), and storage usage/quota (GET /backups/usage); migration 0065; DATA_MODEL/CMS_API/SECURITY_SPEC/MEDIA_SPEC synced | Backups/Scheduler/Data Model/API/Security/Media/Testing/Docs/Task Board |
| 1221 | 2026-07-05 | TASK-483 Real Web Analytics Pipeline — new `analytics_pageviews`/`analytics_sessions` schema (migration 0064), public beacon collector (`POST /_analytics/collect`, HMAC nonce + `public_write` + bot/DNT, captcha-exempt, no raw IP/UA), privacy-respecting tracking snippet, real traffic aggregation replacing `computeScore`, admin traffic API + CSV export + cached client, retention pruning, standing-CI test matrix + docs | Analytics/Public Ingestion/Schema/Security/Admin UI/Caching/Testing/QA/Docs/Task Board |
| 1220 | 2026-07-05 | TASK-482 Setup & Onboarding Wizard — two-phase onboarding: pre-auth first-run installer (`/auth/install/status` + session-less `/auth/install/admin`, fail-closed no-users gate with in-tx TOCTOU re-check under advisory lock, `auth` rate-limit, audit, self-disable) + post-login multi-track wizard (Basic identity/locale/`site.timezone`/URLs + starter content via `/setup/starter-content/*`, optional Advanced, `setup.completed` finalize) | Admin/Onboarding/Auth/Security/Settings/Docs/Task Board |
| 1219 | 2026-07-04 | TASK-510 AGENTS.md Multi-Agent Workflow Codification — codifies the practiced multi-agent process (research→author→≥5-round drift-audit with cross-subtask reconcile→sequential single-writer implement with targeted gates→~5-lens post-audit→mandatory ≥5-scenario VISIBLE-EFFECT smoke→closure), parallel-stream collision guards, deferred combined gates, fail-closed allowlist + present-only rules, operational discipline | Docs/Process/Task Board |
| 1218 | 2026-07-04 | TASK-509 Security Strict Pass & Settings Test Isolation — scan:security:strict GREEN (nodemailer 9 bump + ws/undici/vite/sigstore overrides + full GitHub Actions SHA pinning) + self-scoped settingsService nullable-id fixture | Security/Dependencies/CI/GitHub Actions/Testing/QA/Docs/Task Board |
| 1217 | 2026-07-03 | TASK-508 Menu Nesting Forms & Flyout Fix — container default hints (180/6), per-level linkAlign centering, perceptible visibility+opacity+transform flyout, unified submenuDirection (right/down/up/left) & accordion submenuMode | Admin UI/Content (Menus)/Navigation/Page Builder/Site Front/Responsive/QA/Docs/Task Board |
| 1216 | 2026-07-03 | TASK-507 Menu Indicator Scope & Hint Alignment — top-bar-only B2 chrome scope, dual-axis rest reset, ControlDefaultHint value===undefined guard (2 TASK-506 LOW residuals) | Site Front/Admin UI/Content (Menus)/Navigation/Responsive/QA/Docs/Task Board |
| 1215 | 2026-07-03 | TASK-506 Menu Modern Styling — base reset, visible defaults & 5 modern bundles (separators, indicator, caret/flyout, pill, nested placement) | Admin UI/Content (Menus)/Navigation/Page Builder/Site Front/Responsive/QA/Docs/Task Board |
| 1214 | 2026-07-03 | TASK-505 Screens Section Columns & Binding Integrity — section style channel, auto-flow grid, binding-GC recovery | Admin UI/Custom Screens/Screen Builder/Schema/Binding Integrity/QA/Docs/Task Board |
| 1213 | 2026-07-03 | TASK-504 Menu Styling Depth — brand style, per-nesting-level styling & cheap wins | Admin UI/Content (Menus)/Navigation/Site Front/Responsive/QA/Docs/Task Board |
| 1212 | 2026-07-02 | TASK-503 Screens Polish V2 — block style channel, clearable labels, clean entry view, drag handle & image residuals | Admin UI/Custom Screens/Screen Builder/Entry View/QA/Docs/Task Board |
| 1211 | 2026-07-02 | TASK-502 Menu design fixes V2 — brand text, tablet cascade, canvas WYSIWYG & nested submenus | Admin UI/Content (Menus)/Navigation/Site Front/Responsive/QA/Docs/Task Board |
| 1210 | 2026-07-02 | TASK-501 Menu per-device overrides, orientation & block visibility | Admin UI/Content (Menus)/Navigation/Page Builder/Responsive/QA/Docs/Task Board |
| 1209 | 2026-07-02 | TASK-500 Screen builder — sections, insertion targeting and editor UX | Admin UI/Custom Screens/Screen Builder/Page-Builder UX/QA/Docs/Task Board |
| 1208 | 2026-07-01 | TASK-499 Menu items restyle and Design tab (menuDocumentV2) | Admin UI/Content (Menus)/Navigation/Page Builder/Visual Refresh/QA/Docs/Task Board |
| 1207 | 2026-07-01 | TASK-498 Custom-screen data-oriented builder and look parity | Custom Screens/Admin UI/Screen Builder/Screen Model/Relations/Visual Refresh/QA/Docs/Task Board |
| 1206 | 2026-06-30 | TASK-497 Posts list and editor prototype-parity restyle | Admin UI/Content (Posts)/Visual Refresh/QA/Docs/Task Board |
| 1205 | 2026-06-30 | TASK-496 Shared editor-chrome shell and Screens adoption | Pages/Custom Screens/Admin UI/Architecture/Cleanup/Docs/Task Board |
| 1204 | 2026-06-30 | TASK-495 Page/Template editor and Top-Bar prototype parity | Pages/Page Templates/Admin UI/Page Builder/QA/Docs/Task Board |
| 1199 | 2026-06-27 | TASK-477-02 Page Editor block-level swatch preview accuracy | Pages/Admin UI/Theme/QA/Docs/Task Board |
| 1198 | 2026-06-26 | TASK-477-01 Page Editor inline color swatch accuracy and picker | Pages/Admin UI/QA/Docs/Task Board |
| 1197 | 2026-06-26 | TASK-476-02 Page Editor live in-edit mark feedback | Pages/Admin UI/QA/Docs/Task Board |
| 1196 | 2026-06-26 | TASK-476-01 Page Editor mark re-color replacement | Pages/Admin UI/QA/Docs/Task Board |
| 1195 | 2026-06-25 | TASK-475 Page Editor inline mark toolbar real-input fixes | Pages/Admin UI/QA/Docs/Task Board |
| 1194 | 2026-06-25 | TASK-473 record detail overrides closure | Custom Screens/Admin UI/Cache/Docs/QA/Task Board |
| 1193 | 2026-06-24 | TASK-474 Custom Screen authoring parity and inline editing | Custom Screens/Admin UI/Schema/Docs/QA/Task Board |
| 1192 | 2026-06-24 | TASK-473 Custom Screen presentation overrides foundation | Custom Screens/API/DB/Docs/QA/Task Board |
| 1191 | 2026-06-23 | TASK-472 Page Editor V2 authoring controls backlog | Pages/Admin UI/Renderer/Security/QA/Task Board |
| 1190 | 2026-06-22 | TASK-471 Page Editor authoring controls | Pages/Admin UI/Renderer/Security/QA/Task Board |
| 1189 | 2026-06-22 | TASK-468 V4 Custom Screen completion | Custom Screens/Assistant/DB/Widgets/Cache/Docs/QA |
| 1188 | 2026-06-21 | TASK-468 neutral authoring corrective repair | Custom Screens/Admin UI/Authoring/Schema/QA/Task Board |
| 1187 | 2026-06-21 | TASK-468 screen canvas runtime cutover | Custom Screens/Admin UI/Runtime/QA/Task Board |
| 1186 | 2026-06-20 | TASK-468 V4 definition slice | Custom Screens/Admin UI/Service/Schema/QA/Task Board |
| 1185 | 2026-06-20 | TASK-470 drift reconciliation | Pages/Public Runtime/Renderer/QA/Task Board/Audit |
| 1184 | 2026-06-20 | TASK-469 rich inline edit fidelity | Pages/Admin UI/Rich Text/Sanitization/QA/Task Board/Audit |
| 1183 | 2026-06-19 | TASK-470 Image fit and video title render wiring closure | Pages/Public Runtime/Renderer/QA/Task Board/Closure Audit |
| 1182 | 2026-06-18 | TASK-459 Visitor catalog closure | Listings/Public Runtime/Pages/Search/Performance/QA/Task Board |
| 1181 | 2026-06-18 | TASK-458 Menus site shell closure | Menus/Admin UI/Public Runtime/QA/Task Board |
| 1180 | 2026-06-18 | TASK-336 widget contract historical closure | Widgets/Task Board/Docs/Closure Audit |
| 1179 | 2026-06-17 | TASK-454 Page Editor draft recovery and cache hardening | Pages/Admin UI/Cache/Revisions/Navigation/QA/Docs |
| 1178 | 2026-06-16 | TASK-426..436 Phase 3B post-audit coverage | Pages/Public Runtime/QA/Docs/Post-Implementation Audit |
| 1177 | 2026-06-16 | TASK-426..436 Pages editor Phase 3B section closure | Pages/Public Runtime/Admin UI/QA/Docs/Task Contracts |
| 1176 | 2026-06-16 | TASK-438/440/441/445 post-implementation Phase 3a drift | Pages Runtime/Admin UI/Docs/Drift Audit |
| 1175 | 2026-06-16 | TASK-437..450 Phase 3a drift pass | Pages Runtime/Admin UI/CSS/Docs/Task Contracts/Drift Audit |
| 1174 | 2026-06-16 | TASK-437..450 Pages editor Phase 3a block closure | Pages/Admin UI/Public Runtime/QA/Docs/Drift Audit |
| 1173 | 2026-06-14 | TASK-466 Page full-width section background bleed | Pages/Public Runtime/Admin Preview/QA/Docs |
| 1172 | 2026-06-14 | TASK-464 Page Editor modular reuse and security | Pages/Admin UI/Architecture/Security/QA/Docs |
| 1171 | 2026-06-14 | TASK-465 Page route validation memory hardening | Pages/Templates/API/Performance/QA |
| 1170 | 2026-06-14 | TASK-463 CodeQL Pages security remediation | Security/Pages/Dependencies/QA/Docs |
| 1169 | 2026-06-13 | TASK-462 admin browser/runtime boundary hardening | Admin Build/Architecture/Runtime Boundary/QA/Docs |
| 1168 | 2026-06-13 | TASK-461 hide Advanced Widgets entry point | Widgets/Admin UI/Navigation/Docs |
| 1167 | 2026-06-13 | TASK-460 Page Templates Pages entry point | Pages/Templates/Admin UI/Navigation/Docs |
| 1166 | 2026-06-13 | TASK-458/459 implementation stabilization | Menus/Listings/Public Runtime/Admin UI/Performance/QA/Docs |
| 1165 | 2026-06-12 | TASK-455/456/457 client-readiness closure | Pages/Runtime/Forms/Content/Admin UI/QA/Docs |
| 1164 | 2026-06-11 | TASK-442 closure correction (drift pass) | Docs/Planning |
| 1163 | 2026-06-11 | TASK-424/425/451/420 Pages editor Phase 2 closure | Pages/Admin UI/Runtime/Templates/Preview/QA/Docs |
| 1162 | 2026-06-11 | TASK-421/422/423 Pages editor Phase 1 closure | Pages/Admin UI/Runtime/QA/Docs |
| 1161 | 2026-06-11 | TASK-449/442/452 Pages editor Phase 0 closure | Pages/Admin UI/Cache/QA/Docs |
| 1160 | 2026-06-10 | TASK-418 Page Editor v2 remediation closure | Pages/Admin UI/Runtime/Assistant/Templates/QA/Docs/Drift Audit |
| 1159 | 2026-06-10 | TASK-418 collection form embed runtime binding | Pages/Runtime/Security/Forms/Content/Embed/Cache/QA/Docs/Drift Audit |
| 1158 | 2026-06-10 | TASK-418 Page template boundary freeze | Pages/Templates/Widgets/Runtime/QA/Docs/Drift Audit |
| 1157 | 2026-06-10 | TASK-418 assistant Page surface parity | Assistant/Pages/Active Surface/Schema/Blueprints/QA/Docs/Drift Audit |
| 1156 | 2026-06-10 | TASK-418 public runtime block parity | Pages/Runtime/Capabilities/Solution Kits/QA/Docs/Drift Audit |
| 1155 | 2026-06-10 | TASK-418 recursive layout runtime rendering | Pages/Runtime/Admin Preview/Responsive/QA/Docs/Drift Audit |
| 1154 | 2026-06-10 | TASK-418 container block inserter and Layers | Pages/Admin UI/Nested Blocks/Controls/QA/Docs/Drift Audit |
| 1153 | 2026-06-10 | TASK-418 recursive Page block slots | Pages/Domain Contract/Validation/Docs/Drift Audit |
| 1152 | 2026-06-10 | TASK-418 section template variants | Pages/Runtime/Admin UI/Templates/Controls/QA/Docs |
| 1151 | 2026-06-10 | TASK-418 block canvas feedback | Pages/Admin UI/Canvas/Renderer/Responsive/QA/Docs |
| 1150 | 2026-06-09 | TASK-418 section canvas feedback | Pages/Admin UI/Canvas/Responsive/Controls/QA/Docs |
| 1149 | 2026-06-09 | TASK-418 shared Pages v2 renderer | Pages/Runtime/Admin UI/Renderer/QA/Docs |
| 1148 | 2026-06-09 | TASK-418 floating toolbar shortcuts | Pages/Admin UI/Toolbar/Shortcuts/Command Palette/QA/Docs |
| 1147 | 2026-06-09 | TASK-418 responsive override reset UX | Pages/Admin UI/Responsive/Controls/QA/Docs |
| 1146 | 2026-06-09 | TASK-418 per-type page block controls | Pages/Domain Contract/Admin UI/Controls/Responsive/QA/Docs |
| 1145 | 2026-06-09 | TASK-418 universal page control registry | Pages/Domain Contract/Admin UI/Controls/QA/Docs |
| 1144 | 2026-06-09 | TASK-418 immediate editor correctness | Pages/Admin UI/Selection/Block Actions/Responsive/Autosave/QA/Docs |
| 1143 | 2026-06-09 | TASK-418 block selection layers | Pages/Admin UI/Assistant/Selection/QA/Docs |
| 1142 | 2026-06-09 | TASK-418 type-safe block patching | Pages/Admin UI/Responsive/Autosave/QA/Docs |
| 1141 | 2026-06-09 | TASK-418 block style responsive substrate | Pages/Domain Contract/Responsive/Validation/QA/Docs |
| 1140 | 2026-06-09 | TASK-418 audit freeze | Pages/Task Contract/QA/Docs/Drift Audit |
| 1139 | 2026-06-09 | TASK-417 Pages v2 sections editor | Pages/Admin UI/Runtime/Assistant/QA/Docs |
| 1138 | 2026-06-07 | TASK-414 generic content-type field refinement | Assistant/CMS Content Types/Admin UI/OpenRouter/QA/Docs |
| 1137 | 2026-06-07 | Timeline MUI-aligned preset gallery rewrite | CMS Widgets/Timeline/Page Builder/Admin UI/QA/Docs |
| 1136 | 2026-06-07 | Navigation sticky collapse runtime regressions | CMS Widgets/Navigation/Runtime/Admin Preview/QA/Docs |
| 1135 | 2026-06-06 | Navigation runtime and page editor canvas | CMS Widgets/Navigation/Admin UI/Page Builder/Runtime/QA/Docs |
| 1134 | 2026-06-06 | Media upload native File metadata | Media/Admin API/Runtime Storage/QA |
| 1133 | 2026-06-07 | TASK-410 assistant widget capability sync docs | Assistant/Widgets/Docs/Process/QA |
| 1132 | 2026-06-07 | TASK-407 guided site-builder closure | Assistant/Site Builder/Navigation/Media/Docs/Task Board/QA/Drift Audit |
| 1131 | 2026-06-07 | TASK-407 scoped cleanup and second-theme live E2E | Assistant/Site Builder/Solution Kits/Rollback/Public Runtime/Playwright/QA/Docs |
| 1130 | 2026-06-06 | TASK-407 follow-up live Playwright E2E | Assistant/Site Builder/Follow-Up Resolver/Playwright/Public Runtime/Security/QA/Docs |
| 1129 | 2026-06-06 | TASK-407 Advanced live Playwright E2E | Assistant/Site Builder/Advanced Intake/Public Runtime/Solution Kits/Playwright/QA/Docs |
| 1128 | 2026-06-06 | TASK-407 Basic live Playwright E2E | Assistant/Site Builder/Playwright/Solution Kits/Public Runtime/Forms/QA/Docs |
| 1127 | 2026-06-06 | TASK-407 targeted validation lanes | Assistant/Site Builder/Validation/Release Gates/Security/QA/Docs |
| 1126 | 2026-06-06 | TASK-407 legacy AI site wizard convergence | Assistant/Site Builder/Admin UI/API/Planner/Validation/QA/Docs |
| 1125 | 2026-06-06 | TASK-407 UI warning local-state redaction | Assistant/Site Builder/Admin UI/Redaction/Local State/Validation/QA/Docs |
| 1124 | 2026-06-06 | TASK-407 review summary execution gating | Assistant/Site Builder/Admin UI/Review Gating/Validation/QA/Docs |
| 1123 | 2026-06-06 | TASK-407 Advanced intake controls | Assistant/Site Builder/Admin UI/Advanced Intake/Validation/QA/Docs |
| 1122 | 2026-06-06 | TASK-407 Basic intake controls | Assistant/Site Builder/Admin UI/Basic Intake/Validation/QA/Docs |
| 1121 | 2026-06-06 | TASK-407 intake UI state machine | Assistant/Site Builder/Admin UI/State/Validation/QA/Docs |
| 1120 | 2026-06-06 | TASK-407 siteKit runtime contracts | Assistant/Site Builder/SiteKit/Runtime/Validation/QA/Docs |
| 1119 | 2026-06-06 | TASK-407 follow-up target scoping | Assistant/Site Builder/Follow-Up Resolver/Validation/QA/Docs |
| 1118 | 2026-06-06 | TASK-407 custom-screen decision rules | Assistant/Site Builder/Custom Screens/Validation/QA/Docs |
| 1117 | 2026-06-06 | TASK-407 content-engine decision rules | Assistant/Site Builder/Content Engines/Validation/QA/Docs |
| 1116 | 2026-06-05 | TASK-407 static siteKit action coverage gates | Assistant/Site Builder/SiteKit/Static Shell/Validation/QA/Docs |
| 1115 | 2026-06-05 | TASK-407 siteKit intake adapter | Assistant/Site Builder/SiteKit/Compiler/Planner Handoff/QA/Docs |
| 1114 | 2026-06-05 | TASK-407 reference design brief review gate | Assistant/Site Builder/Advanced References/Review Gate/Provider Context/QA/Docs |
| 1113 | 2026-06-05 | TASK-407 reference intake validation policy | Assistant/Site Builder/Advanced References/Media Safety/Redaction/QA/Docs |
| 1112 | 2026-06-05 | TASK-407 Advanced layout option registries | Assistant/Site Builder/Advanced Layout/Widget Mapping/Validation/QA/Docs |
| 1111 | 2026-06-05 | TASK-409 Resend email provider | Settings/Integrations/Email/Security/Admin UI/Forms/QA/Docs |
| 1110 | 2026-06-04 | AGENTS task workflow alignment | Docs/Process/Agent Workflow/Task Board/QA |
| 1109 | 2026-06-05 | TASK-407 Advanced design preset registry | Assistant/Site Builder/Advanced Design/Validation/QA/Docs |
| 1108 | 2026-06-05 | TASK-407 Basic prompt-poisoning guards | Assistant/Site Builder/Basic Security/Validation/QA/Docs |
| 1107 | 2026-06-05 | TASK-407 Basic review facts | Assistant/Site Builder/Basic Review/Widget Mapping/Validation/QA/Docs |
| 1106 | 2026-06-05 | TASK-407 Basic site-map defaults | Assistant/Site Builder/Basic Defaults/Validation/QA/Docs |
| 1105 | 2026-06-05 | TASK-407 Basic intake progression | Assistant/Site Builder/Basic Intake/Planning/QA/Docs |
| 1104 | 2026-06-05 | TASK-407 site-builder intake redaction and browser state | Assistant/Site Builder/Redaction/Provider Context/Admin State/QA/Docs |
| 1103 | 2026-06-05 | TASK-407 site-builder intake siteKit handoff | Assistant/Site Builder/SiteKit/Validation/QA/Docs |
| 1102 | 2026-06-05 | TASK-407 site-builder intake normalization | Assistant/Site Builder/Validation/Facts/Security/QA/Docs |
| 1101 | 2026-06-05 | TASK-407 site-builder intake registry | Assistant/Site Builder/Domain Contract/QA/Docs |
| 1100 | 2026-06-05 | TASK-407 site-builder intake audit and siteKit context hardening | Assistant/Site Builder/Admin Client/Planning/QA |
| 1099 | 2026-06-05 | Assistant curated media profiles | Assistant/Site Builder/Media/Public Runtime/QA/Docs |
| 1098 | 2026-06-04 | TASK-404 full-service assistant site generation | Assistant/LLM Guide/Site Builder/Runtime/QA/Docs |
| 1097 | 2026-06-04 | TASK-403 assistant docs and LLM Guide UX repair | Assistant/Admin UI/Docker/OpenRouter/Docs/QA |
| 1096 | 2026-06-04 | reCAPTCHA backend configuration and eager loading | Security/Bot Protection/Admin UI/Public Forms/Widgets/QA/Docs |
| 1095 | 2026-06-04 | DB runtime test idle timeout | Runtime Testing/Bun Server/Media/QA/Docs |
| 1094 | 2026-06-04 | Docker startup migrations | Docker/Runtime/Database/Release/Testing/Docs |
| 1093 | 2026-06-04 | TASK-399 admin SPA route code splitting | Admin UI/Build Performance/Vite/Docker/QA/Docs |
| 1092 | 2026-06-04 | TASK-399 admin code-splitting refinement | Planning/Admin UI/Build Performance/Vite/Docker/QA |
| 1091 | 2026-06-04 | TASK-399 admin SPA code-splitting planning | Planning/Admin UI/Build Performance/Vite/Docker/QA |
| 1090 | 2026-06-03 | Assistant settings security route policy coverage | Assistant/Settings/Security/Testing/Docs |
| 1089 | 2026-05-31 | Admin UI Playwright audit | QA/Admin UI/Playwright/Docs |
| 1088 | 2026-06-02 | Footer widget 31-05 UI audit remediation | CMS Widgets/Footer/Runtime Security/Admin UI/QA/Docs |
| 1087 | 2026-06-02 | Navigation widget 31-05 UI audit remediation | CMS Widgets/Navigation/Runtime Security/Admin UI/QA/Docs |
| 1086 | 2026-06-02 | Contact widget 31-05 UI audit remediation | CMS Widgets/Contact/Public Forms API/Runtime Security/Admin UI/QA/Docs |
| 1085 | 2026-06-02 | Form Embed widget 31-05 UI audit remediation | CMS Widgets/Form Embed/Public Forms API/Runtime Security/Admin UI/QA/Docs |
| 1084 | 2026-06-02 | Appointment Form widget 31-05 UI audit remediation | CMS Widgets/Appointment Form/Public Booking API/Runtime Security/QA/Docs |
| 1083 | 2026-06-02 | Booking Calendar widget 31-05 UI audit remediation | CMS Widgets/Booking Calendar/Runtime Security/Admin UI/Public Resolver/QA/Docs |
| 1082 | 2026-06-02 | Newsletter widget 31-05 UI audit remediation | CMS Widgets/Newsletter/Admin UI/Forms Runtime/Public Security/QA/Docs |
| 1081 | 2026-06-02 | Compare Timeline widget 31-05 UI audit remediation | CMS Widgets/Compare Timeline/Admin UI/Runtime/QA/Docs |
| 1080 | 2026-06-02 | Timeline widget 31-05 UI audit remediation | CMS Widgets/Timeline/Admin UI/Runtime/QA/Docs |
| 1079 | 2026-06-02 | Search Box widget 31-05 UI audit remediation | CMS Widgets/Search Box/Admin UI/QA/Docs |
| 1078 | 2026-06-02 | Listing Filters widget 31-05 UI audit remediation | CMS Widgets/Listing Filters/Admin UI/QA/Docs |
| 1077 | 2026-06-02 | Product Table widget 31-05 UI audit remediation | CMS Widgets/Product Table/Admin UI/Commerce Fixtures/Playwright/QA/Docs |
| 1076 | 2026-06-02 | Product Compare widget 31-05 UI audit remediation | CMS Widgets/Product Compare/Admin UI/Commerce Fixtures/Playwright/QA/Docs |
| 1075 | 2026-06-02 | Product Gallery widget 31-05 UI audit remediation | CMS Widgets/Product Gallery/Admin UI/Commerce Fixtures/Playwright/QA/Docs |
| 1074 | 2026-06-02 | Entry Teaser widget 31-05 UI audit fixture and console hygiene | CMS Widgets/Entry Teaser/Playwright/Fixtures/Console Hygiene/QA/Docs |
| 1073 | 2026-06-02 | Posts Feed widget 31-05 UI audit remediation | CMS Widgets/Posts Feed/Admin UI/Playwright/Fixtures/QA/Docs |
| 1072 | 2026-06-01 | Content List widget 31-05 UI audit remediation | CMS Widgets/Content List/Admin UI/Playwright/Fixtures/QA/Docs |
| 1071 | 2026-06-01 | Rich Text Section widget 31-05 UI audit remediation | CMS Widgets/Rich Text/Admin UI/Sanitizer/Playwright/Media Fixtures/QA/Docs |
| 1070 | 2026-06-01 | Team widget 31-05 UI audit UX and fixtures | CMS Widgets/Team/Admin UX/Playwright/Media Fixtures/QA/Docs |
| 1069 | 2026-06-01 | Gallery Mosaic widget 31-05 UI audit remediation | CMS Widgets/Gallery Mosaic/Admin UI/Playwright/Media Fixtures/QA/Docs |
| 1068 | 2026-06-01 | Logo Cloud widget 31-05 UI audit media fixture seed | CMS Widgets/Logo Cloud/Playwright/Media Fixtures/QA/Docs |
| 1067 | 2026-06-01 | Pricing Plans widget 31-05 UI audit contract copy | CMS Widgets/Pricing Plans/Admin UX/Runtime QA/Docs |
| 1066 | 2026-06-01 | Testimonials widget 31-05 UI audit remediation | CMS Widgets/Testimonials/Runtime Sanitizer/Admin UI/QA/Docs |
| 1065 | 2026-06-01 | Stats KPI widget 31-05 UI audit UX guard | CMS Widgets/Stats KPI/Admin UX/Runtime QA/Docs |
| 1064 | 2026-06-01 | FAQ Accordion widget 31-05 UI audit remediation | CMS Widgets/FAQ Accordion/Admin Preview/Accessibility/QA/Docs |
| 1063 | 2026-06-01 | CTA Banner widget 31-05 UI audit remediation | CMS Widgets/CTA Banner/Admin UI/Runtime QA/Docs |
| 1062 | 2026-06-01 | Feature Grid widget 31-05 UI audit remediation | CMS Widgets/Feature Grid/Admin UI/QA/Docs |
| 1061 | 2026-06-01 | Hero widget 31-05 UI audit continuation and remediation | CMS Widgets/Hero/Admin UI/Runtime QA/Docs |
| 1060 | 2026-06-01 | Stack widget 31-05 UI audit remediation | CMS Widgets/Stack/Runtime Normalization/Validator/QA/Docs |
| 1059 | 2026-06-01 | Divider widget 31-05 UI audit remediation | CMS Widgets/Divider/Runtime Security/Admin UI/QA/Docs |
| 1058 | 2026-06-01 | Spacer widget 31-05 UI audit regression guard | CMS Widgets/Spacer/Runtime QA/Admin UI/Docs |
| 1057 | 2026-06-01 | Toggle Block widget 31-05 UI audit remediation | CMS Widgets/Toggle Block/Runtime Security/Admin UI/QA/Docs |
| 1056 | 2026-06-01 | Accordion widget 31-05 UI audit remediation | CMS Widgets/Accordion/Runtime Security/Admin UI/Builder Metadata/QA/Docs |
| 1055 | 2026-06-01 | Tabs widget 31-05 UI audit remediation | CMS Widgets/Tabs/Runtime Security/Admin UI/Builder Metadata/QA/Docs |
| 1054 | 2026-06-01 | Split Layout widget 31-05 UI audit remediation | CMS Widgets/Split Layout/Admin UI/Builder Metadata/QA/Docs |
| 1053 | 2026-06-01 | Grid Columns widget 31-05 UI audit remediation | CMS Widgets/Grid Columns/Admin UI/Builder Metadata/QA/Docs |
| 1052 | 2026-06-01 | Template Section widget 31-05 UI audit remediation | CMS Widgets/Template Section/Admin UI/Runtime/Security/QA/Docs |
| 1051 | 2026-06-01 | Section widget 31-05 UI audit remediation | CMS Widgets/Section/Admin UI/Runtime/Security/QA/Docs |
| 1050 | 2026-06-01 | TASK-360 Admin UI cross-cutting remediation family | Planning/Admin UI/RBAC/QA/Docs |
| 1049 | 2026-06-01 | TASK-359 Admin Settings remediation family | Planning/Admin UI/Settings/Security/Navigation/Cache/QA/Docs |
| 1048 | 2026-06-01 | TASK-358 Admin Access Logs remediation family | Planning/Admin UI/Access Logs/Security/QA/Docs |
| 1047 | 2026-06-01 | TASK-357 Admin Audit Logs remediation family | Planning/Admin UI/Audit Logs/Compliance/QA/Docs |
| 1046 | 2026-06-01 | TASK-356 Admin Roles Matrix remediation family | Planning/Admin UI/RBAC/QA/Docs |
| 1045 | 2026-06-01 | TASK-355 Admin Users remediation family | Admin UI/Users/RBAC/QA/Docs |
| 1044 | 2026-06-02 | TASK-354 Admin Tools user feedback follow-up | Admin Tools/UX/Cache/QA/Docs |
| 1043 | 2026-06-01 | TASK-354 Cross Tools remediation closure | Admin Tools/UX/Auth Bootstrap/Playwright/QA/Docs |
| 1042 | 2026-06-01 | TASK-353 Redirects tools remediation closure | Admin Tools/Redirects/Public Runtime/API/UI/QA/Docs |
| 1041 | 2026-06-01 | TASK-352 Import Export tools remediation closure | Admin Tools/Import Export/API/UI/QA/Docs |
| 1040 | 2026-06-01 | TASK-351 Backups tools remediation closure | Admin Tools/Backups/API/UI/QA/Docs |
| 1039 | 2026-06-01 | TASK-350 Analytics tools remediation closure | Admin Tools/Analytics/API/UI/QA/Docs |
| 1038 | 2026-06-01 | TASK-349 SEO Manager tools remediation closure | Admin Tools/SEO/Public Runtime/API/UI/QA/Docs |
| 1037 | 2026-06-01 | TASK-348 Search Tools remediation closure | Admin Tools/Search/API/UI/QA/Docs |
| 1036 | 2026-06-01 | TASK-348-354 Tools remediation refinement | Admin Tools/Tasks/Reports/API Docs/Security/Cache |
| 1035 | 2026-06-01 | TASK-348-354 Tools remediation planning | Admin Tools/Search/SEO/Analytics/Backups/Import Export/Redirects/Cross Tools |
| 1034 | 2026-05-31 | Admin Tools Playwright audit reports | QA/Admin UI/Playwright/Docs |
| 1033 | 2026-05-31 | Admin seed package command | Developer Tooling/Auth Bootstrap/Docs |
| 1032 | 2026-05-31 | CodeQL widget sanitizer and validation DoS remediation | Security/CodeQL/Widgets/Testing |
| 1031 | 2026-05-31 | Bun coverage WriteFailed stabilization | CI/Testing/Tooling/Docs |
| 1030 | 2026-05-31 | CI env loading for test lanes | CI/Testing/Docs |
| 1029 | 2026-05-30 | TASK-343-02 Appointment Form phone validation | CMS Widgets/Appointment Form/Admin UI/Runtime/QA/Docs |
| 1028 | 2026-05-30 | TASK-343-04 Accordion preview truthfulness | CMS Widgets/Accordion/Admin UI/Runtime/Accessibility/QA/Docs |
| 1027 | 2026-05-30 | TASK-343-05 FAQ Accordion spacing and preview truthfulness | CMS Widgets/FAQ/Admin UI/Runtime/Accessibility/QA/Docs |
| 1026 | 2026-05-30 | TASK-343-06 Booking Calendar truthfulness | CMS Widgets/Booking/Admin UI/Runtime/QA/Docs |
| 1025 | 2026-05-30 | TASK-343-08 Compare Timeline segment label size | CMS Widgets/Compare Timeline/Runtime/QA/Docs |
| 1024 | 2026-05-30 | TASK-343-11 Team truthfulness | CMS Widgets/Team/Admin UI/Runtime/Accessibility/QA/Docs |
| 1023 | 2026-05-30 | TASK-343-12 Template Section truthfulness | CMS Widgets/Template Section/Admin UI/Runtime/QA/Docs |
| 1022 | 2026-05-30 | TASK-343-13 Timeline truthfulness | CMS Widgets/Timeline/Admin UI/Runtime/QA/Docs |
| 1021 | 2026-05-30 | TASK-343-15 Navigation truthfulness | CMS Widgets/Navigation/Admin UI/Runtime/QA/Docs |
| 1020 | 2026-05-30 | TASK-343-16 Product Gallery truthfulness | CMS Widgets/Commerce/Admin UI/Runtime/Accessibility/QA/Docs |
| 1019 | 2026-05-30 | TASK-343-17 Rich Text Section truthfulness | CMS Widgets/Rich Text/Admin UI/Runtime/Security/QA/Docs |
| 1018 | 2026-05-30 | TASK-343-20 Search Box truthfulness | CMS Widgets/Search/Admin UI/Runtime/Accessibility/QA/Docs |
| 1017 | 2026-05-30 | TASK-343-22 CTA Banner truthfulness | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 1016 | 2026-05-30 | TASK-343-23 Gallery Mosaic truthfulness | CMS Widgets/Admin UI/Runtime/Accessibility/QA/Docs |
| 1015 | 2026-05-30 | TASK-343-26 Stats KPI truthfulness | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 1014 | 2026-05-30 | TASK-343-25 Pricing Plans truthfulness | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 1013 | 2026-05-30 | TASK-343-24 Logo Cloud truthfulness | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 1012 | 2026-05-30 | TASK-343-27 Tabs slot truthfulness | CMS Widgets/Admin UI/Builder/Runtime/QA/Docs |
| 1011 | 2026-05-30 | TASK-343-28 Split Layout ratio truthfulness | CMS Widgets/Admin UI/UX/QA/Docs |
| 1010 | 2026-05-30 | TASK-343-29 Entry Teaser a11y and CTA guidance | CMS Widgets/Admin UI/Runtime/Accessibility/QA/Docs |
| 1009 | 2026-05-30 | TASK-343-31 MediaPicker dialog description | CMS Widgets/Admin UI/Accessibility/QA/Docs |
| 1008 | 2026-05-30 | TASK-343-30 Shared color state truthfulness | CMS Widgets/Admin UI/QA/Docs |
| 1007 | 2026-05-30 | TASK-343-21 Shared block layout and visibility | CMS Widgets/Admin UI/Builder/Runtime/QA |
| 1006 | 2026-05-30 | TASK-343-19 Posts Feed route truthfulness | CMS Widgets/Posts/Admin UI/Runtime/QA |
| 1005 | 2026-05-30 | TASK-343-18 Listing Filters a11y and empty facets | CMS Widgets/Listings/Admin UI/Runtime/A11y/QA |
| 1004 | 2026-05-30 | TASK-343-14 Form Embed truthfulness | CMS Widgets/Forms/Admin UI/Runtime/QA |
| 1003 | 2026-05-30 | TASK-343-10 Toggle Block contrast | CMS Widgets/Admin UI/Runtime/QA |
| 1002 | 2026-05-30 | TASK-343-09 Stack responsive class maps | CMS Widgets/Runtime/Tailwind/QA |
| 1001 | 2026-05-30 | TASK-343-07 Feature Grid remediation | CMS Widgets/Admin UI/A11y/QA |
| 1000 | 2026-05-30 | TASK-343-03 Newsletter submit guard | CMS Widgets/Forms/Public UX/QA |
| 999 | 2026-05-30 | TASK-343-01 Hero remediation | CMS Widgets/Admin UI/Runtime/QA |
| 998 | 2026-05-30 | TASK-343 Claude cross-check | QA/Widgets/Docs |
| 997 | 2026-05-29 | TASK-343 code alignment audit | QA/Widgets/Docs |
| 996 | 2026-05-29 | TASK-343 shared MediaPicker routing | QA/Widgets/Admin UI/Accessibility/Docs |
| 995 | 2026-05-29 | TASK-343 report classification correction | QA/Widgets/Playwright/Docs |
| 994 | 2026-05-28 | TASK-342 widget Playwright gap closure | QA/Widgets/Playwright/Docs |
| 993 | 2026-05-28 | TASK-342 evidence reconciliation | QA/Widgets/Playwright/Docs |
| 992 | 2026-05-28 | TASK-342 commerce populated fixture wave | QA/Widgets/Commerce/Playwright |
| 991 | 2026-05-28 | TASK-342 metadata-gap admin contract wave | QA/Widgets/Admin UI/Playwright |
| 990 | 2026-05-27 | Widget current-state Playwright re-audit | QA/Widgets/Playwright/Docs |
| 989 | 2026-05-27 | Widget contract Bun expectation drift repair | QA/Widgets/Admin UI/Tooling |
| 988 | 2026-05-27 | Widget hero parity program closure | CMS Widgets/Admin UI/Docs/QA |
| 987 | 2026-05-27 | Residual widget contract truthfulness sweep | CMS Widgets/Admin UI/Contracts/QA/Docs |
| 986 | 2026-05-27 | Timeline contract truthfulness | CMS Widgets/Admin UI/Timeline/Contracts/Playwright/QA/Docs |
| 985 | 2026-05-27 | Product Compare contract truthfulness | CMS Widgets/Admin UI/Commerce/Contracts/Playwright/QA/Docs |
| 984 | 2026-05-27 | Product Gallery contract truthfulness | CMS Widgets/Admin UI/Commerce/Contracts/Playwright/QA/Docs |
| 983 | 2026-05-27 | Entry Teaser contract truthfulness | CMS Widgets/Admin UI/Content/Contracts/Playwright/QA/Docs |
| 982 | 2026-05-27 | Rich Text Section contract truthfulness | CMS Widgets/Admin UI/Editorial/Contracts/Playwright/QA/Docs |
| 981 | 2026-05-27 | Team contract truthfulness | CMS Widgets/Admin UI/Team/Contracts/Playwright/QA/Docs |
| 980 | 2026-05-27 | Gallery Mosaic contract truthfulness | CMS Widgets/Admin UI/Media/Contracts/Playwright/QA/Docs |
| 979 | 2026-05-27 | FAQ Accordion contract truthfulness | CMS Widgets/Admin UI/FAQ/Contracts/Playwright/QA/Docs |
| 978 | 2026-05-27 | Pricing Plans contract truthfulness | CMS Widgets/Admin UI/Contracts/Playwright/QA/Docs |
| 977 | 2026-05-27 | Testimonials contract truthfulness | CMS Widgets/Admin UI/Contracts/Playwright/QA/Docs |
| 976 | 2026-05-27 | CTA Banner hero section parity | CMS Widgets/Admin UI/Contracts/Playwright/QA/Docs |
| 975 | 2026-05-27 | Contact hero color parity | CMS Widgets/Admin UI/Forms/Contracts/Playwright/QA/Docs |
| 974 | 2026-05-27 | Navigation hero parity and contract truthfulness | CMS Widgets/Admin UI/Navigation/Contracts/Playwright/QA/Docs |
| 973 | 2026-05-27 | Widget daily live preview surface | CMS Widgets/Admin UI/Builder/Preview/QA/Docs |
| 972 | 2026-05-27 | Widget contract Vitest expectation drift repair | QA/Widgets/Admin UI/Tooling |
| 971 | 2026-05-27 | Spacer and Stats KPI lint typecheck repair | QA/Widgets/Admin UI/Tooling |
| 970 | 2026-05-26 | Widget UI mode drift cleanup closure | CMS Widgets/Admin UI/Contracts/Playwright/QA/Docs |
| 969 | 2026-05-26 | Raw Advanced payload and preset cleanup | CMS Widgets/Admin UI/Contracts/Playwright/QA/Docs |
| 968 | 2026-05-26 | Booking editor cleanup | CMS Widgets/Admin UI/Booking/Contracts/QA/Docs |
| 967 | 2026-05-26 | Gallery Mosaic and Team editor cleanup | CMS Widgets/Admin UI/Media/Team/Contracts/QA/Docs |
| 966 | 2026-05-26 | Commerce editor query and color cleanup | CMS Widgets/Admin UI/Commerce/Contracts/QA/Docs |
| 965 | 2026-05-26 | Logo Cloud editor drift cleanup | CMS Widgets/Admin UI/Trust/Contracts/QA/Docs |
| 964 | 2026-05-26 | Feature Grid editor drift cleanup | CMS Widgets/Admin UI/Marketing/Contracts/QA/Docs |
| 963 | 2026-05-26 | Newsletter editor drift cleanup | CMS Widgets/Admin UI/Forms/Contracts/QA/Docs |
| 962 | 2026-05-25 | FAQ Accordion editor drift cleanup | CMS Widgets/Admin UI/FAQ/Contracts/QA/Docs |
| 961 | 2026-05-25 | Form Embed editor drift cleanup | CMS Widgets/Admin UI/Forms/Contracts/QA/Docs |
| 960 | 2026-05-25 | Product Table editor drift cleanup | CMS Widgets/Admin UI/Commerce/Contracts/QA/Docs |
| 959 | 2026-05-25 | Listing Filters editor drift cleanup | CMS Widgets/Admin UI/Listings/Contracts/QA/Docs |
| 958 | 2026-05-25 | Search Box editor drift cleanup | CMS Widgets/Admin UI/Search/Contracts/QA/Docs |
| 957 | 2026-05-25 | Content List editor drift cleanup | CMS Widgets/Admin UI/Contracts/QA/Docs |
| 956 | 2026-05-25 | Stack editor drift cleanup | CMS Widgets/Admin UI/Layout/Contracts/QA/Docs |
| 955 | 2026-05-25 | Divider editor drift cleanup | CMS Widgets/Admin UI/Layout/Contracts/QA/Docs |
| 954 | 2026-05-25 | Spacer editor drift cleanup | CMS Widgets/Admin UI/Layout/Contracts/QA/Docs |
| 953 | 2026-05-25 | Accordion editor drift cleanup | CMS Widgets/Admin UI/Runtime/Contracts/QA/Docs |
| 952 | 2026-05-25 | Tabs editor drift cleanup | CMS Widgets/Admin UI/Runtime/Contracts/QA/Docs |
| 951 | 2026-05-25 | Split Layout editor ownership | CMS Widgets/Admin UI/Layout/Contracts/QA/Docs |
| 950 | 2026-05-25 | Template Section editor ownership | CMS Widgets/Admin UI/Runtime/Contracts/QA/Docs |
| 949 | 2026-05-25 | Grid Columns editor ownership | CMS Widgets/Admin UI/Contracts/QA/Docs |
| 948 | 2026-05-25 | Section editor ownership | CMS Widgets/Admin UI/Contracts/QA/Docs |
| 947 | 2026-05-25 | Testimonials editor ownership | CMS Widgets/Admin UI/Contracts/QA/Docs |
| 946 | 2026-05-25 | Entry Teaser editor ownership | CMS Widgets/Admin UI/Contracts/QA/Docs |
| 945 | 2026-05-24 | One-time widget Wizard lifecycle | CMS Widgets/Admin UI/Builder/Playwright/QA/Docs |
| 944 | 2026-05-24 | Remaining widget editor contracts | CMS Widgets/Admin UI/Contracts/Playwright/QA/Docs |
| 943 | 2026-05-24 | Widget frontend fixtures and overflow contract | CMS Widgets/Runtime/Frontend CSS/Playwright/QA/Docs |
| 942 | 2026-05-24 | Layout widget Advanced token policy | CMS Widgets/Admin UI/Layout/QA/Docs |
| 941 | 2026-05-24 | P2 widget editor ownership | CMS Widgets/Admin UI/Forms/Security/QA/Docs |
| 940 | 2026-05-24 | Stats KPI editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 939 | 2026-05-24 | Hero editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 938 | 2026-05-24 | Form Embed editor ownership | CMS Widgets/Forms/Admin UI/Security/QA/Docs |
| 937 | 2026-05-24 | Posts Feed editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 936 | 2026-05-24 | Accordion editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 935 | 2026-05-24 | Tabs editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 934 | 2026-05-24 | Listing Filters editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 933 | 2026-05-24 | Template Section and Search Box editor ownership | CMS Widgets/Admin UI/QA/Docs |
| 932 | 2026-05-23 | Widget contract Playwright smoke harness | CMS Widgets/Admin UI/Playwright/QA/Docs |
| 931 | 2026-05-23 | Widget editor DOM ownership metadata | CMS Widgets/Admin UI/QA/Docs |
| 930 | 2026-05-23 | Widget editor contract v2 foundation | CMS Widgets/Admin UI/QA/Docs |
| 929 | 2026-05-23 | Shared row-flow child shell | CMS Widgets/Layout/Runtime/QA/Docs |
| 928 | 2026-05-23 | Shared widget script dedupe and color-token truthfulness | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 927 | 2026-05-23 | Shared widget residual audit closure | CMS Widgets/Accessibility/Admin UI/QA/Docs |
| 926 | 2026-05-22 | TASK-292 toggle block widget followups | CMS Widgets/Admin UI/Runtime/Accessibility/QA/Docs |
| 925 | 2026-05-22 | TASK-291 timeline widget followup closure | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 924 | 2026-05-22 | TASK-290 testimonials widget product followups | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 923 | 2026-05-22 | TASK-289 Team widget followup closure | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 922 | 2026-05-22 | TASK-287 stats kpi widget followups | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 921 | 2026-05-22 | TASK-288 tabs widget drift hardening | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 920 | 2026-05-22 | TASK-288 tabs widget followup closure | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 919 | 2026-05-22 | TASK-286 stack widget Playwright product followups | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 918 | 2026-05-21 | TASK-284 spacer widget Playwright product followups | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 917 | 2026-05-21 | TASK-284-04 spacer horizontal orientation decision | CMS Widgets/Layout/Runtime/QA/Docs |
| 916 | 2026-05-21 | TASK-284-03 spacer named rhythm presets | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 915 | 2026-05-21 | TASK-284-02 spacer viewport and fluid lengths | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 914 | 2026-05-21 | TASK-284-01 spacer editor guidance and accessibility | CMS Widgets/Admin UI/Accessibility/QA/Docs |
| 913 | 2026-05-22 | TASK-283 section widget followup closure | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 912 | 2026-05-22 | TASK-283-05-02 section angle and overlay slider controls | CMS Widgets/Admin UI/QA/Docs |
| 911 | 2026-05-22 | TASK-326 section shared structural truthfulness | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 910 | 2026-05-22 | TASK-283-07 section region labels and structure UX | CMS Widgets/Admin UI/Builder/QA/Docs |
| 909 | 2026-05-22 | TASK-283-06 section responsive spacing | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 908 | 2026-05-21 | TASK-283-05-01 section shadow motion and surface preview | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 907 | 2026-05-21 | TASK-283-04 section presets and width guidance | CMS Widgets/Admin UI/QA/Docs |
| 906 | 2026-05-21 | TASK-283-03 section heading typography alignment and Wizard UX | CMS Widgets/Admin UI/Runtime/QA |
| 905 | 2026-05-21 | TASK-283-02 section background media and layering model | CMS Widgets/Admin UI/Runtime/QA |
| 904 | 2026-05-21 | TASK-283-01 section layout height and region flow controls | CMS Widgets/Admin UI/Runtime/QA |
| 903 | 2026-05-22 | TASK-281 product table widget closure | CMS Widgets/Admin UI/Runtime/QA/Docs |
| 902 | 2026-05-22 | TASK-281-09 product table export and currency | CMS Widgets/Admin UI/Runtime/QA |
| 901 | 2026-05-22 | TASK-281-08 product table layout variants and sticky header | CMS Widgets/Admin UI/Runtime/QA |
| 900 | 2026-05-22 | TASK-281-07 product table public controls | CMS Widgets/Admin UI/Runtime/QA |
| 899 | 2026-05-22 | TASK-281-06 product table media excerpt section header | CMS Widgets/Admin UI/Runtime/QA |
| 898 | 2026-05-21 | TASK-281-05 product table accessibility semantics | CMS Widgets/Accessibility/Runtime/QA |
| 897 | 2026-05-21 | TASK-281-04 product table links and action column | CMS Widgets/Admin UI/Runtime/QA |
| 896 | 2026-05-21 | TASK-281-03 product table status stock and row state | CMS Widgets/Admin UI/Runtime/QA |
| 895 | 2026-05-21 | TASK-281-02 product table column labels and visibility | CMS Widgets/Admin UI/Runtime/QA |
| 894 | 2026-05-21 | TASK-281-01 product table admin preview parity | CMS Widgets/Admin UI/Runtime/QA |
| 893 | 2026-05-21 | TASK-282 Rich Text Section implementation pass | CMS Widgets/Admin UI/Runtime/Accessibility/QA |
| 892 | 2026-05-21 | TASK-325 Grid Columns shared structural truthfulness | CMS Widgets/Admin UI/Runtime/QA |
| 891 | 2026-05-21 | TASK-319 newsletter responsive variant decision | CMS Widgets/Admin UI/Runtime/QA |
| 890 | 2026-05-21 | TASK-322 session expiry resilience | CMS Admin UI/Auth/Reliability |
| 889 | 2026-05-21 | TASK-322-01 admin API session classification | CMS Admin API/Auth |
| 888 | 2026-05-21 | TASK-317 widget editor live preview surface | CMS Admin UI/Builder/Preview |
| 887 | 2026-05-21 | TASK-321 shared clear undo feedback contract | CMS Admin UI/Widgets/QA |
| 886 | 2026-05-21 | TASK-318 section sticky containment contract | CMS Layout/Runtime/QA |
| 885 | 2026-05-21 | TASK-323 content list legacy pagination truthfulness | CMS Widgets/Runtime/QA |
| 884 | 2026-05-21 | TASK-320 content list shared accessibility residuals | CMS Widgets/Accessibility/Runtime/QA |
| 883 | 2026-05-19 | TASK-280 Product Gallery follow-ups and TASK-313 money parity | CMS Widgets/Admin UI/Runtime/QA |
| 882 | 2026-05-20 | TASK-279 product compare widget follow-ups | CMS Widgets/Admin UI/Runtime/QA |
| 881 | 2026-05-20 | TASK-278 pricing plans widget follow-ups | CMS Widgets/Admin UI/Runtime/QA |
| 880 | 2026-05-20 | TASK-277 posts feed widget follow-ups | CMS Widgets/Admin UI/Runtime/QA |
| 879 | 2026-05-19 | TASK-276 newsletter widget Playwright followups | CMS Widgets/Forms/Admin UI/Runtime/QA |
| 878 | 2026-05-19 | TASK-275 navigation widget followups | CMS Widgets/Admin UI/Runtime/QA |
| 877 | 2026-05-19 | TASK-274 Logo Cloud closure and validation sync | CMS Widgets/Admin UI/Runtime/QA |
| 876 | 2026-05-19 | TASK-274-05 Logo Cloud tile links and CTA | CMS Widgets/Admin UI/Runtime/QA |
| 875 | 2026-05-19 | TASK-274-04 Logo Cloud layouts and marquee | CMS Widgets/Admin UI/Runtime/QA |
| 874 | 2026-05-19 | TASK-274-03 Logo Cloud item management and reorder | CMS Widgets/Admin UI/QA |
| 873 | 2026-05-19 | TASK-274-02 Logo Cloud asset authoring and previews | CMS Widgets/Admin UI/Runtime/QA |
| 872 | 2026-05-19 | TASK-274-01 Logo Cloud header shell controls | CMS Widgets/Admin UI/Runtime/QA |
| 871 | 2026-05-19 | TASK-314 Logo Cloud shared residuals | CMS Widgets/Admin UI/Runtime/QA |
| 870 | 2026-05-20 | TASK-273 listing-filters and shared runtime wave | CMS Widgets/Admin UI/Runtime/QA |
| 869 | 2026-05-19 | TASK-272 Hero widget follow-ups | CMS Widgets/Admin UI/Runtime/QA |
| 868 | 2026-05-19 | TASK-271 Grid Columns widget follow-ups | CMS Widgets/Admin UI/Runtime/QA |
| 867 | 2026-05-19 | TASK-311 forms field model wave | CMS Forms/Runtime/Admin UI |
| 866 | 2026-05-19 | TASK-310 shared color adoption wave | CMS Widgets/Admin UI |
| 865 | 2026-05-19 | TASK-308 and TASK-309 footer owner wave | CMS Footer/Admin UI/Runtime |
| 864 | 2026-05-19 | TASK-304 Entry Teaser manual listing contract | CMS Widgets/Runtime/Admin UI |
| 863 | 2026-05-19 | TASK-293 to TASK-301 shared follow-up owners | CMS Widgets/Forms/Admin UI/Runtime |
| 862 | 2026-05-18 | TASK-257 to TASK-270 regression fixes | QA/CMS Widgets/Assistant |
| 861 | 2026-05-18 | TASK-270 Gallery Mosaic widget follow-ups | CMS Widgets/Admin UI/Runtime/QA |
| 860 | 2026-05-18 | TASK-312 Gallery Mosaic shared residuals | CMS Widgets/Admin UI/Runtime/QA |
| 847 | 2026-05-18 | TASK-269 Form Embed closure | CMS Widgets/Forms/Admin UI/QA |
| 846 | 2026-05-17 | TASK-256 follow-up drift closure | CMS Widgets/Admin UI/QA |
| 845 | 2026-05-17 | TASK-256 shared widget contract closure | CMS Widgets/Admin UI/QA |
| 844 | 2026-05-13 | Admin breadcrumbs and workspace links | CMS Content/Admin UI |
| 843 | 2026-05-12 | Detail template workspace actions | CMS Content/Admin UI |
| 842 | 2026-05-12 | Detail template field bindings | CMS Content/Admin UI |
| 841 | 2026-05-12 | Widget editor single-column control stacking | CMS Widgets/Admin UI |
| 840 | 2026-05-12 | Admin detail page schema browser-safe hashing | Admin UI/Resilience |
| 839 | 2026-05-12 | TASK-252 widget configuration closure | CMS Widgets/Admin UI/QA |
| 838 | 2026-05-11 | TASK-252 widget inspector IA | CMS Widgets/Admin UI |
| 837 | 2026-05-10 | TASK-252 widget research archive | CMS Widgets/Research |
| 836 | 2026-05-11 | TASK-190 implementation drift hardening | Assistant/Core |
| 835 | 2026-05-11 | TASK-190 live provider matrix rerun | Assistant/QA |
| 834 | 2026-05-11 | TASK-190 validation drift closure | Assistant/Core/QA |
| 833 | 2026-05-10 | TASK-190 final agent pass fixes | Assistant/Core |
| 832 | 2026-05-10 | TASK-190 legacy custom screen reuse fallback | Assistant/Core |
| 831 | 2026-05-10 | TASK-190 post-review drift fixes | Assistant/Core |
| 830 | 2026-05-10 | TASK-190 blueprint composer closure | Documentation/Assistant |
| 829 | 2026-05-10 | TASK-190 blueprint composer guide | Documentation/Assistant |
| 828 | 2026-05-10 | TASK-190 composition fixture matrix | Assistant/QA |
| 827 | 2026-05-10 | TASK-190 detail-page generic resource integration | Assistant/Core |
| 826 | 2026-05-10 | TASK-190 composition review metadata | Assistant/Core |
| 825 | 2026-05-10 | TASK-190 existing resource matcher | Assistant/Core |
| 824 | 2026-05-10 | TASK-190 collection workspace assistant context | Assistant/Core |
| 823 | 2026-05-10 | TASK-190 detail template editor surface | Assistant/Admin UI |
| 822 | 2026-05-10 | TASK-190 collection workspace cache UI shell | Assistant/Admin UI |
| 821 | 2026-05-10 | TASK-190 collection workspace canonical resolution | Assistant/Core |
| 820 | 2026-05-10 | TASK-190 collection workspace route read model | Assistant/Core |
| 819 | 2026-05-10 | TASK-190 admin bindings metadata safety | Assistant/Core |
| 818 | 2026-05-10 | TASK-190 admin screen layout composer | Assistant/Core |
| 817 | 2026-05-10 | TASK-190 detail-page fixture runtime acceptance | Assistant/QA |
| 816 | 2026-05-10 | TASK-190 detail-page admin client cache parity | Assistant/Admin Cache |
| 815 | 2026-05-10 | TASK-190 conflict media and permission closure | Assistant/Core |
| 814 | 2026-05-10 | TASK-190 docs status drift sync | Documentation/Assistant |
| 813 | 2026-05-10 | Security strict dependency advisory closure | Security/Dependencies |
| 812 | 2026-05-09 | TASK-190 detail-page route contract hardening | Assistant/Core |
| 811 | 2026-05-09 | Test runner and wave act stabilization | QA/Tooling |
| 810 | 2026-05-08 | TASK-190 detail-page revision routes | Assistant/Core |
| 809 | 2026-05-08 | TASK-190 drift pass runtime and cache verification | Assistant/Core |
| 808 | 2026-05-08 | TASK-190 detail-page drift hardening | Assistant/Core |
| 807 | 2026-05-08 | TASK-190 detail-page lifecycle routes | Assistant/Core |
| 806 | 2026-05-08 | TASK-190 detail-page CRUD and read routes | Assistant/Core |
| 805 | 2026-05-08 | TASK-190 detail-page action adapter | Assistant/Core |
| 804 | 2026-05-08 | TASK-190 detail-page preview and cache invalidation | Assistant/Core |
| 803 | 2026-05-08 | TASK-190 detail-page runtime route rendering | Assistant/Core |
| 802 | 2026-05-08 | TASK-190 detailPageId content-route round-trip | Assistant/Core |
| 801 | 2026-05-08 | TASK-190 detail page binding resolver | Assistant/Core |
| 800 | 2026-05-07 | TASK-190 provider sanitization and collection-link conflict closure | Assistant/Core |
| 799 | 2026-05-07 | TASK-190 planner boundary and page collection drift fixes | Assistant/Core |
| 798 | 2026-05-07 | TASK-190 detail page model and schema contract | Assistant/Core |
| 797 | 2026-05-07 | TASK-190 page upsert composition adapter | Assistant/Core |
| 796 | 2026-05-07 | TASK-190 post-review drift fixes | Assistant/Core |
| 795 | 2026-05-07 | TASK-190 page section library slice | Assistant/Core |
| 794 | 2026-05-07 | TASK-190 listing facet and card merge slice | Assistant/Core |
| 793 | 2026-05-07 | TASK-190 content schema merge slice | Assistant/Core |
| 792 | 2026-05-06 | TASK-190 conflict needs-input slice | Assistant/Core |
| 791 | 2026-05-06 | TASK-190 provider and shadow diagnostics slice | Assistant/Core |
| 790 | 2026-05-05 | TASK-190 blueprint composer foundation slice 1 | Assistant/Core |
| 789 | 2026-05-04 | Manual git hooks setup and Docker-safe install | Developer Tooling |
| 788 | 2026-05-03 | TASK-251 custom screens builder hardening | CMS Custom Screens/Admin UI |
| 787 | 2026-05-02 | TASK-250 custom screens screen widget parity | CMS Custom Screens/Admin UI |
| 786 | 2026-05-02 | TASK-157 integrations follow-up coverage and reset hardening | Docs/Admin UI/QA |
| 785 | 2026-05-01 | TASK-249 custom screens workspace V3 | CMS Custom Screens/Admin UI |
| 784 | 2026-05-01 | Custom Screens read-path definition fallback | CMS Custom Screens/Resilience |
| 783 | 2026-05-01 | TASK-248 custom screens runtime contract follow-up | CMS Custom Screens/Admin UI |
| 782 | 2026-05-01 | TASK-248 custom screens workspace builder V2 | CMS Custom Screens/Admin UI |
| 781 | 2026-04-30 | TASK-244 widget surface clear controls | CMS Widgets/Admin UI |
| 780 | 2026-04-30 | TASK-247 media always-on selection and upload copy | CMS Media/Admin UI |
| 779 | 2026-04-30 | TASK-246 menus drop intent and indicator stability | CMS Menus/Admin UI |
| 778 | 2026-04-30 | TASK-245 menus drag handle hit target | CMS Menus/Admin UI |
| 777 | 2026-04-29 | TASK-243 menus editor action, location, and drag parity | CMS Menus/Admin UI |
| 776 | 2026-04-29 | TASK-242 widget style none tokens | CMS Widgets/Admin UI |
| 775 | 2026-04-29 | Menus editor detail cache hydration | CMS Menus/Admin Cache |
| 774 | 2026-04-29 | TASK-241 pages published preview draft sync | CMS Pages/Admin UI |
| 773 | 2026-04-29 | Markdown pre-commit format guard | Developer Tooling |
| 772 | 2026-04-29 | TASK-054 modular admin IA closure and portal/i18n split | Documentation/Planning |
| 771 | 2026-04-29 | TASK-220 ESLint 9 React Hooks Compiler cleanup | Tooling/Admin UI |
| 770 | 2026-04-29 | TASK-238 GitHub CodeQL security findings remediation | Security/CodeQL |
| 769 | 2026-04-29 | Pre-commit formatting and lint hook | Developer Tooling |
| 768 | 2026-04-29 | TASK-237 GHCR Docker image lowercase tag normalization | Release Engineering/CI |
| 767 | 2026-04-28 | TASK-236 semantic release Node runtime pin | Release Engineering/CI |
| 766 | 2026-04-28 | TASK-235 security gate Gitleaks Action v2 contract | CI/CD Security |
| 765 | 2026-04-28 | TASK-234 security gate Trivy SARIF and blocking output | CI/CD Security |
| 764 | 2026-04-28 | TASK-233 root README marketing and agents index | Documentation/Branding |
| 763 | 2026-04-28 | TASK-232 reliability gate slow DB timeout hardening | CI/CD Reliability |
| 762 | 2026-04-28 | TASK-231 CI security and release gate fixes | CI/CD Security |
| 761 | 2026-04-28 | TASK-230 Bun testing lane workflow contract | CI/CD Testing |
| 760 | 2026-04-28 | TASK-229 Coderso release gates optional DB checks | CI/CD Release Gates |
| 759 | 2026-04-28 | TASK-228 security gate Trivy Action pin repair | CI/CD Security |
| 758 | 2026-04-28 | TASK-227 semantic release GitHub App authentication | Release Engineering/CI Security |
| 757 | 2026-04-28 | TASK-226 Coderso rebrand and Advanced admin IA | Branding/Admin IA |
| 756 | 2026-04-27 | TASK-225 page editor status badge and action locking | CMS Pages/Admin UI |
| 755 | 2026-04-27 | TASK-224 page editor preview action consolidation | CMS Pages/Admin UI |
| 754 | 2026-04-27 | TASK-223 semantic release and Docker workflow | Release Engineering/CI |
| 753 | 2026-04-27 | TASK-222 public homepage runtime settings route | Site Runtime/CMS Pages |
| 752 | 2026-04-27 | TASK-221 entries metadata panel scroll containment | CMS Entries/Admin UI |
| 751 | 2026-04-27 | TASK-219 dependency CVE remediation | Security/Dependencies |
| 750 | 2026-04-27 | TASK-218 post editor polish | CMS Posts/Admin UI |
| 749 | 2026-04-27 | TASK-217 security scan baseline hardening | Security/Tooling |
| 748 | 2026-04-26 | TASK-216 commerce catalog list parity | CMS Commerce/Admin UI |
| 747 | 2026-04-26 | TASK-215 widgets Pages-style library parity | CMS Widgets/Admin UI |
| 746 | 2026-04-26 | TASK-214 listings tabbed list parity | CMS Listings/Admin UI |
| 745 | 2026-04-26 | TASK-213 widget library QA followups | CMS Widgets/Admin UI |
| 744 | 2026-04-26 | TASK-212 posts editor media followups | CMS Posts/Admin UI |
| 743 | 2026-04-26 | TASK-210 forms list parity | CMS Forms/Admin UI |
| 742 | 2026-04-25 | TASK-211 pages editor UX followups | CMS Pages/Admin UI |
| 740 | 2026-04-25 | TASK-209 custom screens list parity | CMS Custom Screens/Admin UI |
| 739 | 2026-04-25 | Pages CSRF token refresh | Security/Admin API |
| 738 | 2026-04-24 | TASK-208 admin list action toasts | Admin UI/CMS Lists |
| 737 | 2026-04-24 | TASK-207 entries list parity | CMS Entries/Admin UI |
| 736 | 2026-04-24 | TASK-206 media cache lifecycle | CMS Media/Admin Cache |
| 735 | 2026-04-24 | TASK-205 admin list popup parity | CMS Engine/Admin UI |
| 734 | 2026-04-24 | Posts metadata date-time validation | CMS Posts/Validation |
| 733 | 2026-04-24 | Posts tag and category metadata save | CMS Posts/Metadata |
| 732 | 2026-04-24 | Posts taxonomy slug resolution | CMS Posts/Taxonomy |
| 731 | 2026-04-23 | TASK-203 entries admin QA metadata rich text editor UX | QA/CMS Entries |
| 730 | 2026-04-23 | TASK-202 engine admin QA recovery | CMS Engine/Admin UI |
| 729 | 2026-04-23 | TASK-201 media library QA recovery | CMS Media/Admin UI |
| 728 | 2026-04-23 | TASK-204 posts QA follow-up closure | QA/CMS Posts |
| 727 | 2026-04-23 | TASK-200 menus list parity | CMS Menus/Admin UI |
| 726 | 2026-04-23 | TASK-199 posts list header bulk actions | CMS Posts/Admin UI |
| 725 | 2026-04-23 | TASK-198 page list header bulk actions | CMS Pages/Admin UI |
| 724 | 2026-04-23 | TASK-197 pages builder library scroll containment | CMS Pages/Admin UI |
| 723 | 2026-04-22 | TASK-194 pages admin UX reliability and polish | CMS Pages/Admin UI |
| 722 | 2026-04-22 | TASK-195 posts admin QA recovery | QA/CMS Posts |
| 721 | 2026-04-22 | TASK-196 menus list-first editor and UX closure | Admin/UI |
| 720 | 2026-04-21 | TASK-193 pages bun route timeout stabilization | QA/CMS Pages |
| 719 | 2026-04-20 | TASK-192 assistant admin resource catalog repair | Assistant/Core |
| 718 | 2026-04-20 | TASK-191 pages coverage closure | QA/CMS Pages |
| 717 | 2026-04-20 | TASK-191-04 page builder branch coverage | QA/Page Builder |
| 716 | 2026-04-20 | TASK-191-03 pages client cache coverage | QA/Admin Pages |
| 715 | 2026-04-20 | TASK-191-02 public page runtime coverage | QA/Runtime Pages |
| 714 | 2026-04-20 | TASK-191-01 pages route coverage | QA/CMS Pages |
| 713 | 2026-04-20 | TASK-189-05 live regression fixes | Assistant/Core |
| 712 | 2026-04-19 | TASK-189-05 final policy planner hardening | Assistant/Core |
| 711 | 2026-04-19 | TASK-189 policy remediation closure | Assistant/Core |
| 710 | 2026-04-19 | TASK-189-04 docs tests closure | Docs/QA |
| 709 | 2026-04-19 | TASK-189-03 planner heuristic removal | Assistant/Core |
| 708 | 2026-04-19 | TASK-189-02 policy resource identity | Assistant/Core |
| 707 | 2026-04-19 | TASK-189-01 provider action array removal | Assistant/Core |
| 706 | 2026-04-19 | TASK-188 policy engine closure | Assistant/Core |
| 705 | 2026-04-19 | TASK-188-10 policy closure docs | Docs/QA |
| 704 | 2026-04-19 | TASK-188-09 policy cutover | Assistant/Core |
| 703 | 2026-04-19 | TASK-188-08 LangGraph evaluation | Assistant/Architecture |
| 702 | 2026-04-19 | TASK-188-07 coverage policy | Assistant/QA |
| 701 | 2026-04-19 | TASK-188-06 follow up policy | Assistant/Core |
| 700 | 2026-04-19 | TASK-188-05 action mapping safety policy | Assistant/Core |
| 699 | 2026-04-19 | TASK-188-04 resolver filtering from policy | Assistant/Core |
| 698 | 2026-04-19 | TASK-188-03 provider guidance from policy | Assistant/Provider |
| 697 | 2026-04-19 | TASK-188-02 policy migration closure | Assistant/Core |
| 696 | 2026-04-19 | TASK-188-02-04 coderso planned gated policy | Assistant/Core |
| 695 | 2026-04-19 | TASK-188-02-03 admin settings security tools policy | Assistant/Core |
| 694 | 2026-04-19 | TASK-188-02-02 content screens widgets media policy | Assistant/Core |
| 693 | 2026-04-19 | TASK-188-02-01 pages forms listings policy | Assistant/Core |
| 692 | 2026-04-18 | TASK-188-01 policy schema | Assistant/Core |
| 691 | 2026-04-18 | TASK-187 assistant filtered all delete and je follow-up | Assistant/Core |
| 690 | 2026-04-18 | TASK-186 assistant follow-up all candidates delete | Assistant/Core |
| 689 | 2026-04-18 | TASK-185 assistant read-only status question guard | Assistant/Core |
| 688 | 2026-04-18 | TASK-184 live CMS matrix closure | Assistant/QA |
| 687 | 2026-04-18 | TASK-184-16 live coverage map | Assistant/QA |
| 686 | 2026-04-18 | TASK-184-15 settings live matrix | Assistant/QA |
| 685 | 2026-04-18 | TASK-184-14 admin security live matrix | Assistant/QA |
| 684 | 2026-04-18 | TASK-184-13 tools safety live matrix | Assistant/QA |
| 683 | 2026-04-18 | TASK-184-12 store themes dashboard analytics live matrix | Assistant/QA |
| 682 | 2026-04-18 | TASK-184-11 coderso operations live matrix | Assistant/QA |
| 681 | 2026-04-18 | TASK-184-10 posts media search live matrix | Assistant/QA |
| 680 | 2026-04-18 | TASK-184-09 bulk follow-up safety live matrix | Assistant/QA |
| 679 | 2026-04-18 | TASK-184-08 menus seo media live matrix | Assistant/QA |
| 678 | 2026-04-18 | TASK-184-07 widget templates live matrix | Assistant/QA |
| 677 | 2026-04-18 | TASK-184-06 listings live matrix | Assistant/QA |
| 676 | 2026-04-18 | TASK-184-05 forms live matrix | Assistant/QA |
| 675 | 2026-04-18 | TASK-184-04 custom screens live matrix | Assistant/QA |
| 674 | 2026-04-18 | TASK-184-03 content types entries live matrix | Assistant/QA |
| 673 | 2026-04-18 | TASK-184-02 pages live matrix | Assistant/QA |
| 672 | 2026-04-18 | TASK-184-01 live CMS matrix harness | Assistant/QA |
| 671 | 2026-04-18 | TASK-183 assistant page title search filtering | Assistant/Core |
| 670 | 2026-04-18 | TASK-182 assistant chat mode control removal | Admin/UI |
| 669 | 2026-04-18 | TASK-181 assistant follow-up target selection | Assistant/Core |
| 668 | 2026-04-18 | TASK-180 assistant CMS bulk cache consistency | Assistant/Admin UI |
| 667 | 2026-04-17 | TASK-179 follow-up page cache and restore | Assistant/Admin UI |
| 666 | 2026-04-17 | TASK-179 surface hints inspection closure | Docs/Assistant |
| 665 | 2026-04-17 | TASK-179 conversation persistence | Admin/UI |
| 664 | 2026-04-17 | TASK-179 assistant cache refresh | Admin/UI |
| 663 | 2026-04-17 | TASK-179 natural prompt live matrix | Assistant/QA |
| 662 | 2026-04-17 | TASK-179 inspection UI copy | Admin/UI |
| 661 | 2026-04-17 | TASK-179 provider surface hints and filters | Assistant/Core |
| 660 | 2026-04-17 | TASK-179 surface hint filter contract | Assistant/Core |
| 659 | 2026-04-17 | TASK-178 generic CMS reasoning closure | Docs/Assistant |
| 658 | 2026-04-17 | TASK-178 evaluation fixture matrix | Assistant/QA |
| 657 | 2026-04-17 | TASK-178 model capability structured output | Assistant/Core |
| 656 | 2026-04-17 | TASK-178 OpenRouter live planner smoke | Assistant/QA |
| 655 | 2026-04-17 | TASK-178 conversation target memory | Assistant/Core |
| 654 | 2026-04-17 | TASK-178 generic mutation mapping | Assistant/Core |
| 653 | 2026-04-17 | TASK-178 provider response kinds and safety | Assistant/Core |
| 652 | 2026-04-16 | TASK-178 model-first planning route | Assistant/Core |
| 651 | 2026-04-16 | TASK-178 generic CMS planner foundation | Assistant/Core |
| 650 | 2026-04-15 | TASK-177 Vitest happy-dom cleanup | QA/Test Infrastructure |
| 649 | 2026-04-14 | TASK-176 scanner strict mode and closure | Security/Tooling |
| 648 | 2026-04-14 | TASK-176-05 runtime dependency CVE upgrades | Security/Dependencies |
| 647 | 2026-04-14 | TASK-176-04 CORS origin hardening | Security/Server |
| 646 | 2026-04-14 | TASK-176-03 post HTML rendering sanitization | Security/Posts |
| 645 | 2026-04-14 | TASK-176-02 AES-GCM tag length hardening | Security/Crypto |
| 644 | 2026-04-14 | TASK-176-01 Dockerfile non-root runtime user | Security/Runtime |
| 643 | 2026-04-14 | Trivy scanner source scope | Security/Tooling |
| 642 | 2026-04-14 | TASK-174 resource operations closure | QA/Assistant |
| 641 | 2026-04-14 | TASK-174-06-01 resource operation review UI states | Admin/UI |
| 640 | 2026-04-14 | TASK-174-05-02 page template target resolution | Assistant/Core |
| 639 | 2026-04-14 | TASK-174-05-01 template section reference inspection | Assistant/Core |
| 638 | 2026-04-14 | TASK-174-04-05 domain resource edit actions | Assistant/Core |
| 637 | 2026-04-14 | TASK-174-04-04 custom screen edit actions | Assistant/Core |
| 636 | 2026-04-14 | TASK-174-04-03 widget template edit actions | Assistant/Core |
| 635 | 2026-04-14 | TASK-174-04-02 page widget patch action | Assistant/Core |
| 634 | 2026-04-14 | TASK-174-04-01 page update action | Assistant/Core |
| 633 | 2026-04-14 | TASK-174-03-07 menu SEO delete actions | Assistant/Core |
| 632 | 2026-04-14 | TASK-174-03-06 form delete archive actions | Assistant/Core |
| 631 | 2026-04-13 | TASK-174-03-05 listing delete actions | Assistant/Core |
| 630 | 2026-04-13 | TASK-174-03-04 content and entry delete actions | Assistant/Core |
| 629 | 2026-04-13 | TASK-174-03-03 widget template delete action | Assistant/Core |
| 628 | 2026-04-13 | TASK-174-03-02 page delete action | Assistant/Core |
| 627 | 2026-04-13 | TASK-174-02-04 active surface hydration and redaction | Assistant/Core |
| 626 | 2026-04-13 | TASK-174-02-03 active custom screen context | Assistant/Admin |
| 625 | 2026-04-13 | TASK-174-02-02 active widget template context | Assistant/Admin |
| 624 | 2026-04-13 | TASK-174-02-01 active page canvas context | Assistant/Admin |
| 623 | 2026-04-12 | TASK-174-03-01 custom screen delete action | Assistant/Core |
| 622 | 2026-04-12 | TASK-175 solution kit screens and module focus convergence | Admin/IA |
| 621 | 2026-04-12 | TASK-174-01 assistant undo manifest persistence | Assistant/Core |
| 620 | 2026-04-12 | TASK-173 LLM Guide production readiness closure | Docs/Assistant |
| 619 | 2026-04-12 | TASK-173-05 assistant action metrics | Assistant/Core |
| 618 | 2026-04-12 | TASK-173-04 security performance gate revalidation | QA/Security |
| 617 | 2026-04-12 | TASK-173-03 idempotency replay diagnostics | Assistant/Core |
| 616 | 2026-04-12 | TASK-173-02 partial success recovery UI | Admin/UI |
| 615 | 2026-04-12 | TASK-173-01 LLM Guide acceptance matrix | QA/Assistant |
| 614 | 2026-04-12 | TASK-172 business blueprint packs closure | Assistant/Product |
| 613 | 2026-04-12 | TASK-172-07 gated solution-kit refinements | Assistant/Product |
| 612 | 2026-04-12 | TASK-172-06 editorial content hub pack | Assistant/Product |
| 611 | 2026-04-12 | TASK-172-05 portfolio case study pack | Assistant/Product |
| 610 | 2026-04-12 | TASK-172-04 product inquiry catalog pack | Assistant/Product |
| 609 | 2026-04-12 | TASK-172-03 gated booking service pack | Assistant/Product |
| 608 | 2026-04-12 | TASK-172-02 lead capture site pack | Assistant/Product |
| 607 | 2026-04-12 | TASK-172-01 shared business blueprint pack contract | Assistant/Product |
| 606 | 2026-04-12 | TASK-171 provider planner intelligence closure | Assistant/Core |
| 605 | 2026-04-12 | TASK-171-04 provider planner explanation metadata | Assistant/UI |
| 604 | 2026-04-12 | TASK-171-03 provider draft schema repair | Assistant/Core |
| 603 | 2026-04-12 | TASK-171-02 provider draft execution helper | Assistant/Core |
| 602 | 2026-04-12 | TASK-171-01 provider planning prompt package | Assistant/Core |
| 601 | 2026-04-12 | TASK-170 action family expansion closure | Assistant/Core |
| 600 | 2026-04-12 | TASK-170-04 assistant action review UI labels | Admin/UI |
| 599 | 2026-04-12 | TASK-170-03 executor adapter closure | Assistant/Core |
| 598 | 2026-04-12 | TASK-170-03-03 form page listing patch adapter closure | Assistant/Core |
| 597 | 2026-04-12 | TASK-170-03-03-04 form automation action executor | Assistant/Core |
| 596 | 2026-04-12 | TASK-170-03-03-03 page widget patch action executor | Assistant/Core |
| 595 | 2026-04-12 | TASK-170-03-03-02 listing template card action executor | Assistant/Core |
| 594 | 2026-04-12 | TASK-170-03-03-01 listing query filters action executor | Assistant/Core |
| 593 | 2026-04-12 | TASK-170-03-02 media reference action and adapter closure | Assistant/Core |
| 592 | 2026-04-12 | TASK-170-03-02-02 SEO document action executor | Assistant/Core |
| 591 | 2026-04-12 | TASK-170-03-02-01 menu item action executor | Assistant/Core |
| 590 | 2026-04-12 | TASK-170-03-01 entry draft action executor | Assistant/Core |
| 589 | 2026-04-12 | TASK-170-02 preview metadata expansion | Assistant/Core |
| 588 | 2026-04-12 | TASK-170-01 action family contracts | Assistant/Core |
| 587 | 2026-04-12 | OpenRouter API key settings link | Admin/UI |
| 586 | 2026-04-12 | TASK-101-09-01 canonical LLM Guide mode | Assistant/Core |
| 585 | 2026-04-12 | TASK-101-09-04 action registry and idempotency | Assistant/Core |
| 584 | 2026-04-12 | TASK-101-09-04 execution pipeline replan | Docs/Planning |
| 583 | 2026-04-12 | TASK-101-09-03 planner strict schema | Assistant/Core |
| 582 | 2026-04-12 | TASK-101-09-02-01 runtime context snapshot | Assistant/Core |
| 581 | 2026-04-11 | TASK-101-09-02-02 resource catalog context | Assistant/Core |
| 580 | 2026-04-11 | TASK-101-09-01-03 single LLM Guide site-kit flow | Assistant/Core |
| 579 | 2026-04-11 | TASK-101-09 site-builder convergence plan | Docs/Planning |
| 578 | 2026-04-11 | TASK-101-09 board audit and status cleanup | Docs/Planning |
| 577 | 2026-04-11 | TASK-101-09-07-04 state-aware refinement closure | Assistant/Product |
| 576 | 2026-04-10 | TASK-101-09-07-04 inquiry form refinement slice | Assistant/Product |
| 575 | 2026-04-10 | TASK-101-09-07-04 house-projects filter refinement slice | Assistant/Product |
| 574 | 2026-04-10 | TASK-101-09-07-03 multi-family llm-guide presets | Assistant/Product |
| 573 | 2026-04-10 | TASK-101-09-07-02 generic catalog blueprint engine | Assistant/Core |
| 572 | 2026-04-10 | TASK-101-09-07-01 intent family classification and routing | Assistant/Core |
| 571 | 2026-04-10 | TASK-101-09 second-wave tests and generic planning follow-up | QA/Assistant |
| 570 | 2026-04-10 | TASK-101-09 llm-guide house projects catalog flow | Assistant/Product |
| 569 | 2026-03-22 | TASK-169 assistant widget template medium and decision guide polish | Docs/Assistant |
| 568 | 2026-03-22 | TASK-168 assistant widget template medium-detail polish | Docs/Assistant |
| 567 | 2026-03-22 | TASK-167 assistant guide-mode follow-up specificity | Assistant/Product |
| 566 | 2026-03-22 | TASK-166 assistant widgets hero color guidance recovery | Docs/Assistant |
| 565 | 2026-03-22 | TASK-165 assistant reindex deletes removed DB docs | Assistant/Core |
| 564 | 2026-03-22 | TASK-164 assistant coderso split reference cleanup | Docs/Assistant |
| 563 | 2026-03-22 | TASK-163 historical assistant task reference cleanup | Docs/Assistant |
| 562 | 2026-03-22 | TASK-162 obsolete combined assistant screen docs cleanup | Docs/Assistant |
| 561 | 2026-03-22 | TASK-161 authentication and account recovery admin UI assistant documentation refresh | Docs/Assistant |
| 560 | 2026-03-22 | TASK-160 dashboard admin UI assistant documentation refresh | Docs/Assistant |
| 559 | 2026-03-22 | TASK-159 roles matrix admin UI assistant documentation refresh | Docs/Assistant |
| 558 | 2026-03-22 | TASK-158 users admin UI assistant documentation refresh | Docs/Assistant |
| 557 | 2026-03-22 | TASK-157 integrations admin UI assistant documentation refresh | Docs/Assistant |
| 556 | 2026-03-22 | TASK-156 storage settings admin UI assistant documentation refresh | Docs/Assistant |
| 555 | 2026-03-22 | TASK-155 email settings admin UI assistant documentation refresh | Docs/Assistant |
| 554 | 2026-03-22 | TASK-154 webhooks admin UI assistant documentation refresh | Docs/Assistant |
| 553 | 2026-03-22 | TASK-153 api keys admin UI assistant documentation refresh | Docs/Assistant |
| 552 | 2026-03-22 | TASK-152 login alerts admin UI assistant documentation refresh | Docs/Assistant |
| 551 | 2026-03-22 | TASK-151 sessions admin UI assistant documentation refresh | Docs/Assistant |
| 550 | 2026-03-22 | TASK-150 ip allowlist admin UI assistant documentation refresh | Docs/Assistant |
| 549 | 2026-03-22 | TASK-149 security settings admin UI assistant documentation refresh | Docs/Assistant |
| 548 | 2026-03-22 | TASK-148 assistant settings admin UI assistant documentation refresh | Docs/Assistant |
| 547 | 2026-03-22 | TASK-147 site settings admin UI assistant documentation refresh | Docs/Assistant |
| 546 | 2026-03-22 | TASK-146 general settings admin UI assistant documentation refresh | Docs/Assistant |
| 545 | 2026-03-22 | TASK-134 popups admin UI assistant documentation refresh | Docs/Assistant |
| 544 | 2026-03-22 | TASK-133 commerce admin UI assistant documentation refresh | Docs/Assistant |
| 543 | 2026-03-22 | TASK-145 access logs admin UI assistant documentation refresh | Docs/Assistant |
| 542 | 2026-03-22 | TASK-144 import export admin UI assistant documentation refresh | Docs/Assistant |
| 541 | 2026-03-22 | TASK-143 backups admin UI assistant documentation refresh | Docs/Assistant |
| 540 | 2026-03-22 | TASK-142 audit logs admin UI assistant documentation refresh | Docs/Assistant |
| 539 | 2026-03-22 | TASK-141 analytics admin UI assistant documentation refresh | Docs/Assistant |
| 538 | 2026-03-22 | TASK-140 redirects admin UI assistant documentation refresh | Docs/Assistant |
| 537 | 2026-03-22 | TASK-139 seo manager admin UI assistant documentation refresh | Docs/Assistant |
| 536 | 2026-03-22 | TASK-138 search admin UI assistant documentation refresh | Docs/Assistant |
| 535 | 2026-03-22 | TASK-137 admin UI theme assistant documentation refresh | Docs/Assistant |
| 534 | 2026-03-22 | TASK-136 plugin store admin UI assistant documentation refresh | Docs/Assistant |
| 533 | 2026-03-22 | TASK-135 solution kits admin UI assistant documentation refresh | Docs/Assistant |
| 532 | 2026-03-22 | TASK-132 reviews admin UI assistant documentation refresh | Docs/Assistant |
| 531 | 2026-03-22 | TASK-131 booking admin UI assistant documentation refresh | Docs/Assistant |
| 530 | 2026-03-22 | TASK-130 filters and search admin UI assistant documentation refresh | Docs/Assistant |
| 529 | 2026-03-22 | TASK-129 listings admin UI assistant documentation refresh | Docs/Assistant |
| 528 | 2026-03-22 | TASK-128 forms admin UI assistant documentation refresh | Docs/Assistant |
| 527 | 2026-03-22 | TASK-127 widgets admin UI assistant documentation refresh | Docs/Assistant |
| 526 | 2026-03-22 | TASK-126 custom screens admin UI assistant documentation refresh | Docs/Assistant |
| 525 | 2026-03-22 | TASK-125 entries admin UI assistant documentation refresh | Docs/Assistant |
| 524 | 2026-03-21 | TASK-124 engine admin UI assistant documentation refresh | Docs/Assistant |
| 523 | 2026-03-21 | TASK-123 media admin UI assistant documentation refresh | Docs/Assistant |
| 522 | 2026-03-21 | TASK-122 menus admin UI assistant documentation refresh | Docs/Assistant |
| 521 | 2026-03-21 | TASK-121 posts admin UI assistant documentation refresh | Docs/Assistant |
| 520 | 2026-03-21 | TASK-120 pages admin UI assistant documentation refresh | Docs/Assistant |
| 519 | 2026-03-21 | TASK-119 assistant multi-level docs and progressive follow-up flow | Assistant/Docs |
| 518 | 2026-03-21 | TASK-118 assistant surface labels procedural guidance and corpus specificity follow-up | Assistant/Product |
| 517 | 2026-03-21 | TASK-117 assistant clarifying questions and section-aware docs answers | Assistant/Product |
| 516 | 2026-03-21 | TASK-115 ranking hardening and docs-only answer formatting | Assistant/Product |
| 515 | 2026-03-20 | TASK-116 assistant answer from chunk content | Assistant/Core |
| 514 | 2026-03-20 | TASK-115 assistant content-first answer composer | Assistant/Product |
| 513 | 2026-03-20 | TASK-114 assistant DB-only enforcement | Assistant/Core |
| 512 | 2026-03-20 | TASK-113 assistant transcript scroll containment | Admin/UI |
| 511 | 2026-03-20 | TASK-112 assistant conversation window overflow and width handling | Admin/UI |
| 510 | 2026-03-20 | TASK-111 assistant reindex action decoupled from save | Admin/UI |
| 509 | 2026-03-20 | TASK-110 assistant settings run reindex action | Admin/UI |
| 508 | 2026-03-20 | TASK-109 official assistant docs corpus and DB seeding | Docs/Assistant |
| 507 | 2026-03-20 | TASK-108 anchored assistant window and launcher visual polish | Admin/UI |
| 506 | 2026-03-20 | TASK-107 floating assistant launcher and minimal chat window | Admin/UI |
| 505 | 2026-03-20 | TASK-106 assistant drawer runtime UX and configuration separation | Admin/UI |
| 504 | 2026-03-19 | TASK-054-30 solution kits module audit and sidebar gating | Admin/UI |
| 503 | 2026-03-19 | TASK-054-29 widget template builder toolbar and mobile panel UX fixes | Admin/UI |
| 502 | 2026-03-19 | TASK-054-28 widget template builder settings details and canvas action parity | Admin/UI |
| 501 | 2026-03-19 | TASK-054-27 custom screen builder canvas action parity | Admin/UI |
| 500 | 2026-03-19 | TASK-054-26 widget library CTA clarity and template-only authoring | Admin/UI |
| 499 | 2026-03-19 | TASK-054-25 widget library default tab and count alignment | Admin/UI |
| 498 | 2026-03-19 | TASK-054-24 widget template builder card parity | Admin/UI |
| 497 | 2026-03-18 | TASK-054-23 Coderso screens surface split and preview recovery | Admin/UI |
| 496 | 2026-03-13 | TASK-105 footer sparse empty-state coverage | QA/Platform |
| 495 | 2026-03-13 | TASK-105 feature grid sparse default coverage | QA/Platform |
| 494 | 2026-03-15 | TASK-105 users roles shell and theme closure follow-up | QA/Platform |
| 493 | 2026-03-15 | TASK-105 theme and users roles follow-up coverage | QA/Platform |
| 492 | 2026-03-15 | TASK-105 low-line admin editor follow-up | QA/Platform |
| 491 | 2026-03-15 | TASK-105 theme drawer and user details follow-up coverage | QA/Platform |
| 490 | 2026-03-15 | TASK-105 audit table coverage follow-up | QA/Platform |
| 489 | 2026-03-15 | TASK-105 booking leaf interaction follow-up coverage | QA/Platform |
| 488 | 2026-03-15 | TASK-105 booking services tab fallback coverage | QA/Platform |
| 487 | 2026-03-14 | TASK-105 form canvas and theme drawer follow-up coverage | QA/Platform |
| 486 | 2026-03-14 | TASK-105 page editor and listings list follow-up coverage | QA/Platform |
| 485 | 2026-03-14 | TASK-105 adapter paste and typography branch follow-up | QA/Platform |
| 484 | 2026-03-14 | TASK-105 hook helper follow-up coverage | QA/Platform |
| 483 | 2026-03-14 | TASK-105 shell state and canvas branch hardening | QA/Platform |
| 482 | 2026-03-14 | TASK-105 editor canvas follow-up and coverage wrapper stabilization | QA/Platform |
| 481 | 2026-03-14 | TASK-105 page editor state and editor chrome input follow-up | QA/Platform |
| 480 | 2026-03-14 | TASK-105 page editor reorder and shell-error follow-up | QA/Platform |
| 479 | 2026-03-14 | TASK-105 editor chrome micro follow-up coverage | QA/Platform |
| 478 | 2026-03-14 | TASK-105 page editor and adapter micro follow-up | QA/Platform |
| 477 | 2026-03-14 | TASK-105 page settings and adapter follow-up coverage | QA/Platform |
| 476 | 2026-03-14 | TASK-105 page leafs sidebar and editor chrome coverage | QA/Platform |
| 475 | 2026-03-14 | TASK-105 deeper editor shell and canvas follow-up coverage | QA/Platform |
| 474 | 2026-03-14 | TASK-105 editor and admin follow-up coverage | QA/Platform |
| 473 | 2026-03-13 | TASK-105 navigation sparse default coverage | QA/Platform |
| 472 | 2026-03-13 | TASK-105 post editor layout hook coverage | QA/Platform |
| 471 | 2026-03-13 | TASK-105 post list view panel dnd coverage | QA/Platform |
| 470 | 2026-03-13 | TASK-105 post richtext command engine DOM coverage | QA/Platform |
| 469 | 2026-03-13 | TASK-105 widget picker direct coverage | QA/Platform |
| 468 | 2026-03-13 | TASK-105 wizard panel direct coverage | QA/Platform |
| 467 | 2026-03-13 | TASK-105 post details sidebar direct coverage | QA/Platform |
| 466 | 2026-03-13 | TASK-105 logo cloud sparse default coverage | QA/Platform |
| 465 | 2026-03-13 | TASK-105 contact sparse default coverage | QA/Platform |
| 464 | 2026-03-13 | TASK-105 contact sparse default follow-up | QA/Platform |
| 463 | 2026-03-13 | TASK-105 search box mode and reset follow-up | QA/Platform |
| 462 | 2026-03-13 | TASK-105 FAQ accordion sparse default coverage | QA/Platform |
| 461 | 2026-03-13 | TASK-105 testimonials sparse default coverage | QA/Platform |
| 460 | 2026-03-13 | TASK-105 pricing plans guard behavior | QA/Platform |
| 459 | 2026-03-13 | TASK-105 content list sparse default coverage | QA/Platform |
| 458 | 2026-03-13 | TASK-105 team style fallback coverage | QA/Platform |
| 457 | 2026-03-13 | TASK-105 product table fallback coverage | QA/Platform |
| 456 | 2026-03-13 | TASK-105 product compare fallback coverage | QA/Platform |
| 455 | 2026-03-13 | TASK-105 product gallery fallback coverage | QA/Platform |
| 454 | 2026-03-13 | TASK-105 posts feed fallback coverage | QA/Platform |
| 453 | 2026-03-13 | TASK-105 post classic editor shell follow-up | QA/Platform |
| 452 | 2026-03-13 | TASK-105 block inspector direct coverage | QA/Platform |
| 451 | 2026-03-13 | TASK-105 document inspector direct coverage | QA/Platform |
| 450 | 2026-03-13 | TASK-105 post richtext command follow-up | QA/Platform |
| 449 | 2026-03-12 | TASK-105 block list interaction follow-up | QA/Platform |
| 448 | 2026-03-12 | TASK-105 page list page lifecycle coverage | QA/Platform |
| 447 | 2026-03-12 | TASK-105 posts list page lifecycle coverage | QA/Platform |
| 446 | 2026-03-12 | TASK-105 post editor canvas preview follow-up | QA/Platform |
| 445 | 2026-03-12 | TASK-105 post richtext selection and layout follow-up | QA/Platform |
| 444 | 2026-03-12 | TASK-105 post editor state hook coverage | QA/Platform |
| 443 | 2026-03-12 | TASK-105 post editor canvas interaction coverage | QA/Platform |
| 442 | 2026-03-12 | TASK-105 posts table branch coverage | QA/Platform |
| 441 | 2026-03-12 | TASK-105 post richtext adapter dom flow coverage | QA/Platform |
| 440 | 2026-03-12 | TASK-105 post richtext toolbar interaction coverage | QA/Platform |
| 439 | 2026-03-12 | TASK-105 post richtext paste helper follow-up | QA/Platform |
| 438 | 2026-03-12 | TASK-105 post richtext helper export coverage | QA/Platform |
| 437 | 2026-03-12 | TASK-105 block settings interaction coverage | QA/Platform |
| 436 | 2026-03-12 | TASK-105 page table branch coverage | QA/Platform |
| 435 | 2026-03-12 | TASK-105 booking validation and delete branch follow-up | QA/Platform |
| 434 | 2026-03-12 | TASK-105 themes drawer and page branch follow-up | QA/Platform |
| 433 | 2026-03-12 | TASK-105 listings editor and binding branch follow-up | QA/Platform |
| 432 | 2026-03-12 | TASK-105 booking helper and page branch follow-up | QA/Platform |
| 431 | 2026-03-12 | TASK-105 forms builder and action log branch follow-up | QA/Platform |
| 430 | 2026-03-12 | TASK-105 forms automation runner dependency split | QA/Platform |
| 429 | 2026-03-12 | TASK-105 post runtime media seam | QA/Platform |
| 428 | 2026-03-12 | TASK-105 import boundary guardrails | Docs/Architecture |
| 427 | 2026-03-12 | TASK-105 forms runtime and nonce seams | QA/Platform |
| 426 | 2026-03-12 | TASK-105 assistant provider and docs seams | QA/Platform |
| 425 | 2026-03-12 | TASK-105 legacy migration cleanup closure | QA/Platform |
| 424 | 2026-03-12 | TASK-105 server settings helper migration | QA/Platform |
| 423 | 2026-03-12 | TASK-105 refactor-first audit closure | QA/Platform |
| 422 | 2026-03-12 | TASK-105 search pure suite migration | QA/Platform |
| 420 | 2026-03-12 | TASK-105 server helper suite migration | QA/Platform |
| 419 | 2026-03-12 | TASK-105 forms pure suite migration | QA/Platform |
| 418 | 2026-03-12 | TASK-105 posts pure suite migration | QA/Platform |
| 417 | 2026-03-12 | TASK-105 validation and assistant suite migration | QA/Platform |
| 416 | 2026-03-12 | TASK-105 custom screens legacy suite migration | QA/Platform |
| 415 | 2026-03-12 | TASK-105 legacy bun-free duplicate suite cleanup | QA/Platform |
| 414 | 2026-03-11 | TASK-105 posts list and classic shell jump | QA/Platform |
| 413 | 2026-03-11 | TASK-105 field renderer and page list follow-up | QA/Platform |
| 412 | 2026-03-11 | TASK-105 entries pages posts foundation slice | QA/Platform |
| 411 | 2026-03-11 | TASK-105 newsletter team logo branch refactor follow-up | QA/Platform |
| 410 | 2026-03-11 | TASK-105 newsletter pricing safety follow-up | QA/Platform |
| 409 | 2026-03-11 | TASK-105 feature grid safety follow-up | QA/Platform |
| 408 | 2026-03-11 | TASK-105 product compare and table branch cleanup | QA/Platform |
| 407 | 2026-03-11 | TASK-105 logo cloud safety follow-up | QA/Platform |
| 406 | 2026-03-11 | TASK-105 timeline line gap closure | QA/Platform |
| 405 | 2026-03-10 | TASK-105 stats navigation pricing hero follow-up | QA/Platform |
| 404 | 2026-03-10 | TASK-105 footer team navigation logo divider entry follow-up | QA/Platform |
| 403 | 2026-03-10 | TASK-105 pricing plans coverage follow-up | QA/Platform |
| 402 | 2026-03-10 | TASK-105 vitest coverage canonical rebaseline | QA/Platform |
| 401 | 2026-03-10 | TASK-105 gallery mosaic coverage follow-up | QA/Platform |
| 400 | 2026-03-10 | TASK-105 commerce shared number guard follow-up | QA/Platform |
| 399 | 2026-03-10 | TASK-105 compare posts and shared editor coverage follow-up | QA/Platform |
| 398 | 2026-03-10 | TASK-105 contact and newsletter coverage follow-up | QA/Platform |
| 397 | 2026-03-10 | TASK-105 parallel low-line widget editor coverage follow-up | QA/Platform |
| 396 | 2026-03-10 | TASK-105 defensive widget editor fallback follow-up | QA/Platform |
| 395 | 2026-03-10 | TASK-105 residual widget editor branch closure follow-up | QA/Platform |
| 394 | 2026-03-10 | TASK-105 hero content list and section coverage follow-up | QA/Platform |
| 393 | 2026-03-09 | TASK-105 appointment form and cta banner coverage follow-up | QA/Platform |
| 392 | 2026-03-09 | TASK-105 divider editor coverage follow-up | QA/Platform |
| 391 | 2026-03-09 | TASK-105 stack and spacer widget editor coverage follow-up | QA/Platform |
| 390 | 2026-03-09 | TASK-105 utility layout widget editor coverage follow-up | QA/Platform |
| 389 | 2026-03-09 | TASK-105 promo and utility widget editor coverage follow-up | QA/Platform |
| 388 | 2026-03-09 | TASK-105 contact and content widget editor coverage follow-up | QA/Platform |
| 387 | 2026-03-09 | TASK-105 layout and social-proof widget editor coverage follow-up | QA/Platform |
| 386 | 2026-03-09 | TASK-105 product and template widget editor coverage follow-up | QA/Platform |
| 385 | 2026-03-08 | TASK-105 stats kpi editor coverage follow-up | QA/Platform |
| 384 | 2026-03-08 | TASK-105 content list editor coverage follow-up | QA/Platform |
| 383 | 2026-03-08 | TASK-105 posts feed editor coverage follow-up | QA/Platform |
| 382 | 2026-03-08 | TASK-105 listing filters editor coverage follow-up | QA/Platform |
| 381 | 2026-03-08 | TASK-105 entry teaser editor coverage follow-up | QA/Platform |
| 380 | 2026-03-08 | TASK-105 theme template drawer deep coverage follow-up | QA/Platform |
| 379 | 2026-03-08 | TASK-105 theme profile drawer coverage follow-up | QA/Platform |
| 378 | 2026-03-08 | TASK-105 themes page coverage follow-up | QA/Platform |
| 377 | 2026-03-08 | TASK-105 booking page coverage follow-up | QA/Platform |
| 376 | 2026-03-08 | TASK-105 theme template drawer coverage follow-up | QA/Platform |
| 375 | 2026-03-08 | TASK-105 listing template manager coverage follow-up | QA/Platform |
| 374 | 2026-03-08 | TASK-105 listing binding editor coverage follow-up | QA/Platform |
| 373 | 2026-03-08 | TASK-105 listings editor coverage follow-up | QA/Platform |
| 372 | 2026-03-08 | TASK-105 form action logs coverage follow-up | QA/Platform |
| 371 | 2026-03-08 | TASK-105 forms builder and automation coverage follow-up | QA/Platform |
| 370 | 2026-03-08 | TASK-105 coverage gap rebaseline and lane backlog | QA/Docs |
| 369 | 2026-03-06 | TASK-105 forms wave progress | QA/Platform |
| 368 | 2026-03-06 | TASK-105 listings wave progress | QA/Platform |
| 367 | 2026-03-06 | TASK-105 vitest coverage waves follow-up | QA/Platform |
| 366 | 2026-03-06 | TASK-105 vitest coverage waves progress | QA/Platform |
| 365 | 2026-03-06 | TASK-104 coverage remediation closure | QA/Platform |
| 364 | 2026-03-06 | TASK-102-06 custom screens and admin nav vitest migration | QA/Platform |
| 363 | 2026-03-06 | TASK-054-22-07 custom screen sidebar shortcuts | Admin/UI |
| 362 | 2026-03-06 | TASK-102 hybrid testing closure | QA/Platform |
| 361 | 2026-03-06 | TASK-102 dual coverage commands | QA/Platform |
| 360 | 2026-03-06 | TASK-053-06 page settings autosave and history | Admin/UI |
| 359 | 2026-03-06 | TASK-102 vitest bootstrap | QA/Platform |
| 358 | 2026-03-06 | TASK-103 agent guidelines hardening and contribution guardrails | Docs/Architecture |
| 357 | 2026-03-06 | TASK-054-22 custom screens bindings and record workflow | Admin/UI |
| 356 | 2026-03-05 | TASK-054-22-03 custom screens builder UI | Admin/UI |
| 355 | 2026-03-05 | TASK-063-16-23 section formatting regression fixes | Admin/UI |
| 354 | 2026-03-04 | TASK-054-22-02 custom screens admin routes and RBAC | Core/API |
| 353 | 2026-03-04 | TASK-054-22-01 custom screens schema foundation | CMS/Content |
| 352 | 2026-03-02 | TASK-054-199 security gate CI workflow | Security/CI |
| 351 | 2026-03-02 | TASK-061-08 post editor QA docs and closure | QA/Docs |
| 350 | 2026-03-02 | TASK-063-09 post editor QA and closure | QA/Docs |
| 349 | 2026-03-02 | TASK-063-08 keyboard, focus, and accessibility | Admin/UI |
| 348 | 2026-03-02 | TASK-063-07 details inspector tabs and preferences | Admin/UI |
| 347 | 2026-03-02 | TASK-063-16-22 section empty placeholder preview | Admin/UI |
| 346 | 2026-03-02 | TASK-063-16-21 editor settings dialog scroll | Admin/UI |
| 345 | 2026-03-02 | TASK-063-16-20 section toolbar type heading icon | Admin/UI |
| 344 | 2026-03-02 | TASK-063-16-19 section toolbar type profiles | Admin/UI |
| 343 | 2026-03-02 | TASK-063-16-18 section toolbar type control | Admin/UI |
| 342 | 2026-03-02 | TASK-063-16-17 section toolbar typography row | Admin/UI |
| 341 | 2026-03-02 | TASK-063-16-16 section inline typography list selection | Admin/UI |
| 340 | 2026-03-02 | TASK-063-16-15 section inline typography preview persistence | Admin/UI |
| 339 | 2026-03-02 | TASK-063-16-14 section inline typography selection | Admin/UI |
| 338 | 2026-03-02 | TASK-063-16-13 section alignment visual styles | Admin/UI |
| 337 | 2026-03-02 | TASK-063-16-12 section inline code visual styles | Admin/UI |
| 336 | 2026-03-02 | TASK-063-16-11 section inline code caret wrap | Admin/UI |
| 335 | 2026-03-02 | TASK-063-16-10 section list strike code and clear formatting | Admin/UI |
| 334 | 2026-03-02 | TASK-063-16-09 section heading icons and h6 style | Admin/UI |
| 333 | 2026-03-02 | TASK-063-16-08 runtime heading quote styles | Runtime/UX |
| 332 | 2026-03-02 | TASK-063-16-07 section heading visual styles | Admin/UI |
| 331 | 2026-03-02 | TASK-063-16-06 section paragraph quote visual styles | Admin/UI |
| 330 | 2026-03-02 | TASK-063-16-05 section paragraph quote div alias normalization | Admin/UI |
| 329 | 2026-03-02 | TASK-063-16 section paragraph quote node-boundary command closure | Admin/UI |
| 328 | 2026-03-02 | TASK-063-15 section writing-canvas hardening and grouped toolbar closure | Admin/UI |
| 327 | 2026-02-28 | TASK-063-14 richtext command reliability closure and qa gate completion | Admin/UI |
| 326 | 2026-02-27 | TASK-063-14 richtext command reliability phase 1 and documentation sync | Admin/UI |
| 325 | 2026-02-27 | TASK-063-13 post editor authoring stability and parity hardening | Admin/UI |
| 324 | 2026-02-27 | TASK-063-12 post editor block delete affordances (list view + canvas) | Admin/UI |
| 323 | 2026-02-25 | TASK-063-12 post editor reference parity wave 2 and closure | Admin/UI |
| 322 | 2026-02-25 | TASK-063-12 post editor reference parity wave 1 (header, left rail, canvas) | Admin/UI |
| 321 | 2026-02-24 | TASK-063-11 post editor strict html parity and unified canvas | Admin/UI |
| 320 | 2026-02-24 | TASK-063-10 post editor stitch template and focus mode | Admin/UI |
| 319 | 2026-02-24 | TASK-063-06 writing canvas appender and smart paste parity | Admin/UI |
| 318 | 2026-02-24 | TASK-063-05 post editor list view, outline, and stats | Admin/UI |
| 317 | 2026-02-24 | TASK-063-04 post editor inserter sidebar and library | Admin/UI |
| 316 | 2026-02-24 | TASK-063-03 post editor header document tools and actions | Admin/UI |
| 315 | 2026-02-23 | TASK-063-02 post editor shell regions | Admin/UI |
| 314 | 2026-02-23 | TASK-062 posts dynamic table of contents | CMS/Posts |
| 313 | 2026-02-23 | TASK-063-01 gutenberg reference audit and gap matrix | Docs/Architecture |
| 312 | 2026-02-23 | TASK-061-09 post editor silent save and preview without hydrate reload | Admin/UI |
| 311 | 2026-02-23 | TASK-061-07 runtime renderer parity and backward compatibility | Runtime/Compatibility |
| 310 | 2026-02-22 | TASK-061-06 editor ui integration ribbon canvas list view | Admin/UI |
| 309 | 2026-02-22 | TASK-061-05 image wrap controls and layout semantics | Core/Editor |
| 308 | 2026-02-22 | TASK-061-04 clipboard image upload and inline media insertion | Admin/UI |
| 307 | 2026-02-22 | TASK-061-03 smart paste word/docs/html parsing and sanitization | Core/Editor |
| 306 | 2026-02-22 | TASK-061-02 writing canvas block contract and normalization | Core/Content |
| 305 | 2026-02-22 | TASK-061-01 writing canvas ux contract and user flows | Docs/UX |
| 304 | 2026-02-22 | TASK-060 ribbon completion and inserter drawer removal | Admin/UI |
| 303 | 2026-02-22 | TASK-060 post editor unified canvas and ribbon UX | Admin/UI |
| 302 | 2026-02-22 | TASK-059-08 posts decoupling QA docs and closure | QA/Docs |
| 301 | 2026-02-22 | TASK-059-07 posts feed widget and page integration | CMS/Widgets |
| 300 | 2026-02-22 | TASK-059-06 posts data backfill and cutover | Core/Migration |
| 299 | 2026-02-22 | TASK-059-05 posts runtime listings search cutover | Runtime/Search |
| 298 | 2026-02-22 | TASK-059-04 posts admin ui decoupling from entries | Admin/UI |
| 297 | 2026-02-22 | TASK-059-03 posts admin api decoupling | Core/API |
| 296 | 2026-02-22 | TASK-059-02 posts domain service extraction | Core/Content |
| 295 | 2026-02-22 | TASK-059-01 posts db schema and migration foundation | Core/DB |
| 294 | 2026-02-21 | posts moved to main navigation after pages | Admin/UI |
| 293 | 2026-02-21 | admin dev strictmode fetch diagnostics fix | Admin/Performance |
| 292 | 2026-02-21 | TASK-058-06 regression tests, docs, changelog, and closure | QA/Docs |
| 291 | 2026-02-21 | TASK-058-05 admin shell global request minimization | Admin/Performance |
| 290 | 2026-02-21 | TASK-058-04 admin prefetch policy rework and budgeting | Admin/Performance |
| 289 | 2026-02-21 | TASK-058-03 pages and menus hydration refresh policy | Admin/Performance |
| 288 | 2026-02-21 | TASK-058-02 global read dedupe cache | Admin/Performance |
| 287 | 2026-02-21 | TASK-058-01 request storm instrumentation and baseline | Admin/Performance |
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
| 154 | 2026-02-04 | Widget slots core | CMS/Widgets |
| 155 | 2026-02-04 | Hero widget expansion | CMS/Widgets |
| 156 | 2026-02-06 | Hero widget bugfixes and UX hardening | CMS/Widgets |
| 157 | 2026-02-06 | Hero widget visual rebuild and advanced cleanup | CMS/Widgets |
| 158 | 2026-02-07 | Page layout model and runtime wrapper parity | CMS/Pages |
| 159 | 2026-02-07 | Widget template layout settings and runtime preview styling | CMS/Widgets |
| 160 | 2026-02-07 | Admin page layout settings and runtime preview unification | Admin/UI |
| 161 | 2026-02-07 | Navigation widget bugfixes and UX hardening | CMS/Widgets |
| 162 | 2026-02-07 | Navigation widget visual rebuild and advanced cleanup | CMS/Widgets |
| 163 | 2026-02-07 | Footer widget bugfixes and UX hardening | CMS/Widgets |
| 164 | 2026-02-07 | Footer widget visual rebuild and advanced cleanup | CMS/Widgets |
| 165 | 2026-02-07 | Timeline widget bugfixes and UX hardening | CMS/Widgets |
| 166 | 2026-02-07 | Timeline widget visual rebuild and advanced cleanup | CMS/Widgets |
| 167 | 2026-02-07 | Compare timeline widget bugfixes and UX hardening | CMS/Widgets |
| 168 | 2026-02-08 | Compare timeline widget visual rebuild and advanced cleanup | CMS/Widgets |
| 169 | 2026-02-08 | Newsletter widget bugfixes and UX hardening | CMS/Widgets |
| 170 | 2026-02-08 | Newsletter widget visual rebuild and advanced cleanup | CMS/Widgets |
| 171 | 2026-02-08 | Contact widget bugfixes and UX hardening | CMS/Widgets |
| 172 | 2026-02-08 | Contact widget visual rebuild and advanced cleanup | CMS/Widgets |
| 173 | 2026-02-08 | Feature grid widget | CMS/Widgets |
| 174 | 2026-02-08 | Testimonials widget | CMS/Widgets |
| 175 | 2026-02-08 | Pricing plans widget | CMS/Widgets |
| 176 | 2026-02-08 | FAQ accordion widget | CMS/Widgets |
| 177 | 2026-02-08 | CTA banner widget | CMS/Widgets |
| 178 | 2026-02-08 | Logo cloud widget | CMS/Widgets |
| 179 | 2026-02-08 | Gallery mosaic widget | CMS/Widgets |
| 180 | 2026-02-08 | Stats KPI widget | CMS/Widgets |
| 181 | 2026-02-08 | Team widget | CMS/Widgets |
| 182 | 2026-02-08 | Rich text section widget | CMS/Widgets |
| 183 | 2026-02-08 | Content list widget | CMS/Widgets |
| 184 | 2026-02-08 | Entry teaser widget | CMS/Widgets |
| 185 | 2026-02-09 | Repeatable slots core | CMS/Widgets |
| 186 | 2026-02-09 | Section layout widget | CMS/Widgets |
| 187 | 2026-02-09 | Grid columns layout widget | CMS/Widgets |
| 188 | 2026-02-09 | Stack layout widget | CMS/Widgets |
| 189 | 2026-02-09 | Split layout widget | CMS/Widgets |
| 190 | 2026-02-09 | Spacer widget | CMS/Widgets |
| 191 | 2026-02-09 | Divider widget | CMS/Widgets |
| 192 | 2026-02-09 | Assistant settings and data model | CMS/Settings |
| 193 | 2026-02-09 | TASK-100-01 settings keys and runtime validation | Core/Settings |
| 194 | 2026-02-09 | TASK-100-02 public base URL resolver and consumers | Core/Platform |
| 195 | 2026-02-09 | TASK-100-03 auth TTL runtime sources | Core/Auth |
| 196 | 2026-02-09 | TASK-100-04 admin UI runtime URL and auth TTL wiring | Admin/UI |
| 197 | 2026-02-09 | TASK-100-05 first-run setup wizard and gating | Admin/UI |
| 198 | 2026-02-09 | Assistant doc index and retrieval | Core/Assistant |
| 199 | 2026-02-09 | Assistant API doc navigator runtime | Core/API |
| 200 | 2026-02-09 | Assistant internal docs DB knowledge base | Core/Assistant |
| 201 | 2026-02-09 | Assistant OpenRouter provider adapter and llm-rag fallback | Core/Assistant |
| 202 | 2026-02-09 | Assistant admin UI chat and modes | Admin/UI |
| 203 | 2026-02-09 | Assistant avatar rendering and preferences | Admin/UI |
| 204 | 2026-02-09 | Assistant security, quotas, observability and hardening | Core/Security |
| 205 | 2026-02-09 | Dashboard service | Core/Services |
| 206 | 2026-02-09 | Dashboard API | Core/API |
| 207 | 2026-02-09 | Dashboard UI wiring | Admin/UI |
| 208 | 2026-02-10 | Page template and navigation runtime parity | CMS/Pages |
| 209 | 2026-02-10 | TASK-052 parity follow-up | CMS/Pages |
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
| 848 | 2026-02-02 | Widgets library UI refresh | Admin/UI |
| 849 | 2026-02-02 | Widget template editor drag-and-drop | Admin/UI |
| 210 | 2026-02-14 | Page settings retention and runtime preview polish | CMS/Pages |
| 211 | 2026-02-14 | Page builder template sections | Admin/UI |
| 212 | 2026-02-14 | Runtime preview FOUC dev modules | CMS/Site |
| 213 | 2026-02-14 | Page preview + template section fixes summary | CMS/Pages |
| 214 | 2026-02-14 | Page list clickable title | Admin/UI |
| 215 | 2026-02-14 | Entry list clickable title | Admin/UI |
| 216 | 2026-02-14 | Entry author panel fix | CMS/Content |
| 217 | 2026-02-14 | Content type list clickable title | Admin/UI |
| 218 | 2026-02-14 | Content type editor cache | Admin/UI |
| 219 | 2026-02-14 | Admin session cache utilities | Admin/UI |
| 220 | 2026-02-15 | Admin cache layer | Admin/UI |

| 221 | 2026-02-15 | Admin rate limit auth bypass | Core/Security |
| 222 | 2026-02-16 | Settings UI polish + content type editor fix | Admin/UI |
| 223 | 2026-02-16 | Menu editor cache + drag nesting | Admin/UI |
| 850 | 2026-02-15 | Security hardening and settings UX | Core/Security |
| 224 | 2026-02-17 | Widget library cache hydration | Admin/UI |

| 225 | 2026-02-17 | Admin SPA navigation + prefetch | Admin/UI |
| 226 | 2026-02-17 | Admin UI theme cache hydration | Admin/UI |


---
*Details of changes are in the linked files.*
| 227 | 2026-02-17 | Forms editor split and embed widget | Admin/UI |
| 228 | 2026-02-17 | Forms submission fallback settings | CMS/Forms |
| 229 | 2026-02-17 | Forms submission access modes | Core/Security |
| 230 | 2026-02-17 | Forms submission nonce guard | Core/Security |
| 231 | 2026-02-17 | Coderso admin IA and routing foundation | Admin/UI |
| 232 | 2026-02-17 | Coderso module catalog and tiers | Admin/UI |
| 233 | 2026-02-18 | Coderso listings query contract and validation | CMS/Content |
| 234 | 2026-02-18 | Coderso listings execution engine | CMS/Content |
| 235 | 2026-02-18 | Coderso listing templates model and service | CMS/Content |
| 236 | 2026-02-18 | Coderso listings API and routes | Core/API |
| 237 | 2026-02-18 | Coderso listings admin UI | Admin/UI |
| 238 | 2026-02-18 | Coderso runtime widget listings integration | CMS/Widgets |
| 239 | 2026-02-18 | Coderso listing visibility and dynamic binding | CMS/Widgets |
| 240 | 2026-02-18 | Coderso listings QA and documentation closure | QA/Docs |
| 241 | 2026-02-18 | Coderso filters and search suite | CMS/Search |
| 242 | 2026-02-18 | Coderso forms automation foundation | CMS/Forms |
| 243 | 2026-02-18 | Coderso forms runtime presets, multi-step UX, and retry policy | CMS/Forms |
| 244 | 2026-02-18 | Coderso search preview route fix and filters query guide | Admin/UI |
| 245 | 2026-02-18 | Coderso Booking foundation (domain + API) | CMS/Booking |
| 246 | 2026-02-18 | Coderso Booking admin UI | Admin/UI |
| 247 | 2026-02-18 | Coderso Booking runtime widgets and public API | CMS/Booking |
| 248 | 2026-02-18 | Booking and media access modes | Core/Security |
| 249 | 2026-02-19 | Media delivery settings UX relocation | Admin/UI |
| 250 | 2026-02-19 | Booking suite QA and docs closure | QA/Docs |
| 251 | 2026-02-19 | Commerce domain contract and schemas | CMS/Commerce |
| 252 | 2026-02-19 | Commerce DB and service/query engine | CMS/Commerce |
| 253 | 2026-02-19 | Commerce admin API routes and RBAC | Core/API |
| 254 | 2026-02-19 | Commerce admin UI catalog and editor | Admin/UI |
| 255 | 2026-02-19 | Commerce runtime widgets (gallery, compare, table) | CMS/Widgets |
| 256 | 2026-02-19 | Commerce checkout/cart adapter contract | CMS/Commerce |
| 257 | 2026-02-19 | Commerce suite QA, docs, and closure | QA/Docs |
| 258 | 2026-02-19 | Engagement domain DB foundation | CMS/Engagement |
| 259 | 2026-02-19 | Engagement services and validation | CMS/Engagement |
| 260 | 2026-02-19 | Engagement API routes and RBAC | Core/API |
| 261 | 2026-02-19 | Engagement admin UI for popups and reviews | Admin/UI |
| 262 | 2026-02-19 | Engagement mega menu metadata and utility widgets | CMS/Widgets |
| 263 | 2026-02-19 | Engagement suite QA, docs, and closure | QA/Docs |
| 264 | 2026-02-19 | Solution kits foundation: catalog, planner, and admin surface | Admin/UI |
| 265 | 2026-02-19 | Solution kits install engine, idempotency, and rollback | CMS/Kits |
| 266 | 2026-02-19 | Solution kits internal API and RBAC | Core/API |
| 267 | 2026-02-19 | Solution kits admin UI runs, cache, and prefetch | Admin/UI |
| 268 | 2026-02-19 | AI site wizard guided flow for solution kits | Admin/UI |
| 269 | 2026-02-20 | Solution kits content packs and installers | CMS/Kits |
| 270 | 2026-02-20 | Solution kits QA, docs, and closure | QA/Docs |
| 271 | 2026-02-20 | Coderso composite-first widget strategy | CMS/Widgets |
| 272 | 2026-02-20 | Coderso plugin contract and package manifest | Core/Plugins |
| 273 | 2026-02-20 | Coderso module widget pack matrix | CMS/Widgets |
| 274 | 2026-02-20 | Coderso presets, templates, and kits contract | CMS/Kits |
| 275 | 2026-02-20 | Assistant site builder guided executor | Admin/UI |
| 276 | 2026-02-20 | Coderso release gates baseline | QA/Security |
| 277 | 2026-02-21 | Forms editor logic/style parity and runtime test preview | CMS/Forms |
| 278 | 2026-02-21 | Posts module in Coderso (list + editor + API aliases) | CMS/Content |
| 279 | 2026-02-21 | TASK-057-01 post block document contract and legacy compatibility | CMS/Content |
| 280 | 2026-02-21 | TASK-057-02 modular Gutenberg-like post editor shell and state architecture | Admin/UI |
| 281 | 2026-02-21 | TASK-057-04 inserter, slash command, list view DnD/keyboard, and block transforms | Admin/UI |
| 282 | 2026-02-21 | TASK-057-05 document/block inspector panels with metadata save integration | Admin/UI |
| 283 | 2026-02-21 | TASK-057-06 autosave/revisions flow with restore drawer and editor lifecycle statuses | CMS/Content |
| 284 | 2026-02-21 | TASK-057-07 post block runtime renderer and public preview/published parity | CMS/Runtime |
| 285 | 2026-02-21 | TASK-057-03 rich text engine and text formatting capabilities | Admin/UI |
| 286 | 2026-02-21 | TASK-057-08 post editor QA/docs/rollout closure with fallback mode | QA/Docs |
