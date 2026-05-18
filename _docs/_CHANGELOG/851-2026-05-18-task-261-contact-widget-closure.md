# 851 - TASK-261 contact widget closure

Date: 2026-05-18
Version: Unreleased
Tasks: TASK-261, TASK-261-01, TASK-261-02, TASK-261-02-01, TASK-261-02-02, TASK-261-02-03, TASK-261-03, TASK-261-04, TASK-261-05, TASK-261-06, TASK-301

## Key Changes

### CMS Widgets

- Expanded the Contact widget contract end-to-end: section header fields,
  panel headings, semantic contact details, safe `tel:`/`mailto:` links,
  bounded contact icons, map title/description/height/fallback controls,
  bounded width/padding/social options, and explicit normalizer defaults are
  now part of the schema/defaults/render/editor surface.
- Hardened the Contact form surface: field metadata is schema-owned
  (`label`, `placeholder`, `autocomplete`, `span`, `fieldLayout`), static mode
  no longer performs a native GET to the current page, and Forms runtime mode
  now reuses the existing `POST /forms/:id/submissions` path only for valid
  public bindings.
- Added a Contact-local Forms runtime bridge with strict type-safe field
  mapping, runtime hydration through `publicSite.tsx`, nonce projection,
  internal/public binding warnings, and static-safe fallback when the selected
  Form exceeds Contact's supported surface or depends on conditional logic /
  extra step groups.

### QA and Documentation

- Added focused Contact runtime coverage for widget rendering, editor runtime
  binding, validator hydration, public pages runtime hydration, route/security
  smoke, DB-backed submission proof, and the full `gates:coderso` /
  `precommit` / strict security scan closure path.
- Refreshed the Contact Playwright report with a final TASK-261 status matrix,
  synchronized `_docs/_WIDGETS/CONTACT.md`, moved the TASK-261 family to
  `Done`, and recorded a new shared follow-up task for stale cached Forms
  nonces on public pages (`TASK-301`).
