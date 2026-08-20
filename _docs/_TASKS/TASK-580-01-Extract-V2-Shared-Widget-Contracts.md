# TASK-580-01: Extract V2 Shared Widget Contracts
# FileName: TASK-580-01-Extract-V2-Shared-Widget-Contracts.md

**Parent Task:** TASK-580
**Priority:** High
**Category:** Architecture / Widget Removal / Page V2 / Refactor
**Estimated Effort:** Large
**Dependencies:** None (first to land in the TASK-580 family)
**Status:** ✅ Done
**Started:** 2026-08-19
**Completed:** 2026-08-20

---

## Overview

Before any v1 widget module is deleted, move the contracts and renderers that Page
V2 and the public render pipeline still share OUT of `core/widgets/**` into a
neutral, non-widget-owned domain module. This is a pure refactor: same exported
names, same values, no behavior change. After this task lands, no V2, content,
navigation, settings, server, site, or template module may import from
`core/widgets/**` for the relocated symbols, which unblocks TASK-580-02 (authoring-surface deletion), TASK-580-03 (detail-page migration), and TASK-580-04 (kernel deletion).

The shared surface is enumerated in `_S6-R1` (section A, "Page V2 services —
HIGH RISK", "Content / entry binding", "Navigation", "Public site render +
cache", "Server render / validation") and `_S6-R2` §(3) item 7. Verified facts:

- `core/widgets/core/*` has 63 modules. Only ~10 are shared with non-widget code;
  the rest (~45) are v1-only and stay put for now.
- The shared mixed modules (`contentList.tsx`, `navigation.tsx`, `formEmbed.tsx`,
  `listingFilters.tsx`) each contain BOTH shared data/renderer exports and v1-only
  `*EditorContract` / `create*Widget` exports. They must be SPLIT, not whole-file
  moved, so the neutral module never imports `WidgetEditorContract` or `WidgetRenderer`.
- Pure helper deps of the shared renderers (`clearableStyle.ts`, `widgetInstanceIds.ts`,
  `formRuntimeScript.ts`, `listingRuntimeScript.ts`) must move too.
- The shared tokens `DeviceTarget`, `ContainerToken`, `SpacingToken`,
  `InheritableContainerToken`, `InheritableSpacingToken` currently live in
  `core/widgets/types.ts` (lines ~219-226) and must move to a neutral `tokens.ts`;
  the v1 `types.ts` keeps a re-export shim so v1 consumers still compile.
- `blueprintPageSectionLibrary.ts` has exactly one importer (verified): the test
  file `tests/vitest/assistant/blueprint-page-section-library.test.ts`; it imports
  only `./blueprintPageSectionTypes`. Neither production module is deleted here:
  TASK-580-02 (matrix rewire) rewires them and TASK-580-03-L06 (terminal delete)
  deletes them together with their test importer.
- `core/.tmp/widget_audit*.{tsx,jsonl}` + `widget_contract_diff.{ts,jsonl}` are
  UNTRACKED working-tree junk present ONLY in the shared main tree and absent from
  this worktree; delete them from the main-tree filesystem opportunistically
  (`rm -f` is a harmless no-op in this worktree).
- `core/server/popupRuntimeScript.ts:20` only carries a stale comment referencing
  `core/widgets/core/listingRuntimeScript.ts`; clean the comment, no code change.

### Target neutral module

Create `core/services/renderContracts/`. Rationale: it is non-widget-owned and
non-page-owned, sits in the Bun-free `core/services` layer, and is imported
equally by `core/services/*`, `core/site/*`, and `core/server/*`. (Alternative
considered and rejected in favor of one seam: `core/site/renderContracts`.)
Every moved export keeps its exact name and value; importers change only their
import path. React renderer components are allowed here (precedent:
`core/services/pages/pageDataBlockRenderers.tsx`).

### Moved admin controls

`SharedColorControl.tsx` and `TokenOrPixelField.tsx` move from
`core/admin/ui/widgets/editors/` to `core/admin/ui/shared/` (which already holds
`colorValue.ts`). `FormDesignPanel.tsx` is the only non-widget-editor consumer and
is rewired. The ~20 still-live widget editors keep compiling via a re-export shim
left at the old `editors/` path until TASK-580-02 deletes them.

- **Goal:** decouple Page V2 / public render / content / navigation / settings /
  server / site from `core/widgets/**` by relocating the shared contracts and
  renderers to `core/services/renderContracts/`.
- **Owning modules:** `core/widgets/core/*` (source), `core/services/renderContracts/*`
  (target), plus the importers listed below.
- **Out of scope:** any deletion of v1 registry/validator/runtime/renderers,
  Widget Library, preview routes, `modulePackMatrix`, widget templates, or DB
  migrations. Those are TASK-580-02/03/04.

## Security Contract

- **Endpoint visibility:** no new endpoints; no endpoint is added or removed here.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** moved schemas/normalizers keep their strict reject-unknown
  behavior byte-for-byte. No new schema keys and no permissive fallback.
- **Anti-abuse:** no public write path.
- **Secret handling:** moved contracts contain no secrets; `bookingSchemas.ts`
  relocation must not introduce any secret/captcha-token leak. No secrets may
  reach logs, cache, or debug payloads.

## New Files To Create

```
core/services/renderContracts/
  tokens.ts                    # DeviceTarget, containerTokens, spacingTokens,
                               # ContainerToken, SpacingToken, InheritableContainerToken,
                               # InheritableSpacingToken
  runtimeScriptRegistry.tsx    # RuntimeScriptRegistry + createWidgetRuntimeScriptRegistry
                               # + renderSharedWidgetRuntimeScript
  clearableStyle.ts            # resolveClearableStyleValue, resolveClearableCssColorValue
  widgetInstanceIds.ts         # createWidgetInstanceId, scopedId
  widgetSafeHref.ts            # normalizeWidgetSafeHref, resolveWidgetLinkAttrs + types
  timelineLucideIcons.ts       # lucideKebabIconComponents, lucideIconNames
  timelineIcons.ts            # timelineQuickIconComponents, loadFullTimelineIcons,
                               # resolveLucideIcon (extracted from timeline.tsx);
                               # NEW HOME for MenuDesignEditor's loadFullTimelineIcons
  appointmentFormContract.ts   # appointmentFormCustomFieldTypes, appointmentFormFieldLimits,
                               # clampAppointmentFormText
  contentListContract.ts       # contentList types/constants/defaults/normalizers/sort/template mappers
  contentListRenderer.tsx      # ContentListBlock + ContentListPager + card/pager helpers
  listingFiltersContract.ts    # ListingFiltersData, ListingFiltersCopy, normalizeListingFiltersData, defaults
  listingFiltersRenderer.tsx   # ListingFiltersBlock, resolveFacetOptionOwnership
  formEmbedContract.ts         # FormEmbedData, FORM_EMBED_*_LIMITS, FORM_EMBED_SUCCESS_BEHAVIORS, ...
  formEmbedFields.tsx          # field DOM id / presentation helpers
  formEmbedRenderer.tsx        # FormEmbedBlock
  navigationContract.ts        # navigationVariantIds, navigationMobileModeIds, NavigationVariantId, ...
  navigationRenderer.tsx       # NavigationItem, NavigationItemMeta, NavigationData types
                               # + NavigationBlock + runtime DOM helpers; NEW HOME for
                               # MenuDesignEditor's NavigationItem import
  listingRuntimeScript.ts      # getListingRuntimeClientScript
  formRuntimeClientScript.ts   # String.raw client bundle constant (2060+ lines,
                               # byte-identical, extracted from formRuntimeScript.ts)
  formRuntimeScript.ts         # getFormRuntimeClientScript (tiny wrapper importing the
                               # constant)
  heroContract.ts              # HeroData, heroTilts, heroDefaults, heroSchema, normalizeHeroData,
                               # normalizeHeroBackgroundGradient, normalizeHeroHref
```

Admin shared controls:

```
core/admin/ui/shared/SharedColorControl.tsx   # moved byte-identical
core/admin/ui/shared/TokenOrPixelField.tsx    # moved byte-identical
```

## Files To Change (rewire import path only)

Pure contract/token/script moves (whole-file, byte-identical bodies, only import
paths inside them updated):

| From `core/widgets/**` | Move to `core/services/renderContracts/` | Consumers to rewire |
|---|---|---|
| `core/widgets/core/formEmbedContract.ts` | `formEmbedContract.ts` | `pageBlockJsonSchemaV2.ts`, `pageBlockNormalizerV2.ts`, `pageDataBlockRenderers.tsx`, `pageEditorBlockControlRegistry.ts`, `formEmbed.tsx` (internal) |
| `core/widgets/core/listingFiltersContract.ts` | `listingFiltersContract.ts` | `pageRuntimeBindingContract.ts`, `pageRuntimeDataPreparation.ts`, `listingFilters.tsx` (internal) |
| `core/widgets/core/navigationContract.ts` | `navigationContract.ts` | `actionPlanSchema.ts`, `assistantSiteBuilderIntakeAdvancedOptions.ts`, `assistantSiteBuilderIntakeTypes.ts`, `navigation.tsx` (internal) |
| `core/widgets/core/widgetSafeHref.ts` | `widgetSafeHref.ts` | `navigationMenuMapping.ts`, `contentList.tsx`/`navigation.tsx` (internal) |
| `core/widgets/core/timelineLucideIcons.ts` | `timelineLucideIcons.ts` | `siteShell.tsx`, `timeline.tsx` (internal), `timelineIcons.ts` (internal) |
| `core/widgets/core/appointmentFormContract.ts` | `appointmentFormContract.ts` | `core/server/validation/bookingSchemas.ts`, `appointmentForm.tsx` (internal) |
| `core/widgets/core/listingRuntimeScript.ts` | `listingRuntimeScript.ts` | `publicSite.tsx`, `listingFiltersRenderer.tsx` (internal) |
| `core/widgets/runtimeScripts.tsx` | `runtimeScriptRegistry.tsx` (decoupled, see pseudocode) | `publicSite.tsx`, `renderPublicPage.tsx`, `navigation.tsx` (internal) |
| `core/widgets/types.ts` tokens (lines ~219-226) | `tokens.ts` | `layoutSettings.ts`, `publicSite.tsx`, `publicEntryRender.tsx`, `publicEntryGateUi.tsx`, `renderPublicPage.tsx`, `pageRuntime.tsx` (type `DeviceTarget`) |

Split moves (shared part → neutral; v1 part stays in `core/widgets/core/*`):

| Source module | Shared exports (→ neutral) | v1 exports (stay, deleted in 580-04) |
|---|---|---|
| `contentList.tsx` | types, `contentListDefaults`, `contentListLimitMax`, `resolveContentListSort`, `normalizeContentListLimit`, `normalizeContentListRuntimeItems`, `normalizeContentListData`, `ContentListBlock`, `ContentListPager`, template-presentation mappers | `contentListEditorContract`, `createContentListWidget` |
| `listingFilters.tsx` + `listingFiltersRenderer.tsx` | `ListingFiltersBlock`, `resolveFacetOptionOwnership`, contract re-exports | `listingFiltersEditorContract`, `createListingFiltersWidget` |
| `formEmbed.tsx` + `formEmbedFields.tsx` | `FormEmbedBlock`, field presentation helpers, `formEmbedContract` re-exports | `formEmbedEditorContract`, `createFormEmbedWidget` |
| `navigation.tsx` | `NavigationItem`, `NavigationItemMeta`, `NavigationData`, `NavigationLinkTarget`, nav runtime DOM helpers, `NavigationBlock` | `navigationEditorContract`, `createNavigationWidget` |
| `timeline.tsx` | `timelineQuickIconComponents`, `loadFullTimelineIcons`, `resolveLucideIcon` (→ `timelineIcons.ts`) | `TimelineBlock`, `timelineEditorContract`, `createTimelineWidget`, timeline data/schema/normalizers |
| `hero.tsx` | `HeroData`, `heroTilts`, `heroDefaults`, `heroSchema`, `normalizeHeroData`, `normalizeHeroBackgroundGradient`, `normalizeHeroHref` | `HeroBlock`, `heroEditorContract`, `createHeroWidget` |
| `formRuntimeScript.ts` | `getFormRuntimeClientScript` (tiny wrapper) + `formRuntimeClientScript.ts` (String.raw bundle constant) | (none v1-only; SPLIT, not whole-file move — source is 2069 lines) |

Production importers to rewire (import-path-only, no behavior change):

- `core/services/pages/`: `layoutSettings.ts`, `pageBlockJsonSchemaV2.ts`,
  `pageBlockNormalizerV2.ts`, `pageDataBlockRenderers.tsx`, `pageDocumentV2Types.ts`,
  `pageEditorBlockControlRegistry.ts`, `pageEditorCollectionPreview.ts`,
  `pageRuntimeBindingContract.ts`, `pageRuntimeDataPreparation.ts`.
- `core/services/content/`: `contentListResolver.ts`, `detailPageBindingResolver.ts`,
  `entryTeaserResolver.ts` (stays-via-shim: its contentList import is covered by the
  v1 remnant re-export; the resolver dies in 580-04 with hydration),
  `postsFeedRuntime.ts`.
- `core/services/navigation/`: `navigationMenuMapping.ts`, `navigationRuntimeResolver.ts`.
- `core/services/settings/userSettingsService.ts` (`hero` → `heroContract`).
- `core/services/assistant/`: `actionPlanSchema.ts`,
  `assistantSiteBuilderIntakeAdvancedOptions.ts`, `assistantSiteBuilderIntakeTypes.ts`
  (`navigationContract`).
- `core/services/commerce/commerceWidgetRuntime.ts` (verify V2 equivalents first;
  if none, keep importing from the shim and flag for 580-02/04).
- `core/server/`: `publicSite.tsx`, `publicSiteRenderContext.ts`,
  `publicSiteRouteRuntime.ts`, `publicEntryRender.tsx`, `publicEntryGateUi.tsx`,
  `validation/bookingSchemas.ts`.
- `core/site/`: `renderPublicPage.tsx`, `renderPublicEntry.tsx`, `siteShell.tsx`,
  `pageRuntime.tsx` (token imports only: ContainerToken/DeviceTarget/SpacingToken).
- `core/templates/content-list.tsx` (`ContentListPager`).
- `core/admin/ui/menus/MenuDesignEditor.tsx`: rewire `NavigationItem` to
  `core/services/renderContracts/navigationRenderer.tsx` and `loadFullTimelineIcons`
  to `core/services/renderContracts/timelineIcons.ts`.
- `core/admin/ui/forms/FormDesignPanel.tsx` (`SharedColorControl`).

Compatibility shims to keep v1 compiling (admin editor shim deleted in 580-02;
`core/widgets/**` shims deleted in 580-04):

- `core/widgets/core/contentList.tsx`, `listingFilters.tsx`, `formEmbed.tsx`,
  `navigation.tsx`, `hero.tsx`: keep the v1-only exports; import the shared types
  they still reference from `core/services/renderContracts/*`; re-export shared
  names if any remaining v1 consumer needs them.
- `core/widgets/core/navigation.tsx` and `core/widgets/core/timeline.tsx`: keep
  one-line re-export shims for `NavigationItem`/`NavigationItemMeta` and
  `loadFullTimelineIcons` (respectively) until TASK-580-04 deletes the v1 kernel,
  so any remaining v1 consumer keeps compiling.
- `core/widgets/types.ts`: replace the moved token definitions with a re-export
  from `core/services/renderContracts/tokens.ts` (keep identical exported names).
- `core/widgets/core/index.ts`: re-point `ContentListData`, `ListingFiltersData`,
  `FormEmbedData`, `NavigationData`, `HeroData` imports to the neutral module.
- `core/admin/ui/widgets/editors/SharedColorControl.tsx` and
  `TokenOrPixelField.tsx`: one-line re-export from `core/admin/ui/shared/*`.

Delete (filesystem / source):

- `core/.tmp/widget_audit_all.tsx`, `core/.tmp/widget_audit_all.jsonl`,
  `core/.tmp/widget_audit.tsx`, `core/.tmp/widget_contract_diff.ts`,
  `core/.tmp/widget_contract_diff.jsonl` (untracked junk; `rm` from the tree).
- `core/server/popupRuntimeScript.ts:20` stale comment (edit, not delete).

## Implementation Pseudocode

### 1. Pure whole-file move (contracts, tokens, scripts, helpers)

For `formEmbedContract.ts`, `listingFiltersContract.ts`, `navigationContract.ts`,
`widgetSafeHref.ts`, `timelineLucideIcons.ts`, `appointmentFormContract.ts`,
`listingRuntimeScript.ts`, `clearableStyle.ts`,
`widgetInstanceIds.ts`:

```ts
// 1a. Copy the file to core/services/renderContracts/<name> (git mv).
// 1b. Fix ONLY its relative imports to the new depth:
//     "../../services/..."  ->  "../..."          (renderContracts is one level
//                                                     deeper than core/widgets/core)
//     "./clearableStyle"    ->  "./clearableStyle" (unchanged if co-located)
// 1c. Do NOT rename any exported symbol; do NOT change any value.
// 1d. Leave a re-export shim at the old path when v1 consumers still import it:
//       export * from "../../services/renderContracts/<name>";
```

`formRuntimeScript.ts` (2069 lines, verified) is the ONE split among the scripts:
its String.raw client bundle constant moves byte-identical into
`core/services/renderContracts/formRuntimeClientScript.ts`, while
`core/services/renderContracts/formRuntimeScript.ts` keeps only the tiny
`getFormRuntimeClientScript` wrapper that imports/returns that constant. No
other moved module may exceed 1000 lines.

Representative (tokens extraction):

```ts
// core/services/renderContracts/tokens.ts  (byte-identical to types.ts lines 219-226)
export const containerTokens = ["default", "narrow", "full"] as const;
export const spacingTokens = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const;
export type ContainerToken = (typeof containerTokens)[number];
export type SpacingToken = (typeof spacingTokens)[number];
export type InheritableContainerToken = ContainerToken | "inherit";
export type InheritableSpacingToken = SpacingToken | "inherit";
export type DeviceTarget = "desktop" | "tablet" | "mobile";

// core/widgets/types.ts (replace the definitions above with:)
export {
  containerTokens,
  spacingTokens,
  type ContainerToken,
  type SpacingToken,
  type InheritableContainerToken,
  type InheritableSpacingToken,
  type DeviceTarget,
} from "../services/renderContracts/tokens";
```

### 2. Split mixed renderer modules

Split boundary: shared data types + constants + defaults + schemas + normalizers +
`*Block` renderer → neutral; `*EditorContract` + `create*Widget` + `WidgetDefinition`
/`WidgetRenderer` coupling → stays in v1.

```ts
// core/services/renderContracts/contentListContract.ts
//   move (byte-identical): ContentListVariantId ... ContentListData types,
//   contentListLimitMin/Max, contentListSchema, contentListDefaults,
//   resolveContentListSort/Variant/Gap, normalizeContentListLimit,
//   normalizeContentListRuntimeItems, normalizeContentListData,
//   ContentListTemplatePresentation* and mapListingTemplatePresentationToContentList.
//   imports: only react types, clearableStyle, widgetSafeHref, search/filterContract.

// core/services/renderContracts/contentListRenderer.tsx
//   move (byte-identical): ContentListItemCard, ContentListPager(+Props, actions),
//   ContentListBlock, and their private helpers.
//   imports: contentListContract, clearableStyle, widgetSafeHref.

// core/widgets/core/contentList.tsx (v1 remnant)
//   keep: contentListEditorContract, createContentListWidget.
//   imports shared types from core/services/renderContracts/contentListContract;
//   re-export shared names only if another v1 file still needs them.
```

Repeat for `navigation` (types + `NavigationBlock` + runtime DOM helpers → neutral;
`navigationEditorContract` + `createNavigationWidget` stay), `formEmbed`
(`FormEmbedBlock` + `formEmbedFields` helpers → neutral; editor contract + creator
stay), `listingFilters` (already split across contract/renderer/editor files; move
contract + renderer, keep editor), `hero` (`HeroData`/defaults/schema/normalizers →
`heroContract.ts`; `HeroBlock`/editor/creator stay).

### 3. Runtime script registry decoupling

`core/widgets/runtimeScripts.tsx` imports `WidgetRenderContext` from v1 `types`.
Do not move that v1 type; define a structural, dependency-free registry contract:

```ts
// core/services/renderContracts/runtimeScriptRegistry.tsx
import type { ReactNode } from "react";

export type RuntimeScriptRegistry = {
  registerScript: (id: string, source: string) => void;
  renderScripts: () => ReactNode[];
};

export function createWidgetRuntimeScriptRegistry(): RuntimeScriptRegistry {
  // byte-identical body to the v1 implementation
}

export function renderSharedWidgetRuntimeScript({
  renderContext,
  id,
  source,
}: {
  renderContext?: { runtimeScripts?: RuntimeScriptRegistry };
  id: string;
  source: string;
}): ReactNode {
  // byte-identical body; the narrowed param type is structurally compatible
  // with the v1 WidgetRenderContext.runtimeScripts field.
}
```

Because TypeScript is structural, `WidgetRenderContext.runtimeScripts` (v1 type)
remains assignable to `RuntimeScriptRegistry` without a type change in `types.ts`.
Rewire `publicSite.tsx` and `renderPublicPage.tsx` to import
`createWidgetRuntimeScriptRegistry` from the neutral module.

### 4. Admin shared color controls

```ts
// git mv core/admin/ui/widgets/editors/SharedColorControl.tsx
//        -> core/admin/ui/shared/SharedColorControl.tsx
// git mv core/admin/ui/widgets/editors/TokenOrPixelField.tsx
//        -> core/admin/ui/shared/TokenOrPixelField.tsx
// Old path becomes:
export { SharedColorControl, describeSharedColorControlState } from "@/ui/shared/SharedColorControl";
// (and the analogous TokenOrPixelField shim) so the ~20 live widget editors
// keep compiling until TASK-580-02 removes them.
```

Rewire `core/admin/ui/forms/FormDesignPanel.tsx`:

```tsx
import { SharedColorControl } from "@/ui/shared/SharedColorControl";
```

### 5. Deletions and comment cleanup

```bash
rm -f core/.tmp/widget_audit_all.tsx core/.tmp/widget_audit_all.jsonl \
      core/.tmp/widget_audit.tsx core/.tmp/widget_contract_diff.ts \
      core/.tmp/widget_contract_diff.jsonl
```

Before the 580-02 rewire, prove the blueprint modules are production-orphaned (the
production delete itself is owned by TASK-580-03-L06):

```bash
# library: expect only the test-file hit, plus its own definition line
grep -rn "blueprintPageSectionLibrary" core/ tests/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v "blueprintPageSectionLibrary.ts:" \
  # -> only tests/vitest/assistant/blueprint-page-section-library.test.ts
# types: expect only the library's own import, plus its own definition line
grep -rn "blueprintPageSectionTypes" core/ tests/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v "blueprintPageSectionTypes.ts:" \
  # -> only the library's own import
```

### Data flow

Move-only refactor: same module graph, same emitted values. A V2 page render and a
no-widget entry render must produce byte-identical output before and after. The v1
kernel (`core/widgets/registry|validator|runtime|renderers`) keeps working through
the shims; no runtime path changes in this task.

### Error handling

- `lint:types` and `lint` must stay green after each module move; a broken shim is
  a hard fail, not a soft skip.
- Reject-unknown schema behavior must remain byte-identical; do not widen any
  schema while relocating.
- If `commerceWidgetRuntime.ts` has no V2 commerce-block equivalent (verify first),
  leave it importing from the v1 shim and record a follow-up for 580-02/04 rather
  than inventing a new contract here.

### Regression-test shape

- Byte-identity: `buildSiteShellCss(null)` and no-override V2 page render ZERO-line
  diff; moved-contract unit tests import from the NEW path and assert identical
  exported values (e.g. `contentListLimitMax === 24`,
  `FORM_EMBED_TEXTAREA_ROWS_LIMITS` object equality, `normalizeContentListData`
  output equality).
- Import-graph boundary: a test or lint pass asserting `core/services/renderContracts/*`
  never imports `core/widgets/**` (except the v1 shim files, which are explicitly
  allowed and deleted later).
- Consumer regression: existing Vitest suites for pages/content/navigation/forms
  /site/assistant/kits stay green with only import-path diffs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run check:admin-bundle`
- Targeted Vitest: `tests/vitest/pages/*`, `tests/vitest/site/*`,
  `tests/vitest/forms/*`, `tests/vitest/content/*`, `tests/unit/navigation/*`,
  `tests/vitest/assistant/*`, `tests/vitest/kits/*`, and the moved-contract unit
  suites in `tests/vitest/renderContracts/*` (or their current owning location).
- Targeted Bun: content/detail-page, navigation, menu render, commerce runtime,
  posts-feed/product-table pagination, assistant full-service runtime, and the
  `bookingSchemas` validation suites.
- Byte-identity pins: `buildSiteShellCss(null)` and no-override V2 render tests
  must show ZERO diff.
- `git diff --check` and `bun run precommit` before a manual commit.
- DB-backed tests only if `DATABASE_URL` is available (load `.env` first).

## Documentation Updates Required

- `_docs/_TASKS/README.md` (board row + Statistics — done by the parent author at
  authoring time).
- No product-doc change is required for this pure refactor; if the neutral module
  location is deemed public architecture, note it in `_docs/ARCHITECTURE.md` and
  `docs/develop/project-structure.md` during closure.
- `_docs/_CHANGELOG/` + `_docs/_CHANGELOG/README.md` at family closure (changelog
  1323 pinned).

## Acceptance Criteria

1. `core/services/renderContracts/*` owns the relocated shared contracts, tokens,
   renderers, and runtime scripts; every moved export keeps its exact name/value.
2. No Page V2, content, navigation, settings, server, site, template, or forms
   module imports the relocated symbols from `core/widgets/**` anymore.
3. `core/widgets/**` still compiles via compatibility shims, and the v1 kernel is
   functionally untouched.
4. `SharedColorControl`/`TokenOrPixelField` live in `core/admin/ui/shared/` with a
   shim at the old editors path; `FormDesignPanel.tsx` imports the shared location.
5. `.tmp` widget-audit junk is gone from the main tree and the `popupRuntimeScript.ts`
   stale comment is removed; the blueprint modules stay put (580-02 rewires them,
   580-03-L06 deletes them with their test importer).
6. Byte-identity guards, lint, types, admin build/boundary, and targeted suites are
   green; moved files are each ≤1000 lines after splitting.
