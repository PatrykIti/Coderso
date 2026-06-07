# TASK-405: Assistant Curated Media Profiles
# FileName: TASK-405_Assistant_Curated_Media_Profiles.md

**Priority:** High
**Category:** Assistant + LLM Guide + Media + Public Runtime + QA
**Estimated Effort:** Large
**Dependencies:** TASK-404
**Status:** ✅ Done (2026-06-05)

---

## Overview

Close the post-TASK-404 media drift found during live Playwright review of the
assistant site builder. A nontechnical user prompt asking for a complete service
website with many photos currently produces a technically valid site, but the
generated public site still has zero rendered images and keeps launch readiness
media gated.

The assistant must create a more realistic first-run site by selecting a
backend-owned curated media profile for the requested industry/theme and
attaching deterministic, license-documented stock photo references to public
pages and sample entries through explicit URL fields that are not media-library
asset fields. The architecture-studio profile is the first profile, not a
hardcoded CMS limitation. The change must not open a general remote-media import
path: arbitrary user/provider URLs, uploads, generated images, and media-library
writes remain gated until a trusted media asset pipeline exists.

Claude read-only pre-audit on 2026-06-05 found that the first draft incorrectly
planned to store remote URLs in `heroImage`/`gallery`. Those fields are
`xFieldType: "media"` and real DB execution validates them as media-table asset
IDs, so remote URLs would fail with `media_asset_missing`. This task therefore
uses separate curated URL fields and visible page/detail/listing rendering paths
while keeping `heroImage`/`gallery` as media-ID fields. The adapter is shaped so
later profiles can add different industries, visual themes, and media kinds
without weakening the trust boundary. TASK-405 ships curated image assets only;
curated video remains gated until a profile, renderer, validation, and public
runtime contract land together.

## Sub-Tasks

- Audit current TASK-404 assistant implementation drift with Claude in read-only
  mode before code edits.
- Add a generic curated media profile contract with stable asset URLs, media
  kind, roles, industry/theme tags, source name, source URL, and license URL.
- Add explicit non-media URL/alt/source/license fields for curated media
  references in the services and portfolio content schemas.
- Attach curated images to supporting page rich-text image blocks and to
  service/portfolio sample values through those URL fields.
- Ensure catalog cards and service/portfolio detail pages render those curated
  URL fields visibly in the public runtime.
- Update launch-readiness media evidence so curated media references can be
  satisfied after execute while raw media import remains gated elsewhere.
- Extend planner, executor, and public runtime tests to require rendered images.
- Restart the local helper server and run Playwright CLI E2E as a nontechnical
  user after the fix.
- Run Claude post-implementation drift review on the committed HEAD and repair
  any blocking drift before closure.

## Security Contract

- Endpoint visibility: no new endpoints; existing assistant action routes stay
  internal under `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC: plan/dry-run use existing assistant read permissions; execute requires
  existing page/content/menu/SEO/form write permissions from
  `actionFamilyContracts`.
- CSRF: unchanged; all assistant POST routes keep the existing CSRF contract.
- Rate-limit bucket: unchanged `assistant` bucket.
- Reject unknown validation: no route payload expansion; planned actions still
  normalize through strict assistant action schemas before dry-run/execute.
- Anti-abuse: no public assistant write path; no nonce/HMAC/reCAPTCHA changes;
  public lead forms keep existing Forms runtime hardening.
- Media trust boundary: the assistant may only use backend-owned curated
  `https://` media references selected by a trusted profile adapter. It must not
  accept arbitrary remote media URLs from prompts or provider drafts and must
  not download, upload, proxy, insert media-library rows, or persist binary
  media assets.
- Media-field compatibility: existing `heroImage` and `gallery` fields stay
  media-library asset IDs; remote stock URLs must use separate string URL fields
  so real `createEntry` media validation remains intact.
- Secret handling: no provider keys, cookies, CSRF tokens, raw prompts, signed
  URLs, or secret settings may appear in media metadata, tests, docs, task
  evidence, changelog, or diagnostics.

## Files To Change

| Area | Files |
|---|---|
| Curated media contract | `core/services/media/curatedMediaProfiles.ts` |
| Assistant blueprint | `core/services/assistant/blueprints/fullServiceSiteBlueprint.ts` |
| Catalog schemas/templates | `core/services/assistant/blueprints/catalogFamilyPresets.ts`, `core/services/assistant/blueprints/catalogFamilyBlueprint.ts` |
| Execution readiness | `core/services/assistant/actionExecutorService.ts` |
| Content runtime | `core/services/content/contentListResolver.ts`, `core/services/content/detailPageBindingResolver.ts`, `core/services/content/entryService.ts` |
| Tests | `tests/vitest/assistant/actionPlannerService.test.ts`, `tests/vitest/content/detailPageBindingResolver.test.ts`, `tests/unit/assistant/actionExecutorService.test.ts`, `tests/unit/content/contentListResolver.test.ts`, `tests/unit/content/entryService.test.ts`, `tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts` |
| Docs | `_docs/ASSISTANT_SITE_BUILDER.md`, `docs/develop/assistant.md`, `_docs/MEDIA_SPEC.md` |
| Closure | `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/1099-2026-06-05-assistant-curated-media-profiles.md`, `_docs/_CHANGELOG/README.md` |

