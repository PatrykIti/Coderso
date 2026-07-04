# Blueprint Composer

**Status:** Active
**Last Updated:** 2026-05-10
**Related Tasks:** TASK-190, TASK-190-08-03

## Purpose

The blueprint composer lets `LLM Guide` combine existing business packs without
creating one-off preset branches. It turns a setup prompt into:

`prompt -> capability candidates -> composition graph -> conflict policy -> typed actions -> dry-run/execute`

The composer does not execute provider output. Providers may help with bounded
operation drafts or capability context, but executable plans are assembled
locally through strict action contracts.

## Current Contract

- Current executable primary packs: house projects, products, portfolio
  projects, services directory, lead capture, product inquiry, and editorial
  content hub.
- Current gated domains: booking and checkout/payment.
- Detail-page capability metadata is available to the composer, but executable
  detail-page writes are assembled locally through `detail-page.upsert`; generic
  `detail-page` provider mutations remain gated.
- Single-pack setup/refinement paths may still use legacy pack builders until a
  later rollout moves them fully behind composed routing.

## Authoring Checklist

### Capability Ids

- Use stable lowercase kebab-case ids, for example `product-catalog` or
  `lead-capture-site`.
- Do not encode a customer, vendor, or prompt brand into ids. A Mabudo-like
  prompt must compose reusable house-project, lead-capture, editorial, detail,
  media, and admin capabilities rather than introducing `mabudo`.
- Keep ids stable once fixtures or persisted metadata reference them.

### Provides And Requires

- `provides` describes product capabilities, not implementation files.
- Use durable keys such as `catalog`, `public-detail-page`, `lead-capture`,
  `editorial-hub`, `booking`, or `checkout-payment`.
- `requires` is for prerequisites that must be explicit before action assembly.
  Missing adapters, unsupported widgets, unsafe media uploads, and privileged
  permissions should become conflicts or gated metadata instead of partial
  executable plans.

### Resource Keys

Resource keys must be deterministic and scoped by resource kind:

| Kind | Example Key | Owner |
|---|---|---|
| content type | `content-type:products` | `content-type.upsert` |
| content route | `route:products` | `setting.content-route.upsert` |
| page | `page:/produkty` | `page.upsert` |
| form | `form:lead-capture-inquiry` | `form.upsert` |
| detail page | `detail-page:products` | local `detail-page.upsert` assembler path |
| custom screen | `screen:products` | `custom-screen.upsert` |
| listing query | `listing-query:Product Catalog Query` | `listing-query.upsert` |
| listing template | `listing-template:product-catalog-grid` | `listing-template.upsert` |

Relation fields are content-schema metadata on a content type. Do not model
`relation` as a standalone resource node.

### Merge Policy

- Primary capabilities own the main collection or site surface.
- Adjunct capabilities add compatible resources such as forms, pages, fields,
  filters, cards, or admin sections.
- Gated capabilities are represented in metadata and conflicts, but return no
  executable actions until their owner adapters exist.
- Use `dedupe-by-key` for resources that should converge on one owner seam.
- Use `merge-page-upsert` only when the target page is the same canonical
  surface. Use `keep-separate` for supporting pages such as `/kontakt` or
  `/blog`.
- Merge helpers must validate through the destination owner schema. Do not add
  assistant-only schema shortcuts.

### Page Sections

Page section contributions must use `blueprintPageSectionLibrary.ts` and the
current widget registry. Unsupported aliases such as missing step/timeline/media
capabilities must become gated conflicts until their widget or preset owner
lands. Raw media URLs and uploads are not valid section data; use trusted media
library ids or return `needs_input`.

### Admin Surfaces

Admin surface contributions must go through:

- `blueprintAdminSurfaceComposer.ts` for deterministic V4 screen sections and
  block groups,
- `blueprintBindingComposer.ts` for `blockId + propPath + field + mode`
  bindings,
- current `custom-screen.upsert`, `custom-screen.update`, or V4 screen document
  action contracts.

Generated admin screens must keep `collectionRole` and `compositionKey` stable
so workspace routing, cache hydration, and existing-resource matching can reuse
the same screen later.

### Existing Resource Reuse

Before action handoff, `blueprintExistingResourceMatcher.ts` consumes the
server-derived resource catalog. Reuse must prefer stable ids and canonical
links:

- pages: persisted `PageData.settings.collectionLink`,
- detail pages: stable `contentTypeId` and linked route context,
- custom screens: `collectionRole` and `compositionKey`; during execute only,
  a single exact-name screen with null `collectionRole` and null
  `compositionKey` may be upgraded as a legacy compatibility fallback,
- media: exact trusted media ids only,
- listing query/template names: exact unique matches or `needs_input`.

Do not trust browser-supplied `context.resourceCatalog`; the route may hydrate
it only when `context.includeResourceCatalog=true`.

## Observability

Composed plans carry `metadata.blueprintComposition` with:

- primary, adjunct, and gated capability ids,
- merged resource ownership,
- existing-resource reuse matches,
- resolved and unresolved conflicts,
- redacted candidate scores.

`core/services/assistant/blueprints/blueprintCompositionDiagnostics.ts` builds a
test/internal diagnostics payload for support and QA. It records:

- prompt hash, not prompt text,
- selected/gated capability ids,
- action assembly type/count trace,
- merged resource keys and no-duplicate matcher decisions,
- conflict snapshots,
- redacted provider-draft shape and hash.

Candidate shadow diagnostics can be exposed only through the local/test
`ASSISTANT_BLUEPRINT_SHADOW=1` gate. They are metadata-only and must not execute
the graph or provider payload.

## Fixture Requirements

Every new capability or merge rule should add or update fixtures in the
TASK-190 matrix:

- single-pack regression prompt,
- primary + adjunct prompt,
- gated-domain prompt when relevant,
- resource-catalog reuse or duplicate prevention case,
- provider action-array or unsafe draft red-team case,
- media/reference case when media placement changes,
- live OpenAI/OpenRouter matrix row when provider behavior is relevant.

Assert stable action types, resource keys, capability ids, conflict codes, and
route slugs. Avoid brittle generated copy assertions.

## Security Checklist

- Provider output remains operation-draft-only. Provider `actions[]` are ignored
  or rejected.
- Strict schemas must reject unknown fields before persistence, rendering, or
  caching.
- Public writes stay on existing hardened domains such as Forms and Booking.
- Secrets, provider keys, cookies, auth headers, upload bytes, signed URLs, and
  raw media payloads must not appear in provider packages, diagnostics, cache, or
  action payloads.
- Gated domains return `needs_input` or `gated` without executable actions.
- Route modules stay orchestration-only and map domain errors at the boundary.

## Changelog And Task Checklist

When adding or changing a capability:

1. Update the capability registration and owner docs.
2. Add fixture and red-team coverage in the correct lane.
3. Update `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
4. Update this guide if authoring or diagnostics rules changed.
5. Update `_docs/_TASKS/README.md` and relevant task files.
6. Add a changelog entry under `_docs/_CHANGELOG/`.
7. Run the full local gate before commit.
