# TASK-256-07: Cross-Report Shared Contract Classification

# FileName: TASK-256-07_Cross_Report_Shared_Contract_Classification.md

**Priority:** High
**Category:** Widgets + Playwright QA + Contract Classification
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04
**Status:** To Do

---

## Overview

Classify every current Playwright widget report against the shared TASK-256
contracts before implementation closes. This leaf is not a per-widget
implementation backlog. It is the routing layer that prevents completed reports
from widening TASK-256 into one-off widget feature work.

Every report finding must end in one of these classification buckets. A finding
may be routed to a TASK-256 implementation leaf only when that leaf has a
physical task file with concrete owner and test rows for the relevant shared
contract. If a completed report exposes a shared-contract class that no current
TASK-256 leaf owns executably, TASK-256-08 must create a future physical task
instead of widening this family into a per-widget implementation backlog.

- `TASK-256-01`: shared editor mode, atomic block updates, and mode ownership.
- `TASK-256-02`: `Clear`, `none`, token picker, custom value, and CSS-variable
  preservation semantics.
- `TASK-256-03`: slot/nested-content metadata and public placeholder gating.
- `TASK-256-04`: instance-safe IDs, scoped runtime scripts, form state, and
  accessibility relationships.
- `TASK-256-05`: truthful controls, variant-bound data, inert/duplicated
  controls, and editor-visible state that does not match runtime output.
- `TASK-256-06`: safe public href/media output, public form/runtime safety,
  section/header semantics, and anti-abuse boundaries.
- `TASK-256-08`: closure evidence, explicit non-reproducible rows, or physical
  future tasks for product expansion or shared-contract rows not owned by an
  existing TASK-256 implementation leaf.

## Drift Evidence

The first TASK-256 draft missed reports that were completed later or were not
part of the early structural/marketing pass. These reports still contain shared
contract findings that must be classified before closure:

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

| Report group | Shared-contract classes to route | Out of TASK-256 unless a current control is broken |
|---|---|---|
| Form widgets: contact, newsletter, form-embed | Form `name`/autocomplete/label semantics, consent/form containment, success/error `aria-live`, mode ownership, clear controls, URL validation, public submission anti-abuse | New form field builders, marketing integrations, analytics, double opt-in, large form product features |
| Booking widgets: booking-calendar, appointment-form | Admin preview vs public runtime parity, scoped runtime state, slot/form ARIA, stale error cleanup, nonce/runtime-only field boundaries, past-date/runtime request safety | Calendar UI redesign, service pricing UX, captcha UI, legal consent product configuration |
| Shell/content composites: footer, compare-timeline, rich-text-section | Safe links, ARIA/heading semantics, duplicated controls, clear/token controls, dynamic grid/control truthfulness, mode reset/output-mode truthfulness | New brand/social icon systems, WYSIWYG editor, SEO schemas, drag/drop and advanced typography |
| Commerce widgets: product-gallery, product-compare, product-table | Safe href/media output, table/list semantics, status text accessibility, runtime error/empty states, editor controls with no runtime effect | Commerce catalog features, new merchandising layout variants, advanced filtering/product table product scope |
| Dynamic widgets: content-list, navigation, posts-feed, entry-teaser, listing-filters | Truthful controls, safe href/media, listing runtime token validation, sticky/layout ownership, accessibility/focus/runtime state | Pagination widgets, taxonomy pickers, active chips, complex menu IA, broad content-query expansion |

Footer, Compare Timeline, and Rich Text Section reports enter TASK-256 only by
shared contract class. Safe link and media output route to TASK-256-06-02 or
TASK-256-06-04; duplicated or ineffective controls route to TASK-256-01,
TASK-256-02, or TASK-256-05; heading, focus, and ARIA rows route to TASK-256-04
or TASK-256-06. Brand systems, WYSIWYG behavior, icon expansion, advanced
typography, and other product-specific work must be recorded by TASK-256-08 as
future physical task scope instead of being implemented in this family.

## Files to Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-256_Widget_Shared_Contract_Playwright_Drift_Repair.md` | Keep the source report list complete and describe reports as evidence for shared contracts, not per-widget implementation families. |
| `_docs/_TASKS/TASK-256-08_Playwright_Report_Completion_and_Closure.md` | Add final classification evidence and future task IDs for product-scope deferrals. |
| `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` | During closure only: add textual fixed/deferred/not-reproducible status rows. |
| Future `_docs/_TASKS/TASK-*.md` | Create only for deferred product-scope work that TASK-256 intentionally does not implement. |

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