## Implementation Pseudocode

```ts
type CuratedMediaProfile = {
  id: "architecture-studio" | "restaurant" | "clinic" | "...";
  industryKeywords: string[];
  themeKeywords: string[];
  supportedKinds: Array<"image" | "video">;
};

type CuratedMediaAsset = {
  id: string;
  profileId: CuratedMediaProfile["id"];
  kind: "image" | "video";
  role: "home" | "about" | "process" | "proof" | "service" | "portfolio";
  industryTags: string[];
  themeTags: string[];
  src: string;
  alt: string;
  sourceName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
};

const mediaProfiles = defineCuratedMediaProfiles([
  {
    id: "architecture-studio",
    industryKeywords: ["architecture", "interior", "studio architektoniczne"],
    themeKeywords: ["premium", "portfolio", "materials"],
    supportedKinds: ["image"],
  },
]);

const mediaAssets = defineCuratedMediaAssets([
  { id: "home-studio", role: "home", src, alt, sourceUrl },
  { id: "portfolio-apartment", role: "portfolio", src, alt, sourceUrl },
]);

function selectCuratedMediaProfile(input) {
  return scoreProfilesByIndustryAndTheme(input.prompt, input.intentFamily);
}

function mediaFor(id: CuratedMediaAsset["id"]) {
  const asset = mediaAssets[id];
  if (!asset) throw new Error("assistant_curated_media_missing");
  return asset;
}

function buildSupportingPageBlocks(page) {
  const image = mediaFor(`${page.role}-...`);
  return [
    richTextSection({
      blocks: [
        textBlock(...),
        imageBlock({
          src: image.src,
          alt: image.alt,
          caption: `${image.sourceName} media reference`,
        }),
      ],
    }),
  ];
}

function serviceSamples() {
  return serviceSeeds.map((sample) => {
    const image = mediaFor(sample.mediaId);
    return entrySampleCreate({
      values: {
        ...sample.values,
        coverImageUrl: image.src,
        coverImageAlt: image.alt,
        coverImageSource: image.sourceUrl,
        coverImageLicenseUrl: image.licenseUrl,
      },
    });
  });
}

function createListingTemplateConfig(input) {
  return {
    fields: [
      { key: "image", source: "data.coverImageUrl", format: "text" },
      ...defaultTextFields,
    ],
  };
}

function buildListingQueryFields(preset) {
  return [
    "id",
    "title",
    "slug",
    "status",
    "updatedAt",
    "data.summary",
    "data.heroImage",
    ...(preset.coverImageUrlField ? [`data.${preset.coverImageUrlField}`] : []),
    ...(preset.coverImageAltField ? [`data.${preset.coverImageAltField}`] : []),
    ...screenFieldPaths,
    "data.projectStatus",
  ];
}

function buildDetailPageDocument(preset) {
  return {
    blocks: [
      hero({
        variant: "split",
        media: { type: "image", source: "external", src: "", alt: "" },
      }),
    ],
    bindings: [
      bind("headline", "title", "text"),
      bind("body", "summary", "text"),
      bind("media.src", "coverImageUrl", "text", { required: false }),
      bind("media.alt", "coverImageAlt", "text", { required: false }),
    ],
  };
}

function reconcileLaunchReadinessAfterExecution(plan, results) {
  const mediaSatisfied =
    successfulPagesHaveCuratedImageBlocks(plan, results) &&
    successfulEntrySamples.every(hasCuratedCoverImageUrl);
  // Media must start as pending_execute; gated checks are intentionally not
  // reconciled, because true raw media import gates remain fail-closed.
  return updateCheck("media", mediaSatisfied ? "satisfied" : "pending_execute");
}
```

Data flow:

- The prompt selects a site-builder capability and the backend chooses a curated
  media profile by trusted prompt/intent signals; provider text does not supply
  executable image URLs.
- The backend blueprint consumes local curated media assets by role from the
  selected profile. Unsupported industries do not fall back to unrelated
  architecture media.
- Planned page blocks and sample entry values carry public, backend-curated
  `https://` image URLs plus alt/caption/source/license text.
- Existing rich-text renderers resolve page block URLs on public pages without
  server-side image fetching.
- Catalog listing templates expose the curated URL as the card image field, and
  detail-page bindings expose it as visible hero media.
- Listing runtime treats assistant-owned `coverImageUrl` as a curated media URL
  field and ignores arbitrary non-curated external URLs from that field.
- Detail-page runtime removes an optional hero media slot when the bound media
  URL is empty, so public pages never show editor placeholders such as "Add
  media URL" for user-created entries without curated media.
