# TASK-256-06-04: Team Profile Links and Accessibility

# FileName: TASK-256-06-04_Team_Profile_Links_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Marketing Content + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-04, TASK-256-06
**Status:** To Do

---

## Overview

Repair Team widget report findings that affect truthful editor controls, public
profile link safety, image loading, and accessibility. Defer broad product
expansions such as department filters, CTA sections, or advanced typography
unless they are needed to fix a broken existing control.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md:42-91` for resolver/default cleanup,
  empty photo payload, spotlight columns, section ARIA, hardcoded `h3`, social
  link safety, avatar fallback, and duplicate normalization.
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md:210-264` for editor UX issues around
  spotlight lead, misleading columns, Wizard role fields, photo URL validation,
  social link defaults, and remove flows.
- `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md:328-393` for accessibility and
  priority findings confirmed by Playwright.

## Scope Decision Matrix

| Finding | TASK-256 action | Owner | Follow-up policy |
|---|---|---|---|
| Spotlight columns selector has little/no effect | Fix or disable with clear variant context | `TeamEditors.tsx`, `team.tsx` | None |
| Social links lack safe external-link behavior | Fix here | `team.tsx`, `widgetSafeHref.test.ts` | None |
| Section lacks accessible label and hardcoded `h3` may break hierarchy | Fix here if current model can support it without breaking compatibility; otherwise document heading-level follow-up | `team.tsx` | TASK-256-08 creates follow-up if schema expansion is required |
| Photo URL validation and lazy loading | Fix here for lazy loading and safe editor feedback | `TeamEditors.tsx`, `team.tsx` | Media picker is future scope |
| Member-count reduction data loss, social default `#`, and spotlight lead badge | Fix here because current controls can destroy data or mislead editors | `TeamEditors.tsx` | None |
| Drag/drop, section background, CTA, contact buttons, department filters, contrast validator, and configurable lead member | Future product scope unless needed for existing-control truthfulness | Future widget task | TASK-256-08 records deferral |

## Sub-Tasks

- [ ] Make spotlight columns truthful by hiding/disabled repeated equivalent
  options or by changing the renderer to honor them.
- [ ] Normalize newly added members without serializing empty `photo` strings
  when the field is intentionally blank.
- [ ] Add safe social-link output with existing safe href helpers and tests.
- [ ] Add section/header accessible labels without breaking existing pages.
- [ ] Add `loading="lazy"` to member photos and keep fallback initials
  accessible through the card/member label.
- [ ] Protect member-count reductions from silent data loss.
- [ ] Use empty social-link URLs for new links and show safe validation feedback.
- [ ] Improve Wizard minimum profile setup by exposing role where needed or
  documenting why Wizard remains name-only.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | 301-369, 494-659, 792-888 | Spotlight-aware columns control, safer add-member/add-link defaults, photo validation feedback, and Wizard role scope. |
| `core/widgets/core/team.tsx` | 58-63, 184-197, 360-383, 447-483 | Explicit resolver defaults, spotlight column behavior, lazy photos, safe social links, section labels, heading semantics, and duplicate normalization cleanup. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | existing suite | Add spotlight columns, Wizard role/default, social link default, and photo validation regressions. |
| `tests/vitest/widgets/team.test.tsx` | existing suite | Add social link, lazy image, section ARIA, heading, and spotlight column regressions. |
| `tests/vitest/widgets/widgetSafeHref.test.ts` | existing suite | Add team social-link safe href coverage if helper behavior changes. |

## Implementation Pseudocode

```tsx
function supportsTeamColumnsControl(variant: TeamVariantId) {
  return variant !== "spotlight";
}

function addMember(value: TeamData, onChange: (next: TeamData) => void) {
  updateTeamData(value, onChange, (current) => ({
    ...current,
    members: normalizeTeamMembers([
      ...normalizeTeamMembers(current.members),
      { id: createTeamMemberId(), name: "", role: "", bio: undefined, photo: undefined },
    ]),
  }));
}

function renderSocialLink(link: TeamSocialLink) {
  const href = normalizeWidgetSafeHref(link.url);
  if (!href) return null;
  const external = isExternalWidgetHref(href);
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
      {link.label}
    </a>
  );
}
```

Error handling:

- Invalid social URLs are not rendered publicly and show editor feedback.
- Existing payloads with `photo: ""` continue to render the fallback initial.
- Unsupported style tokens normalize to defaults without dropping safe legacy
  member data.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: public social links must reject unsafe schemes and external links
  must use safe `rel`; no user-authored script execution is added.
- Secret handling: no private media URLs, tokens, or debug payloads in widget
  data, DOM datasets, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetSafeHref.test.ts` when
  social-link safe href behavior changes.
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring changes.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md`.
- Update `_docs/_WIDGETS/TEAM.md` when editor/runtime behavior changes.
- Update `_docs/WIDGETS.md` only if shared safe-link/media or heading contracts
  change.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Team spotlight columns are no longer misleading.
- Social links are safe and accessible in public output.
- Member photos lazy-load and fallback identity remains accessible.
- Broad team-section product expansions are deferred with physical follow-up
  tasks during TASK-256-08 closure.
