# Filename: 1-2025-01-15-project-init-and-core-rpc.md

# 1. Project Initialization and Core RPC

> **Template-only file.** This is a reusable, project-agnostic example of a
> changelog entry. Copy it into a new project, rename per the rules below, and
> replace the example content with your real change. The H1 number, the
> filename number, and the Index row number must all match.

**Date:** 2025-01-15
**Version:** 0.1.0
**Tasks:** TASK-001, TASK-002

---

## Changelog Conventions (read once, then delete from a real entry)

These rules travel with the template so a new project can model from them.

### File naming

- Format: `{N}-{YYYY-MM-DD}-short-title.md` (lowercase, hyphenated title).
- Example: `1-2025-01-15-project-init-and-core-rpc.md`.
- `N` is a monotonically increasing integer, incremented by 1, never reused —
  even if a file is deleted or a task is cancelled.
- One entry per completed task or coherent task family. A leaf task may be
  covered by a parent-family entry only when that entry explicitly lists the
  parent task ID and every closed leaf ID it covers.

### Entry format (minimum)

- Title line: `# {N}. Short Title`.
- Metadata: `Date`, `Version`, `Tasks` (every related task ID).
- `Key Changes` grouped by area (Core, API, UI, Tests, Docs, ...).
- Keep entries concise and user-facing — what changed and why, not a diff.

### Index

- Every entry has a matching row in the changelog index
  (`README.md` Index table): `No. | Date | Title | Type`.
- A task is not `✅ Done` until its changelog entry and index row exist.

---

## 🚀 Key Changes

### Core & Structure

- Initialized the project and dependency manager (`<tool>`).
- Established the directory layout (`<domain>`, `<application>`, `<adapters>`,
  `<infrastructure>` or your project's equivalent).
- Configured ignore files and the local development environment.

### `<Component A>` (e.g. server side)

- Implemented `<component>` at `<path>` (`<transport/port/protocol>`).
- Described the concurrency / thread-safety model used.
- Added a fallback/mock mode for running outside the real runtime.

### `<Component B>` (e.g. client side)

- Implemented `<client>` at `<path>`.
- Defined the communication/validation models (`<RequestModel>`,
  `<ResponseModel>`).
- Added reconnection and timeout handling.

### Testing

- Added `<test file>` covering `<the contract this change introduces>`.
- Recorded which lanes ran and any that were skipped.

### Docs

- Updated `<source-of-truth docs>` for any contract changes.
- Added the matching Index row in `README.md`.
