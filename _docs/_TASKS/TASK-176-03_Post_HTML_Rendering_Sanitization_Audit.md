# TASK-176-03: Post HTML Rendering Sanitization Audit
# FileName: TASK-176-03_Post_HTML_Rendering_Sanitization_Audit.md

**Priority:** High
**Category:** Security + Posts Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-176
**Status:** To Do

---

## Overview

Audit and harden Semgrep `dangerouslySetInnerHTML` findings in post editor/runtime rendering. The goal is to prove every HTML render path receives sanitized, normalized, schema-owned content, or to replace unsafe rendering with structured React output.

Current findings:
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`
- post rich-text sanitizer/normalizer modules
- relevant post editor/runtime tests

## Security Contract

- Visibility: admin editor preview and public post runtime.
- Auth model: admin editor requires existing admin session; public runtime remains public read.
- RBAC: no change.
- CSRF: no change.
- Rate-limit bucket: no change.
- Reject-unknown validation: post rich-text/block payloads must keep schema normalization.
- Anti-abuse:
  - no raw user HTML reaches React `dangerouslySetInnerHTML`,
  - sanitize before render or render structured nodes,
  - preserve allowed rich-text formatting without allowing script/event/style injection.
- Idempotency: rendering must be deterministic for the same normalized post document.
- Secret handling: rendered HTML must not expose internal metadata or editor-only state.

## Testing Requirements

- Add/update Vitest/Bun-owned tests according to layer:
  - sanitizer rejects script tags, event handlers, dangerous URLs, and malformed HTML,
  - editor canvas renders safe rich text,
  - runtime renderer preserves allowed formatting while stripping unsafe content.
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - relevant post editor/runtime suites
  - `bun run scan:semgrep`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if sanitizer/rendering contract changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. All post HTML render paths are sanitized or converted to structured rendering.
2. XSS regression tests cover editor and runtime surfaces.
3. Semgrep `dangerouslySetInnerHTML` findings are resolved or explicitly justified with bounded sanitizer proof.
