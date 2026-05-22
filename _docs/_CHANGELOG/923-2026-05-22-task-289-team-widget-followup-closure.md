# 923 - TASK-289 Team widget followup closure

- Date: 2026-05-22
- Version: Unreleased
- Tasks: TASK-289, TASK-289-06

## Key Changes

### Team authoring and presentation
- Closed the Team widget follow-up family with member-panel IA improvements, explicit spotlight lead selection, media-library photo picking, bounded section presentation controls, and the compact mobile bio density path.
- Kept the larger-directory decision explicit: Team still caps at 12 members and now directs larger organizations toward multiple Team sections or a different listing surface instead of silently widening schema scope.
- Built on the landed shared `TASK-256-06-04` baseline for section labels, heading semantics, safe links, count protection, and lazy avatar loading instead of duplicating those contracts inside widget-local code.

### Evidence and docs
- Synchronized the Team Playwright report, widget docs, umbrella/leaf task files, task board, and changelog index with the final fixed/shared/no-action status matrix.
- Recorded the final validation matrix for the dedicated TASK-289 worktree, including focused Team suites, lint/type checks, release gates, and the current local scanner-tool limitation.
