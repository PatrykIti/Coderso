# TASK-190-04: Field, Facet, and Card Merge Foundation
# FileName: TASK-190-04_Field_Facet_and_Card_Merge_Foundation.md

**Priority:** High
**Category:** Assistant/Core + CMS Schema + Listings
**Estimated Effort:** Large
**Dependencies:** TASK-190-03
**Status:** To Do

---

## Overview

Build merge engines for content schemas, listing facets, and listing card
configuration. This lets the composer add fragments such as "pricing packages",
"Mabudo-like filters", "lead capture", or "portfolio proof" to a primary
catalog without hardcoding a new preset.

Business value:
- Richer catalogs can be assembled from reusable fragments.
- Existing content models can be extended safely.
- Listing filters and cards can evolve with the composed model.

## Sub-Tasks

- `TASK-190-04-01_Content_Schema_Field_Merge_Engine.md`
- `TASK-190-04-02_Listing_Facet_and_Card_Config_Merge_Engine.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintSchemaMerger.ts`
- `core/services/assistant/blueprints/blueprintFacetMerger.ts`
- `core/services/assistant/blueprints/blueprintCardConfigMerger.ts`
- `tests/vitest/assistant/blueprint-schema-merger.test.ts`
- `tests/vitest/assistant/blueprint-facet-card-merger.test.ts`

## Acceptance Criteria

1. Field merge is deterministic.
2. Field type conflicts are explicit.
3. Required fields are merged conservatively.
4. Facets only reference existing/merged fields.
5. Card config only references existing/merged fields.
6. Unsupported fields return `needs_input` or are gated by policy.

## Security Contract

- Visibility: internal planning only.
- Auth model: unchanged.
- RBAC: schema/listing writes still require existing typed actions.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: merged schemas and facet configs pass existing
  `content-type` and `listing-filters` validation.
- Anti-abuse: no arbitrary DB paths; fields must be plain JSON schema properties
  with allowed `xFieldType` metadata.
- Secret handling: field names matching secret patterns cannot be provider-visible
  without redaction metadata.

## Testing Requirements

- Vitest schema merge fixtures.
- Facet/card merge fixtures.
- Invalid field path rejection tests.
- Existing action plan schema tests must remain green.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
