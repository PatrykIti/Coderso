# TASK-336-19: Remaining Widget UI Mode Drift Cleanup

# FileName: TASK-336-19_Remaining_Widget_UI_Mode_Drift_Cleanup.md

**Priority:** High
**Category:** Widgets + Admin UI + UX Contract
**Estimated Effort:** Very Large
**Dependencies:** TASK-336-18
**Status:** In Progress (2026-05-24)

---

## Overview

Clean up the high/medium UI mode drift discovered while adding strict
`editorContract` metadata to the remaining page-builder widgets.

`TASK-336-18` defines the target ownership contract. This follow-up must bring
the actual editor UI into that contract so nontechnical users are not asked to
enter raw CSS tokens, JSON, HTML, IDs, or web-development-specific values in
normal Wizard/Visual flows.

## TASK-336-18 Intake Findings

Authenticated Playwright admin smoke
`widget-contract-smoke-task-336-18-admin-auth-2026-05-24.*` captured the
initial drift baseline for this cleanup:

- `adminFailures=9`, `fixtureGaps=19`, `metadataGaps=2`.
- Mode-root or visible-section failures: `feature-grid`, `pricing-plans`,
  `faq-accordion`, `cta-banner`, `gallery-mosaic`, `team`,
  `rich-text-section`, `navigation`, `footer`.
- Metadata gaps: `toggle-block` (`wizard`, `visual`, `advanced`) and
  `logo-cloud` Visual repeated-logo controls.
- Fixture/unopenable mode gaps include structural/admin-selection issues for
  `template-section`, `split-layout`, `accordion`, `spacer`, `stack`,
  `content-list`, `entry-teaser`, `product-compare`, `listing-filters`,
  `timeline`, `newsletter`, `appointment-form`, `contact`, and `footer`.
- Static/read-only audits also found writable Advanced controls and raw
  ID/JSON/HTML/CSS-token/technical URL fields across the in-scope editors.

## Claude UX Review Intake

The 2026-05-24 read-only Claude review accepted the target split: Wizard
handles one-time setup, Visual handles daily editing, and Advanced stays
read-only diagnostics. It added these concrete cleanup requirements:

- Replace editable `formId`, `menuKey`, `assetId`, and item-id fields with
  form, menu, media, and item pickers, or move them to read-only diagnostics.
- Resolve the `contact` `map.embedUrl` contradiction before closure: it cannot
  be both a Visual raw URL input and an Advanced read-only diagnostic unless
  the Visual UI is a sanitizer-gated map picker or paste flow with
  nontechnical copy.
- Ensure rich HTML paths such as testimonial quote HTML and rich feature
  descriptions render through a rich-text editor, never a raw HTML textarea.
- Move FAQ JSON-LD controls out of ordinary content editing into a clear SEO
  section or a sitewide SEO surface.
- Standardize Advanced contract-summary diagnostics across the remaining
  widgets after the UI ownership is corrected.
- Mask or omit `contact.resolved.submissionNonce` and similarly sensitive
  runtime data from any rendered Advanced diagnostic summary.

## Widgets in Scope

- Interactive/content: `toggle-block`, `faq-accordion`, `timeline`,
  `compare-timeline`, `rich-text-section`
- Marketing/trust/media: `feature-grid`, `testimonials`, `pricing-plans`,
  `cta-banner`, `logo-cloud`, `gallery-mosaic`
- Dynamic/commerce/source: `entry-teaser`, `product-gallery`,
  `product-compare`, `newsletter`, `contact`
- Site chrome: `navigation`, `footer`

## Sub-Tasks

- [x] Add missing Wizard/Advanced section DOM metadata and classify
  non-persisted custom controls as `preview` or `action` so Playwright can
  distinguish metadata drift from real editable controls.
- [ ] Remove Wizard ownership of style/layout fields that were only tolerated
  during replayable setup.
- [ ] Move daily content/style/behavior controls from Advanced into Visual or
  convert them to read-only Advanced summaries.
- [ ] Replace raw ID/JSON/HTML/URL user inputs in Wizard/Visual with pickers,
  preset controls, preview cards, or support-only diagnostics.
- [ ] Keep source IDs, query payloads, sanitizer output, runtime payloads, and
  integration metadata read-only in Advanced unless the product explicitly
  marks a support-only repair action.
- [ ] Confirm destructive normalization/reset/import actions before mutation.
- [ ] Re-run Playwright CLI smoke for the affected widgets and ensure no
  duplicate writable owners remain outside explicit temporary allowances.
