import { invariant } from "./core.mjs";
import {
  andPredicate,
  arrayPredicateRef,
  capturePredicateRef,
  comparePredicate,
  deepEqualPredicate,
  everyPositiveObservationRect,
  everyPredicate,
  everyZeroObservationRect,
  fixturePredicateRef,
  lengthRef,
  literalPredicateRef,
  notPredicate,
  observationEquals,
  observationEqualsRef,
  observationLengthEquals,
  observationNonEmpty,
  observationRef,
  outputRef,
  pathPredicateRef,
  positiveRectRefPredicate,
  priorPredicateRef,
  sameSetPredicate,
  subtractionPredicateRef,
  varRef,
  withinPredicate,
} from "./contract-dsl.mjs";

export function visibleAssertionTargetRef(name) {
  if (name === "persisted-no-empty-binding") return capturePredicateRef("screen.id");
  if (["safe-link-front-url", "unsafe-link-disabled"].includes(name))
    return capturePredicateRef("palette.button");
  if (["direct-image-safe-url", "missing-or-unsafe-placeholder"].includes(name)) {
    return fixturePredicateRef(["screen", "blockIds", "raceImage"]);
  }
  if (name === "media-field-keeps-uuid") {
    return fixturePredicateRef(["screen", "blockIds", "mediaField"]);
  }
  if (
    [
      "three-tabs-persisted",
      "one-panel-visible",
      "other-panels-zero-geometry",
      "armed-slot-equals-active-tab",
      "arrow-home-end-focus",
      "aria-reciprocal",
      "nested-tabs-isolated",
      "renderer-ids-unique",
    ].includes(name)
  )
    return capturePredicateRef("palette.outer-tabs");
  if (name === "space-text-preserved")
    return fixturePredicateRef(["screen", "blockIds", "spaceNoteField"]);
  if (["nested-controls-do-not-select", "selection-handle-independent"].includes(name)) {
    return fixturePredicateRef(["screen", "blockIds", "spaceGroup"]);
  }
  if (["builder-cancel-byte-identical", "builder-confirm-navigates-once"].includes(name)) {
    return capturePredicateRef("palette.dirty-text");
  }
  if (["related-error-visible-before-retry", "visible-retry-succeeds"].includes(name)) {
    return fixturePredicateRef(["retryScreen", "relatedListBlockId"]);
  }
  if (
    [
      "same-target-visible-rows-retained",
      "target-switch-immediate-empty",
      "stale-a-cannot-commit",
    ].includes(name)
  ) {
    return fixturePredicateRef(["screen", "blockIds", "relatedListA"]);
  }
  if (name === "only-b-rows-visible")
    return fixturePredicateRef(["screen", "blockIds", "relatedListB"]);
  return capturePredicateRef("entry.id");
}

export function visibleTargetPredicate(targetRef) {
  return deepEqualPredicate(outputRef(["target"]), targetRef);
}

export function expectedTabIdsRef() {
  return arrayPredicateRef([
    fixturePredicateRef(["tabs", "defaults", "0", "id"]),
    fixturePredicateRef(["tabs", "defaults", "1", "id"]),
    fixturePredicateRef(["tabs", "added", "id"]),
  ]);
}

export function expectedTabLabelsRef() {
  return arrayPredicateRef([
    fixturePredicateRef(["tabs", "authoredLabels", "tab-1"]),
    fixturePredicateRef(["tabs", "authoredLabels", "tab-2"]),
    fixturePredicateRef(["tabs", "authoredLabels", "tab-3"]),
  ]);
}

export function expectedTabTextRef() {
  return arrayPredicateRef([
    fixturePredicateRef(["tabs", "text", "tab-1"]),
    fixturePredicateRef(["tabs", "text", "tab-2"]),
    fixturePredicateRef(["tabs", "text", "tab-3"]),
  ]);
}

export function expectedRelatedIdsRef(group) {
  return arrayPredicateRef([
    capturePredicateRef(`related-entry-${group}1.id`),
    capturePredicateRef(`related-entry-${group}2.id`),
  ]);
}

