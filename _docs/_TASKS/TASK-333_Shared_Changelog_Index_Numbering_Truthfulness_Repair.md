# TASK-333: Shared Changelog Index Numbering Truthfulness Repair

# FileName: TASK-333_Shared_Changelog_Index_Numbering_Truthfulness_Repair.md

**Priority:** Low
**Category:** Documentation + Process + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-289, TASK-289-06
**Status:** To Do

---

## Overview

Repair the historical changelog-index numbering drift discovered during the
TASK-289 closure audit.

The current `_docs/_CHANGELOG/README.md` index still contains duplicate entry
numbers and stale row-to-file mappings on the current branch. This is shared documentation/process drift and should not
be hidden inside widget-local closure work.

## Source Findings

- `_docs/_CHANGELOG/README.md` - duplicate numbers currently include `287`,
  `204`, `124`, and `123` after the direct repair of the extra `893` Split
  Layout entry.
- `_docs/_CHANGELOG/` - the matching numbered files for some duplicate rows are
  ambiguous or missing.
- `_docs/_TASKS/TASK-289-06_Team_Report_Docs_Changelog_and_Closure.md` - the
  closure pass that surfaced this shared archive truthfulness issue.

## Sub-Tasks

- [ ] Audit `_docs/_CHANGELOG/README.md` for every duplicate or out-of-sync
  number/file mapping.
- [ ] Decide the truthful repair path for each affected historical entry:
  direct renumber, file rename, missing-file recreation, or explicit archival
  note.
- [ ] Apply the numbering/file repairs without reusing numbers again.
- [ ] Verify the final changelog index has unique entry numbers and every row
  maps cleanly to an existing file.

## Files to Change

| File | Required change |
|---|---|
| `_docs/_CHANGELOG/README.md` | Repair duplicate numbering and stale file mapping. |
| `_docs/_CHANGELOG/*.md` | Rename or recreate the specific historical entries that need truthful numbering. |
| `_docs/_TASKS/README.md` | Keep the board and counts synchronized. |

## Implementation Pseudocode

```md
for each duplicate changelog number:
  locate the indexed row
  locate the underlying file
  choose the truthful next-unused number or recover the missing file mapping
  update the file name, title header, and index row together
```

Data flow:

- Start from the index rows.
- Resolve each row to an actual changelog file.
- Apply numbering repairs consistently across filename, title header, and index.

Error handling:

- If a historical file is missing, document whether it must be recreated or the
  index row corrected to a different existing file.
- Do not reuse numbers during repair.

Regression Test Shape:

- repo-level validation script or ad-hoc audit
  - prove the final index has unique numbers and every row maps to one file.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Secret handling: changelog repair must not add secrets or binary artifacts.

## Testing Requirements

- `git diff --check`
- `bun run precommit`
- a targeted uniqueness/mapping audit for `_docs/_CHANGELOG/README.md`

## Documentation Updates Required

- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- The changelog index no longer reuses entry numbers.
- Every changelog index row maps cleanly to an existing numbered file.
- TASK-289 closure no longer carries the historical changelog numbering drift as
  unresolved hidden residue.
