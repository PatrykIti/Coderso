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
| 123 | 2026-02-02 | Widgets library UI refresh | Admin/UI |
| 124 | 2026-02-02 | Widget template editor drag-and-drop | Admin/UI |
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
| 204 | 2026-02-15 | Security hardening and settings UX | Core/Security |
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
| 287 | 2026-02-23 | Posts editor paste flow fix (rich-text priority + image-safe fallback + section normalization) | Admin/UI |
