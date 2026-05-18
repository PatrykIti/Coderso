# 847. TASK-265 entry teaser closure

- **Date:** 2026-05-18
- **Version:** Unreleased
- **Tasks:** TASK-293, TASK-265, TASK-265-01, TASK-265-02, TASK-265-03, TASK-265-04, TASK-265-05, TASK-265-06

## Key Changes

### Widgets and Runtime

- added an internal Entry Teaser preview route and transient editor preview state
  so admin canvas rendering can hydrate resolved teaser data without persisting
  preview-only payloads into page or template JSON
- completed listing-source semantics for Entry Teaser so listing mode now has
  tested `latest` and `featured` one-item behavior, while manual listing-row
  picking is explicitly deferred to `TASK-294`
- expanded the widget schema, normalizer, renderer, and DOM markers with
  section heading, entry heading, media mode/aspect/height/object-fit, tag
  limit, max-width, CTA new-tab safety, CTA style variants, and deterministic
  image dimensions

### Admin UI

- moved source mutation ownership into Wizard and replaced duplicated
  cross-editor source controls with a read-only Visual summary
- added variant thumbnails, grouped fallback copy and behavior, local field
  preview feedback, Auto URL guidance, and a copyable runtime payload snapshot
- adopted the shared swatch-plus-text color control for Entry Teaser surface and
  border fields after landing the shared `TASK-293` contract

### QA and Docs

- introduced and extended focused Entry Teaser Vitest and Bun coverage for the
  editor wave, renderer, listing featured semantics, public HTML output, preview
  route, and shared color adoption
- refreshed the Entry Teaser widget doc, the Playwright report closure matrix,
  the task board, and the task-family closure notes for `TASK-265`
- recorded the remaining local security-scan blocker: `bun run scan:security:strict`
  still fails in this environment because Semgrep cannot build the system trust
  store and `bun audit` cannot reach the advisory service, while Trivy and
  Gitleaks stay clean