- Listing template image fields use `format: "text"` because the listing card
  image contract is keyed by field name (`image`/`imageSrc`/`cover`/`thumbnail`);
  `format: "media"` is not a valid listing-template format.
- Listing queries must project `data.coverImageUrl`/`data.coverImageAlt`;
  otherwise public card rows strip the fields before runtime image resolution.
- Execute reconciles media readiness from successful actions and curated media
  fields, while unrelated raw media/import gates remain in place.

Error handling:

- Missing curated media profile or asset id fails plan construction with a
  deterministic `assistant_curated_media_*` error in tests/development.
- Unknown action fields still fail strict assistant plan normalization.
- Failed sample-entry/page actions leave media readiness `pending_execute`.
- Untrusted prompt/provider image URLs are ignored by this blueprint and do not
  alter readiness.
- Remote URLs in `heroImage`/`gallery` remain invalid because those fields are
  media-library asset IDs.
- Optional detail-page cover bindings without a value degrade to a no-media hero
  instead of rendering a public editor placeholder.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/unit/content/contentListResolver.test.ts tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts`
- Add or update a DB-backed execute/public render assertion so the fix is not
  only proven through mocks.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Restart `coderso-dev-core-host` after the fix.
- Playwright CLI E2E through:
  - admin: `http://coderso-b.localhost:5175/admin/settings/assistant`
  - front: `http://coderso-b.localhost:3001/`
  - site Vite dev assets: `http://coderso-b.localhost:5176/site/`
- E2E prompt style: act as a slightly nontechnical user asking the assistant to
  create a complete architecture/interior design service site with lots of
  photos, portfolio, services, contact, SEO, and a real public feel.
- E2E must verify public pages render images, navigation/footer/detail routes
  still work, and console/page errors are absent.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `docs/develop/assistant.md`
- `_docs/MEDIA_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New changelog entry `1099-2026-06-05-assistant-curated-media-profiles.md`

## Closure Evidence

- Implemented a generic curated media profile adapter in
  `core/services/media/curatedMediaProfiles.ts` with profile ids, asset roles,
  media kinds, industry/theme tags, source URL, and license URL. The first
  shipped profile is `architecture-studio` with image assets only; video remains
  gated.
- Removed the unsafe industry fallback: unsupported full-service prompts do not
  receive architecture media. Follow-up TASK-406 records the separate
  destructive/reset cross-industry E2E requested for another site theme.
- Kept media-library fields fail-closed. `heroImage` and `gallery` remain media
  asset IDs; curated image URLs only flow through explicit text URL fields and
  rich-text image `src` blocks.
- Required curated `coverImageUrl` values to carry exact source/license
  metadata matching the backend asset, and filtered non-curated manual
  `coverImageUrl` values from listing/detail public rendering.
- Added services/portfolio cover URL/alt/source/license schema fields, listing
  query projection, card image config, detail hero bindings, and launch-readiness
  media reconciliation.
- Fixed public rich-text image responsiveness so existing generated image blocks
  no longer create mobile horizontal scroll.
- Claude/agent audits:
  - Pre-implementation audit caught the media-ID drift for `heroImage`/`gallery`.
  - Post-implementation agent audit caught missing required source/license
    metadata for curated cover URLs; fixed with schema validation tests.
  - Final Claude-style review found no blocker before closure; low-priority
    detail/listing trust asymmetry was fixed by filtering detail cover URLs too.
- Playwright CLI E2E after helper restart:
  - Helper public routes: admin `http://coderso-b.localhost:5175/admin/`,
    front `http://coderso-b.localhost:3001/`, site Vite assets
    `http://coderso-b.localhost:5176/site/`.
  - Nontechnical Polish prompt created a full Studio Forma architecture/interior
    site via live assistant settings using OpenRouter.
  - Plan returned `service-business-full-site` with 49 actions, dry-run was
    executable, execute completed with `failed: 0`, public pages/details returned
    HTTP 200, all checked pages rendered images, navigation/footer links were
    valid, contact form submission returned 200, mobile viewport had no
    horizontal scroll, and console/page errors were empty.
- Validation:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/content/detailPageBindingResolver.test.ts tests/vitest/widgets/richTextSection.test.tsx`
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.test.ts tests/unit/content/contentListResolver.test.ts tests/unit/content/entryService.test.ts tests/integration/server/assistantFullServiceSitePublicRuntime.test.ts`
  - `bun run vitest run --config vitest.config.ts tests/vitest/widgets/richTextSection.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `git diff --check`
  - `bun run gates:coderso` passed on rerun: functional, ux, performance,
    security, and reliability all passed. The first gate attempt failed only in
    `tests/unit/kits/installService.test.ts` because the live E2E had left a
    local `primary` menu conflict for the solution-kit reliability dry-run; the
    isolated suite passed after its cleanup, then the full gate passed.
  - Live curated asset HEAD check for 10 profile image URLs returned HTTP 200.
