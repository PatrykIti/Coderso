# TASK-343-11: Team Audit Remediation Family

# FileName: TASK-343-11_Team_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Team + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the confirmed Team drift where platform switches can corrupt social
handles and the Wizard silently truncates members when switching to Spotlight.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TEAM_WIDGET.md:165-175`
- `core/admin/ui/widgets/editors/TeamEditors.tsx:423-517,947-980,1313,1565+`
- `core/widgets/core/team.tsx:500-552,782-889`

## Sub-Tasks

- [x] Preserve the intended handle when changing platform from LinkedIn to a
  non-LinkedIn platform.
- [x] Add explicit confirmation or non-destructive behavior when Spotlight would
  reduce the member set.
- [x] Clean up misleading member-insert copy and, if retained, document the real
  append behavior.
- [x] Review the report's heading-hierarchy note (`H2 -> H4`) and either fix
  the member heading level or document the product decision.
- [x] Route shared color-clear/default wording to `TASK-343-30` and placeholder
  link polish outside this high-risk handle/truncation fix if not addressed here.
- [x] Add regression coverage for platform switching and Spotlight transitions.

## Completion Notes

- LinkedIn platform switching now strips LinkedIn-only `in/` and `company/`
  path prefixes before building non-LinkedIn URLs, preserving the real profile
  handle.
- Wizard Spotlight transitions are non-destructive and only change the variant.
  Intentional member-count reduction remains in Visual where the existing
  destructive count guard is explicit.
- Member insertion copy now states that new members are appended after the
  current list.
- Team member names render as `h3` headings under the section heading.
- Shared clear/default color wording remains owned by completed `TASK-343-30`;
  placeholder public social links remain fixture data.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Fix platform-handle extraction, Spotlight transition UX, and helper copy. |
| `core/widgets/core/team.tsx` | Touch only if normalization or Spotlight fallback ownership must move into the renderer layer. |
| `tests/vitest/widgets/team.test.tsx` | Cover normalized social URLs and Spotlight ownership. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover platform switching and destructive Spotlight transitions. |

## Implementation Pseudocode

```ts
function updateMemberSocialPlatform(
  value: TeamData,
  onChange: (next: TeamData) => void,
  memberIndex: number,
  socialIndex: number,
  nextPlatform: TeamSocialPlatform
) {
  const member = normalizeTeamMembers(value.members)[memberIndex];
  const link = member ? normalizeTeamSocialLinks(member.socialLinks)[socialIndex] : undefined;
  if (!link) return;

  const currentPlatform = resolveTeamSocialPlatform(link);
  const profile = readTeamSocialProfile(currentPlatform, link.url);
  const portableProfile =
    currentPlatform === "linkedin" && profile.startsWith("in/") ? profile.slice(3) : profile;
  updateMemberSocialLink(value, onChange, memberIndex, socialIndex, {
    label: teamSocialPlatformLabels[nextPlatform],
    url: buildTeamSocialHref(nextPlatform, portableProfile),
  });
}

function changeVariantWithGuard(current: TeamData, next: TeamVariantId) {
  if (next === "spotlight" && current.members.length > 6) {
    return { mode: "confirm-truncate", next };
  }
  return applyTeamVariant(current, next);
}
```

## Regression Test Shape

- LinkedIn -> GitHub keeps the human handle instead of `in`.
- The regression seed must start with an existing LinkedIn URL such as
  `https://www.linkedin.com/in/anna-kowalska`, then switch to GitHub and assert
  `anna-kowalska`, not add a blank link first.
- Spotlight transition does not silently discard members.

## Security Contract

No API routes are added. Existing safe-link and media rules remain unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_TEAM_WIDGET.md`.
- Update `_docs/_WIDGETS/TEAM.md` if the Team Wizard contract changes.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Platform switching preserves the intended profile handle.
- Spotlight no longer truncates members silently.

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/team.test.tsx tests/vitest/ui/team-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun scripts/playwright-widget-contract-smoke.ts --widget team --session task-343-11-team-auth-rerun --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-11-team-widget-smoke-auth-rerun.json --output-md .tmp/task-343-11-team-widget-smoke-auth-rerun.md`
- `playwright-cli -s=task-343-11-team-public-heading run-code --filename .tmp/task-343-11-team-public-heading-smoke.js`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-11
  diff review; no blockers)