- [ ] Record accepted/rejected Claude UX review feedback in the task notes.

## Status Notes

- In Progress (2026-05-24): first implementation family targets DOM metadata
  drift from the authenticated Playwright baseline. It adds missing Wizard or
  Advanced `WidgetEditorSection` markers for `feature-grid`, `pricing-plans`,
  `faq-accordion`, `cta-banner`, `gallery-mosaic`, `team`,
  `rich-text-section`, `navigation`, and `footer`, and classifies non-persisted
  custom controls in `toggle-block`, `logo-cloud`, and `feature-grid` as
  `preview` or `action`.
- In Progress (2026-05-24): fresh helper-agent refinement accepted this family
  as safe DOM metadata cleanup and separately queued raw media URL replacement
  with existing `MediaPicker` surfaces for the next family.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the 11 touched widgets now reports `adminFailures=0` and `metadataGaps=0` for
  each widget. Remaining fixture gaps are still visible for the `advanced`
  probes of `pricing-plans`, `cta-banner`, `team`, `navigation`, and
  `toggle-block`; these are not closed by the DOM metadata family.
- In Progress (2026-05-24): full 38-widget admin smoke was attempted but
  stopped after the unchanged `spacer` advanced probe hung without producing a
  report. Targeted widget evidence is recorded under
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-dom-admin-*-2026-05-24.*`.
- In Progress (2026-05-24): second implementation family removes editable raw
  image/media URL fields from normal Wizard/Visual flows in `navigation`,
  `cta-banner`, `testimonials`, `feature-grid`, and `logo-cloud`. The editors
  now use existing `MediaPicker` controls and keep legacy external image values
  as read-only replace/clear notices without changing the persisted widget
  schema. General CTA/navigation/link URL fields remain queued for a separate
  link/page-picker family.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the five raw-media cleanup widgets reports `adminFailures=0` and
  `metadataGaps=0` for every widget. `navigation`, `testimonials`, and
  `logo-cloud` have `fixtureGaps=0`; `cta-banner` and `feature-grid` still show
  unchanged Advanced fixture-selection gaps (`block_select_missing`).
- In Progress (2026-05-24): third implementation family replaces editable raw
  `href`/URL/path fields in normal Wizard/Visual flows for `navigation`,
  `cta-banner`, `logo-cloud`, `testimonials`, and `feature-grid` with the
  shared `LinkDestinationField`. The field loads published pages, writes back
  the existing string `href` contract, and preserves legacy custom/hash/external
  destinations as read-only replace/clear state. Claude read-only UI/UX review
  accepted the page-first/read-only-legacy approach for this slice and required
  filtering page options to `published` plus removing the new-logo `href: "#"`
  seed, both of which are included.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the five link-destination widgets reports `adminFailures=0`,
  `metadataGaps=0`, and authenticated admin reachability for every widget.
  `navigation`, `logo-cloud`, and `feature-grid` have `fixtureGaps=0`;
  `cta-banner` and `testimonials` still show unchanged Advanced
  fixture-selection gaps (`block_select_missing`).
- In Progress (2026-05-24): fourth implementation family resolves the explicit
  `contact` map/social authoring contradiction. Visual now asks for a public
  map location/address and known social profile names/handles, then writes the
  existing `map.embedUrl` and `contact.social[].href` string fields through
  Contact-owned helpers. Legacy custom map/social destinations remain
  backward-compatible replace/clear states instead of editable raw URL fields.
  Advanced map metadata is read-only, and Contact normalization is a
  confirm-gated support action. Claude recommended a sanitizer-gated paste
  flow; this slice intentionally uses location/profile-name authoring because
  the user requirement was stricter than paste-a-URL authoring.
- In Progress (2026-05-24): Claude post-implementation review flagged three
  pre-commit blockers, all addressed in this slice: Wizard no longer writes
  `form.submission.staticMessage` outside its declared contract, the Contact
  Advanced contract no longer lists the nonexistent `runtime.normalizedData`
  path, and new social rows start from a known platform instead of a dead-end
  `custom` choice. Full social URLs pasted into known-platform profile fields
  are parsed or rejected instead of being encoded as profile handles.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  `contact` reports `adminFailures=0`, `publicFailures=0`, `fixtureGaps=0`,
  and `metadataGaps=0` in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-contact-authoring-admin-2026-05-24.*`.
