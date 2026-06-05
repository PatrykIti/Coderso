# TASK-407-04-L02: Advanced Menu Hero and Section Options
# FileName: TASK-407-04-L02-Advanced-Menu-Hero-and-Section-Options.md

**Parent Subtask:** TASK-407-04
**Priority:** High
**Category:** Assistant + Advanced Layout Options
**Estimated Effort:** Medium
**Dependencies:** TASK-407-04-L01
**Status:** ⏳ To Do

---

## Overview

Define controlled Advanced choices for menu behavior, hero variants, and section
variants, mapped to existing widget/module capabilities.

## Sub-Tasks

- Add menu behavior options: single-level, grouped, sticky, transparent,
  nontransparent, mobile drawer behavior, and CTA destination where supported.
- Add hero variants and section variants backed by existing widgets.
- Map Advanced choices to normalized facts without touching UI controls.
- Gate unsupported combinations instead of inventing widgets or custom code.

## Security Contract

- Endpoint visibility: no new endpoint.
- Auth model: unchanged existing admin session.
- RBAC: unchanged until action assembly.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: menu/hero/section option ids and CTA destination
  ids must resolve from backend-owned registries or trusted resource catalogs.
- Anti-abuse: Advanced choices cannot inject arbitrary hrefs, scripts, widget
  aliases, or layout code.
- Secret handling: option metadata and derived facts must not include secrets,
  auth state, provider keys, signed URLs, or raw prompt text.

## Files To Change

| Area | Files |
|---|---|
| Options | `core/services/assistant/assistantSiteBuilderIntakeAdvancedOptions.ts` |
| Facts | `core/services/assistant/assistantSiteBuilderIntakeFacts.ts` |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeAdvancedOptions.test.ts` |

## Implementation Pseudocode

```ts
export function normalizeAdvancedLayoutOptions(input: unknown) {
  const record = readRecord(input);
  rejectUnknownKeys(record, ["menuBehavior", "heroVariant", "sectionVariants", "ctaTargetId"]);
  return {
    menuBehavior: resolveAdvancedMenuBehavior(record.menuBehavior),
    heroVariant: resolveHeroVariant(record.heroVariant),
    sectionVariants: resolveSectionVariants(record.sectionVariants),
    ctaTarget: resolveTrustedCtaTarget(record.ctaTargetId),
  };
}
```

## Data Flow and Error Handling

- Advanced answers resolve to menu/hero/section facts before review and planner
  assembly.
- Unsupported widget variants, unsafe CTA destinations, unknown ids, or invalid
  combinations become gates or validation errors.
- UI leaves later render these choices from the same registries.

## Testing Requirements

- Tests for valid option normalization.
- Tests for unknown option ids, unsafe CTA targets, and unsupported combinations.
- Tests that options map only to supported widget/module capabilities.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`

## Acceptance Criteria

- Advanced menu/hero/section choices are controlled and registry-backed.
- Unsupported combinations are explicit gates.
- No free-form layout/code path is introduced.
