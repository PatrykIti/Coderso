# TASK-478-01: Inline Link Visual Feedback
# FileName: TASK-478-01-Inline-Link-Visual-Feedback.md

**Parent Task:** TASK-478
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-472-05 (link marks)
**Status:** ⏳ To Do
**Changelog:** 1307 (pinned; closure only)

---

## Overview

Make a fragment that carries a `link` mark visually obvious — at least an
underline + link color — so the author can see a link exists. Today it renders as
a bare `<a>` with no class and resolves to plain body text (no underline, base
color); it is indistinguishable from normal text.

## Current State (verified live 2026-06-27)

- `core/services/pages/pageRendererV2.tsx:778-784` `renderMarkedTextSegment` link
  branch: `<a key href={link.href} rel="nofollow noreferrer">{node}</a>` — **no
  `className`/style**. So both the front and the canvas paint the link without any
  affordance. (Contrast: the separate button/cta anchor at `:1782` uses
  `className="hover:underline"`.)

## Implementation sketch

- Add a deterministic link style to the rendered anchor in
  `renderMarkedTextSegment` (e.g. `className="underline underline-offset-2
  decoration-from-font"` plus a link color token), so it reads as a link on both
  the front and the canvas. Keep it token-driven (`var(--color-primary)` or a
  dedicated `--color-link`) and consistent with `DESIGN_TOKENS`.
- Optional editor-only affordance: when editing, add a `data-page-text-mark="link"`
  marker (already emit `data-page-text-mark` for color/highlight at `:767`; extend
  to link) so the editor can also outline linked runs distinctly from the front
  style if desired.
- Confirm the style survives the sanitizer/allowlist (it is renderer-applied, not
  stored in the mark, so no schema/sanitizer change is needed).

## Regression-test shape

- `tests/vitest/pages/page-renderer-v2.test.tsx`: a `link` mark renders an `<a>`
  with the link `className`/decoration (assert the class/`data-page-text-mark` is
  present) and still carries `rel="nofollow noreferrer"` + the sanitized href.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`, `page-renderer-v2` + canvas
  Vitest suites; live smoke that a linked fragment shows underline/color in-editor
  and on the published front.