- In Progress (2026-05-24): fifth implementation family converts Advanced
  second-editor controls in `faq-accordion`, `newsletter`, and `navigation` to
  read-only diagnostics. FAQ and Newsletter keep only two-step confirmed
  normalization support actions. Navigation layout width/spacing and
  sticky/collapse behavior move into Visual, Advanced redacts raw `menuKey` to
  configured/not-configured status, and the contract no longer declares
  nonexistent `cta.target` or `cta.enabled` paths. Claude and helper-agent
  review agreed the one-time Wizard lifecycle remains separate under
  `TASK-336-16`; this batch only addresses Advanced drift. FAQ Visual SEO copy
  now uses beginner-facing search visibility wording instead of raw `JSON-LD`
  terminology.
- In Progress (2026-05-24): targeted authenticated Playwright admin smoke for
  the Advanced read-only batch is stored in
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-advanced-readonly-admin-*-2026-05-24.*`.
  `faq-accordion` and `navigation` report `adminFailures=0`,
  `publicFailures=0`, `fixtureGaps=0`, and `metadataGaps=0`. `newsletter`
  reports `adminFailures=0`, `publicFailures=0`, and `metadataGaps=0`, with an
  unchanged admin fixture gap (`block_select_missing`) that prevents opening
  widget modes in the harness.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/*Editors.tsx` | Align actual controls with the `TASK-336-18` contract. |
| `core/widgets/core/*` | Remove temporary duplicate allowances after UI ownership is corrected. |
| `tests/vitest/widgets/*test.tsx` | Add focused widget contract tests where ownership changed. |
| `tests/vitest/ui/*editor-wave.test.tsx` | Add/extend editor wave coverage for mode-specific UI. |
| `_docs/_WIDGETS/*` | Document final mode ownership and support-only diagnostics. |
| `_docs/PLAYWRIGHT/*` | Store final smoke evidence. |

## Implementation Pseudocode

```ts
for (const widgetType of task33619WidgetTypes) {
  const editor = loadEditor(widgetType);
  moveControls({
    from: "wizard",
    to: "visual",
    paths: contract.visualWritablePaths.filter(isStyleOrLayoutPath),
  });
  convertAdvancedControls({
    writableControls: editor.advanced.controls,
    policy: "readonly-summary-or-confirmed-support-action",
  });
  replaceRawInputs({
    rawKinds: ["css-token", "json", "html", "id-list", "webhook-id"],
    replacement: "picker-or-readonly-diagnostic",
  });
  assertStrictContract(widgetType);
}
```

Data flow:

- The source of truth is the widget's exported `editorContract`.
- Visual remains the daily owner for content, presentation, behavior, and safe
  pickers.
- Advanced shows normalized/runtime diagnostics and confirmed support actions.

Error handling:

- Do not add broad duplicate allowlists to make tests pass.
- Do not expose raw IDs as editable fields for a nontechnical user.
- Destructive imports/resets must be confirm-gated and tested.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve existing widget schemas.
- Anti-abuse: no raw script, unsafe URL, public write, nonce, captcha, or HMAC
  changes.
- Secret handling: integration IDs, webhook IDs, source IDs, and runtime
  diagnostics must not expose secrets or privileged provider settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Focused editor wave tests for every touched editor family.
- Focused widget tests for changed render/source behavior.
- Playwright CLI smoke for all touched widgets.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

Regression-test shape:

- Advanced diagnostics sections stay read-only.
- Wizard does not own style/layout paths.
- Raw JSON/HTML/ID/CSS-token fields are not visible as normal Wizard/Visual
  controls.
- Temporary duplicate allowances added in `TASK-336-18` are removed or reduced
  to the true one-time Wizard lifecycle.

## Documentation Updates Required

- Update affected `_docs/_WIDGETS/*` mode ownership sections.
- Update `_docs/WIDGETS.md` if the shared Wizard/Visual/Advanced contract
  changes.
- Add Playwright evidence under `_docs/PLAYWRIGHT/`.
- Add a changelog entry and synchronize `_docs/_TASKS/README.md` on closure.

## Acceptance Criteria

- Remaining widget editors match the strict ownership model from
  `TASK-336-18`.
- Nontechnical users do not see raw CSS, JSON, HTML, IDs, or integration
  tokens as normal editing controls.
- Playwright admin smoke has zero duplicate-owner and metadata-gap findings for
  the touched widgets.
- Temporary duplicate allowances from `TASK-336-18` are either removed or tied
  only to the completed one-time Wizard lifecycle.
