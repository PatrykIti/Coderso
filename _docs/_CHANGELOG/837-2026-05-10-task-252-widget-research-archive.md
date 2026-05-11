# 837 - TASK-252 widget research archive

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-252, TASK-252-02

## Key Changes

### Widget research archive

- Added a license-safe `_docs/_WIDGETS/tmp/**` research archive for all 38
  Pages-publishable widgets before implementation leaves are written.
- Captured ten research cards per widget, covering source URL, access type,
  license/terms summary, observed UX pattern, Coderso option mapping,
  Keep/Adapt/Reject decision, and copy policy.
- Added a `MATRIX.md` for every widget folder so later editor/schema work can
  derive final option lists from analyzed patterns instead of assumptions.
- Added central archive rules and source pools in `_docs/_WIDGETS/tmp/README.md`
  and `_docs/_WIDGETS/tmp/SOURCE_POOLS.md`.

## Validation

- `git diff --check`
- Verified 38 widget folders under `_docs/_WIDGETS/tmp/**`.
- Verified 380 total research cards: ten cards per widget.
- Verified every widget has `README.md` and `MATRIX.md`.
- Verified no `SHORTFALL.md` files were needed.
