# TASK-404-05: SEO Media and Launch Readiness Validation
# FileName: TASK-404-05_SEO_Media_and_Launch_Readiness_Validation.md

**Priority:** High
**Category:** Assistant + SEO + Media + Validation
**Estimated Effort:** Large
**Dependencies:** TASK-404-01, TASK-404-02, TASK-404-03, TASK-404-04
**Status:** To Do

---

## Overview

Add SEO, media, and launch-readiness validation so full-service plans can prove
they are complete before claiming readiness. This leaf must make dry-run and
execute results explain which launch requirements are satisfied, missing, or
gated.

## Sub-Tasks

- Add safe SEO action assembly for all main pages and sample entries.
- Resolve SEO targets through same-plan locators from TASK-404-02.
- Define OG title/description/image support or explicitly gate unsupported OG
  fields.
- Attach existing trusted media ids only; raw uploads and remote URLs stay gated.
- Add a launch readiness checklist to plan/dry-run/execute metadata.
- Update admin review UI only if the existing review cannot show readiness
  clearly.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/blueprints/fullServiceSiteBlueprint.ts` | Emit SEO/media/readiness requirements. |
| `core/services/assistant/blueprints/blueprintExistingResourceMatcher.ts` | Reuse trusted media ids only. |
| `core/services/assistant/blueprints/blueprintConflictResolver.ts` | Add/confirm missing media and SEO target gates. |
| `core/services/assistant/actionPlanTypes.ts` | Extend SEO/readiness metadata if needed. |
| `core/services/assistant/actionPlanSchema.ts` | Strict SEO/readiness normalization. |
| `core/services/assistant/actionExecutorService.ts` | Dry-run/execute SEO with locator support and readiness checks. |
| `core/admin/ui/assistant/components/ActionPlanReview.tsx` | Show launch readiness checklist if metadata requires new UI. |
| `core/site/renderPublicPage.tsx` | Change only if OG output contract is missing and source-of-truth docs approve it. |
| `tests/vitest/assistant/*` | SEO/media/readiness planner and schema tests. |
| `tests/vitest/ui/assistant-panel*.tsx` | Review UI tests if UI changes. |
| `tests/unit/assistant/actionExecutorService.test.ts` | SEO/readiness dry-run and execute tests. |

## Implementation Pseudocode

```ts
function buildLaunchReadiness(plan: AssistantActionPlan): LaunchReadinessChecklist {
  const pages = collectPlannedPages(plan.actions);
  const samples = collectPlannedSamples(plan.actions);
  const seo = collectPlannedSeo(plan.actions);
  const menu = collectPlannedMenu(plan.actions);
  const media = collectTrustedMediaReferences(plan.actions);

  return {
    pages: checkRequiredPages(pages),
    content: checkSampleMinimums(samples, { services: 3, portfolio: 3 }),
    navigation: checkNavigationCoverage(menu, pages),
    seo: checkSeoCoverage(seo, pages),
    media: checkMediaReferences(media),
    publicRuntime: { status: "pending_execute" },
  };
}

function buildSeoActions(
  pages: PlannedPage[],
  sampleEntries: PlannedSampleEntry[],
  locators: SamePlanLocators
) {
  const pageSeo = pages.map((page) => ({
    id: `seo-${page.role}`,
    type: "seo.document.upsert",
    title: `Set SEO for ${page.title}`,
    description: `Create SEO metadata for ${page.slug}.`,
    input: {
      targetType: "page",
      targetId: locators.page(page.slug),
      seo: {
        slug: page.slug,
        title: page.seoTitle,
        description: page.seoDescription,
        canonicalUrl: page.slug,
        robots: "index,follow",
      },
    },
  }));

  const entrySeo = sampleEntries.map((entry) => ({
    id: `seo-entry-${entry.contentTypeSlug}-${entry.slug}`,
    type: "seo.document.upsert",
    title: `Set SEO for ${entry.title}`,
    description: `Create SEO metadata for ${entry.slug}.`,
    input: {
      targetType: "entry",
      targetId: locators.entry(entry.contentTypeSlug, entry.slug),
      seo: {
        slug: entry.slug,
        title: entry.seoTitle,
        description: entry.seoDescription,
        robots: "index,follow",
      },
    },
  }));

  return [...pageSeo, ...entrySeo];
}
```

Data flow:

- Full-service composer emits SEO and readiness requirements.
- Same-plan locators resolve page/entry ids for SEO writes.
- Media references resolve only by trusted existing media id; unresolved media
  returns a gate.
- Dry-run shows readiness status before execute.
- Execute validates public runtime output and updates readiness evidence.

Error handling:

- Missing SEO target locator returns `assistant_action_locator_unresolved`.
- Unsupported OG field returns `assistant_seo_capability_gated` or is excluded
  with an explicit readiness note.
- Raw media URL/upload bytes return existing media gate errors.
- Missing required readiness item prevents `ready` launch claim.

## Security Contract

- Endpoint visibility: existing internal assistant action routes.
- Auth model: admin session.
- RBAC:
  - SEO plan/dry-run require `content:read`,
  - SEO execute requires `content:write`,
  - media attach/reference requires `media:read` + content write where used,
  - public runtime checks are read-only.
- CSRF: required on POST routes.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: SEO/readiness/media locator payloads reject unknown
  fields.
- Anti-abuse:
  - no public assistant writes,
  - raw media upload/import/generation remains gated,
  - no assistant nonce/HMAC/reCAPTCHA path.
- Secret handling:
  - readiness and SEO diagnostics may include slugs, titles, counts, and gate
    codes only,
  - no provider keys, cookies, CSRF tokens, raw prompt text, upload bytes,
    signed URLs, or secret-like settings.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/blueprint-existing-resource-matcher.test.ts tests/vitest/assistant/blueprint-conflict-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
  if review UI changes.
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
- Add public runtime assertions for SEO head basics and trusted media behavior.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `docs/develop/assistant.md`

## Acceptance Criteria

- Full-service dry-run explains page/content/nav/SEO/media readiness.
- SEO metadata is created for main pages and launch sample entries, or
  explicitly gated where target resolution/support is unavailable.
- Raw media URLs/uploads cannot pass as launch-ready media.
- Public runtime checks prove non-placeholder title, description, canonical, and
  robots basics for main pages.
