# TASK-176-03: Post HTML Rendering Sanitization Audit
# FileName: TASK-176-03_Post_HTML_Rendering_Sanitization_Audit.md

**Priority:** High
**Category:** Security + Posts Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-176
**Status:** Done (2026-04-14)

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

## Progress Notes

- 2026-04-14: Completed post HTML rendering sanitization audit. Post editor preview and public runtime rich-text rendering now convert sanitized rich text into React nodes instead of using `dangerouslySetInnerHTML`.
- 2026-04-14: Added regression coverage for allowed formatting, script/event/unsafe URL stripping, editor canvas preview, and runtime renderer parity.
- 2026-04-14: Validation passed:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/posts/post-richtext-react-renderer.test.tsx tests/vitest/posts/post-block-runtime-renderer.test.tsx tests/vitest/ui/post-editor-canvas-wave.test.tsx tests/vitest/posts/post-richtext-serializer.test.ts`
  - `bun --cwd core lint:types`
  - `bun --cwd core lint`
  - `bun run scan:semgrep > /tmp/nextless-semgrep-176-03.txt 2>&1; if rg -q "react-dangerouslysetinnerhtml|dangerouslySetInnerHTML|core/admin/ui/posts/editor/PostEditorCanvas\\.tsx|core/services/posts/runtime/postBlockRuntimeRenderer\\.tsx" /tmp/nextless-semgrep-176-03.txt; then rg -n "react-dangerouslysetinnerhtml|dangerouslySetInnerHTML|core/admin/ui/posts/editor/PostEditorCanvas\\.tsx|core/services/posts/runtime/postBlockRuntimeRenderer\\.tsx" /tmp/nextless-semgrep-176-03.txt; exit 1; else echo "Post dangerouslySetInnerHTML findings resolved"; rg -n "Findings:" /tmp/nextless-semgrep-176-03.txt | tail -1; fi`
