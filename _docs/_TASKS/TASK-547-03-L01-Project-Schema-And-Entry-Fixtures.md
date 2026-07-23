# TASK-547-03-L01: Project Schema and Entry Fixtures
# FileName: TASK-547-03-L01-Project-Schema-And-Entry-Fixtures.md

**Parent Subtask:** TASK-547-03
**Priority:** High
**Category:** Reference Example / Content
**Estimated Effort:** Medium
**Dependencies:** TASK-547-02
**Status:** ⏳ To Do

## Overview

Own bounded generator modules for the `house-project` schema and six deterministic
published entries. No Page/form/listing edits.

Own and export
`scripts/projekty-domow/content/constants.ts::HOUSE_PROJECT_RESOURCE_KEY =
"house-project"`; siblings import this symbol rather than repeating the key.

## Security Contract

No endpoint. Fixtures contain no PII/secrets or unsafe remote URLs and normalize
through the content type/entry owners.

## Implementation Pseudocode

```ts
export const buildProjectResources = () => ({
  contentTypes: [buildHouseProjectType()],
  entries: PROJECT_FIXTURES.map((p) => normalizeProjectSeed(p)),
});
```

Data flow: frozen fixtures → strict field mapping → package seeds. Throw on
duplicate key/slug, missing required field, invalid category or any media ref.

Regression tests in
`tests/vitest/kits/projekty-domow-project-fixtures.test.ts`: six unique entries,
Aurora required values, schema/data round-trip and deterministic output.

## Sub-Tasks

- [ ] Add schema/fixtures/builders.
- [ ] Add focused Vitest generator suite.

## Testing Requirements

Targeted Vitest/content tests; core lint/types; line counts.

## Documentation Updates Required

Send schema/fixture recipe to TASK-547-06.
