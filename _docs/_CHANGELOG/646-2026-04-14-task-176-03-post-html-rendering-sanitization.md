# 646. TASK-176-03 post HTML rendering sanitization

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-176, TASK-176-03

## Key Changes

### Security
- Replaced post editor/runtime rich-text `dangerouslySetInnerHTML` rendering with sanitized React-node rendering.
- Added a bounded post rich-text React renderer that uses the existing sanitizer/schema allowlist before creating elements.
- Preserved allowed formatting while stripping scripts, event handlers, unsafe URLs, forbidden elements, and unsupported tags.
- Resolved Semgrep `typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml` findings in:
  - `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
  - `core/services/posts/runtime/postBlockRuntimeRenderer.tsx`

### Validation
- Ran:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/posts/post-richtext-react-renderer.test.tsx tests/vitest/posts/post-block-runtime-renderer.test.tsx tests/vitest/ui/post-editor-canvas-wave.test.tsx tests/vitest/posts/post-richtext-serializer.test.ts`
  - `bun --cwd core lint:types`
  - `bun --cwd core lint`
  - filtered Semgrep check confirming post `dangerouslySetInnerHTML` findings are resolved
