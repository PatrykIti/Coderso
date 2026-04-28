# 734. Posts metadata date-time validation

Date: 2026-04-24
Version: unreleased
Tasks: TASK-195-03-01

## Key Changes

### CMS Posts / Validation

- Registered the shared server `date-time` schema format used by Posts and
  content-entry metadata payloads.
- Fixed the `Update` button path where editing tags/categories could fail
  before validation with `unknown format "date-time"`.
- Added regression coverage for Posts metadata payload validation without
  requiring `scheduledAt` in the request body.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/server/schemaValidator.test.ts tests/integration/routes/postsRoutes.test.ts`
- `bun run test:vitest -- tests/vitest/ui/post-editor-state-hook-wave.test.tsx tests/vitest/admin/postsClient.test.ts`
