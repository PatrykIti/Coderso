# TASK-404-04: Public Sample Content Navigation Footer and Lead Form Actions
# FileName: TASK-404-04_Public_Sample_Content_Navigation_Footer_and_Lead_Form_Actions.md

**Priority:** High
**Category:** Assistant + Content + Menus + Forms + Executor
**Estimated Effort:** Large
**Dependencies:** TASK-404-01, TASK-404-02, TASK-404-03
**Status:** To Do

---

## Overview

Make full-service plans populate public content, global navigation/footer IA,
and the public contact conversion path safely.
Current `entry.upsert-draft` is draft-only, and contract-only sample entry
actions cannot satisfy public launch readiness. This leaf promotes or replaces
the sample-entry gap with a strict executable path and wires deterministic menu
items, footer links, and the lead-capture form for the generated site.

## Sub-Tasks

- Promote a bounded sample-entry action or extend the existing entry action
  model with explicit reviewable publish semantics.
- Create at least three visible service entries and three visible
  portfolio/reference entries for the full-service plan.
- Ensure detail routes render populated entries.
- Add deterministic global navigation through safe `menu.item.upsert` or a
  promoted `menu.structure.patch` contract.
- Add footer IA ownership: footer menu/contact/legal/CTA links must be generated
  through safe menu/footer owner seams or explicitly gated if no owner seam
  exists.
- Reuse or extend the existing `lead-capture-site` capability so `form.upsert`
  for `lead-capture-inquiry` is created in the same full-service plan before
  contact page/runtime assertions run.
- Preserve idempotency and avoid duplicate sample/menu/form resources on rerun.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/actionPlanTypes.ts` | Add/promote strict sample-entry action or publish-capable entry fields. |
| `core/services/assistant/actionPlanSchema.ts` | Validate sample entry input, status, fields, unknown rejection, and bounds. |
| `core/services/assistant/actionRegistry.ts` | Register new executable action only after executor support exists. |
| `core/services/assistant/actionFamilyContracts.ts` | Promote `entry.sample.create` / `entry.bulk-draft.create` or document replacement. |
| `core/services/assistant/actionExecutorService.ts` | Dry-run and execute sample entries and menu updates through domain services. |
| `core/services/assistant/actionUndoManifest.ts` | Add undo/restore behavior for sample entries/menu changes. |
| `core/services/assistant/blueprints/leadCaptureBlueprint.ts` | Reuse/extend `form.upsert` for the public lead-capture form instead of only passing a form slug. |
| `core/services/assistant/blueprints/fullServiceSiteBlueprint.ts` | Emit sample-content and navigation actions. |
| `tests/vitest/assistant/action-plan-schema.test.ts` | Strict sample/menu schema tests. |
| `tests/vitest/assistant/action-family-contracts.test.ts` | Executable/contract status tests. |
| `tests/unit/assistant/actionExecutorService.test.ts` | Dry-run/execute/idempotency tests. |
| `tests/integration/routes/assistant.test.ts` | Permission and invalid-plan route tests. |
| New DB/public runtime suite | Verify sample entries are public and detail routes render. |

## Implementation Pseudocode

```ts
type AssistantEntrySampleCreateAction = {
  id: string;
  type: "entry.sample.create";
  title: string;
  description: string;
  input: {
    contentTypeSlug: "services-directory" | "portfolio-projects";
    status: "published";
    samples: Array<{
      title: string;
      slug: string;
      values: Record<string, unknown>;
      seo?: SeoDraft;
    }>;
  };
};

async function executeEntrySampleCreate(action, ctx) {
  const type = await ctx.deps.contentTypes.getBySlug(action.input.contentTypeSlug);
  const normalizedSamples = action.input.samples.map((sample) =>
    normalizeEntryValuesForSchema(type.schema, sample.values)
  );

  return await ctx.deps.entries.upsertSamples({
    contentTypeId: type.id,
    status: "published",
    samples: normalizedSamples,
    idempotencyKey: ctx.idempotencyKey,
  });
}

