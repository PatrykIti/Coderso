# 846 - TASK-256 follow-up drift closure

Date: 2026-05-17
Version: Unreleased
Tasks: TASK-256-02, TASK-256-05-04, TASK-256-06-03, TASK-256-06-04, TASK-256-08

## Key Changes

### CMS Widgets

- Hardened the Team shared-contract slice after the original TASK-256 closure:
  social links now use the shared safe-href owner, new links no longer seed
  `#`, member-count reductions require confirmation, spotlight columns stay
  truthful, and valid avatar images lazy-load while invalid values fall back to
  initials.
- Tightened the Accordion and Toggle Block shared slices after the original
  closure: Accordion now honors non-first default-open items, keeps one item
  open when `collapsible=false`, syncs runtime disclosure state, and Toggle
  Block preserves an intentionally cleared helper while exposing clear controls
  for the remaining shared style fields.
- Closed the remaining Testimonials shared-contract gaps by adding
  `slider-static` scroll-snap, variant-owned count synchronization when the
  editor owns variant changes, current section/card labelling, lazy avatar
  loading, and clear controls for `textColor` and `accentColor`.

### QA and Documentation

- Refreshed the TASK-256 report status notes for Accordion, Team, Testimonials,
  CTA Banner, Contact, Newsletter, Appointment Form, Booking Calendar, Compare
  Timeline, and Form Embed so they now reflect final fixed/deferred/classified
  scope instead of leaving generic handoff placeholders to `TASK-256-08`.
- Synchronized `_docs/_TASKS/TASK-256-08_Playwright_Report_Completion_and_Closure.md`
  and `_docs/_TASKS/README.md` with the post-close follow-up state, including
  explicit `needs-refresh` routing for the still-in-progress Form Embed report
  under `TASK-269`.
