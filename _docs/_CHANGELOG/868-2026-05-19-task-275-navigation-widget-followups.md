# 868. TASK-275 navigation widget followups

- Date: 2026-05-19
- Version: Unreleased
- Tasks: TASK-275, TASK-275-01, TASK-275-02, TASK-275-03, TASK-275-04, TASK-275-05, TASK-275-05-01, TASK-275-05-02, TASK-275-05-03, TASK-275-05-04, TASK-275-06, TASK-313, TASK-314

## Key Changes

### CMS Widgets
- landed the Navigation widget follow-up family with safe linked logos, hash-link editor parity, real `minimal` vs `drawer` mobile behavior, bounded CTA placement, and runtime collapse/active-link handling
- added touch and keyboard submenu disclosure controls, plain-text icon/badge/description metadata rendering, safe manual link target handling, and client-side active-link detection without widening shared sanitizer ownership
- expanded Navigation-owned visual and brand controls with hover/active colors, underline, letter spacing, shadow, blur, dropdown direction, motion, logo size, CTA radius, and CTA separator tokens

### Admin UI
- upgraded Navigation editors with labelled logo-link fields, link metadata and target controls, top-level and child reordering, limit feedback, Wizard overflow messaging, menu-source read-only previews, and clearer mobile/runtime guidance
- kept extra actions on the existing `Right Actions` slot instead of inventing a second persisted CTA contract

### QA And Docs
- refreshed the Navigation widget source-of-truth doc, final Playwright report classification, task board state, and changelog evidence for the closed TASK-275 family
- kept shared builder live-preview and Section sticky containment findings routed to `TASK-313` and `TASK-314` instead of masking them with widget-local patches
