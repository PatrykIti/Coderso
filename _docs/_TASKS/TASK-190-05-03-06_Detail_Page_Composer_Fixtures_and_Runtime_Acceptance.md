# TASK-190-05-03-06: Detail Page Composer Fixtures and Runtime Acceptance
# FileName: TASK-190-05-03-06_Detail_Page_Composer_Fixtures_and_Runtime_Acceptance.md

**Priority:** High
**Category:** QA + Runtime Acceptance
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-04, TASK-190-05-03-05, TASK-190-05-03-07
**Status:** To Do

---

## Overview

Add fixture and acceptance coverage proving that composed detail page contracts
work end-to-end and do not regress current public content route behavior.

## Sub-Tasks

No child task files.

## Files to Change

- Add `tests/vitest/assistant/blueprint-detail-page-fixtures.test.ts`
- Add `tests/integration/runtime/detail-page-composer-runtime.test.tsx`

Sequencing rule:

- this leaf owns the dedicated local detail-page fixture files above,
- shared `tests/vitest/assistant/blueprint-composition-fixtures.test.ts`
  remains `TASK-190-08`-owned until that later leaf creates the shared matrix
  file; only then may those cases be folded into the broader corpus,
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` remains `TASK-190-08`-owned together
  with the shared live/provider matrix; this leaf should not update live
  coverage docs while local deterministic fixtures are still the only owner
  surface,
- live matrix updates stay deferred until local deterministic fixtures are
  green.

## Fixture Matrix

Required local fixtures:

- house project catalog:
  - list page + detail page,
  - gallery/spec table/price/CTA/form/related projects,
  - public runtime render for one published entry.
- product catalog:
  - product detail gallery/spec/inquiry form,
  - checkout/payment remains gated.
- services directory:
  - service detail offer/process/FAQ/CTA,
  - booking remains gated until typed booking adapter exists.
- portfolio case study:
  - challenge/solution/result/testimonial/gallery/CTA.
- negative:
  - missing field binding,
  - secret field binding,
  - duplicate route,
  - provider-injected action payload.

## Acceptance Criteria

1. Composer creates a valid detail page document for each supported fixture.
2. Canonical content routes link to detail page documents through
   `site.contentRoutes.detailPageId`, with no second route source-of-truth in
   the document itself.
3. Runtime renders composed detail pages for published entries.
4. Draft entries do not render publicly.
5. Preview renders draft detail data only with valid token.
6. Existing legacy content detail routes still work without a detail document.
7. Gated domains appear in review metadata but not executable actions.

## Pseudocode

```ts
for (const fixture of detailPageFixtures) {
  const plan = planAssistantActions({
    prompt: fixture.prompt,
    context: fixture.context,
  });
  expect(plan.actions).toContainAction("detail-page.upsert");
  await dryRunAssistantActionPlan({ plan });
  await executeAssistantActionPlan({ plan, actorId: fixture.actorId });
  await assertPublicRuntimeMatchesFixture(fixture);
}
```

## Security Contract

- Visibility: QA fixtures plus public read runtime tests.
- Auth model: test admin actor for execution; public runtime read for rendering.
- RBAC: execute tests use existing action permissions.
- CSRF: route-level assistant execute coverage remains existing unless changed.
- Rate-limit bucket: assistant/public_read as applicable.
- Reject-unknown validation: fixtures include invalid provider/document cases.
- Anti-abuse: fixtures use disposable prefixes and cleanup.
- Secret handling: red-team cases verify secret-like fields are not rendered or
  logged.

## Testing Requirements

- Vitest fixture matrix.
- Bun DB-backed runtime acceptance.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Add live provider coverage in TASK-190-08 only after local fixtures pass.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
