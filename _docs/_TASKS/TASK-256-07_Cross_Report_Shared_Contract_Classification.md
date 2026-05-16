# TASK-256-07: Cross-Report Shared Contract Classification

# FileName: TASK-256-07_Cross_Report_Shared_Contract_Classification.md

**Priority:** High
**Category:** Widgets + Playwright QA + Contract Classification
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04
**Status:** To Do

---

## Overview

Classify every current Playwright widget report against the current executable
TASK-256 contract before implementation closes. This leaf is not a per-widget
implementation backlog. It is the routing layer that prevents completed reports
from widening TASK-256 into one-off widget feature work.

Every report finding must end in one of these classification buckets. A finding
may be routed to a TASK-256 implementation leaf only when that leaf has a
physical task file with concrete owner and test rows for the relevant current
TASK-256 contract. If a completed late report exposes a defect outside the
current TASK-256 executable leaves, TASK-256-08 must create a future physical
task instead of widening this family into a per-widget implementation backlog.

- `TASK-256-01`: shared editor mode, atomic block updates, and mode ownership.
- `TASK-256-02`: `Clear`, `none`, token picker, custom value, and CSS-variable
  preservation semantics.
- `TASK-256-03`: slot/nested-content metadata and public placeholder gating.
- `TASK-256-04`: instance-safe IDs, scoped runtime scripts, form state, and
  accessibility relationships.
- `TASK-256-05`: truthful controls, variant-bound data, inert/duplicated
  controls, and editor-visible state that does not match runtime output.
- `TASK-256-06`: safe public href/media output, section/header semantics, and
  marketing/content accessibility boundaries already owned by physical
  TASK-256-06 leaves.
- `TASK-256-08`: closure evidence, explicit non-reproducible rows, or physical
  future tasks for report rows outside the current TASK-256 executable leaves.

## Drift Evidence

The first TASK-256 draft missed reports that were completed later or were not
part of the early structural/marketing pass. These reports still contain report
findings that must be classified before closure:

- `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md:294` for public form submission,
  `name`/autocomplete semantics, clear controls, hidden/minimal-variant
  controls, and contact link safety.
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md:172` for public form field
  semantics, consent placement, success status visibility, duplicated variant
  ownership, URL validation, and `aria-live`.
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md:124` for admin-preview vs
  frontend runtime parity, stale runtime errors, field visibility truthfulness,
  nonce handling, autocomplete, and form labels.
- `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md:297` for admin-preview vs
  frontend resolver parity, slot runtime ARIA, loading state, past-date safety,
  and runtime request behavior.
- `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md:291` for clear controls,
  duplicated Visual/Advanced controls, ARIA, dynamic grid truthfulness, and
  `guides.enabled` runtime truthfulness.
- `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md:191` for safe external links,
  clearable colors, duplicated padding controls, footer semantics, hardcoded
  public copy, and social-link output.
- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md:294` for identical editor modes,
  documented-but-unimplemented variants, clear controls, public form
  accessibility, runtime state, and public submission anti-abuse.
- `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md:431` for mode reset,
  output-mode truthfulness, max-width runtime drift, clear controls, and
  heading/focus semantics.
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md:233`,
  `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md:343`, and
  `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md:344` for commerce widget
  rows that must be split between shared runtime contract defects and future
  commerce-feature work.

## Sub-Tasks

- [ ] Build a report-to-contract matrix for every current
  `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` file.
- [ ] Map every shared-contract finding to the exact TASK-256 physical leaf
  that already owns its implementation and validation path.
- [ ] Mark product-feature findings as future scope and leave their
  implementation out of TASK-256.
- [ ] Mark resolved/non-bug findings explicitly so they cannot silently re-enter
  implementation leaves.
- [ ] Add future physical task files only when a deferred finding is
  product-scope or is shared-contract drift that no current TASK-256 physical
  leaf owns executably.
- [ ] Update TASK-256-08 with the final classification evidence before closure.

## Classification Matrix