export function geometrySamplesPredicate(actionIds, { panel = false } = {}) {
  const items = actionIds.map((actionId, index) =>
    observationEqualsRef(["samples", String(index)], priorPredicateRef(actionId))
  );
  if (panel) {
    items.push(
      everyPredicate(
        observationRef(["samples"]),
        "viewportSample",
        andPredicate([
          comparePredicate(
            "gte",
            varRef("viewportSample", ["panel", "left"]),
            literalPredicateRef(0)
          ),
          comparePredicate(
            "lte",
            varRef("viewportSample", ["panel", "right"]),
            varRef("viewportSample", ["viewportWidth"])
          ),
          positiveRectRefPredicate(varRef("viewportSample", ["panel"])),
        ])
      )
    );
  }
  return andPredicate(items);
}

export function createVisibleAssertionPredicate(name, targetRef) {
  const exact = (field, value) => observationEquals([field], value);
  const exactRef = (field, ref) => observationEqualsRef([field], ref);
  const sameObservationSet = (field, ref) => sameSetPredicate(observationRef([field]), ref);
  const positiveRects = (field, variable) => everyPositiveObservationRect([field], variable);
  const zeroRects = (field, variable) => everyZeroObservationRect([field], variable);
  let effect;
  if (name === "persisted-no-empty-binding") {
    effect = andPredicate([
      exactRef("screenId", capturePredicateRef("screen.id")),
      exact("hrefBindingCount", 1),
      exact("hrefBindingField", "primaryUrl"),
      exact("emptyFieldCount", 0),
    ]);
  } else if (name === "safe-link-front-url") {
    effect = andPredicate([
      exact("tagName", "A"),
      exactRef("href", pathPredicateRef("safeFront")),
      exactRef("pageUrl", pathPredicateRef("safeFront")),
    ]);
  } else if (name === "unsafe-link-disabled") {
    effect = andPredicate([
      exact("tagName", "SPAN"),
      exact("ariaDisabled", "true"),
      exact("href", null),
      exact("anchorCount", 0),
    ]);
  } else if (name === "direct-image-safe-url") {
    effect = andPredicate([
      exact("imageCount", 1),
      exactRef("src", capturePredicateRef("media.resolved-url")),
      exact("placeholderVisible", false),
    ]);
  } else if (name === "missing-or-unsafe-placeholder") {
    effect = andPredicate([
      exact("imageCount", 0),
      exact("placeholderVisible", true),
      exact("unsafeUrlPresent", false),
    ]);
  } else if (name === "media-field-keeps-uuid") {
    effect = andPredicate([
      exactRef("selectedMediaTitle", fixturePredicateRef(["media", "title"])),
      exactRef("selectedImageSrc", capturePredicateRef("media.resolved-url")),
      exactRef("persistedMediaId", capturePredicateRef("media.id")),
      exact("persistedResolvedUrlPresent", false),
    ]);
  } else if (name === "three-tabs-persisted") {
    effect = andPredicate([
      exactRef("tabIds", expectedTabIdsRef()),
      exactRef("labels", expectedTabLabelsRef()),
      exactRef("slotIds", expectedTabIdsRef()),
      exactRef("nestedText", expectedTabTextRef()),
    ]);
  } else if (name === "one-panel-visible") {
    effect = andPredicate([
      exactRef("activeTabId", priorPredicateRef("tc-038-history-state", ["activeTabId"])),
      exactRef("activeTabId", fixturePredicateRef(["tabs", "added", "id"])),
      exactRef("visiblePanelIds", priorPredicateRef("tc-038-history-state", ["visiblePanelIds"])),
      observationLengthEquals(["visiblePanelIds"], 1),
      observationEqualsRef(["visiblePanelIds", "0"], observationRef(["activeTabId"])),
      observationLengthEquals(["visibleRects"], 1),
      positiveRects("visibleRects", "visiblePanelRect"),
    ]);
  } else if (name === "other-panels-zero-geometry") {
    effect = andPredicate([
      sameObservationSet(
        "hiddenPanelIds",
        priorPredicateRef("tc-038-history-state", ["hiddenPanelIds"])
      ),
      sameObservationSet(
        "hiddenPanelIds",
        arrayPredicateRef([
          fixturePredicateRef(["tabs", "defaults", "0", "id"]),
          fixturePredicateRef(["tabs", "defaults", "1", "id"]),
        ])
      ),
      exact("hiddenValues", [true, true]),
      zeroRects("rects", "hiddenPanelRect"),
    ]);
  } else if (name === "armed-slot-equals-active-tab") {
    const active = arrayPredicateRef([
      priorPredicateRef("tc-036-details-state", ["activeTabId"]),
      priorPredicateRef("tc-038-history-state", ["activeTabId"]),
    ]);
    const armed = arrayPredicateRef([
      priorPredicateRef("tc-036-details-state", ["armedSlotId"]),
      priorPredicateRef("tc-038-history-state", ["armedSlotId"]),
    ]);
    effect = andPredicate([
      exactRef("activeTabId", active),
      exactRef("armedSlotId", armed),
      exactRef(
        "activeTabId",
        arrayPredicateRef([
          fixturePredicateRef(["tabs", "defaults", "1", "id"]),
          fixturePredicateRef(["tabs", "added", "id"]),
        ])
      ),
      observationEqualsRef(["activeTabId"], observationRef(["armedSlotId"])),
      observationEqualsRef(["activeTabId"], observationRef(["selectedTabId"])),
    ]);
  } else if (name === "arrow-home-end-focus") {
    effect = andPredicate([
      observationEqualsRef(
        ["steps"],
        arrayPredicateRef([
          priorPredicateRef("tk-014-observe-left"),
          priorPredicateRef("tk-016-observe-right"),
          priorPredicateRef("tk-018-observe-home"),
          priorPredicateRef("tk-020-observe-end"),
        ])
      ),
      observationEquals(["steps", "0", "focusedTabText"], "History"),
      observationEqualsRef(
        ["steps", "0", "selectedTabId"],
        fixturePredicateRef(["tabs", "added", "id"])
      ),
      observationEquals(["steps", "1", "focusedTabText"], "Overview"),
      observationEqualsRef(
        ["steps", "1", "selectedTabId"],
        fixturePredicateRef(["tabs", "defaults", "0", "id"])
      ),
      observationEquals(["steps", "2", "focusedTabText"], "Overview"),
      observationEqualsRef(
        ["steps", "2", "selectedTabId"],
        fixturePredicateRef(["tabs", "defaults", "0", "id"])
      ),
      observationEquals(["steps", "3", "focusedTabText"], "History"),
      observationEqualsRef(
        ["steps", "3", "selectedTabId"],
        fixturePredicateRef(["tabs", "added", "id"])
      ),
      everyPredicate(
        observationRef(["steps"]),
        "keyboardStep",
        andPredicate([
          deepEqualPredicate(
            varRef("keyboardStep", ["focusedTabId"]),
            varRef("keyboardStep", ["selectedTabId"])
          ),
          deepEqualPredicate(varRef("keyboardStep", ["tabIndex"]), literalPredicateRef(0)),
        ])
      ),
    ]);
  } else if (name === "aria-reciprocal") {
    effect = andPredicate([
      everyPredicate(
        observationRef(["pairs"]),
        "ariaPair",
        andPredicate([
          deepEqualPredicate(varRef("ariaPair", ["ariaControls"]), varRef("ariaPair", ["panelId"])),
          deepEqualPredicate(varRef("ariaPair", ["ariaLabelledBy"]), varRef("ariaPair", ["tabId"])),
        ])
      ),
      exactRef("visiblePanelId", observationRef(["pairs", "2", "panelId"])),
      sameObservationSet(
        "hiddenPanelIds",
        arrayPredicateRef([
          observationRef(["pairs", "0", "panelId"]),
          observationRef(["pairs", "1", "panelId"]),
        ])
      ),
      observationEquals(["pairs", "0", "selected"], false),
      observationEquals(["pairs", "0", "hidden"], true),
      observationEquals(["pairs", "1", "selected"], false),
      observationEquals(["pairs", "1", "hidden"], true),
      observationEquals(["pairs", "2", "selected"], true),
      observationEquals(["pairs", "2", "hidden"], false),
      observationEqualsRef(
        ["pairs", "2", "tabId"],
        priorPredicateRef("tk-020-observe-end", ["selectedTabId"])
      ),
    ]);
  } else if (name === "nested-tabs-isolated") {
    effect = andPredicate([
      exactRef("outerRootId", capturePredicateRef("palette.outer-tabs")),
      exactRef("innerRootId", capturePredicateRef("palette.inner-tabs")),
      notPredicate(
        deepEqualPredicate(observationRef(["outerRootId"]), observationRef(["innerRootId"]))
      ),
      exactRef("outerSelectedId", fixturePredicateRef(["tabs", "defaults", "0", "id"])),
      exactRef("innerSelectedId", fixturePredicateRef(["tabs", "defaults", "1", "id"])),
      notPredicate(
        deepEqualPredicate(observationRef(["outerSelectedId"]), observationRef(["innerSelectedId"]))
      ),
    ]);
  } else if (name === "renderer-ids-unique") {
    effect = andPredicate([
      comparePredicate("gt", lengthRef(observationRef(["ids"])), literalPredicateRef(0)),
      observationEqualsRef(["uniqueCount"], lengthRef(observationRef(["ids"]))),
    ]);
  } else if (name === "space-text-preserved") {
    effect = andPredicate([
      exactRef("expectedText", fixturePredicateRef(["entry", "spacePhrase"])),
      observationEqualsRef(["text"], observationRef(["expectedText"])),
    ]);
  } else if (name === "nested-controls-do-not-select") {
    effect = andPredicate([
      exact("linkActivated", true),
      exact("inputFocused", true),
      exactRef("selectedBefore", fixturePredicateRef(["screen", "blockIds", "spaceGroup"])),
      observationEqualsRef(["selectedBefore"], observationRef(["selectedAfter"])),
    ]);
  } else if (name === "selection-handle-independent") {
    effect = andPredicate([
      exact("handleFocused", true),
      exact("ariaPressed", true),
      exactRef("selectedBlockId", fixturePredicateRef(["screen", "blockIds", "spaceGroup"])),
      exact("defaultPrevented", false),
    ]);
  } else if (name === "builder-cancel-byte-identical") {
    effect = andPredicate([
      observationEqualsRef(["draftBefore"], observationRef(["draftAfter"])),
      observationEqualsRef(["urlBefore"], observationRef(["urlAfter"])),
      exactRef("draftBefore", priorPredicateRef("dg-011-builder-before-cancel", ["draftBytes"])),
      exactRef("urlBefore", priorPredicateRef("dg-011-builder-before-cancel", ["url"])),
    ]);
  } else if (name === "builder-confirm-navigates-once") {
    effect = andPredicate([
      exactRef("urlBefore", priorPredicateRef("dg-011-builder-before-cancel", ["url"])),
      exactRef("urlAfter", pathPredicateRef("records")),
      notPredicate(deepEqualPredicate(observationRef(["urlBefore"]), observationRef(["urlAfter"]))),
      exact("navigationCount", 1),
      exact("draftDiscarded", true),
    ]);
  } else if (name === "entry-cancel-byte-identical") {
    effect = andPredicate([
      observationEqualsRef(["contentBefore"], observationRef(["contentAfter"])),
      observationEqualsRef(["presentationBefore"], observationRef(["presentationAfter"])),
      exactRef("contentBefore", priorPredicateRef("dg-023-entry-before-cancel", ["contentBytes"])),
      exactRef(
        "presentationBefore",
        priorPredicateRef("dg-023-entry-before-cancel", ["presentationBytes"])
      ),
    ]);
  } else if (name === "entry-cancel-url-stable") {
    effect = andPredicate([
      observationEqualsRef(["urlBefore"], observationRef(["urlAfter"])),
      exactRef("urlBefore", priorPredicateRef("dg-023-entry-before-cancel", ["url"])),
    ]);
  } else if (name === "entry-confirm-navigates-once") {
    effect = andPredicate([
      exactRef("urlBefore", pathPredicateRef("entry")),
      exactRef("urlAfter", pathPredicateRef("records")),
      notPredicate(deepEqualPredicate(observationRef(["urlBefore"]), observationRef(["urlAfter"]))),
      exact("navigationCount", 1),
    ]);
  } else if (name === "entry-error-retains-both-drafts") {
    effect = andPredicate([
      exact("errorVisible", true),
      exactRef("contentValue", fixturePredicateRef(["entry", "contentDraft"])),
      exactRef("presentationValue", fixturePredicateRef(["entry", "presentationDraft"])),
      exact("contentDirty", true),
      exact("presentationDirty", true),
    ]);
  } else if (name === "beforeunload-active") {
    effect = andPredicate([exact("defaultPrevented", true), exact("returnValueSet", true)]);
  } else if (name === "successful-retry-clears-persisted-channel") {
    effect = andPredicate([
      exact("persistedContentMatches", true),
      exact("persistedPresentationUnchanged", true),
      exact("localPresentationPreserved", true),
      exact("contentDirty", false),
      exact("presentationDirty", true),
    ]);
  } else if (name === "related-error-visible-before-retry") {
    effect = andPredicate([
      exactRef("rootId", fixturePredicateRef(["retryScreen", "relatedListBlockId"])),
      exact("errorVisible", true),
      exact("retryVisible", true),
      exact("rowCount", 0),
      exact("skeletonChipCount", 3),
      positiveRects("skeletonRects", "retrySkeletonRect"),
      exact("emptyVisible", false),
    ]);
  } else if (name === "visible-retry-succeeds") {
    effect = andPredicate([
      exactRef("rootId", fixturePredicateRef(["retryScreen", "relatedListBlockId"])),
      exact("errorVisible", false),
      exact("retryVisible", false),
      exactRef(
        "failureRowIds",
        arrayPredicateRef([capturePredicateRef("related-entry-failure1.id")])
      ),
      positiveRects("failureRowRects", "failureRowRect"),
      exact("skeletonVisible", false),
      exact("emptyVisible", false),
    ]);
  } else if (name === "same-target-visible-rows-retained") {
    effect = andPredicate([
      exactRef("rootId", fixturePredicateRef(["screen", "blockIds", "relatedListA"])),
      exactRef("rowIdsBefore", priorPredicateRef("rc-017a-pre-route-a-baseline", ["rowIds"])),
      exactRef("rowIdsPending", priorPredicateRef("rc-017a-pre-route-a-baseline", ["rowIds"])),
      exactRef("rowTextBefore", priorPredicateRef("rc-017a-pre-route-a-baseline", ["rowText"])),
      exactRef("rowTextPending", priorPredicateRef("rc-017a-pre-route-a-baseline", ["rowText"])),
      sameObservationSet("rowIdsBefore", expectedRelatedIdsRef("a")),
      sameObservationSet("rowIdsPending", expectedRelatedIdsRef("a")),
      exactRef("rectsBefore", priorPredicateRef("rc-017a-pre-route-a-baseline", ["rects"])),
      exactRef("rectsPending", priorPredicateRef("rc-017a-pre-route-a-baseline", ["rects"])),
      positiveRects("rectsBefore", "retainedBeforeRect"),
      positiveRects("rectsPending", "retainedPendingRect"),
      exact("errorVisible", false),
      exact("skeletonVisible", false),
      exact("emptyVisible", false),
    ]);
  } else if (name === "target-switch-immediate-empty") {
    effect = andPredicate([
      exactRef("aRootId", fixturePredicateRef(["screen", "blockIds", "relatedListA"])),
      exactRef("bRootId", fixturePredicateRef(["screen", "blockIds", "relatedListB"])),
      exact("aRowCount", 0),
      exact("bRowCount", 0),
      exact("aEmptyVisible", false),
      exact("bEmptyVisible", false),
      exact("aSkeletonChipCount", 3),
      exact("bSkeletonChipCount", 3),
      positiveRects("skeletonRects", "targetSwitchSkeletonRect"),
    ]);
  } else if (name === "stale-a-cannot-commit") {
    effect = andPredicate([
      exactRef("aRootId", fixturePredicateRef(["screen", "blockIds", "relatedListA"])),
      exactRef("bRootId", fixturePredicateRef(["screen", "blockIds", "relatedListB"])),
      exact("aRowCount", 0),
      sameObservationSet("bRowIds", expectedRelatedIdsRef("b")),
      exact("staleATextPresent", false),
    ]);
  } else if (name === "only-b-rows-visible") {
    effect = andPredicate([
      exactRef("rootId", fixturePredicateRef(["screen", "blockIds", "relatedListB"])),
      sameObservationSet("visibleRowIds", expectedRelatedIdsRef("b")),
      positiveRects("visibleRects", "visibleBRect"),
      exact("skeletonVisible", false),
      exact("emptyVisible", false),
      exactRef(
        "bListGetCountBaseline",
        priorPredicateRef("rc-012c-picker-warm-proof", ["bListGetCount"])
      ),
      observationEqualsRef(["bListGetCountBaseline"], observationRef(["bListGetCount"])),
      observationEqualsRef(
        ["bListGetDelta"],
        subtractionPredicateRef(
          observationRef(["bListGetCount"]),
          observationRef(["bListGetCountBaseline"])
        )
      ),
      exact("bListGetDelta", 0),
    ]);
  } else if (name === "unrelated-draft-byte-identical") {
    effect = andPredicate([
      observationEqualsRef(["contentBefore"], observationRef(["contentAfter"])),
      observationEqualsRef(["presentationBefore"], observationRef(["presentationAfter"])),
      exactRef("contentBefore", priorPredicateRef("rc-017-unrelated-before", ["contentBytes"])),
      exactRef(
        "presentationBefore",
        priorPredicateRef("rc-017-unrelated-before", ["presentationBytes"])
      ),
    ]);
  } else if (name === "relation-diff-exact") {
    effect = andPredicate([
      exactRef("relationABefore", expectedRelatedIdsRef("a")),
      exact("relationAAfter", []),
      exact("relationBBefore", []),
      sameObservationSet("relationBAfter", expectedRelatedIdsRef("b")),
      exact("otherDiffPaths", []),
    ]);
  } else if (name === "flow6-exit-discarded-once") {
    effect = andPredicate([
      exactRef("url", pathPredicateRef("records")),
      exactRef(
        "navigationCountBaseline",
        priorPredicateRef("rc-017a-pre-route-a-baseline", ["navigationCount"])
      ),
      observationEqualsRef(
        ["navigationCountDelta"],
        subtractionPredicateRef(
          observationRef(["navigationCountCurrent"]),
          observationRef(["navigationCountBaseline"])
        )
      ),
      exact("navigationCountDelta", 1),
      exact("entryDirtyBadgeCount", 0),
      exact("presentationDirtyBadgeCount", 0),
    ]);
  } else if (name === "narrow-padding-and-positive-geometry") {
    const actions = [
      "ru-010-closed-320",
      "ru-012-open-320",
      "ru-015-closed-390",
      "ru-017-open-390",
      "ru-020-closed-480",
      "ru-022-open-480",
    ];
    effect = andPredicate([
      geometrySamplesPredicate(actions),
      everyPredicate(
        observationRef(["samples"]),
        "narrowSample",
        andPredicate([
          deepEqualPredicate(varRef("narrowSample", ["paddingRight"]), literalPredicateRef("24px")),
          comparePredicate(
            "gt",
            varRef("narrowSample", ["scrollerContent", "width"]),
            literalPredicateRef(0)
          ),
        ])
      ),
      observationEqualsRef(
        ["samples", "0", "scrollerBorder", "left"],
        observationRef(["samples", "1", "scrollerBorder", "left"])
      ),
      observationEqualsRef(
        ["samples", "0", "scrollerBorder", "width"],
        observationRef(["samples", "1", "scrollerBorder", "width"])
      ),
      observationEqualsRef(
        ["samples", "2", "scrollerBorder", "left"],
        observationRef(["samples", "3", "scrollerBorder", "left"])
      ),
      observationEqualsRef(
        ["samples", "2", "scrollerBorder", "width"],
        observationRef(["samples", "3", "scrollerBorder", "width"])
      ),
      observationEqualsRef(
        ["samples", "4", "scrollerBorder", "left"],
        observationRef(["samples", "5", "scrollerBorder", "left"])
      ),
      observationEqualsRef(
        ["samples", "4", "scrollerBorder", "width"],
        observationRef(["samples", "5", "scrollerBorder", "width"])
      ),
    ]);
  } else if (name === "wide-padding-delta-300") {
    const actions = [
      "ru-025-closed-1024",
      "ru-027-open-1024",
      "ru-030-closed-1280",
      "ru-032-open-1280",
    ];
    effect = andPredicate([
      geometrySamplesPredicate(actions),
      observationEquals(["samples", "0", "paddingRight"], "32px"),
      observationEquals(["samples", "1", "paddingRight"], "332px"),
      observationEquals(["samples", "2", "paddingRight"], "32px"),
      observationEquals(["samples", "3", "paddingRight"], "332px"),
      observationEqualsRef(
        ["samples", "0", "scrollerBorder", "left"],
        observationRef(["samples", "1", "scrollerBorder", "left"])
      ),
      observationEqualsRef(
        ["samples", "0", "scrollerBorder", "width"],
        observationRef(["samples", "1", "scrollerBorder", "width"])
      ),
      observationEqualsRef(
        ["samples", "2", "scrollerBorder", "left"],
        observationRef(["samples", "3", "scrollerBorder", "left"])
      ),
      observationEqualsRef(
        ["samples", "2", "scrollerBorder", "width"],
        observationRef(["samples", "3", "scrollerBorder", "width"])
      ),
      withinPredicate(
        subtractionPredicateRef(
          observationRef(["samples", "0", "scrollerContent", "width"]),
          observationRef(["samples", "1", "scrollerContent", "width"])
        ),
        literalPredicateRef(300),
        literalPredicateRef(1)
      ),
      withinPredicate(
        subtractionPredicateRef(
          observationRef(["samples", "2", "scrollerContent", "width"]),
          observationRef(["samples", "3", "scrollerContent", "width"])
        ),
        literalPredicateRef(300),
        literalPredicateRef(1)
      ),
    ]);
  } else if (name === "panel-inside-viewport") {
    effect = geometrySamplesPredicate(
      [
        "ru-012-open-320",
        "ru-017-open-390",
        "ru-022-open-480",
        "ru-027-open-1024",
        "ru-032-open-1280",
      ],
      { panel: true }
    );
  } else if (name === "user-a-b-a-isolated") {
    effect = andPredicate([
      exact("userAFirst", true),
      exact("userB", false),
      exact("userAReturn", false),
      exact("durableA", false),
      observationEquals(["metadataEffects", "userAFirst"], true),
      observationEquals(["metadataEffects", "userB"], false),
      observationEquals(["metadataEffects", "userAReturn"], false),
      observationEqualsRef(
        ["metadataEffects", "userB"],
        priorPredicateRef("ru-072-b-dark-capture", ["metadataEffect"])
      ),
      observationEquals(["userAReturnComputed", "theme"], "light"),
      observationEquals(["userAReturnComputed", "toggleAriaPressed"], "false"),
      observationNonEmpty(["userAReturnComputed", "rootColor"]),
      observationNonEmpty(["userAReturnComputed", "bodyColor"]),
      observationEqualsRef(
        ["userAReturnComputed", "rootColor"],
        priorPredicateRef("ru-045-a-light-capture", ["rootColor"])
      ),
      observationEqualsRef(
        ["userAReturnComputed", "bodyColor"],
        priorPredicateRef("ru-045-a-light-capture", ["bodyColor"])
      ),
      notPredicate(
        deepEqualPredicate(
          observationRef(["userAReturnComputed", "rootColor"]),
          priorPredicateRef("ru-072-b-dark-capture", ["rootColor"])
        )
      ),
      notPredicate(
        deepEqualPredicate(
          observationRef(["userAReturnComputed", "bodyColor"]),
          priorPredicateRef("ru-072-b-dark-capture", ["bodyColor"])
        )
      ),
    ]);
  } else if (name === "same-user-retained-view-pending") {
    effect = andPredicate([
      exact("visibleValue", true),
      exact("durableA", true),
      exact("readPending", true),
      exact("metadataEffect", true),
    ]);
  } else if (name === "same-user-authoritative-refresh") {
    effect = andPredicate([
      exact("before", true),
      exact("server", false),
      exact("after", false),
      exact("metadataEffect", false),
    ]);
  } else if (name === "newer-local-write-pending") {
    effect = andPredicate([
      exact("visibleValue", false),
      exact("newLocalValue", false),
      exact("readPending", true),
      exact("metadataEffect", false),
    ]);
  } else if (name === "newer-local-write-wins-refresh") {
    effect = andPredicate([
      exact("visibleValue", false),
      exact("persistedValue", false),
      exact("staleReadValue", true),
      exact("metadataEffect", false),
    ]);
  } else if (name === "legacy-local-storage-absent") {
    effect = andPredicate([
      exact("key", "coderso.screens.entry.preferences.v1"),
      exact("value", null),
      exact("writeCount", 0),
    ]);
  } else if (name === "light-and-dark-computed") {
    effect = andPredicate([
      observationEqualsRef(["userA"], priorPredicateRef("ru-045-a-light-capture")),
      observationEqualsRef(["userB"], priorPredicateRef("ru-072-b-dark-capture")),
      observationEquals(["userA", "theme"], "light"),
      observationEquals(["userA", "toggleAriaPressed"], "false"),
      observationEquals(["userB", "theme"], "dark"),
      observationEquals(["userB", "toggleAriaPressed"], "true"),
      observationEquals(["userB", "metadataEffect"], false),
      notPredicate(
        deepEqualPredicate(
          observationRef(["userA", "rootColor"]),
          observationRef(["userB", "rootColor"])
        )
      ),
      notPredicate(
        deepEqualPredicate(
          observationRef(["userA", "bodyColor"]),
          observationRef(["userB", "bodyColor"])
        )
      ),
    ]);
  } else if (name === "second-a-intent-visible-before-exit") {
    effect = andPredicate([
      exact("visibleValue", false),
      exact("queuedIntent", false),
      exact("firstWritePending", true),
      exact("metadataEffect", false),
    ]);
  } else if (name === "user-b-default-before-release") {
    effect = andPredicate([
      observationEquals(["response", "key"], "customScreens.entry.preferences"),
      observationEquals(["response", "value", "version"], 1),
      observationEquals(["response", "value", "showFieldMetadata"], false),
      exact("metadataEffect", false),
    ]);
  } else if (name === "user-b-default-unchanged") {
    effect = andPredicate([
      observationEquals(["before", "key"], "customScreens.entry.preferences"),
      observationEquals(["before", "value", "version"], 1),
      observationEquals(["before", "value", "showFieldMetadata"], false),
      observationEqualsRef(["before"], observationRef(["after"])),
      exact("metadataEffect", false),
    ]);
  } else if (name === "final-a-retry-converges") {
    effect = andPredicate([
      exact("visibleValue", false),
      exact("persistedValue", false),
      exact("writePending", false),
      exact("unhandledRejectionCount", 0),
      exact("metadataEffect", false),
    ]);
  } else {
    invariant(false, "visible assertion predicate is missing: " + name);
  }
  return andPredicate([visibleTargetPredicate(targetRef), effect]);
}
