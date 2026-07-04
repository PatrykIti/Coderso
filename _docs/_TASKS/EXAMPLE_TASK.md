# TASK-000: Task File Format Example
# FileName: EXAMPLE_TASK.md

> **Template-only file.** This is a reusable, project-agnostic example of how a
> task file should look. It is NOT a board task — do not add `TASK-000` to the
> task board. Copy this file into a new project's task folder and replace the
> placeholders (`<...>`) with your own stack, docs, and commands.
>
> Real board-level task files use `TASK-###_Short_Title.md`. Real physical child
> files use the child-naming rules in the "Task Conventions" section below.

**Priority:** Low | Medium | High
**Category:** `<area>` / `<sub-area>`
**Estimated Effort:** Small | Medium | Large | Very Large
**Dependencies:** `<TASK-### / external blocker / None>`
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD, set when work begins>`
**Completed:** `<YYYY-MM-DD, set at closure>`

---

## Task Conventions (read once, then delete from a real task)

These rules are part of the template so a new project can model from them.
They complement — they do not replace — the repository's agent/contributor
guide (in this repo: `AGENTS.md`).

### Naming & numbering

- Board-level file: `TASK-###_Short_Title.md` (underscores after the ID).
- Physical child files (hyphens, not underscores or spaces):
  - `TASK-###-NN-Title.md` — technical subtask under `TASK-###`.
  - `TASK-###-NN-LNN-Title.md` — executable leaf under a technical subtask.
  - `TASK-###-NN-SNN-Title.md` — optional deeper subtask under a subtask.
- Numbering is zero-padded and stable after merge. Never reuse a retired
  number; supersede the old file and allocate the next one.
- `NN` starts at `01` per parent; `LNN`/`SNN` start at `L01`/`S01` per subtask.
- The H1 (`# TASK-###: Title`) and `# FileName:` must match the actual filename.
- Child files must name their parent: `**Parent Task:** TASK-###` or
  `**Parent Subtask:** TASK-###-NN`.

### Status (keep `**Status:**` canonical)

- `⏳ To Do`, `🚧 In Progress`, `✅ Done`, `⏭️ Superseded`, `❌ Cancelled`.
- Keep dates/reasons/links OUT of the status line; use dedicated fields:
  `**Started:**`, `**Completed:**`, `**Superseded By:**`,
  `**Cancellation Reason:**`.
- A parent reaches `✅ Done` only when every descendant is `✅ Done`,
  `⏭️ Superseded`, or `❌ Cancelled`. Never leave an open child under a closed
  parent — convert leftover work into an explicit follow-on task.

### Scope discipline

- If scope is unclear or too large for one file, split or refine BEFORE
  implementing. Do not silently downgrade agreed scope to a smaller MVP.
- Implement in dependency order to avoid rework.
- Execution-ready leaf tasks must carry enough detail (pseudocode, data flow,
  error handling, regression-test shape, validation commands) that the
  implementer never has to rediscover the strategy.

### Required vs optional sections

- Required: Overview, Sub-Tasks, Testing Requirements, Documentation Updates.
- Required for any task touching API routes/auth/data: Security Contract.
- Required for executable leaves: Implementation Pseudocode.
- Optional: Architecture, Implementation Order, New Files to Create, Risks.

---

## Overview

State the user-facing or developer-facing goal in 2–4 sentences. Name the
source-of-truth docs that constrain this work and the owning module/service.

- **Goal:** `<what changes and why it matters to a user or developer>`
- **Owning module/service:** `<path/to/module>`
- **Source-of-truth docs:** `<arch/spec/API docs this change must obey>`
- **Out of scope:** `<explicitly list what this task does NOT do>`

---

## Security Contract

Include for every task that touches API routes, auth, permissions, or sensitive
data. For docs-only or non-API work, write: "No endpoint or permission model
changes."

- **Endpoint visibility:** `internal` | `public` | n/a
- **Auth model:** session | API-key scope | anonymous read | anonymous write | n/a
- **RBAC:** required permission(s) | n/a
- **CSRF:** required for admin/internal writes | n/a
- **Rate-limit bucket:** `<auth | admin | public_write | ...>` | n/a
- **Validation:** schema owner + reject-unknown-fields behavior
- **Anti-abuse:** nonce/signature/HMAC, optional CAPTCHA policy | n/a
- **Secret handling:** confirm no secrets/keys reach client cache, logs, or
  debug payloads

---

## Sub-Tasks

- [ ] Identify the owning module/service and the source-of-truth docs.
- [ ] Implement the smallest contract-aligned change.
- [ ] Add or update tests in the correct lane.
- [ ] Validate (lint, types, tests, security as applicable).
- [ ] Update task board, changelog, and impacted contract docs.

---

## Implementation Pseudocode

Required for executable leaf tasks. Show the helper/function shape, not prose.

```ts
// Validate external/admin/runtime input schema-first, then normalize.
export function normalizeExampleInput(input: unknown): ExampleConfig {
  const parsed = exampleSchema.parse(input); // reject unknown fields here
  return {
    mode: parsed.mode ?? "default",
    limit: clamp(parsed.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT),
  };
}
```

**Data flow:** validate payload → normalize via the owning helper → keep routes
orchestration-only → map domain errors at the route boundary → preserve legacy
data through non-destructive adapters when required.

**Error handling:** reject unknown fields at the schema boundary; raise
machine-readable domain errors (`example_invalid`, `example_not_found`,
`example_conflict`); map to a transport error only at the route boundary.

**Regression-test shape:**

- Unit/domain: normalization, defaults, limits, legacy adapters.
- Route: registration, auth/RBAC/CSRF, validation, error mapping.
- UI (if touched): hydration, dirty-state protection, user-visible states.

---

## Testing Requirements

Replace with your project's real commands and lanes.

- `<lint command>`
- `<type-check command>`
- `<unit/domain test command>` for pure logic.
- `<integration/runtime test command>` for routes, DB-backed, or runtime flows.
- `<security/scan command>` for auth, public-write, or secret-handling changes.
- State clearly in the summary if any test was skipped or could not run.

---

## Documentation Updates Required

- Task board index: update status bucket and statistics.
- Changelog: add a task-linked entry when the task closes (see
  `../_CHANGELOG/EXAMPLE_CHANGELOG.md`).
- Any source-of-truth doc whose API/architecture/UX/security/cache contract
  changed.

---

## Closure Checklist

- [ ] Status set to `✅ Done` (or a terminal status with its reason field).
- [ ] No open children left under this task.
- [ ] Board index + statistics synced.
- [ ] Changelog entry added and cross-linked.
- [ ] Impacted contract docs updated.
- [ ] Validation evidence (commands + results) recorded in the closeout.
