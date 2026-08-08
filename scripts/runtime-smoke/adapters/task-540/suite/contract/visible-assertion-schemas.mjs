import { deepFreezeExact } from "./core.mjs";
import {
  schemaArray,
  schemaBoolean,
  schemaInteger,
  schemaLiteral,
  schemaNull,
  schemaObject,
  schemaString,
  schemaTuple,
} from "./contract-dsl.mjs";
import {
  createPreferenceResponseSchema,
  createRectSchema,
  createThemeSampleSchema,
  nullableSchema,
} from "./output-contracts.mjs";

export function visibleStringSchema({ maxLength = 4096 } = {}) {
  return schemaString({ minLength: 1, maxLength });
}

export function visibleIdSchema() {
  return schemaString({ minLength: 1, maxLength: 256 });
}

export function visibleUrlSchema() {
  return schemaString({ minLength: 8, maxLength: 2048, format: "http-url" });
}

export function visibleUuidSchema() {
  return schemaString({ minLength: 36, maxLength: 36, format: "uuid" });
}

export function visibleStringArraySchema({
  minItems = 0,
  maxItems = 128,
  unique = false,
  maxLength = 4096,
} = {}) {
  return schemaArray(visibleStringSchema({ maxLength }), { minItems, maxItems, unique });
}

export function visibleIdArraySchema({ minItems = 0, maxItems = 128, unique = true } = {}) {
  return schemaArray(visibleIdSchema(), { minItems, maxItems, unique });
}

export function visibleUuidArraySchema({ minItems = 0, maxItems = 128 } = {}) {
  return schemaArray(visibleUuidSchema(), { minItems, maxItems, unique: true });
}

export function visibleRectArraySchema({ minItems = 0, maxItems = 128 } = {}) {
  return schemaArray(createRectSchema(), { minItems, maxItems });
}

export function createVisibleGeometrySampleSchema({ panelRequired = false } = {}) {
  return schemaObject({
    width: schemaInteger({ minimum: 1, maximum: 10_000 }),
    state: schemaString({ minLength: 4, maxLength: 6, enumValues: ["open", "closed"] }),
    viewportWidth: schemaInteger({ minimum: 1, maximum: 10_000 }),
    paddingRight: schemaString({ minLength: 2, maxLength: 32 }),
    scrollerBorder: createRectSchema(),
    scrollerContent: createRectSchema(),
    panel: panelRequired ? createRectSchema() : nullableSchema(createRectSchema()),
  });
}

export function createVisibleKeyStepSchema(key) {
  return schemaObject({
    key: schemaLiteral(key),
    focusedTabText: visibleStringSchema({ maxLength: 256 }),
    focusedTabId: visibleIdSchema(),
    selectedTabId: visibleIdSchema(),
    tabIndex: schemaInteger({ minimum: 0, maximum: 1024 }),
  });
}

export function createVisibleAriaPairSchema() {
  return schemaObject({
    tabId: visibleIdSchema(),
    panelId: visibleIdSchema(),
    ariaControls: visibleIdSchema(),
    ariaLabelledBy: visibleIdSchema(),
    selected: schemaBoolean(),
    hidden: schemaBoolean(),
  });
}