| Report group | Current TASK-256 executable route | Future family boundary |
|---|---|---|
| Form widgets: contact, newsletter, form-embed | Only rows that exactly match TASK-256-01 mode update, TASK-256-02 clear/token repair, or TASK-256-04 generic accessibility/state wiring already owned by those leaves. | Form `name`/autocomplete, consent/form containment, public submission anti-abuse, nonce, captcha, form-builder behavior, integrations, analytics, and double opt-in must become a future forms/public-write widget family. |
| Booking widgets: booking-calendar, appointment-form | Only rows that exactly match TASK-256-03 placeholder gating or TASK-256-04 generic scoped runtime/a11y wiring already owned by those leaves. | Admin-preview vs public booking resolver parity, stale runtime errors, past-date safety, runtime request behavior, calendar UX, service pricing, and consent/captcha policy must become a future booking widget family. |
| Shell/content composites: footer, compare-timeline, rich-text-section | Only rows that map to existing physical leaves with the exact owner file already named there. | Footer social/brand systems, Rich Text editor/WYSIWYG behavior, Compare Timeline product behavior, SEO schemas, drag/drop, and advanced typography must become future shell/content widget families. |
| Commerce widgets: product-gallery, product-compare, product-table | Only rows that map to existing physical safe-output or accessibility leaves with the exact owner file already named there. | Catalog behavior, merchandising layouts, filters, product-table product scope, commerce runtime flows, and advanced commerce validation must become future commerce widget families. |
| Dynamic widgets: content-list, navigation, posts-feed, entry-teaser, listing-filters | Current TASK-256 can use existing shared link/a11y/truthful-control leaves plus TASK-256-08 dynamic validation when the exact owner/test path is named. | Pagination widgets, taxonomy pickers, active chips, complex menu IA, broad content-query expansion, and dynamic runtime behavior outside current owners must become future dynamic content widget families. |

Footer, Compare Timeline, and Rich Text Section reports enter TASK-256 only
when a row maps to an existing physical TASK-256 owner. Safe link and media
output route to TASK-256-06-02 or TASK-256-06-04 only when those leaves already
name the concrete owner file; duplicated or ineffective controls route to
TASK-256-01, TASK-256-02, or TASK-256-05 only when the exact owner exists
there; heading, focus, and ARIA rows route to TASK-256-04 or TASK-256-06 only
when the physical leaf owns the file. All other rows must be recorded by
TASK-256-08 as future physical task scope instead of being implemented in this
family.

## Late Report Execution Routing

This matrix prevents the classifier from becoming an implicit implementation
backlog. It defines whether a completed late report can be fixed by an existing
TASK-256 physical leaf or must leave TASK-256 as a future physical family.

| Report group | TASK-256 implementation route | Required closure output |
|---|---|---|
| Contact, Newsletter, Form Embed | Classification only unless a row is exactly a TASK-256-01 mode update, TASK-256-02 clear/token repair, or TASK-256-04 accessibility/runtime-state repair already covered by those physical leaf owners. Public submission, nonce, consent, autocomplete, and form-builder behavior must become a future forms/public-write widget task. | TASK-256-08 records fixed/deferred status and creates a future task with form widget owners/tests before marking any unowned row deferred. |
| Appointment Form, Booking Calendar | Classification only unless a row is exactly a TASK-256-03 slot placeholder or TASK-256-04 scoped runtime/a11y repair already covered by those physical leaf owners. Booking service, past-date request safety, calendar UX, and runtime request behavior must become a future booking widget task. | TASK-256-08 records fixed/deferred status and creates a future task with booking widget, booking route, and booking service tests before marking any unowned row deferred. |
| Footer, Compare Timeline, Rich Text Section | Classification only unless a row maps to an existing physical leaf with the exact owner file already named there. Footer-specific product behavior is now routed to TASK-268; Rich Text editing/WYSIWYG scope and Compare Timeline product behavior must become future shell/content widget tasks. | TASK-256-08 records fixed/deferred status and references TASK-268 for Footer-specific rows while creating future shell/content task files for other unowned rows. |
| Product Gallery, Product Compare, Product Table | Classification only unless a row maps to an existing physical safe-output or accessibility leaf with the exact owner file already named there. Catalog, merchandising, filters, and commerce runtime behavior must become future commerce widget tasks. | TASK-256-08 records fixed/deferred status and creates future commerce widget tasks for unowned rows. |
| Content List, Navigation, Posts Feed, Entry Teaser, Listing Filters | Classification plus the explicit dynamic/content validation in TASK-256-08. Any row outside current shared link/a11y/truthful-control owners becomes a future dynamic content widget task. | TASK-256-08 runs the dynamic/content validation commands and creates future dynamic task files for unowned rows. |

