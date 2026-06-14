# TASK-417-06-L02: Blueprint Emitters Executor And Policy Cutover
# FileName: TASK-417-06-L02-Blueprint-Emitters-Executor-And-Policy-Cutover.md

**Parent Subtask:** TASK-417-06
**Priority:** High
**Category:** Assistant / Execution
**Estimated Effort:** Large
**Dependencies:** TASK-417-06-L01, TASK-417-03-L01, TASK-417-04-L01, TASK-417-04-L02
**Status:** ✅ Done

---

## Overview

Cut assistant blueprints, site-builder emitters, action mapper, executor, policy,
diff, undo metadata, and follow-up handling so assistant-generated Pages use v2
sections and render successfully in the public runtime.

---

## Security Contract

- **Endpoint visibility:** internal assistant admin endpoints.
- **Auth model:** existing admin session, assistant availability gates, and
  provider settings.
- **RBAC:** existing assistant/content permissions.
- **CSRF:** execute routes remain admin write paths with CSRF.
- **Rate-limit bucket:** existing assistant/provider quota and admin buckets.
- **Validation:** provider drafts are normalized into v2 Page actions through
  local schemas before dry-run or execute.
- **Anti-abuse controls:** prompt-poisoning guards, redaction, review gates,
  policy checks, and local executor validation remain in force.

---

## Sub-Tasks

- [x] Rewrite Page blueprint section composers to emit v2 Page sections.
- [x] Update `page.upsert` executor to persist v2 data through Pages services.
- [x] Remove/gate Page-specific widget patch execution.
- [x] Rewrite existing "page section" blueprint helpers that currently emit
  `WidgetBlock[]`; the term "section" must mean Pages v2 `PageSectionV2` after
  this leaf.
- [x] Update action diff, undo manifest, conflict resolver, target resolver, and
  follow-up resolver for sections.
- [x] Prove assistant-generated Pages render in the v2 public runtime.

---

## Implementation Pseudocode

```ts
function buildPageUpsertActionV2(plan: BlueprintPlan): AssistantPlannedAction {
  return {
    type: "page.upsert",
    input: {
      title: plan.title,
      slug: plan.slug,
      data: createPageDocumentFromBlueprintSections(plan.sections),
    },
  };
}

async function executePageUpsertV2(action: PageUpsertActionV2, ctx: ExecuteContext) {
  const data = normalizePageDocumentV2(action.input.data);
  return upsertPageBySlug({ title: action.input.title, slug: action.input.slug, data }, ctx);
}
```

Expected data flow:

- Planner/blueprint emits Page sections.
- Dry-run previews v2 sections.
- Execute persists v2 `currentData`.
- Public runtime renders generated Pages without widget fallback.

Error handling:

- Unsupported provider section intents become review gates rather than invalid
  widget payloads.
- Conflicting Page actions merge or fail through existing conflict resolver
  semantics updated for sections.
- Page action undo metadata records v2-safe snapshots.

Regression-test shape:

- Vitest assistant blueprint/action schema/policy tests.
- Bun assistant dry-run/execute tests that publish or preview generated Pages
  through the v2 runtime.

---

## Testing Requirements

- Targeted Vitest assistant blueprint/planner suites.
- Targeted Bun assistant route/executor suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/guide/` assistant docs if user-facing behavior changes.
