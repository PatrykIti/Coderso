# TASK-343-11: Team Audit Remediation Family

# FileName: TASK-343-11_Team_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Team + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the confirmed Team drift where platform switches can corrupt social
handles and the Wizard silently truncates members when switching to Spotlight.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TEAM_WIDGET.md:165-175`
- `core/admin/ui/widgets/editors/TeamEditors.tsx:423-517,947-980,1313,1565+`
- `core/widgets/core/team.tsx:500-552,782-889`

## Sub-Tasks

- [ ] Preserve the intended handle when changing platform from LinkedIn to a
  non-LinkedIn platform.
- [ ] Add explicit confirmation or non-destructive behavior when Spotlight would
  reduce the member set.
- [ ] Clean up misleading member-insert copy and, if retained, document the real
  append behavior.
- [ ] Add regression coverage for platform switching and Spotlight transitions.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TeamEditors.tsx` | Fix platform-handle extraction, Spotlight transition UX, and helper copy. |
| `core/widgets/core/team.tsx` | Touch only if normalization or Spotlight fallback ownership must move into the renderer layer. |
| `tests/vitest/widgets/team.test.tsx` | Cover normalized social URLs and Spotlight ownership. |
| `tests/vitest/ui/team-editor-wave.test.tsx` | Cover platform switching and destructive Spotlight transitions. |

## Implementation Pseudocode

```ts
function extractPortableSocialHandle(platform: TeamSocialPlatform, url: string): string {
  if (platform === "linkedin") return readLinkedInHandle(url);
  return readPortableHandle(url);
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