## Files to Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-256_Widget_Shared_Contract_Playwright_Drift_Repair.md` | Keep the source report list complete and describe reports as evidence for shared contracts, not per-widget implementation families. |
| `_docs/_TASKS/TASK-256-08_Playwright_Report_Completion_and_Closure.md` | Add final classification evidence and future task IDs for product-scope deferrals. |
| `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` | During closure only: add textual fixed/deferred/not-reproducible status rows. |
| Future `_docs/_TASKS/TASK-*.md` | Create only for deferred report rows outside the current TASK-256 executable leaves; include concrete owner/test rows and keep `_docs/_TASKS/README.md` statistics synchronized. |

## Implementation Pseudocode

```ts
type Task256ContractClass =
  | "mode-atomic-update"
  | "clear-none-token"
  | "slot-placeholder"
  | "runtime-instance-a11y"
  | "truthful-control"
  | "safe-public-output"
  | "future-product-scope"
  | "not-reproducible"
  | "resolved-non-bug";

type ReportFindingClassification = {
  reportPath: string;
  findingId: string;
  className: Task256ContractClass;
  ownerTask?: string;
  reason: string;
  followUpTaskId?: string;
};

function classifyTask256Finding(finding: ReportFinding): ReportFindingClassification {
  if (finding.isResolved || finding.isNonBug) return resolvedNonBug(finding);
  if (finding.requiresNewProductSurface) return futureProductScope(finding);
  const ownerTask = findExecutableTask256Leaf(finding);
  if (ownerTask) return mapToSharedContractTask(finding, ownerTask);
  return futureSharedContractTask(finding);
}
```

Error handling:

- If a finding mixes shared-contract drift with product expansion, split it into
  two rows: shared repair in TASK-256 and future product scope in a later task.
- If the report evidence is incomplete, TASK-256-08 records it as
  `needs-refresh` and does not mark the corresponding contract fixed.
- If a finding names a widget but the same failure class exists elsewhere, route
  through the shared owner only when that owner has a physical TASK-256 leaf
  with concrete files and tests. Otherwise TASK-256-08 opens a future physical
  task and TASK-256 does not implement the row.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: classification must preserve existing schema-owned
  validation and must not move public write logic into widget JSON.
- Anti-abuse: public form, booking, listing, and media findings that affect
  public runtime safety must map to existing shared runtime/security owners.
- Secret handling: reports and classification rows must not include secrets,
  private URLs, nonce values, provider keys, or raw privileged payloads.

## Testing Requirements

- Docs-only classification edits: `git diff --check`.
- If this classification creates product-scope follow-up task files, verify
  `_docs/_TASKS/README.md` statistics and table rows.
- No production tests are required for classification-only edits.
- TASK-256-08 remains responsible for running the targeted production suites
  after implementation leaves land.

## Documentation Updates Required

- Update TASK-256 umbrella source report coverage.
- Update TASK-256-08 final closure matrix.
- Update `_docs/_TASKS/README.md` when status/title changes occur.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every current Playwright widget report is listed in a classification matrix.
- Every high/medium/low shared-contract finding is routed to an executable
  TASK-256 physical leaf, explicitly marked not reproducible/resolved, or
  deferred to a future physical task when no current leaf owns it.
- Product-feature findings are deferred to future physical tasks and are not
  implemented as TASK-256 widget-specific work.
- TASK-256-08 has enough evidence to close without rediscovering report scope.
