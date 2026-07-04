# 1184 - TASK-469 Rich Inline Edit Fidelity

**Date:** 2026-06-20
**Version:** Unreleased
**Tasks:** TASK-469, TASK-469-01, TASK-469-01-L01, TASK-469-02,
TASK-469-02-L01, TASK-469-03, TASK-469-03-L01

## Key Changes

### Page Editor
- Rich `text` blocks (`format:"rich"`) now resolve as inline-editable canvas
  targets with `preserveMarkup: true`; non-string stored values still fail
  closed.
- Rich inline commits read the contenteditable `innerHTML` and sanitize through
  `sanitizeAuthoringRichTextHtml`, preserving allowed tags and safe links while
  dropping dangerous tags/content and unsafe hrefs.
- Plain inline targets still use the existing text-only `stripInlineMarkup`
  path, including required-field empty-commit protection.

### Docs And Audit
- Updated `_docs/PAGE_MODEL.md` so rich text is documented as canvas
  inline-editable through the shared rich-text sanitizer, not panel-only.
- Closed TASK-469 and all physical children in `_docs/_TASKS/README.md`.
- Reconciled `_docs/AUDIT/_FOLLOWUP_REPORT_2026-06-10.md` §3.4 and §9.4 item 1
  as resolved by TASK-469.

## Validation

- `bun run test:vitest -- tests/vitest/services/page-inline-edit-contract.test.ts tests/vitest/pages/page-authoring-sanitizers.test.ts tests/vitest/ui/page-authoring-canvas.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx`: passed (`4` files, `144` tests).
- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `bun run gates:coderso`: passed (`functional`, `ux`, `performance`,
  `security`, `reliability`).
- `git diff --check`: clean.

## Live Smoke

- Started the local stack with `coderso-dev-core-host`.
- `playwright-cli` created a throwaway Page v2 page, selected a rich text block
  on the canvas, entered inline edit, wrote `<strong>` plus a safe link and an
  unsafe script/on-click payload, blurred, saved, and published.
- Panel value and stored page data both matched:
  `<p>Edited <strong>rich</strong> <a href="/contact" rel="nofollow noreferrer">contact link</a></p>`.
- Public front rendered the bold text and safe link with `rel="nofollow noreferrer"`
  and did not render the unsafe payload text.
- Cleanup confirmed: the throwaway page id returned `404` after delete.
- Evidence screenshots:
  `.tmp/task-469-rich-inline-task-469-rich-inline-mqm8k0um-3mkt2u-admin-after-inline.png`
  and
  `.tmp/task-469-rich-inline-task-469-rich-inline-mqm8k0um-3mkt2u-front-published.png`.
- Environment note: `playwright-cli`/Node request context could not resolve
  `coderso-a.localhost` (`ENOTFOUND`) in this shell, while the dev host and
  `curl` were reachable. The browser smoke used equivalent local URLs
  `http://localhost:5173/admin` and `http://localhost:3000`.
