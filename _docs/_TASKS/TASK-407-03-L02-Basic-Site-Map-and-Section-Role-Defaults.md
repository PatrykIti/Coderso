# TASK-407-03-L02: Basic Site Map and Section Role Defaults
# FileName: TASK-407-03-L02-Basic-Site-Map-and-Section-Role-Defaults.md

**Parent Subtask:** TASK-407-03
**Priority:** High
**Category:** Assistant + Basic Defaults
**Estimated Effort:** Medium
**Dependencies:** TASK-407-03-L01
**Status:** ⏳ To Do

---

## Overview

Define beginner-safe page roles, menu defaults, route labels, and homepage
section-role presets for Basic mode without hardcoding one industry.

## Sub-Tasks

- Add starter page-role presets such as home, services, proof, about, projects
  or work, FAQ, and contact.
- Add menu defaults for single-level and grouped menus with bounded labels.
- Add homepage section-role defaults keyed by broad goals, not industries.
- Normalize custom label text as content hints only; route slugs remain
  generated through existing safe slug helpers.

## Security Contract

- Endpoint visibility: no new endpoint.
- Auth model: unchanged existing admin session.
- RBAC: unchanged until actions are assembled by later leaves.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject unknown validation: page roles, menu presets, and section roles must
  resolve through backend registries.
- Anti-abuse: user labels cannot inject URLs, scripts, action ids, or route
  overrides outside supported page/menu roles.
- Secret handling: page/menu defaults must not persist secret-like prompt text
  or raw provider output.

## Files To Change

| Area | Files |
|---|---|
| Defaults | `core/services/assistant/assistantSiteBuilderIntakeBasicDefaults.ts` |
| Facts | `core/services/assistant/assistantSiteBuilderIntakeFacts.ts` |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeBasicDefaults.test.ts` |

## Implementation Pseudocode

```ts
export function deriveBasicSiteMapFacts(answers: BasicIntakeAnswers) {
  const pageRoles = resolvePageRoles(answers.pages ?? DEFAULT_BASIC_PAGE_ROLES);
  const menu = resolveBasicMenuPreset(answers.menuPreset ?? "single-level");
  return {
    pageRoles,
    routes: pageRoles.map((role) => buildSafeRouteForRole(role)),
    menu,
    menuItems: buildMenuItemsFromRoles(pageRoles, menu),
    homepageSectionRoles: resolveHomepageSectionRoles(answers.goalIds, answers.sectionRoleIds),
  };
}
```

## Data Flow and Error Handling

- Basic answers choose from page/menu/section options; defaults fill gaps only
  after the user reaches the relevant step.
- Invalid role ids, unsafe labels, duplicate routes, or unsupported menu nesting
  return validation errors or `needs_input`.
- Defaults stay generic and goal-based so the assistant can serve multiple
  industries.

## Testing Requirements

- Tests for default page roles and menu shape.
- Tests for non-industry-specific defaults across several broad goals.
- Tests for unsafe labels and unknown page/menu/section ids.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for Basic defaults.

## Acceptance Criteria

- Basic site-map defaults are generic and deterministic.
- Unsafe or unknown page/menu/section input fails closed.
- Implementers can add new role presets without touching route validation.
