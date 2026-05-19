# 869-2026-05-19 - TASK-272 Hero widget follow-ups

Date: 2026-05-19
Version: Unreleased
Tasks: TASK-272, TASK-272-01, TASK-272-02, TASK-272-03, TASK-272-04, TASK-272-05, TASK-272-06, TASK-272-07, TASK-272-08, TASK-272-09

## Summary

- Closed the Hero-specific Playwright follow-up family with synchronized
  runtime, editor, docs, validation, and explicit deferred-owner coverage for
  true responsive-image variants.

## Key Changes

- CMS/Widgets: Hero now supports the `media-center` variant, bounded
  full-height/full-bleed layout tokens, deterministic image loading and LCP
  hints, video poster/title/description metadata, sanitized rich headline/body
  rendering, a bounded social-proof row, and explicit shadow/font/motion
  appearance tokens.
- Admin/UI: Hero editors now keep centered media authoring available while
  hiding centered-only inline frame controls, align CTA placeholder guidance,
  expose palette presets plus contrast advisories, support confirm-delete plus
  search/sort/import/export for presets, and surface normalization warnings
  instead of silently accepting malformed imported preset data.
- QA/Documentation: Added focused Hero runtime/editor/user-settings coverage,
  refreshed `_docs/_WIDGETS/HERO.md`, converted the Hero Playwright report into
  a closure matrix, marked every TASK-272 leaf `Done`, and documented the
  remaining `BF-07` defer reason until a future media-owner task exposes real
  `srcset`/`picture` variants.