function buildNavigationActions(siteMap: FullServicePage[]): AssistantPlannedAction[] {
  return siteMap.flatMap((page, index) => ({
    id: `menu-main-${page.role}`,
    type: "menu.item.upsert",
    title: `Add ${page.label} to main navigation`,
    description: `Create or update the main navigation item for ${page.slug}.`,
    input: {
      menuId: "main",
      label: page.label,
      href: page.slug,
      orderIndex: index,
    },
  }));
}

function buildFooterActions(siteMap: FullServicePage[]): AssistantPlannedAction[] {
  return [
    ...siteMap.map((page, index) => ({
      id: `menu-footer-${page.role}`,
      type: "menu.item.upsert",
      title: `Add ${page.label} to footer navigation`,
      description: `Create or update the footer navigation item for ${page.slug}.`,
      input: {
        menuId: "footer",
        label: page.label,
        href: page.slug,
        orderIndex: index,
      },
    })),
    {
      id: "menu-footer-contact-cta",
      type: "menu.item.upsert",
      title: "Add quote CTA to footer navigation",
      description: "Create or update the footer quote CTA.",
      input: {
        menuId: "footer",
        label: "Zapytaj o wycenę",
        href: "/kontakt",
        orderIndex: siteMap.length,
      },
    },
  ];
}

function buildLeadCaptureActions(): AssistantPlannedAction[] {
  return buildLeadCaptureSitePlan().actions.filter((action) => action.type === "form.upsert");
}
```

Data flow:

- Full-service blueprint creates schema-aware sample content from local presets
  plus bounded provider narrative fields.
- Sample values normalize through content-type schema owners before persistence.
- Menu and footer actions use safe relative hrefs only and stable order indexes.
- Lead-capture form action comes from the existing `lead-capture-site` form owner
  path and is included before contact page/runtime assertions depend on it.
- Dry-run previews sample counts, slugs, menu/footer paths, and form slug without
  leaking raw provider prompt text.

Error handling:

- Unsupported content type or field returns `assistant_entry_sample_invalid`.
- Unknown sample field fails strict schema validation.
- Unsafe menu/footer href is rejected instead of normalized to `#`.
- Missing lead-capture form owner blocks contact conversion readiness instead of
  allowing the contact page to render a dead form reference.
- Duplicate existing sample slug updates idempotently or returns a conflict
  depending on owner contract; no duplicate public entries/menu items/forms are
  created.

## Security Contract

- Endpoint visibility: existing internal assistant action routes only.
- Auth model: admin session.
- RBAC:
  - plan/dry-run sample content require `content:read`,
  - execute published samples requires `content:write` + `content:publish`,
  - plan/dry-run menu requires `menus:read`,
  - execute menu/footer links requires `menus:write`,
  - plan/dry-run form setup requires `forms:read`,
  - execute lead-capture form setup requires `forms:write`.
- CSRF: required on POST routes.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: sample, menu/footer, and form actions must reject
  unknown fields and unsupported content types.
- Anti-abuse:
  - no public write endpoint,
  - no assistant nonce/signature/HMAC,
  - public contact form hardening remains owned by Forms runtime,
  - generated samples are bounded by count, field length, and schema.
- Secret handling:
  - provider keys, session/CSRF, auth headers, raw prompt text, raw form
    submissions, and secret-like fields cannot be persisted in sample values,
    form config, or diagnostics.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
- Add DB/public runtime test proving at least three services and three
  portfolio/reference entries render publicly, detail links resolve, footer links
  resolve, and the public lead-capture form renders through existing Forms
  runtime hardening.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`

## Acceptance Criteria

- Full-service ready plans contain populated public sample content or block as
  `needs_input`.
- Public listings do not show empty-state copy after execute.
- At least one service detail page and one portfolio detail page render real
  sample data.
- Main navigation and footer links resolve and contain no unsafe `#` fallbacks.
- `form.upsert` for the lead-capture form is owned by this leaf, and the public
  contact page cannot pass launch readiness with only a dead `formSlug`.
