# 1250 - TASK-538 Custom SVG Layout Isolation

Date: 2026-07-11
Version: Unreleased
Tasks: TASK-538, TASK-538-01, TASK-538-01-L01, TASK-538-01-L02,
TASK-538-02, TASK-538-02-L01, TASK-538-02-L02, TASK-538-03,
TASK-538-03-L01

## Key Changes

### Closed SVG trust boundary

- Page Custom SVG content now uses one immutable closed policy at write and render.
  Author `class` and `style` do not survive sanitization, while approved drawing,
  presentation, accessibility, namespace, and local-reference attributes remain
  available.
- Sanitized text is converted into a bounded, deeply immutable safe node tree with an
  exhaustive source-to-React property map. Invalid or over-limit content fails closed
  to the existing neutral placeholder.
- The Page renderer creates SVG elements from that closed tree. Author-controlled SVG
  text no longer reaches a raw-markup insertion sink, and draw-in behavior is applied
  without rewriting the author string.

### Layout and interaction isolation

- A renderer-owned wrapper and root replace author root layout authority, clamp the
  trusted viewport ratio, cap block size, clip paint, and keep the SVG
  pointer-transparent. Safe descendant geometry and presentation remain visible inside
  the boundary.
- Public and preview rendering share the same contract. Cross-seam tests and real
  browser flows prove bounded wide/narrow geometry, preserved safe presentation and
  nesting, reduced-motion behavior, and outside-control click delivery.

### Product and compatibility boundary

- This is maintenance of the existing Page `customSvg` block within Page sections. It
  adds no generic widget, widget preset, module pack, or non-dashboard widget editor;
  configurable product widgets remain exclusive to the Admin Dashboard.
- Existing Page URLs and stored documents remain supported without an endpoint,
  database migration, dependency, or schema-version change. The security and Page
  model documentation now records the defensive boundary without publishing a detailed
  reproduction.

## Validation and smoke

- Core lint and type lint passed. Targeted Vitest passed 423/423; the named TASK-538 Bun
  runtime case executed, and the complete Page runtime suite passed 19/19.
- Targeted Semgrep reported zero findings, both TASK-538/program workflow scripts pass
  `node --check`, all five Coderso release gates pass, and five fresh post-audit lenses
  report no unresolved High/Medium/Low drift after one Low stale renderer-leaf grounded
  source anchor was corrected and freshly re-audited.
- The strict security scan ran without a TASK-538 finding or tooling failure. Its sole
  remaining finding is the unchanged TASK-545-owned workflow-script issue; no rule,
  baseline, allowlist, or suppression changed.
- Real smoke used `coderso-dev-core-host` and complete
  `playwright-cli -s=wf538smoke ...` commands against the canonical admin/front hosts:
  6/6 light/dark and wide/narrow flows passed with visible geometry/paint/DOM/click
  assertions, zero console/page errors, six distinct screenshots, UI fixture cleanup,
  public 404 after deletion, browser close, and server stop.