export function createVisibleAssertionSchemas() {
  const boolean = schemaBoolean();
  const integer = schemaInteger({ minimum: 0, maximum: 100_000 });
  const id = visibleIdSchema();
  const url = visibleUrlSchema();
  const bytes = visibleStringSchema({ maxLength: 1_000_000 });
  const preferenceResponse = createPreferenceResponseSchema();
  const geometrySample = createVisibleGeometrySampleSchema();
  const openGeometrySample = createVisibleGeometrySampleSchema({ panelRequired: true });
  return deepFreezeExact({
    "persisted-no-empty-binding": schemaObject({
      screenId: visibleUuidSchema(),
      hrefBindingCount: integer,
      hrefBindingField: visibleStringSchema({ maxLength: 128 }),
      emptyFieldCount: integer,
    }),
    "safe-link-front-url": schemaObject({ tagName: id, href: url, pageUrl: url }),
    "unsafe-link-disabled": schemaObject({
      tagName: id,
      ariaDisabled: schemaString({ minLength: 4, maxLength: 4, enumValues: ["true"] }),
      href: schemaNull(),
      anchorCount: integer,
    }),
    "direct-image-safe-url": schemaObject({
      imageCount: integer,
      src: url,
      placeholderVisible: boolean,
    }),
    "missing-or-unsafe-placeholder": schemaObject({
      imageCount: integer,
      placeholderVisible: boolean,
      unsafeUrlPresent: boolean,
    }),
    "media-field-keeps-uuid": schemaObject({
      selectedMediaTitle: visibleStringSchema({ maxLength: 512 }),
      selectedImageSrc: url,
      persistedMediaId: visibleUuidSchema(),
      persistedResolvedUrlPresent: boolean,
    }),
    "three-tabs-persisted": schemaObject({
      tabIds: schemaTuple([id, id, id]),
      labels: schemaTuple([
        visibleStringSchema({ maxLength: 256 }),
        visibleStringSchema({ maxLength: 256 }),
        visibleStringSchema({ maxLength: 256 }),
      ]),
      slotIds: schemaTuple([id, id, id]),
      nestedText: schemaTuple([
        visibleStringSchema(),
        visibleStringSchema(),
        visibleStringSchema(),
      ]),
    }),
    "one-panel-visible": schemaObject({
      activeTabId: id,
      visiblePanelIds: visibleIdArraySchema({ minItems: 1, maxItems: 1 }),
      visibleRects: visibleRectArraySchema({ minItems: 1, maxItems: 1 }),
    }),
    "other-panels-zero-geometry": schemaObject({
      hiddenPanelIds: visibleIdArraySchema({ minItems: 2, maxItems: 2 }),
      hiddenValues: schemaTuple([schemaBoolean(), schemaBoolean()]),
      rects: visibleRectArraySchema({ minItems: 2, maxItems: 2 }),
    }),
    "armed-slot-equals-active-tab": schemaObject({
      activeTabId: schemaTuple([id, id]),
      armedSlotId: schemaTuple([id, id]),
      selectedTabId: schemaTuple([id, id]),
    }),
    "arrow-home-end-focus": schemaObject({
      steps: schemaTuple([
        createVisibleKeyStepSchema("ArrowLeft"),
        createVisibleKeyStepSchema("ArrowRight"),
        createVisibleKeyStepSchema("Home"),
        createVisibleKeyStepSchema("End"),
      ]),
    }),
    "aria-reciprocal": schemaObject({
      pairs: schemaTuple([
        createVisibleAriaPairSchema(),
        createVisibleAriaPairSchema(),
        createVisibleAriaPairSchema(),
      ]),
      visiblePanelId: id,
      hiddenPanelIds: visibleIdArraySchema({ minItems: 2, maxItems: 2 }),
    }),
    "nested-tabs-isolated": schemaObject({
      outerRootId: id,
      innerRootId: id,
      outerSelectedId: id,
      innerSelectedId: id,
    }),
    "renderer-ids-unique": schemaObject({
      ids: visibleIdArraySchema({ minItems: 20, maxItems: 20 }),
      uniqueCount: schemaInteger({ minimum: 20, maximum: 20 }),
    }),
    "space-text-preserved": schemaObject({
      text: visibleStringSchema(),
      expectedText: visibleStringSchema(),
    }),
    "nested-controls-do-not-select": schemaObject({
      linkActivated: boolean,
      inputFocused: boolean,
      selectedBefore: id,
      selectedAfter: id,
    }),
    "selection-handle-independent": schemaObject({
      handleFocused: boolean,
      ariaPressed: boolean,
      selectedBlockId: id,
      defaultPrevented: boolean,
    }),
    "builder-cancel-byte-identical": schemaObject({
      draftBefore: bytes,
      draftAfter: bytes,
      urlBefore: url,
      urlAfter: url,
    }),
    "builder-confirm-navigates-once": schemaObject({
      urlBefore: url,
      urlAfter: url,
      navigationCount: integer,
      draftDiscarded: boolean,
    }),
    "entry-cancel-byte-identical": schemaObject({
      contentBefore: bytes,
      contentAfter: bytes,
      presentationBefore: bytes,
      presentationAfter: bytes,
    }),
    "entry-cancel-url-stable": schemaObject({ urlBefore: url, urlAfter: url }),
    "entry-confirm-navigates-once": schemaObject({
      urlBefore: url,
      urlAfter: url,
      navigationCount: integer,
    }),
    "entry-error-retains-both-drafts": schemaObject({
      errorVisible: boolean,
      contentValue: visibleStringSchema(),
      presentationValue: schemaObject({ tone: schemaLiteral("muted") }),
      contentDirty: boolean,
      presentationDirty: boolean,
    }),
    "beforeunload-active": schemaObject({ defaultPrevented: boolean, returnValueSet: boolean }),
    "successful-retry-clears-persisted-channel": schemaObject({
      persistedContentMatches: boolean,
      persistedPresentationUnchanged: boolean,
      localPresentationPreserved: boolean,
      contentDirty: boolean,
      presentationDirty: boolean,
    }),
    "related-error-visible-before-retry": schemaObject({
      rootId: id,
      errorVisible: boolean,
      retryVisible: boolean,
      rowCount: integer,
      skeletonChipCount: integer,
      skeletonRects: visibleRectArraySchema({ minItems: 3, maxItems: 3 }),
      emptyVisible: boolean,
    }),
    "visible-retry-succeeds": schemaObject({
      rootId: id,
      errorVisible: boolean,
      retryVisible: boolean,
      failureRowIds: visibleUuidArraySchema({ minItems: 1, maxItems: 1 }),
      failureRowRects: visibleRectArraySchema({ minItems: 1, maxItems: 1 }),
      skeletonVisible: boolean,
      emptyVisible: boolean,
    }),
    "same-target-visible-rows-retained": schemaObject({
      rootId: id,
      rowIdsBefore: visibleUuidArraySchema({ minItems: 2, maxItems: 2 }),
      rowIdsPending: visibleUuidArraySchema({ minItems: 2, maxItems: 2 }),
      rowTextBefore: visibleStringArraySchema({ minItems: 2, maxItems: 2 }),
      rowTextPending: visibleStringArraySchema({ minItems: 2, maxItems: 2 }),
      rectsBefore: visibleRectArraySchema({ minItems: 2, maxItems: 2 }),
      rectsPending: visibleRectArraySchema({ minItems: 2, maxItems: 2 }),
      errorVisible: boolean,
      skeletonVisible: boolean,
      emptyVisible: boolean,
    }),
    "target-switch-immediate-empty": schemaObject({
      aRootId: id,
      bRootId: id,
      aRowCount: integer,
      bRowCount: integer,
      aEmptyVisible: boolean,
      bEmptyVisible: boolean,
      aSkeletonChipCount: integer,
      bSkeletonChipCount: integer,
      skeletonRects: visibleRectArraySchema({ minItems: 6, maxItems: 6 }),
    }),
    "stale-a-cannot-commit": schemaObject({
      aRootId: id,
      bRootId: id,
      aRowCount: integer,
      bRowIds: visibleUuidArraySchema({ minItems: 2, maxItems: 2 }),
      staleATextPresent: boolean,
    }),
    "only-b-rows-visible": schemaObject({
      rootId: id,
      visibleRowIds: visibleUuidArraySchema({ minItems: 2, maxItems: 2 }),
      visibleRects: visibleRectArraySchema({ minItems: 2, maxItems: 2 }),
      skeletonVisible: boolean,
      emptyVisible: boolean,
      bListGetCountBaseline: schemaInteger({ minimum: 1, maximum: 100_000 }),
      bListGetCount: schemaInteger({ minimum: 1, maximum: 100_000 }),
      bListGetDelta: integer,
    }),
    "unrelated-draft-byte-identical": schemaObject({
      contentBefore: bytes,
      contentAfter: bytes,
      presentationBefore: bytes,
      presentationAfter: bytes,
    }),
    "relation-diff-exact": schemaObject({
      relationABefore: visibleUuidArraySchema({ minItems: 2, maxItems: 2 }),
      relationAAfter: visibleUuidArraySchema({ minItems: 0, maxItems: 0 }),
      relationBBefore: visibleUuidArraySchema({ minItems: 0, maxItems: 0 }),
      relationBAfter: visibleUuidArraySchema({ minItems: 2, maxItems: 2 }),
      otherDiffPaths: visibleStringArraySchema({
        minItems: 0,
        maxItems: 0,
        unique: true,
        maxLength: 512,
      }),
    }),
    "flow6-exit-discarded-once": schemaObject({
      url,
      navigationCountBaseline: integer,
      navigationCountCurrent: integer,
      navigationCountDelta: integer,
      entryDirtyBadgeCount: integer,
      presentationDirtyBadgeCount: integer,
    }),
    "narrow-padding-and-positive-geometry": schemaObject({
      samples: schemaTuple([
        geometrySample,
        geometrySample,
        geometrySample,
        geometrySample,
        geometrySample,
        geometrySample,
      ]),
    }),
    "wide-padding-delta-300": schemaObject({
      samples: schemaTuple([geometrySample, geometrySample, geometrySample, geometrySample]),
    }),
    "panel-inside-viewport": schemaObject({
      samples: schemaTuple([
        openGeometrySample,
        openGeometrySample,
        openGeometrySample,
        openGeometrySample,
        openGeometrySample,
      ]),
    }),
    "user-a-b-a-isolated": schemaObject({
      userAFirst: boolean,
      userB: boolean,
      userAReturn: boolean,
      durableA: boolean,
      metadataEffects: schemaObject({ userAFirst: boolean, userB: boolean, userAReturn: boolean }),
      userAReturnComputed: createThemeSampleSchema(),
    }),
    "same-user-retained-view-pending": schemaObject({
      visibleValue: boolean,
      durableA: boolean,
      readPending: boolean,
      metadataEffect: boolean,
    }),
    "same-user-authoritative-refresh": schemaObject({
      before: boolean,
      server: boolean,
      after: boolean,
      metadataEffect: boolean,
    }),
    "newer-local-write-pending": schemaObject({
      visibleValue: boolean,
      newLocalValue: boolean,
      readPending: boolean,
      metadataEffect: boolean,
    }),
    "newer-local-write-wins-refresh": schemaObject({
      visibleValue: boolean,
      persistedValue: boolean,
      staleReadValue: boolean,
      metadataEffect: boolean,
    }),
    "legacy-local-storage-absent": schemaObject({
      key: visibleStringSchema({ maxLength: 256 }),
      value: schemaNull(),
      writeCount: integer,
    }),
    "light-and-dark-computed": schemaObject({
      userA: createThemeSampleSchema(),
      userB: createThemeSampleSchema({ metadata: true }),
    }),
    "second-a-intent-visible-before-exit": schemaObject({
      visibleValue: boolean,
      queuedIntent: boolean,
      firstWritePending: boolean,
      metadataEffect: boolean,
    }),
    "user-b-default-before-release": schemaObject({
      response: preferenceResponse,
      metadataEffect: boolean,
    }),
    "user-b-default-unchanged": schemaObject({
      before: preferenceResponse,
      after: preferenceResponse,
      metadataEffect: boolean,
    }),
    "final-a-retry-converges": schemaObject({
      visibleValue: boolean,
      persistedValue: boolean,
      writePending: boolean,
      unhandledRejectionCount: integer,
      metadataEffect: boolean,
    }),
  });
}
