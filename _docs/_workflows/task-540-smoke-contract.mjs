import { createHash } from "node:crypto";

import { SETUP_ACTION_ROWS } from "./task-540-smoke/contract/actions/setup.mjs";
import { BUTTON_IMAGE_ACTION_ROWS } from "./task-540-smoke/contract/actions/button-image.mjs";
import { TABS_CONTENT_ACTION_ROWS } from "./task-540-smoke/contract/actions/tabs-content.mjs";
import { TABS_KEYBOARD_ACTION_ROWS } from "./task-540-smoke/contract/actions/tabs-keyboard.mjs";
import { SPACE_SELECTION_ACTION_ROWS } from "./task-540-smoke/contract/actions/space-selection.mjs";
import { DIRTY_GUARD_ACTION_ROWS } from "./task-540-smoke/contract/actions/dirty-guard.mjs";
import { RECOVERY_CACHE_ACTION_ROWS } from "./task-540-smoke/contract/actions/recovery-cache.mjs";
import { RETENTION_USER_ACTION_ROWS } from "./task-540-smoke/contract/actions/retention-user.mjs";
import { TERMINAL_ACTION_ROWS } from "./task-540-smoke/contract/actions/terminal.mjs";

const NONCE_PATTERN = /^[a-f0-9]{12}$/;

const ACTION_KEYS = Object.freeze([
  "ordinal",
  "id",
  "scenario",
  "pageId",
  "tabIndex",
  "kind",
  "builder",
  "precondition",
  "captureInput",
  "captureOutput",
  "postcondition",
  "assertionDependencies",
  "routeStateBefore",
  "routeStateAfter",
  "executable",
  "outputSchemaId",
  "repositoryMutationPolicy",
]);

const EXECUTABLE_KEYS_BY_TYPE = deepFreezeExact({
  "runtime-operation": ["type", "operationId", "refs"],
  "browser-run-code": ["type", "sourceId", "refs"],
  "browser-native": ["type", "operationId", "refs"],
  "browser-screenshot": ["type", "screenshotId", "fullPage"],
  "browser-global-list": ["type"],
});

const REQUIRED_EXECUTABLE_TYPE_COUNTS = deepFreezeExact({
  "runtime-operation": 76,
  "browser-run-code": 392,
  "browser-native": 14,
  "browser-screenshot": 13,
  "browser-global-list": 1,
});

const REQUIRED_NATIVE_ACTION_IDS = Object.freeze([
  "set-005-open",
  "set-009-login-email",
  "set-010-login-password",
  "ru-042-a-password",
  "ru-068-b-password",
  "ru-078-a2-password",
  "ru-092-b2-password",
  "ru-104-a3-password",
  "rc-019-related-tab-new",
  "rc-022-related-tab-origin",
  "rc-044-close-second-tab",
  "rc-045-origin-proof",
  "end-002-route-list",
  "end-006-close",
]);

const BROWSER_NATIVE_OPERATION_IDS = Object.freeze([
  "open-about-blank",
  "fill-secret",
  "tab-new",
  "tab-select",
  "tab-close",
  "route-list",
  "close",
]);

const REQUIRED_GLOBAL_LIST_ACTION_IDS = Object.freeze(["end-007-session-absence"]);

const REQUIRED_SCENARIOS = Object.freeze([
  "button-image",
  "tabs-content",
  "tabs-keyboard-aria",
  "space-selection",
  "dirty-guards",
  "related-retry-cache",
  "responsive-users",
]);

const REQUIRED_FLOW_ACTION_COUNTS = Object.freeze({
  "button-image": 76,
  "tabs-content": 49,
  "tabs-keyboard-aria": 36,
  "space-selection": 35,
  "dirty-guards": 49,
  "related-retry-cache": 54,
  "responsive-users": 135,
});

const REQUIRED_SETUP_ACTION_COUNT = 55;
const REQUIRED_FLOW_ACTION_COUNT = 434;
const REQUIRED_TERMINAL_ACTION_COUNT = 7;
const REQUIRED_ACTION_COUNT = 496;

const REQUIRED_FIXTURE_SUBJECT_KEYS = Object.freeze([
  "user-a",
  "user-b",
  "content-type-editable",
  "content-type-related-a",
  "content-type-related-b",
  "content-type-related-failure",
  "related-entry-a1",
  "related-entry-a2",
  "related-entry-b1",
  "related-entry-b2",
  "related-entry-failure1",
  "media",
  "editable-entry",
  "screen",
  "retry-screen",
]);

const REQUIRED_CAPTURE_NAMES = Object.freeze([
  "user-a.id",
  "user-b.id",
  "content-type-editable.id",
  "content-type-related-a.id",
  "content-type-related-b.id",
  "content-type-related-failure.id",
  "related-entry-a1.id",
  "related-entry-a2.id",
  "related-entry-b1.id",
  "related-entry-b2.id",
  "related-entry-failure1.id",
  "media.id",
  "media.resolved-url",
  "media.storage-key",
  "entry.id",
  "screen.id",
  "retry-screen.id",
]);

const REQUIRED_RUNTIME_BLOCK_CAPTURES = Object.freeze([
  "palette.button",
  "palette.image",
  "palette.media-field",
  "palette.outer-tabs",
  "palette.tab-one-text",
  "palette.tab-two-text",
  "palette.tab-three-text",
  "palette.inner-tabs",
  "palette.dirty-text",
]);

const REQUIRED_FIXTURE_REF_PATHS = Object.freeze([
  "entry.contentDraft",
  "entry.relatedUnrelatedDraft",
  "media.title",
  "relatedEntries.a1.title",
  "relatedEntries.a1.updatedTitle",
  "relatedEntries.a2.title",
  "relatedEntries.b1.title",
  "relatedEntries.b2.title",
  "retryScreen.relatedListBlockId",
  "screen.blockIds.headlineField",
  "screen.blockIds.mediaField",
  "screen.blockIds.raceImage",
  "screen.blockIds.relatedListA",
  "screen.blockIds.relatedListB",
  "screen.blockIds.relationAField",
  "screen.blockIds.relationBField",
  "screen.blockIds.spaceGroup",
  "screen.blockIds.spaceLink",
  "screen.blockIds.spaceNoteField",
  "tabs.text.tab-1",
  "tabs.text.tab-2",
  "tabs.text.tab-3",
  "users.a.displayName",
  "users.a.email",
  "users.b.displayName",
  "users.b.email",
]);

const REQUIRED_ISOLATED_API_ACTION_IDS = Object.freeze([
  "set-011b-bootstrap-api-login",
  "set-011c-bootstrap-csrf-capture",
  "ru-043b-a-api-login",
  "ru-043c-a-api-csrf-capture",
  "ru-047a-a-durable-proof",
  "ru-050-a-server-false",
  "ru-051-a-server-false-proof",
  "ru-061a-a-durable-bypass-read",
]);

const REQUIRED_SIGNOUT_SETTLEMENT_IDS = Object.freeze([
  "ru-040a-bootstrap-signout-settled",
  "ru-066a-a-signout-settled",
  "ru-076a-b-signout-settled",
  "ru-090a-a-exit-signout-settled",
  "ru-102a-b2-signout-settled",
]);

const REQUIRED_METADATA_STATE_VALUES = deepFreezeExact({
  "ru-047-a-write-settle": true,
  "ru-053-a-authoritative": false,
  "ru-053b-a-nondefault-write-settled": true,
  "ru-058-retained-pending": true,
  "ru-059a-new-local-browser-write-settled": false,
  "ru-062-new-local-wins": false,
  "ru-072-b-dark-capture": false,
  "ru-082-isolation-proof": false,
  "ru-087-second-intent": false,
  "ru-095-b-before-release": false,
  "ru-099-b-unchanged": false,
  "ru-106a-a3-fresh-read-settled": true,
  "ru-108-convergence": false,
});

const MAX_PREFERENCE_UNMOUNT_WINDOW_MS = 20_000;
const SCREEN_PREFERENCE_SETTLED_RETENTION_MS = 30_000;
const AUTH_RATE_ALWAYS_PRODUCER_KINDS = Object.freeze([
  "goto",
  "tab-new",
  "isolatedApiSessionLogin",
  "isolatedApiSessionCsrfCapture",
]);
const AUTH_RATE_ALWAYS_PRODUCER_BUILDERS = Object.freeze([
  "apiPublicRead(auth-bot-protection)",
  "click(S.loginSubmit)",
  "click(S.signOut)",
  "click(S.builderSave)",
  "click(S.presentationSave)",
  "click(S.secondTabSave)",
]);
const AUTH_RATE_CONDITIONAL_CSRF_ACTIONS = deepFreezeExact({
  producers: {
    "dg-029-save-click": "click(S.entrySave)",
    "ru-046-a-metadata-enable": "click(S.metadata)",
    "ru-084-first-a-toggle": "click(S.metadata)",
    "ru-107-fresh-a-toggle": "click(S.metadata)",
  },
  cached: {
    "dg-035-real-retry": "click(S.entrySave)",
    "ru-053a-a-nondefault-toggle": "click(S.metadata)",
    "ru-059-new-local-toggle": "click(S.metadata)",
    "ru-086-second-a-toggle": "click(S.metadata)",
  },
});
const AUTH_RATE_COSTS_BY_ACTION = deepFreezeExact({
  "set-004a-bot-protection-preflight": { publicPreflight: 1 },
  "set-007-goto-login": { browserUnauthenticatedNoIdentifier: 5 },
  "set-011-login-submit": { browserLoginBootstrapEmail: 1, bootstrapUser: 3 },
  "set-011b-bootstrap-api-login": { isolatedBootstrapLogin: 1 },
  "set-011c-bootstrap-csrf-capture": { bootstrapUser: 1 },
  "set-045-builder-cold": { bootstrapUser: 2 },
  "bi-014-builder-save": { bootstrapUser: 1 },
  "bi-016-list": { bootstrapUser: 2 },
  "bi-017-reopen": { bootstrapUser: 2 },
  "bi-042-save-presentation": { bootstrapUser: 1 },
  "bi-044-builder-return": { bootstrapUser: 2 },
  "bi-055-save-palette-media": { bootstrapUser: 1 },
  "bi-056-entry-return": { bootstrapUser: 2 },
  "bi-059-entry-after-front": { bootstrapUser: 2 },
  "bi-062-entry-unsafe-reload": { bootstrapUser: 2 },
  "bi-066-final-entry": { bootstrapUser: 2 },
  "tc-003-builder": { bootstrapUser: 2 },
  "tc-031-save": { bootstrapUser: 1 },
  "tc-032-list": { bootstrapUser: 2 },
  "tc-033-reopen": { bootstrapUser: 2 },
  "tk-009-save": { bootstrapUser: 1 },
  "ss-007-entry": { bootstrapUser: 2 },
  "dg-003-builder": { bootstrapUser: 2 },
  "dg-029-save-click": { bootstrapUser: 1 },
  "rc-006-entry-link": { bootstrapUser: 2 },
  "rc-019-related-tab-new": { bootstrapUser: 2 },
  "rc-021-related-tab-save": { bootstrapUser: 1 },
  "ru-007-builder": { bootstrapUser: 2 },
  "ru-038-entry": { bootstrapUser: 2 },
  "ru-040-bootstrap-signout": {
    bootstrapUser: 2,
    browserUnauthenticatedNoIdentifier: 3,
  },
  "ru-043-a-submit": { browserLoginUserA: 1, userA: 3 },
  "ru-043b-a-api-login": { isolatedUserALogin: 1 },
  "ru-043c-a-api-csrf-capture": { userA: 1 },
  "ru-044-a-entry": { userA: 2 },
  "ru-046-a-metadata-enable": { userA: 1 },
  "ru-066-a-signout": { userA: 1, browserUnauthenticatedNoIdentifier: 3 },
  "ru-069-b-submit": { browserLoginUserB: 1, userB: 3 },
  "ru-070-b-entry": { userB: 2 },
  "ru-076-b-signout": { userB: 2, browserUnauthenticatedNoIdentifier: 3 },
  "ru-079-a2-submit": { browserLoginUserA: 1, userA: 3 },
  "ru-080-a2-entry": { userA: 2 },
  "ru-084-first-a-toggle": { userA: 1 },
  "ru-090-a-exit-signout": { userA: 1, browserUnauthenticatedNoIdentifier: 3 },
  "ru-093-b2-submit": { browserLoginUserB: 1, userB: 3 },
  "ru-094-b2-entry": { userB: 2 },
  "ru-102-b2-signout": { userB: 2, browserUnauthenticatedNoIdentifier: 3 },
  "ru-105-a3-submit": { browserLoginUserA: 1, userA: 3 },
  "ru-106-a3-entry": { userA: 2 },
  "ru-107-fresh-a-toggle": { userA: 1 },
});
const REQUIRED_AUTH_RATE_PLAN = deepFreezeExact({
  epochs: [
    {
      endsAtBarrierActionId: "bi-016a-auth-rate-window-barrier",
      maximumRequestsByIdentity: {
        bootstrapUser: 9,
        browserUnauthenticatedNoIdentifier: 5,
        browserLoginBootstrapEmail: 1,
        publicPreflight: 1,
        isolatedBootstrapLogin: 1,
      },
    },
    {
      endsAtBarrierActionId: "bi-061a-auth-rate-window-barrier",
      maximumRequestsByIdentity: { bootstrapUser: 10 },
    },
    {
      endsAtBarrierActionId: "tc-032a-auth-rate-window-barrier",
      maximumRequestsByIdentity: { bootstrapUser: 9 },
    },
    {
      endsAtBarrierActionId: "rc-017b-auth-rate-window-barrier",
      maximumRequestsByIdentity: { bootstrapUser: 10 },
    },
    {
      endsAtBarrierActionId: "ru-076b-auth-rate-window-barrier",
      maximumRequestsByIdentity: {
        bootstrapUser: 9,
        browserUnauthenticatedNoIdentifier: 9,
        userA: 8,
        userB: 7,
        browserLoginUserA: 1,
        browserLoginUserB: 1,
        isolatedUserALogin: 1,
      },
    },
    {
      endsAtBarrierActionId: "ru-100a-auth-rate-window-barrier",
      maximumRequestsByIdentity: {
        browserUnauthenticatedNoIdentifier: 3,
        userA: 7,
        userB: 5,
        browserLoginUserA: 1,
        browserLoginUserB: 1,
      },
    },
    {
      endsAtBarrierActionId: null,
      maximumRequestsByIdentity: {
        browserUnauthenticatedNoIdentifier: 3,
        userA: 6,
        userB: 2,
        browserLoginUserA: 1,
      },
    },
  ],
  requiredEnabledMaxRequests: 10,
  requiredEnabledWindowSecondsMin: 1,
  requiredEnabledWindowSecondsMax: 60,
});

const REQUIRED_ROUTE_KEYS = Object.freeze([
  "media-prior-resolution",
  "entry-save-failure",
  "related-first-failure",
  "related-a-refresh",
  "preference-a-read-refresh",
  "preference-a-write-exit",
]);

const REQUIRED_BUILDER_KIND_COUNTS = deepFreezeExact({
  storage: 2,
  host: 1,
  health: 2,
  apiPublicRead: 1,
  settingsRead: 2,
  open: 1,
  "logger-install": 1,
  goto: 22,
  resize: 11,
  fill: 23,
  click: 125,
  observe: 53,
  isolatedApiSessionLogin: 2,
  isolatedApiSessionCsrfCapture: 2,
  fixture: 4,
  fixtureRead: 4,
  api: 26,
  apiRead: 26,
  blocksBefore: 9,
  captureNew: 9,
  assert: 55,
  route: 22,
  screen: 13,
  "media-count-before-release": 1,
  "media-count-after-release": 1,
  logs: 42,
  focus: 2,
  press: 8,
  type: 4,
  dispatchAndCaptureSelectionHandle: 1,
  "tab-new": 1,
  "tab-select": 2,
  "tab-close": 1,
  isolatedApiSessionApiReadAs: 3,
  isolatedApiSessionApiAs: 1,
  authRateWindowBarrier: 6,
  "cleanup-release-unroute": 1,
  "cleanup-route-list": 1,
  "cleanup-console-errors": 1,
  "cleanup-console-warnings": 1,
  "cleanup-page-errors": 1,
  "cleanup-close": 1,
  "cleanup-session-absence": 1,
});

const REQUIRED_SMOKE_ASSERTIONS = deepFreezeExact({
  "button-image": [
    "persisted-no-empty-binding",
    "media-cache-cold-before-route",
    "prior-media-resolution-pending",
    "newer-media-winner-selected-pending",
    "stale-media-result-ignored",
    "direct-image-safe-url",
    "missing-or-unsafe-placeholder",
    "media-field-keeps-uuid",
    "safe-link-front-url",
    "unsafe-link-disabled",
  ],
  "tabs-content": [
    "three-tabs-persisted",
    "one-panel-visible",
    "other-panels-zero-geometry",
    "armed-slot-equals-active-tab",
  ],
  "tabs-keyboard-aria": [
    "arrow-home-end-focus",
    "aria-reciprocal",
    "nested-tabs-isolated",
    "renderer-ids-unique",
  ],
  "space-selection": [
    "space-text-preserved",
    "nested-controls-do-not-select",
    "selection-handle-independent",
  ],
  "dirty-guards": [
    "builder-cancel-byte-identical",
    "builder-confirm-navigates-once",
    "entry-cancel-byte-identical",
    "entry-cancel-url-stable",
    "entry-error-retains-both-drafts",
    "beforeunload-active",
    "successful-retry-clears-persisted-channel",
    "entry-confirm-navigates-once",
  ],
  "related-retry-cache": [
    "related-error-visible-before-retry",
    "visible-retry-succeeds",
    "same-target-visible-rows-retained",
    "target-switch-immediate-empty",
    "only-b-rows-visible",
    "unrelated-draft-byte-identical",
    "relation-diff-exact",
    "stale-a-cannot-commit",
    "flow6-exit-discarded-once",
  ],
  "responsive-users": [
    "narrow-padding-and-positive-geometry",
    "wide-padding-delta-300",
    "panel-inside-viewport",
    "same-user-authoritative-refresh",
    "same-user-retained-view-pending",
    "newer-local-write-pending",
    "newer-local-write-wins-refresh",
    "legacy-local-storage-absent",
    "light-and-dark-computed",
    "user-a-b-a-isolated",
    "second-a-intent-visible-before-exit",
    "preference-a-write-hit-before-release",
    "user-b-default-before-release",
    "preference-a-write-hit-after-release",
    "queued-a-write-zero-dispatch",
    "user-b-default-unchanged",
    "final-a-retry-converges",
  ],
});

const RAW_VISIBLE_ASSERTION_ROWS = deepFreezeExact([
  [
    "button-image",
    "persisted-no-empty-binding",
    ["screenId", "hrefBindingCount", "hrefBindingField", "emptyFieldCount"],
  ],
  ["button-image", "safe-link-front-url", ["tagName", "href", "pageUrl"]],
  ["button-image", "unsafe-link-disabled", ["tagName", "ariaDisabled", "href", "anchorCount"]],
  ["button-image", "direct-image-safe-url", ["imageCount", "src", "placeholderVisible"]],
  [
    "button-image",
    "missing-or-unsafe-placeholder",
    ["imageCount", "placeholderVisible", "unsafeUrlPresent"],
  ],
  [
    "button-image",
    "media-field-keeps-uuid",
    ["selectedMediaTitle", "selectedImageSrc", "persistedMediaId", "persistedResolvedUrlPresent"],
  ],
  ["tabs-content", "three-tabs-persisted", ["tabIds", "labels", "slotIds", "nestedText"]],
  ["tabs-content", "one-panel-visible", ["activeTabId", "visiblePanelIds", "visibleRects"]],
  ["tabs-content", "other-panels-zero-geometry", ["hiddenPanelIds", "hiddenValues", "rects"]],
  ["tabs-content", "armed-slot-equals-active-tab", ["activeTabId", "armedSlotId", "selectedTabId"]],
  ["tabs-keyboard-aria", "arrow-home-end-focus", ["steps"]],
  ["tabs-keyboard-aria", "aria-reciprocal", ["pairs", "visiblePanelId", "hiddenPanelIds"]],
  [
    "tabs-keyboard-aria",
    "nested-tabs-isolated",
    ["outerRootId", "innerRootId", "outerSelectedId", "innerSelectedId"],
  ],
  ["tabs-keyboard-aria", "renderer-ids-unique", ["ids", "uniqueCount"]],
  ["space-selection", "space-text-preserved", ["text", "expectedText"]],
  [
    "space-selection",
    "nested-controls-do-not-select",
    ["linkActivated", "inputFocused", "selectedBefore", "selectedAfter"],
  ],
  [
    "space-selection",
    "selection-handle-independent",
    ["handleFocused", "ariaPressed", "selectedBlockId", "defaultPrevented"],
  ],
  [
    "dirty-guards",
    "builder-cancel-byte-identical",
    ["draftBefore", "draftAfter", "urlBefore", "urlAfter"],
  ],
  [
    "dirty-guards",
    "builder-confirm-navigates-once",
    ["urlBefore", "urlAfter", "navigationCount", "draftDiscarded"],
  ],
  [
    "dirty-guards",
    "entry-cancel-byte-identical",
    ["contentBefore", "contentAfter", "presentationBefore", "presentationAfter"],
  ],
  ["dirty-guards", "entry-cancel-url-stable", ["urlBefore", "urlAfter"]],
  ["dirty-guards", "entry-confirm-navigates-once", ["urlBefore", "urlAfter", "navigationCount"]],
  [
    "dirty-guards",
    "entry-error-retains-both-drafts",
    ["errorVisible", "contentValue", "presentationValue", "contentDirty", "presentationDirty"],
  ],
  ["dirty-guards", "beforeunload-active", ["defaultPrevented", "returnValueSet"]],
  [
    "dirty-guards",
    "successful-retry-clears-persisted-channel",
    [
      "persistedContentMatches",
      "persistedPresentationUnchanged",
      "localPresentationPreserved",
      "contentDirty",
      "presentationDirty",
    ],
  ],
  [
    "related-retry-cache",
    "related-error-visible-before-retry",
    [
      "rootId",
      "errorVisible",
      "retryVisible",
      "rowCount",
      "skeletonChipCount",
      "skeletonRects",
      "emptyVisible",
    ],
  ],
  [
    "related-retry-cache",
    "visible-retry-succeeds",
    [
      "rootId",
      "errorVisible",
      "retryVisible",
      "failureRowIds",
      "failureRowRects",
      "skeletonVisible",
      "emptyVisible",
    ],
  ],
  [
    "related-retry-cache",
    "same-target-visible-rows-retained",
    [
      "rootId",
      "rowIdsBefore",
      "rowIdsPending",
      "rowTextBefore",
      "rowTextPending",
      "rectsBefore",
      "rectsPending",
      "errorVisible",
      "skeletonVisible",
      "emptyVisible",
    ],
  ],
  [
    "related-retry-cache",
    "target-switch-immediate-empty",
    [
      "aRootId",
      "bRootId",
      "aRowCount",
      "bRowCount",
      "aEmptyVisible",
      "bEmptyVisible",
      "aSkeletonChipCount",
      "bSkeletonChipCount",
      "skeletonRects",
    ],
  ],
  [
    "related-retry-cache",
    "stale-a-cannot-commit",
    ["aRootId", "bRootId", "aRowCount", "bRowIds", "staleATextPresent"],
  ],
  [
    "related-retry-cache",
    "only-b-rows-visible",
    [
      "rootId",
      "visibleRowIds",
      "visibleRects",
      "skeletonVisible",
      "emptyVisible",
      "bListGetCountBaseline",
      "bListGetCount",
      "bListGetDelta",
    ],
  ],
  [
    "related-retry-cache",
    "unrelated-draft-byte-identical",
    ["contentBefore", "contentAfter", "presentationBefore", "presentationAfter"],
  ],
  [
    "related-retry-cache",
    "relation-diff-exact",
    ["relationABefore", "relationAAfter", "relationBBefore", "relationBAfter", "otherDiffPaths"],
  ],
  [
    "related-retry-cache",
    "flow6-exit-discarded-once",
    [
      "url",
      "navigationCountBaseline",
      "navigationCountCurrent",
      "navigationCountDelta",
      "entryDirtyBadgeCount",
      "presentationDirtyBadgeCount",
    ],
  ],
  ["responsive-users", "narrow-padding-and-positive-geometry", ["samples"]],
  ["responsive-users", "wide-padding-delta-300", ["samples"]],
  ["responsive-users", "panel-inside-viewport", ["samples"]],
  [
    "responsive-users",
    "user-a-b-a-isolated",
    ["userAFirst", "userB", "userAReturn", "durableA", "metadataEffects", "userAReturnComputed"],
  ],
  [
    "responsive-users",
    "same-user-retained-view-pending",
    ["visibleValue", "durableA", "readPending", "metadataEffect"],
  ],
  [
    "responsive-users",
    "same-user-authoritative-refresh",
    ["before", "server", "after", "metadataEffect"],
  ],
  [
    "responsive-users",
    "newer-local-write-pending",
    ["visibleValue", "newLocalValue", "readPending", "metadataEffect"],
  ],
  [
    "responsive-users",
    "newer-local-write-wins-refresh",
    ["visibleValue", "persistedValue", "staleReadValue", "metadataEffect"],
  ],
  ["responsive-users", "legacy-local-storage-absent", ["key", "value", "writeCount"]],
  ["responsive-users", "light-and-dark-computed", ["userA", "userB"]],
  [
    "responsive-users",
    "second-a-intent-visible-before-exit",
    ["visibleValue", "queuedIntent", "firstWritePending", "metadataEffect"],
  ],
  ["responsive-users", "user-b-default-before-release", ["response", "metadataEffect"]],
  ["responsive-users", "user-b-default-unchanged", ["before", "after", "metadataEffect"]],
  [
    "responsive-users",
    "final-a-retry-converges",
    ["visibleValue", "persistedValue", "writePending", "unhandledRejectionCount", "metadataEffect"],
  ],
]);

const THEME_STATE_TRANSITIONS = deepFreezeExact([
  { actionId: "tc-004-dark-toggle", proofActionId: "tc-005-dark-proof", from: "light", to: "dark" },
  {
    actionId: "tk-001-light-toggle",
    proofActionId: "tk-002-light-proof",
    from: "dark",
    to: "light",
  },
  { actionId: "ss-008-dark-toggle", proofActionId: "ss-009-dark-proof", from: "light", to: "dark" },
  {
    actionId: "dg-004-light-toggle",
    proofActionId: "dg-005-light-proof",
    from: "dark",
    to: "light",
  },
  { actionId: "dg-040-dark-toggle", proofActionId: "dg-041-dark-proof", from: "light", to: "dark" },
  {
    actionId: "ru-036-light-toggle",
    proofActionId: "ru-037-light-proof",
    from: "dark",
    to: "light",
  },
  {
    actionId: "ru-071-b-dark-toggle",
    proofActionId: "ru-072-b-dark-capture",
    from: "light",
    to: "dark",
  },
  {
    actionId: "ru-081-a2-light-toggle",
    proofActionId: "ru-082-isolation-proof",
    from: "dark",
    to: "light",
  },
]);

const PAGE_STATE_TRANSITIONS = deepFreezeExact([
  { actionId: "set-005-open", from: "closed", to: "p1-selected" },
  { actionId: "rc-019-related-tab-new", from: "p1-selected", to: "p2-selected" },
  { actionId: "rc-022-related-tab-origin", from: "p2-selected", to: "p1-selected-with-p2" },
  { actionId: "rc-044-close-second-tab", from: "p1-selected-with-p2", to: "p1-selected" },
  { actionId: "rc-045-origin-proof", from: "p1-selected", to: "p1-selected" },
  { actionId: "end-006-close", from: "p1-selected", to: "closed" },
]);

const AUTH_STATE_TRANSITIONS = deepFreezeExact([
  { actionId: "set-011a-bootstrap-auth-settled", from: "anonymous", to: "bootstrap" },
  { actionId: "ru-040a-bootstrap-signout-settled", from: "bootstrap", to: "anonymous" },
  { actionId: "ru-043a-a-identity-settled", from: "anonymous", to: "user-a" },
  { actionId: "ru-066a-a-signout-settled", from: "user-a", to: "anonymous" },
  { actionId: "ru-069a-b-identity-settled", from: "anonymous", to: "user-b" },
  { actionId: "ru-076a-b-signout-settled", from: "user-b", to: "anonymous" },
  { actionId: "ru-079a-a2-identity-settled", from: "anonymous", to: "user-a" },
  { actionId: "ru-090a-a-exit-signout-settled", from: "user-a", to: "anonymous" },
  { actionId: "ru-093a-b2-identity-settled", from: "anonymous", to: "user-b" },
  { actionId: "ru-102a-b2-signout-settled", from: "user-b", to: "anonymous" },
  { actionId: "ru-105a-a3-identity-settled", from: "anonymous", to: "user-a" },
]);

const ROUTE_STATE_MACHINES = deepFreezeExact({
  "media-prior-resolution": {
    mode: "delayed",
    method: "GET",
    operations: ["route-setup", "route-hit-read", "route-release", "unroute"],
    states: ["absent", "installed", "hit", "released", "absent"],
  },
  "entry-save-failure": {
    mode: "malformed",
    method: "PATCH",
    operations: ["route-setup", "route-hit-read", "unroute"],
    states: ["absent", "installed", "hit", "absent"],
  },
  "related-first-failure": {
    mode: "malformed",
    method: "GET",
    operations: ["route-setup", "route-hit-read", "unroute"],
    states: ["absent", "installed", "hit", "absent"],
  },
  "related-a-refresh": {
    mode: "delayed",
    method: "GET",
    operations: ["route-setup", "route-hit-read", "route-release", "unroute"],
    states: ["absent", "installed", "hit", "released", "absent"],
  },
  "preference-a-read-refresh": {
    mode: "delayed-preference-read",
    method: "GET",
    operations: ["route-setup", "route-hit-read", "route-release", "unroute"],
    states: ["absent", "installed", "hit", "released", "absent"],
  },
  "preference-a-write-exit": {
    mode: "abort-aware-preference-write",
    method: "PATCH",
    operations: ["route-setup", "route-hit-read", "route-release", "unroute"],
    states: ["absent", "installed", "hit", "released", "absent"],
  },
});

const BROWSER_BUILDER_KINDS = Object.freeze([
  "open",
  "logger-install",
  "goto",
  "resize",
  "fill",
  "click",
  "observe",
  "blocksBefore",
  "captureNew",
  "assert",
  "route",
  "screen",
  "media-count-before-release",
  "media-count-after-release",
  "logs",
  "focus",
  "press",
  "type",
  "dispatchAndCaptureSelectionHandle",
  "tab-new",
  "tab-select",
  "tab-close",
  "authRateWindowBarrier",
  "cleanup-release-unroute",
  "cleanup-route-list",
  "cleanup-console-errors",
  "cleanup-console-warnings",
  "cleanup-page-errors",
  "cleanup-close",
  "cleanup-session-absence",
]);

const RUNTIME_BUILDER_KINDS = Object.freeze([
  "storage",
  "host",
  "health",
  "apiPublicRead",
  "settingsRead",
  "isolatedApiSessionLogin",
  "isolatedApiSessionCsrfCapture",
  "fixture",
  "fixtureRead",
  "api",
  "apiRead",
  "isolatedApiSessionApiReadAs",
  "isolatedApiSessionApiAs",
]);

const OBSERVATION_OUTPUT_FIELDS = deepFreezeExact({
  "bootstrap-auth-identity-settled": ["url", "userMenuVisible", "userName"],
  "theme-light": ["theme", "rootColor", "bodyColor", "toggleAriaPressed"],
  "binding-after-save": ["screenId", "bindings"],
  "safe-link-anchor-before-activation": ["tagName", "href", "rect"],
  "theme-dark": ["theme", "rootColor", "bodyColor", "toggleAriaPressed"],
  "outer-tabs-details-state": [
    "activeTabId",
    "visiblePanelIds",
    "hiddenPanelIds",
    "armedSlotId",
    "rects",
  ],
  "outer-tabs-history-state": [
    "activeTabId",
    "visiblePanelIds",
    "hiddenPanelIds",
    "armedSlotId",
    "rects",
  ],
  "preview-shell-desktop": ["shellVisible", "device", "outerTabsVisible", "innerTabsVisible"],
  "key-step-arrow-left": ["key", "focusedTabText", "focusedTabId", "selectedTabId", "tabIndex"],
  "key-step-arrow-right": ["key", "focusedTabText", "focusedTabId", "selectedTabId", "tabIndex"],
  "key-step-home": ["key", "focusedTabText", "focusedTabId", "selectedTabId", "tabIndex"],
  "key-step-end": ["key", "focusedTabText", "focusedTabId", "selectedTabId", "tabIndex"],
  "selected-block-before-nested-controls": ["selectedBlockId", "url"],
  "selected-block-after-nested-input": ["selectedBlockId", "focused", "url"],
  "selected-block-after-nested-link": ["selectedBlockId", "focused", "url"],
  "builder-draft-url-before-cancel": ["draftBytes", "url", "navigationCount"],
  "entry-drafts-url-before-cancel": ["contentBytes", "presentationBytes", "url", "navigationCount"],
  "entry-save-failure-ui-settled": ["errorVisible", "saveEnabled", "saveLabel"],
  "relation-pickers-a-b-warm": ["aButtons", "bButtons", "aRows", "bListGetCount"],
  "related-unrelated-drafts-before": ["contentBytes", "presentationBytes"],
  "related-a-visible-baseline": [
    "rootId",
    "rowIds",
    "rowText",
    "rects",
    "skeletonCount",
    "emptyVisible",
    "navigationCount",
  ],
  "related-tab-save-settled": [
    "method",
    "pathname",
    "status",
    "entryId",
    "title",
    "saveEnabled",
    "savingAbsent",
  ],
  "geometry-320-closed": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-320-open": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-390-closed": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-390-open": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-480-closed": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-480-open": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-1024-closed": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-1024-open": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-1280-closed": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "geometry-1280-open": [
    "width",
    "state",
    "viewportWidth",
    "paddingRight",
    "scrollerBorder",
    "scrollerContent",
    "panel",
  ],
  "theme-light-user-a-candidate": ["theme", "rootColor", "bodyColor", "toggleAriaPressed"],
  "signout-settled-bootstrap": [
    "url",
    "loginEmailVisible",
    "loginPasswordVisible",
    "loginSubmitVisible",
  ],
  "auth-identity-settled-users-a": ["url", "userMenuVisible", "userName"],
  "user-a-light-computed": ["theme", "rootColor", "bodyColor", "toggleAriaPressed"],
  "preference-a-write-settled": [
    "sequence",
    "method",
    "pathname",
    "status",
    "userIdMatches",
    "value",
    "switchChecked",
    "switchRect",
    "metadataRect",
  ],
  "nondefault-browser-patch-settled": [
    "sequence",
    "method",
    "pathname",
    "status",
    "userIdMatches",
    "value",
  ],
  "new-local-browser-patch-settled": [
    "sequence",
    "method",
    "pathname",
    "status",
    "userIdMatches",
    "value",
  ],
  "signout-settled-user-a": [
    "url",
    "loginEmailVisible",
    "loginPasswordVisible",
    "loginSubmitVisible",
  ],
  "auth-identity-settled-users-b": ["url", "userMenuVisible", "userName"],
  "user-b-dark-computed": [
    "theme",
    "rootColor",
    "bodyColor",
    "toggleAriaPressed",
    "metadataEffect",
  ],
  "signout-settled-user-b": [
    "url",
    "loginEmailVisible",
    "loginPasswordVisible",
    "loginSubmitVisible",
  ],
  "signout-settled-user-a-with-abort": [
    "url",
    "loginEmailVisible",
    "loginPasswordVisible",
    "loginSubmitVisible",
    "clientAborted",
  ],
  "post-redirect-a-fresh-read-settled": [
    "sequence",
    "method",
    "pathname",
    "status",
    "activeUserMenuVisible",
    "value",
    "switchChecked",
    "metadataRect",
  ],
});

const REQUIRED_SCREENSHOT_PATHS = Object.freeze([
  "_docs/_workflows/_smoke/task-540-wf540smoke-button-image-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-content-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-keyboard-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-space-selection-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-save-failure.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-guards-final.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-first-failure.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-converged.png",
]);

const SCREENSHOT_DESCRIPTOR_BY_ACTION_ID = deepFreezeExact({
  "bi-028-media-pending-shot": {
    screenshotId: "screenshot/bi-028-media-pending-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png",
  },
  "bi-067-final-shot": {
    screenshotId: "screenshot/bi-067-final-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-button-image-light.png",
  },
  "tc-042-shot": {
    screenshotId: "screenshot/tc-042-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-content-dark.png",
  },
  "tk-028-shot": {
    screenshotId: "screenshot/tk-028-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-keyboard-light.png",
  },
  "ss-029-shot": {
    screenshotId: "screenshot/ss-029-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-space-selection-dark.png",
  },
  "dg-033-failure-shot": {
    screenshotId: "screenshot/dg-033-failure-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-save-failure.png",
  },
  "dg-042-final-shot": {
    screenshotId: "screenshot/dg-042-final-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-guards-final.png",
  },
  "rc-009-failure-shot": {
    screenshotId: "screenshot/rc-009-failure-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-related-first-failure.png",
  },
  "rc-033-stale-shot": {
    screenshotId: "screenshot/rc-033-stale-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png",
  },
  "rc-037-final-shot": {
    screenshotId: "screenshot/rc-037-final-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png",
  },
  "ru-048-a-first-shot": {
    screenshotId: "screenshot/ru-048-a-first-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png",
  },
  "ru-074-b-shot": {
    screenshotId: "screenshot/ru-074-b-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png",
  },
  "ru-109-converged-shot": {
    screenshotId: "screenshot/ru-109-converged-shot",
    path: "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-converged.png",
  },
});

const EXECUTABLE_REGISTRY_KEY_SHA256 = deepFreezeExact({
  runtimeOperations: "29040b4ce9625fe454bfea8f2d68c169800cdf2fcbb3e15761f151254f9ac447",
  browserRunCodeSources: "62f56b099d2dfcec21d68479fedc55b728525df7f022a0bbe7520647d1ba3e3f",
});

const SCENARIO_BY_PREFIX = Object.freeze({
  set: "setup",
  bi: "button-image",
  tc: "tabs-content",
  tk: "tabs-keyboard-aria",
  ss: "space-selection",
  dg: "dirty-guards",
  rc: "related-retry-cache",
  ru: "responsive-users",
  end: "cleanup",
});

const PAGE_IDENTITY = Object.freeze({
  runtime: Object.freeze({ pageId: null, tabIndex: null }),
  global: Object.freeze({ pageId: null, tabIndex: null }),
  "p1/0": Object.freeze({ pageId: "wf540-page-1", tabIndex: 0 }),
  "p2/1": Object.freeze({ pageId: "wf540-page-2", tabIndex: 1 }),
});

const FIXTURE_CAPTURE_BY_ACTION = Object.freeze({
  "set-012-user-a-create": ["user-a.id"],
  "set-014-user-b-create": ["user-b.id"],
  "set-016-editable-type-create": ["content-type-editable.id"],
  "set-018-related-a-type-create": ["content-type-related-a.id"],
  "set-020-related-b-type-create": ["content-type-related-b.id"],
  "set-021a-related-failure-type-create": ["content-type-related-failure.id"],
  "set-022-related-a1-create": ["related-entry-a1.id"],
  "set-024-related-a2-create": ["related-entry-a2.id"],
  "set-026-related-b1-create": ["related-entry-b1.id"],
  "set-028-related-b2-create": ["related-entry-b2.id"],
  "set-029a-related-failure1-create": ["related-entry-failure1.id"],
  "set-030-media-upload": ["media.id", "media.resolved-url", "media.storage-key"],
  "set-033-entry-create": ["entry.id"],
  "set-035-screen-create": ["screen.id"],
  "set-037-retry-screen-create": ["retry-screen.id"],
});

const FIXTURE_SUBJECT_CAPTURE = Object.freeze({
  "user-a": "user-a.id",
  "user-b": "user-b.id",
  "content-type-editable": "content-type-editable.id",
  "content-type-related-a": "content-type-related-a.id",
  "content-type-related-b": "content-type-related-b.id",
  "content-type-related-failure": "content-type-related-failure.id",
  "related-entry-a1": "related-entry-a1.id",
  "related-entry-a2": "related-entry-a2.id",
  "related-entry-b1": "related-entry-b1.id",
  "related-entry-b2": "related-entry-b2.id",
  "related-entry-failure1": "related-entry-failure1.id",
  media: "media.id",
  "editable-entry": "entry.id",
  screen: "screen.id",
  "retry-screen": "retry-screen.id",
});

const RUNTIME_CAPTURE_BY_ACTION = Object.freeze({
  "bi-005-button-capture": ["palette.button"],
  "bi-047-image-capture": ["palette.image"],
  "bi-052-field-capture": ["palette.media-field"],
  "tc-009-tabs-capture": ["palette.outer-tabs"],
  "tc-017-text-one-capture": ["palette.tab-one-text"],
  "tc-023-text-two-capture": ["palette.tab-two-text"],
  "tc-029-text-three-capture": ["palette.tab-three-text"],
  "tk-008-inner-capture": ["palette.inner-tabs"],
  "dg-009-dirty-capture": ["palette.dirty-text"],
});

const RUNTIME_CAPTURE_EXPRESSIONS = Object.freeze({
  "palette.button": "palette.button",
  "palette.image": "palette.image",
  "palette.mediaField": "palette.media-field",
  "palette.outerTabs": "palette.outer-tabs",
  "palette.tabOneText": "palette.tab-one-text",
  "palette.tabTwoText": "palette.tab-two-text",
  "palette.tabThreeText": "palette.tab-three-text",
  "palette.innerTabs": "palette.inner-tabs",
  "palette.dirtyText": "palette.dirty-text",
});

const CAPTURE_INPUTS_BY_EXPRESSION = Object.freeze({
  "paths.builder": ["screen.id"],
  "paths.records": ["screen.id"],
  "paths.entry": ["screen.id", "entry.id"],
  "paths.retryEntry": ["retry-screen.id", "entry.id"],
  "paths.relatedEntryA1Editor": ["related-entry-a1.id"],
  "users.a.id": ["user-a.id"],
  "users.b.id": ["user-b.id"],
  "screen.id": ["screen.id"],
  "retryScreen.id": ["retry-screen.id"],
  "entry.id": ["entry.id"],
  "media.id": ["media.id"],
  "media.resolvedUrl": ["media.resolved-url"],
  "media.storageKey": ["media.storage-key"],
  "relatedEntries.a1.id": ["related-entry-a1.id"],
  "relatedEntries.a2.id": ["related-entry-a2.id"],
  "relatedEntries.b1.id": ["related-entry-b1.id"],
  "relatedEntries.b2.id": ["related-entry-b2.id"],
  "relatedEntries.failure1.id": ["related-entry-failure1.id"],
});

// Generated from the contract's exhaustive Markdown action tables. The rows are
// intentionally embedded so importing this pure module never reads task files.
const RAW_ACTION_ROWS = deepFreezeExact([
  ...SETUP_ACTION_ROWS,
  ...BUTTON_IMAGE_ACTION_ROWS,
  ...TABS_CONTENT_ACTION_ROWS,
  ...TABS_KEYBOARD_ACTION_ROWS,
  ...SPACE_SELECTION_ACTION_ROWS,
  ...DIRTY_GUARD_ACTION_ROWS,
  ...RECOVERY_CACHE_ACTION_ROWS,
  ...RETENTION_USER_ACTION_ROWS,
  ...TERMINAL_ACTION_ROWS,
]);

function invariant(condition, message) {
  if (!condition) throw new Error("TASK-540 smoke contract: " + message);
}

function deepFreezeExact(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreezeExact(value[key], seen);
  return Object.freeze(value);
}

function assertClosedDataTree(value, label, ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    invariant(Number.isFinite(value), label + " contains a non-finite number");
    return;
  }
  invariant(typeof value === "object", label + " contains a non-data value");
  invariant(!ancestors.has(value), label + " contains a cycle");
  const prototype = Object.getPrototypeOf(value);
  invariant(
    Array.isArray(value)
      ? prototype === Array.prototype
      : prototype === Object.prototype || prototype === null,
    label + " contains a custom or inherited prototype"
  );
  const keys = Reflect.ownKeys(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Array.isArray(value)) {
    invariant(
      keys.length === value.length + 1 &&
        keys.at(-1) === "length" &&
        keys.slice(0, -1).every((key, index) => key === String(index)),
      label + " contains a sparse array or custom array key"
    );
  } else {
    invariant(
      keys.every((key) => typeof key === "string"),
      label + " contains a symbol key"
    );
  }
  ancestors.add(value);
  for (const key of keys) {
    if (Array.isArray(value) && key === "length") continue;
    const descriptor = descriptors[key];
    invariant(
      descriptor !== undefined &&
        Object.hasOwn(descriptor, "value") &&
        !Object.hasOwn(descriptor, "get") &&
        !Object.hasOwn(descriptor, "set") &&
        descriptor.enumerable === true &&
        descriptor.value !== undefined,
      label + "." + String(key) + " must be an enumerable defined data property"
    );
    assertClosedDataTree(descriptor.value, label + "." + String(key), ancestors);
  }
  ancestors.delete(value);
}

function schemaLiteral(value) {
  return deepFreezeExact({ type: "literal", value });
}

function schemaBoolean() {
  return deepFreezeExact({ type: "boolean" });
}

function schemaNull() {
  return deepFreezeExact({ type: "null" });
}

function schemaString({ minLength = 0, maxLength = 4096, enumValues = null, format = null } = {}) {
  return deepFreezeExact({
    type: "string",
    minLength,
    maxLength,
    enum: enumValues,
    format,
  });
}

function schemaNumber({ minimum = null, maximum = null } = {}) {
  return deepFreezeExact({ type: "number", minimum, maximum });
}

function schemaInteger({ minimum = null, maximum = null } = {}) {
  return deepFreezeExact({ type: "integer", minimum, maximum });
}

function schemaArray(items, { minItems = 0, maxItems = 1024, unique = false } = {}) {
  return deepFreezeExact({ type: "array", items, minItems, maxItems, unique });
}

function schemaTuple(items) {
  return deepFreezeExact({ type: "tuple", items });
}

function schemaObject(properties) {
  invariant(
    properties && Object.getPrototypeOf(properties) === Object.prototype,
    "schema object properties must be plain"
  );
  return deepFreezeExact({ type: "object", properties });
}

function schemaUnion(variants) {
  return deepFreezeExact({ type: "union", variants });
}

function outputRef(path = []) {
  return deepFreezeExact({ op: "output", path });
}

function literalPredicateRef(value) {
  return deepFreezeExact({ op: "literal", value });
}

function deepEqualPredicate(left, right) {
  return deepFreezeExact({ op: "deepEqual", left, right });
}

function andPredicate(items) {
  return deepFreezeExact({ op: "and", items });
}

function comparePredicate(mode, left, right) {
  return deepFreezeExact({ op: "compare", mode, left, right });
}

function sameSetPredicate(left, right) {
  return deepFreezeExact({ op: "sameSet", left, right, duplicates: "reject" });
}

function notPredicate(item) {
  return deepFreezeExact({ op: "not", item });
}

function withinPredicate(actual, expected, tolerance) {
  return deepFreezeExact({ op: "within", actual, expected, tolerance });
}

function everyPredicate(source, as, predicate) {
  return deepFreezeExact({ op: "every", source, as, predicate });
}

function varRef(name, path = []) {
  return deepFreezeExact({ op: "var", name, path });
}

function lengthRef(value) {
  return deepFreezeExact({ op: "length", value });
}

function jsonTransport(jsonLayers = 1) {
  return deepFreezeExact({
    encoding: "json",
    jsonLayers,
    nativeMode: null,
    exactText: null,
    sessionName: null,
    normalizedValue: null,
  });
}

function nativeExactTransport(exactText, normalizedValue) {
  return deepFreezeExact({
    encoding: "native",
    jsonLayers: 0,
    nativeMode: "exact-text",
    exactText,
    sessionName: null,
    normalizedValue,
  });
}

function nativeSessionAbsenceTransport(sessionName) {
  return deepFreezeExact({
    encoding: "native",
    jsonLayers: 0,
    nativeMode: "session-list-absence",
    exactText: null,
    sessionName,
    normalizedValue: true,
  });
}

function outputContract({ grammar, schema, predicate, rememberAs = null }) {
  return deepFreezeExact({ grammar, schema, predicate, rememberAs });
}

function outputEquals(path, expected) {
  return deepEqualPredicate(outputRef(path), literalPredicateRef(expected));
}

function outputNonEmpty(path) {
  return deepFreezeExact({ op: "nonEmptyString", value: outputRef(path) });
}

function outputLengthEquals(path, expected) {
  return deepEqualPredicate(lengthRef(outputRef(path)), literalPredicateRef(expected));
}

function assertExactUnitOutputValue(value) {
  exactKeys(value, ["ok"], "unit output");
  invariant(value.ok === true, "unit output ok value drift");
  return value;
}

function createLogProjectionSchema() {
  const messageArray = schemaArray(schemaString({ minLength: 1, maxLength: 4096 }), {
    minItems: 0,
    maxItems: 256,
  });
  const aggregate = schemaObject({
    consoleErrors: messageArray,
    consoleWarnings: messageArray,
    pageErrors: messageArray,
    mediaGetCount: schemaInteger({ minimum: 0, maximum: 10_000 }),
  });
  const page = schemaObject({
    pageId: schemaString({ minLength: 12, maxLength: 32, format: "page-id" }),
    tabIndex: schemaInteger({ minimum: 0, maximum: 1024 }),
    consoleErrors: messageArray,
    consoleWarnings: messageArray,
    pageErrors: messageArray,
    mediaGetCount: schemaInteger({ minimum: 0, maximum: 10_000 }),
  });
  return schemaObject({
    aggregate,
    pages: schemaArray(page, { minItems: 1, maxItems: 8, unique: true }),
  });
}

function createCleanLogPredicate() {
  const emptyAggregate = ["consoleErrors", "consoleWarnings", "pageErrors"].map((key) =>
    outputLengthEquals(["aggregate", key], 0)
  );
  return andPredicate([
    ...emptyAggregate,
    deepFreezeExact({
      op: "every",
      source: outputRef(["pages"]),
      as: "pageLog",
      predicate: andPredicate(
        ["consoleErrors", "consoleWarnings", "pageErrors"].map((key) =>
          deepEqualPredicate(
            lengthRef(deepFreezeExact({ op: "var", name: "pageLog", path: [key] })),
            literalPredicateRef(0)
          )
        )
      ),
    }),
  ]);
}

function captureValueSchema(captureName) {
  if (captureName === "media.resolved-url") {
    return schemaString({ minLength: 8, maxLength: 2048, format: "http-url" });
  }
  if (captureName === "media.storage-key") {
    return schemaString({ minLength: 1, maxLength: 512, format: "repo-relative" });
  }
  return schemaString({ minLength: 36, maxLength: 36, format: "uuid" });
}

function createRuntimeCaptureBindingsSchema() {
  const captureSets = [[], ...Object.values(FIXTURE_CAPTURE_BY_ACTION)];
  const uniqueSets = [];
  for (const captures of captureSets) {
    const identity = [...captures].sort().join("\0");
    if (uniqueSets.some(({ identity: candidate }) => candidate === identity)) continue;
    uniqueSets.push({ identity, captures });
  }
  return schemaUnion(
    uniqueSets.map(({ captures }) =>
      schemaObject(
        Object.fromEntries(
          captures.map((captureName) => [captureName, captureValueSchema(captureName)])
        )
      )
    )
  );
}

function materializeEditableContentSchema(fieldBlueprints) {
  const properties = Object.create(null);
  fieldBlueprints.forEach((field, index) => {
    const definition = {
      type:
        (field.type === "relation" && field.relation?.multiple) ||
        (field.type === "media" && field.media?.multiple)
          ? "array"
          : "string",
      ...(field.type === "relation" && field.relation?.multiple
        ? { items: { type: "string" } }
        : {}),
      title: field.label,
      xFieldType: field.type,
      ...(field.type === "relation"
        ? {
            xRelationTarget: field.relation.target,
            xFieldConfig: {
              relation: {
                target: field.relation.target,
                ...(field.relation.multiple ? { multiple: true } : {}),
              },
              order: index,
            },
          }
        : field.type === "media"
          ? {
              xFieldConfig: {
                media: {
                  ...(field.media.multiple ? { multiple: true } : {}),
                  ...(field.media.accept?.length ? { accept: field.media.accept } : {}),
                },
                order: index,
              },
            }
          : { xFieldConfig: { order: index } }),
    };
    properties[field.name] = definition;
  });
  return deepFreezeExact({
    type: "object",
    additionalProperties: false,
    properties: { ...properties },
  });
}

function createBaseOutputSchemas(fixtureBlueprint) {
  const booleanTrue = schemaLiteral(true);
  const jsonTrue = outputContract({
    grammar: jsonTransport(),
    schema: booleanTrue,
    predicate: outputEquals([], true),
  });
  const unitValue = deepFreezeExact({ ok: true });
  const jsonUnit = outputContract({
    grammar: jsonTransport(),
    schema: schemaObject({ ok: booleanTrue }),
    predicate: outputEquals([], unitValue),
  });
  const logSchema = createLogProjectionSchema();
  const cleanLogPredicate = createCleanLogPredicate();
  const strictMethod = schemaString({
    minLength: 3,
    maxLength: 6,
    enumValues: ["GET", "PATCH"],
  });
  return deepFreezeExact({
    unit: jsonUnit,
    "editable-content-type-detail": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        id: schemaString({ minLength: 36, maxLength: 36, format: "uuid" }),
        slug: schemaLiteral(fixtureBlueprint.contentTypes.editable.slug),
        name: schemaLiteral(fixtureBlueprint.contentTypes.editable.name),
        schema: schemaLiteral(
          materializeEditableContentSchema(fixtureBlueprint.contentTypes.editable.fields)
        ),
      }),
      predicate: andPredicate([
        outputNonEmpty(["id"]),
        outputEquals(["slug"], fixtureBlueprint.contentTypes.editable.slug),
        outputEquals(["name"], fixtureBlueprint.contentTypes.editable.name),
      ]),
    }),
    "runtime-safe-projection": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        captureBindings: createRuntimeCaptureBindingsSchema(),
        observationSha256: schemaString({ minLength: 64, maxLength: 64, format: "sha256" }),
      }),
      predicate: outputNonEmpty(["observationSha256"]),
    }),
    "block-id-set": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        blockIds: schemaArray(schemaString({ minLength: 1, maxLength: 256 }), {
          minItems: 0,
          maxItems: 1024,
          unique: true,
        }),
      }),
      predicate: null,
    }),
    "new-block": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        id: schemaString({ minLength: 1, maxLength: 256 }),
        type: schemaString({
          minLength: 4,
          maxLength: 6,
          enumValues: ["button", "image", "field", "tabs", "text"],
        }),
      }),
      predicate: andPredicate([outputNonEmpty(["id"]), outputNonEmpty(["type"])]),
    }),
    "route-setup": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        key: schemaString({ minLength: 1, maxLength: 128 }),
        method: strictMethod,
        pattern: schemaString({ minLength: 1, maxLength: 2048 }),
        mode: schemaString({ minLength: 1, maxLength: 64 }),
      }),
      predicate: andPredicate([
        outputNonEmpty(["key"]),
        outputNonEmpty(["method"]),
        outputNonEmpty(["pattern"]),
        outputNonEmpty(["mode"]),
      ]),
    }),
    "route-malformed-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({ hits: schemaLiteral(1) }),
      predicate: outputEquals(["hits"], 1),
    }),
    "route-delayed-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({ hits: schemaLiteral(1), captured: booleanTrue }),
      predicate: andPredicate([outputEquals(["hits"], 1), outputEquals(["captured"], true)]),
    }),
    "route-preference-read-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        hits: schemaLiteral(1),
        captured: booleanTrue,
        method: schemaLiteral("GET"),
        bodyAbsent: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["hits"], 1),
        outputEquals(["captured"], true),
        outputEquals(["method"], "GET"),
        outputEquals(["bodyAbsent"], true),
      ]),
    }),
    "route-related-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        hits: schemaLiteral(1),
        captured: booleanTrue,
        rowCount: schemaLiteral(2),
        rowIdsMatch: booleanTrue,
        uniqueIds: booleanTrue,
        updatedA1Matches: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["hits"], 1),
        outputEquals(["captured"], true),
        outputEquals(["rowCount"], 2),
        outputEquals(["rowIdsMatch"], true),
        outputEquals(["uniqueIds"], true),
        outputEquals(["updatedA1Matches"], true),
      ]),
    }),
    "route-preference-write-hit": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        hits: schemaLiteral(1),
        captured: booleanTrue,
        backingSettled: booleanTrue,
        method: schemaLiteral("PATCH"),
        bodyMatches: booleanTrue,
        contentTypeJson: booleanTrue,
        expectedUserIdMatches: booleanTrue,
        csrfPresent: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["hits"], 1),
        outputEquals(["captured"], true),
        outputEquals(["expectedUserIdMatches"], true),
        outputEquals(["csrfPresent"], true),
      ]),
    }),
    "route-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        released: booleanTrue,
        fulfilled: booleanTrue,
        uiSettled: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["released"], true),
        outputEquals(["fulfilled"], true),
        outputEquals(["uiSettled"], true),
      ]),
    }),
    "route-abort-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        released: booleanTrue,
        backingSettled: booleanTrue,
        clientAborted: booleanTrue,
      }),
      predicate: andPredicate([
        outputEquals(["released"], true),
        outputEquals(["backingSettled"], true),
        outputEquals(["clientAborted"], true),
      ]),
    }),
    "route-unroute": jsonTrue,
    "log-channel": outputContract({
      grammar: jsonTransport(),
      schema: logSchema,
      predicate: cleanLogPredicate,
    }),
    "media-count": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(1),
      predicate: outputEquals([], 1),
    }),
    "auth-rate-barrier": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({ barrierSatisfied: booleanTrue }),
      predicate: outputEquals(["barrierSatisfied"], true),
    }),
    screenshot: jsonTrue,
    "selection-handle": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        handleFocused: booleanTrue,
        ariaPressed: booleanTrue,
        selectedBlockId: schemaString({ minLength: 1, maxLength: 256 }),
        defaultPrevented: schemaLiteral(false),
      }),
      predicate: andPredicate([
        outputEquals(["handleFocused"], true),
        outputEquals(["ariaPressed"], true),
        outputNonEmpty(["selectedBlockId"]),
        outputEquals(["defaultPrevented"], false),
      ]),
    }),
    "cleanup-routes": jsonTrue,
    "cleanup-route-list": outputContract({
      grammar: nativeExactTransport("No active routes\n", []),
      schema: schemaLiteral([]),
      predicate: outputLengthEquals([], 0),
    }),
    "cleanup-log-channel": outputContract({
      grammar: jsonTransport(),
      schema: logSchema,
      predicate: cleanLogPredicate,
    }),
    "cleanup-close": outputContract({
      grammar: nativeExactTransport("Browser 'wf540smoke' closed\n\n", "closed"),
      schema: schemaLiteral("closed"),
      predicate: outputEquals([], "closed"),
    }),
    "cleanup-session": outputContract({
      grammar: nativeSessionAbsenceTransport("wf540smoke"),
      schema: booleanTrue,
      predicate: outputEquals([], true),
    }),
  });
}

function nullableSchema(schema) {
  return schemaUnion([schemaNull(), schema]);
}

function createRectSchema() {
  return schemaObject({
    left: schemaNumber({ minimum: -100_000, maximum: 100_000 }),
    right: schemaNumber({ minimum: -100_000, maximum: 100_000 }),
    width: schemaNumber({ minimum: 0, maximum: 100_000 }),
    height: schemaNumber({ minimum: 0, maximum: 100_000 }),
  });
}

function createPreferenceValueSchema() {
  return schemaObject({
    version: schemaLiteral(1),
    showFieldMetadata: schemaBoolean(),
  });
}

function createPreferenceResponseSchema() {
  return schemaObject({
    key: schemaLiteral("customScreens.entry.preferences"),
    value: createPreferenceValueSchema(),
  });
}

function createThemeSampleSchema({ metadata = false } = {}) {
  return schemaObject({
    theme: schemaString({ minLength: 4, maxLength: 5, enumValues: ["light", "dark"] }),
    rootColor: schemaString({ minLength: 1, maxLength: 256, format: "css-color" }),
    bodyColor: schemaString({ minLength: 1, maxLength: 256, format: "css-color" }),
    toggleAriaPressed: schemaString({ minLength: 4, maxLength: 5, enumValues: ["true", "false"] }),
    ...(metadata ? { metadataEffect: schemaBoolean() } : {}),
  });
}

function createScreenBindingSchema() {
  return schemaObject({
    id: schemaString({ minLength: 1, maxLength: 256 }),
    blockId: schemaString({ minLength: 1, maxLength: 256 }),
    propPath: schemaString({ minLength: 1, maxLength: 128 }),
    source: schemaString({ minLength: 1, maxLength: 64 }),
    field: schemaString({ minLength: 1, maxLength: 128 }),
    mode: schemaString({ minLength: 4, maxLength: 9, enumValues: ["read", "readwrite"] }),
  });
}

function createObservationFieldSchema(name, field) {
  const booleans = new Set([
    "activeUserMenuVisible",
    "clientAborted",
    "emptyVisible",
    "errorVisible",
    "focused",
    "loginEmailVisible",
    "loginPasswordVisible",
    "loginSubmitVisible",
    "metadataEffect",
    "innerTabsVisible",
    "outerTabsVisible",
    "saveEnabled",
    "savingAbsent",
    "shellVisible",
    "switchChecked",
    "userIdMatches",
    "userMenuVisible",
  ]);
  if (booleans.has(field)) return schemaBoolean();
  const integers = new Set([
    "bListGetCount",
    "navigationCount",
    "sequence",
    "skeletonCount",
    "status",
    "tabIndex",
    "viewportWidth",
    "width",
  ]);
  if (integers.has(field)) {
    return schemaInteger({
      minimum: field === "tabIndex" ? -1 : 0,
      maximum: field === "status" ? 599 : 100_000,
    });
  }
  if (field === "screenId" || field === "entryId") {
    return schemaString({ minLength: 36, maxLength: 36, format: "uuid" });
  }
  if (field === "url") return schemaString({ minLength: 8, maxLength: 2048, format: "http-url" });
  if (field === "theme") {
    return schemaString({ minLength: 4, maxLength: 5, enumValues: ["light", "dark"] });
  }
  if (field === "rootColor" || field === "bodyColor") {
    return schemaString({ minLength: 1, maxLength: 256, format: "css-color" });
  }
  if (field === "toggleAriaPressed") {
    return schemaString({ minLength: 4, maxLength: 5, enumValues: ["true", "false"] });
  }
  if (field === "device") return schemaLiteral("desktop");
  if (field === "state") {
    return schemaString({ minLength: 4, maxLength: 6, enumValues: ["open", "closed"] });
  }
  if (field === "method") {
    return schemaString({ minLength: 3, maxLength: 5, enumValues: ["GET", "PATCH"] });
  }
  if (field === "key") {
    return schemaString({
      minLength: 3,
      maxLength: 10,
      enumValues: ["ArrowLeft", "ArrowRight", "Home", "End"],
    });
  }
  if (field === "value") return createPreferenceValueSchema();
  if (field === "bindings") {
    return schemaArray(createScreenBindingSchema(), { minItems: 1, maxItems: 256, unique: true });
  }
  if (
    [
      "aButtons",
      "aRows",
      "bButtons",
      "hiddenPanelIds",
      "rowIds",
      "rowText",
      "visiblePanelIds",
    ].includes(field)
  ) {
    return schemaArray(schemaString({ minLength: 1, maxLength: 512 }), {
      minItems: 0,
      maxItems: 128,
      unique: field !== "rowText",
    });
  }
  if (field === "rects") {
    return schemaArray(nullableSchema(createRectSchema()), { minItems: 0, maxItems: 128 });
  }
  if (["metadataRect", "panel", "switchRect"].includes(field)) {
    return nullableSchema(createRectSchema());
  }
  if (["rect", "scrollerBorder", "scrollerContent"].includes(field)) return createRectSchema();
  const strings = new Set([
    "activeTabId",
    "armedSlotId",
    "contentBytes",
    "draftBytes",
    "focusedTabId",
    "focusedTabText",
    "href",
    "paddingRight",
    "pathname",
    "presentationBytes",
    "rootId",
    "saveLabel",
    "selectedBlockId",
    "selectedTabId",
    "tagName",
    "title",
    "userName",
  ]);
  invariant(strings.has(field), "observation field schema is missing: " + name + "." + field);
  return schemaString({ minLength: 1, maxLength: field.endsWith("Bytes") ? 1_000_000 : 4096 });
}

function positiveRectPredicate(ref) {
  return andPredicate([
    comparePredicate(
      "gt",
      deepFreezeExact({ op: "output", path: [...ref, "width"] }),
      literalPredicateRef(0)
    ),
    comparePredicate(
      "gt",
      deepFreezeExact({ op: "output", path: [...ref, "height"] }),
      literalPredicateRef(0)
    ),
  ]);
}

function successfulStatusPredicate(path = ["status"]) {
  return andPredicate([
    comparePredicate("gte", outputRef(path), literalPredicateRef(200)),
    comparePredicate("lte", outputRef(path), literalPredicateRef(299)),
  ]);
}

function createObservationPredicate(name, canonicalAdminRootUrl) {
  if (name === "bootstrap-auth-identity-settled" || name.startsWith("auth-identity-settled-")) {
    return andPredicate([
      outputEquals(["url"], canonicalAdminRootUrl),
      outputEquals(["userMenuVisible"], true),
      outputNonEmpty(["userName"]),
    ]);
  }
  if (
    ["signout-settled-bootstrap", "signout-settled-user-a", "signout-settled-user-b"].includes(name)
  ) {
    return andPredicate([
      outputEquals(["loginEmailVisible"], true),
      outputEquals(["loginPasswordVisible"], true),
      outputEquals(["loginSubmitVisible"], true),
    ]);
  }
  if (name === "signout-settled-user-a-with-abort") {
    return andPredicate([
      outputEquals(["loginEmailVisible"], true),
      outputEquals(["loginPasswordVisible"], true),
      outputEquals(["loginSubmitVisible"], true),
      outputEquals(["clientAborted"], true),
    ]);
  }
  if (
    [
      "theme-light",
      "theme-dark",
      "theme-light-user-a-candidate",
      "user-a-light-computed",
      "user-b-dark-computed",
    ].includes(name)
  ) {
    const dark = name === "theme-dark" || name === "user-b-dark-computed";
    return andPredicate([
      outputEquals(["theme"], dark ? "dark" : "light"),
      outputEquals(["toggleAriaPressed"], dark ? "true" : "false"),
      outputNonEmpty(["rootColor"]),
      outputNonEmpty(["bodyColor"]),
      ...(name === "user-b-dark-computed" ? [outputEquals(["metadataEffect"], false)] : []),
    ]);
  }
  if (name.startsWith("geometry-")) {
    const match = /^geometry-(320|390|480|1024|1280)-(open|closed)$/.exec(name);
    invariant(match !== null, "geometry observation name drift");
    return andPredicate([
      outputEquals(["width"], Number(match[1])),
      outputEquals(["viewportWidth"], Number(match[1])),
      outputEquals(["state"], match[2]),
      outputNonEmpty(["paddingRight"]),
      positiveRectPredicate(["scrollerBorder"]),
      positiveRectPredicate(["scrollerContent"]),
    ]);
  }
  if (name === "binding-after-save") {
    return andPredicate([
      outputNonEmpty(["screenId"]),
      comparePredicate("gt", lengthRef(outputRef(["bindings"])), literalPredicateRef(0)),
    ]);
  }
  if (name === "safe-link-anchor-before-activation") {
    return andPredicate([
      outputEquals(["tagName"], "A"),
      outputNonEmpty(["href"]),
      positiveRectPredicate(["rect"]),
    ]);
  }
  if (name === "outer-tabs-details-state" || name === "outer-tabs-history-state") {
    return andPredicate([
      outputNonEmpty(["activeTabId"]),
      outputNonEmpty(["armedSlotId"]),
      outputLengthEquals(["visiblePanelIds"], 1),
      outputLengthEquals(["hiddenPanelIds"], 2),
      outputLengthEquals(["rects"], 3),
    ]);
  }
  if (name === "preview-shell-desktop") {
    return andPredicate([
      outputEquals(["shellVisible"], true),
      outputEquals(["device"], "desktop"),
      outputEquals(["outerTabsVisible"], true),
      outputEquals(["innerTabsVisible"], true),
    ]);
  }
  if (name.startsWith("key-step-")) {
    const keys = {
      "key-step-arrow-left": "ArrowLeft",
      "key-step-arrow-right": "ArrowRight",
      "key-step-home": "Home",
      "key-step-end": "End",
    };
    return andPredicate([
      outputEquals(["key"], keys[name]),
      outputNonEmpty(["focusedTabText"]),
      outputNonEmpty(["focusedTabId"]),
      outputNonEmpty(["selectedTabId"]),
      comparePredicate("gte", outputRef(["tabIndex"]), literalPredicateRef(0)),
    ]);
  }
  if (name.startsWith("selected-block-")) {
    return andPredicate([
      outputNonEmpty(["selectedBlockId"]),
      outputNonEmpty(["url"]),
      ...(name === "selected-block-before-nested-controls"
        ? []
        : [outputEquals(["focused"], true)]),
    ]);
  }
  if (name === "builder-draft-url-before-cancel") {
    return andPredicate([
      outputNonEmpty(["draftBytes"]),
      outputNonEmpty(["url"]),
      comparePredicate("gte", outputRef(["navigationCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "entry-drafts-url-before-cancel") {
    return andPredicate([
      outputNonEmpty(["contentBytes"]),
      outputNonEmpty(["presentationBytes"]),
      outputNonEmpty(["url"]),
      comparePredicate("gte", outputRef(["navigationCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "entry-save-failure-ui-settled") {
    return andPredicate([
      outputEquals(["errorVisible"], true),
      outputEquals(["saveEnabled"], true),
      outputNonEmpty(["saveLabel"]),
    ]);
  }
  if (name === "relation-pickers-a-b-warm") {
    return andPredicate([
      outputLengthEquals(["aButtons"], 2),
      outputLengthEquals(["bButtons"], 2),
      comparePredicate("gt", lengthRef(outputRef(["aRows"])), literalPredicateRef(0)),
      comparePredicate("gt", outputRef(["bListGetCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "related-unrelated-drafts-before") {
    return andPredicate([outputNonEmpty(["contentBytes"]), outputNonEmpty(["presentationBytes"])]);
  }
  if (name === "related-a-visible-baseline") {
    return andPredicate([
      outputNonEmpty(["rootId"]),
      comparePredicate("gt", lengthRef(outputRef(["rowIds"])), literalPredicateRef(0)),
      outputEquals(["skeletonCount"], 0),
      outputEquals(["emptyVisible"], false),
      comparePredicate("gte", outputRef(["navigationCount"]), literalPredicateRef(0)),
    ]);
  }
  if (name === "related-tab-save-settled") {
    return andPredicate([
      outputEquals(["method"], "PATCH"),
      successfulStatusPredicate(),
      outputNonEmpty(["pathname"]),
      outputNonEmpty(["entryId"]),
      outputNonEmpty(["title"]),
      outputEquals(["saveEnabled"], true),
      outputEquals(["savingAbsent"], true),
    ]);
  }
  if (
    [
      "preference-a-write-settled",
      "nondefault-browser-patch-settled",
      "new-local-browser-patch-settled",
    ].includes(name)
  ) {
    const expected = name !== "new-local-browser-patch-settled";
    return andPredicate([
      outputEquals(["method"], "PATCH"),
      successfulStatusPredicate(),
      outputEquals(["userIdMatches"], true),
      outputEquals(["value", "version"], 1),
      outputEquals(["value", "showFieldMetadata"], expected),
      ...(name === "preference-a-write-settled"
        ? [
            outputEquals(["switchChecked"], true),
            positiveRectPredicate(["switchRect"]),
            positiveRectPredicate(["metadataRect"]),
          ]
        : []),
    ]);
  }
  if (name === "post-redirect-a-fresh-read-settled") {
    return andPredicate([
      comparePredicate("gt", outputRef(["sequence"]), literalPredicateRef(0)),
      outputEquals(["method"], "GET"),
      successfulStatusPredicate(),
      outputEquals(["activeUserMenuVisible"], true),
      outputEquals(["value", "showFieldMetadata"], true),
      outputEquals(["switchChecked"], true),
      positiveRectPredicate(["metadataRect"]),
    ]);
  }
  invariant(false, "observation predicate is missing: " + name);
}

function exactKeys(value, expected, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    label + " must be an object"
  );
  const actual = Reflect.ownKeys(value);
  invariant(
    actual.length === expected.length && expected.every((key, index) => actual[index] === key),
    label + " has non-canonical keys"
  );
}

function sameSet(left, right) {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}

function parseBuilderAst(builder) {
  invariant(typeof builder === "string" && builder.length > 0, "builder must be non-empty");
  const open = builder.indexOf("(");
  if (open === -1) {
    invariant(/^[A-Za-z][A-Za-z0-9-]*$/.test(builder), "bare builder name is invalid");
    return deepFreezeExact({ callee: builder, args: [] });
  }
  invariant(builder.endsWith(")"), "builder call must close");
  const callee = builder.slice(0, open);
  invariant(/^[A-Za-z][A-Za-z0-9-]*$/.test(callee), "builder callee is invalid");
  const body = builder.slice(open + 1, -1);
  const args = [];
  let quote = null;
  let escaped = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote !== null) {
      if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === "(") depth += 1;
    else if (character === ")") {
      invariant(depth > 0, "builder has an unmatched close parenthesis");
      depth -= 1;
    } else if (character === "," && depth === 0) {
      args.push(body.slice(start, index).trim());
      start = index + 1;
    }
  }
  invariant(quote === null && depth === 0, "builder expression is unterminated");
  if (body.trim().length > 0) args.push(body.slice(start).trim());
  invariant(
    args.every((argument) => argument.length > 0),
    "builder has an empty argument"
  );
  return deepFreezeExact({ callee, args });
}

function parseBuilderKind(builder) {
  return parseBuilderAst(builder).callee;
}

function literalRef(value) {
  return deepFreezeExact({ op: "literal", value });
}

function compileArgumentRef(expression) {
  invariant(
    typeof expression === "string" && expression.length > 0 && expression.length <= 1024,
    "command argument expression is invalid"
  );
  if (expression.startsWith('"') && expression.endsWith('"')) {
    const value = JSON.parse(expression);
    invariant(typeof value === "string", "quoted command argument must be a string");
    return literalRef(value);
  }
  if (/^-?(?:0|[1-9][0-9]*)$/.test(expression)) return literalRef(Number(expression));
  if (expression === "$ADMIN_EMAIL" || expression === "$ADMIN_PASSWORD") {
    return deepFreezeExact({ op: "secret", name: expression.slice(1) });
  }
  if (expression === "$WF540_USER_A_EMAIL") {
    return deepFreezeExact({ op: "fixture", path: ["users", "a", "email"] });
  }
  if (expression === "$WF540_USER_B_EMAIL") {
    return deepFreezeExact({ op: "fixture", path: ["users", "b", "email"] });
  }
  invariant(!expression.startsWith("$"), "command secret reference is not allowlisted");
  if (expression.startsWith("paths.")) {
    const key = expression.slice("paths.".length);
    invariant(/^[A-Za-z][A-Za-z0-9]*$/.test(key), "command path key is invalid");
    return deepFreezeExact({ op: "path", key });
  }
  if (expression.startsWith("S.")) {
    const selectorAst = parseBuilderAst(expression.slice(2));
    return deepFreezeExact({
      op: "selector",
      templateId: selectorAst.callee,
      args: selectorAst.args.map(compileArgumentRef),
    });
  }
  if (expression.startsWith("screen.blockIds.")) {
    return deepFreezeExact({
      op: "fixture",
      path: ["screen", "blockIds", expression.slice("screen.blockIds.".length)],
    });
  }
  const captureAliases = {
    "palette.button": "palette.button",
    "palette.image": "palette.image",
    "palette.mediaField": "palette.media-field",
    "palette.outerTabs": "palette.outer-tabs",
    "palette.tabOneText": "palette.tab-one-text",
    "palette.tabTwoText": "palette.tab-two-text",
    "palette.tabThreeText": "palette.tab-three-text",
    "palette.innerTabs": "palette.inner-tabs",
    "palette.dirtyText": "palette.dirty-text",
    "screen.id": "screen.id",
    "entry.id": "entry.id",
  };
  if (Object.hasOwn(captureAliases, expression)) {
    return deepFreezeExact({ op: "capture", name: captureAliases[expression] });
  }
  const fixturePrefixes = ["entry.", "media.", "relatedEntries.", "tabs.", "users."];
  if (fixturePrefixes.some((prefix) => expression.startsWith(prefix))) {
    const path = expression.split(".");
    invariant(
      path.every((segment) => /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(segment)),
      "fixture command path is invalid"
    );
    return deepFreezeExact({ op: "fixture", path });
  }
  invariant(
    expression.length <= 240 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(expression),
    "literal command token is invalid"
  );
  return literalRef(expression);
}

function valueAtPath(value, path, label) {
  let current = value;
  for (const segment of path) {
    invariant(
      current !== null && typeof current === "object" && Object.hasOwn(current, segment),
      label + " references a missing value"
    );
    current = current[segment];
  }
  return current;
}

function validateRefDescriptor(ref, context, label, depth = 0, allowSecret = false) {
  invariant(depth <= 32, label + " exceeds the Ref nesting limit");
  invariant(ref && typeof ref === "object" && !Array.isArray(ref), label + " must be a Ref");
  invariant(typeof ref.op === "string", label + " Ref opcode is missing");
  if (ref.op === "literal") {
    exactKeys(ref, ["op", "value"], label);
    invariant(
      Number.isSafeInteger(ref.value) ||
        (typeof ref.value === "string" &&
          ref.value.length <= 4096 &&
          !/[\0\r\n]/u.test(ref.value) &&
          !ref.value.startsWith("$") &&
          !["ADMIN_EMAIL", "ADMIN_PASSWORD"].includes(ref.value)),
      label + " literal must be a string or safe integer"
    );
    return;
  }
  if (ref.op === "secret") {
    exactKeys(ref, ["op", "name"], label);
    invariant(allowSecret, label + " secret is not permitted in this position");
    invariant(
      ["ADMIN_EMAIL", "ADMIN_PASSWORD"].includes(ref.name),
      label + " secret is not allowlisted"
    );
    return;
  }
  if (ref.op === "capture") {
    exactKeys(ref, ["op", "name"], label);
    invariant(context.captureNames.includes(ref.name), label + " capture is not registered");
    return;
  }
  if (ref.op === "fixture") {
    exactKeys(ref, ["op", "path"], label);
    invariant(
      Array.isArray(ref.path) &&
        ref.path.length > 0 &&
        ref.path.length <= 4 &&
        ref.path.every(
          (segment) => typeof segment === "string" && /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(segment)
        ) &&
        context.fixtureRefPaths.includes(ref.path.join(".")),
      label + " fixture path is invalid"
    );
    const resolved = valueAtPath(context.fixtureBlueprint, ref.path, label);
    invariant(
      typeof resolved === "string" || Number.isSafeInteger(resolved),
      label + " fixture path must resolve to a scalar leaf"
    );
    return;
  }
  if (ref.op === "path") {
    exactKeys(ref, ["op", "key"], label);
    invariant(
      Object.hasOwn(context.fixtureBlueprint.paths, ref.key),
      label + " path is not registered"
    );
    return;
  }
  if (ref.op === "selector") {
    exactKeys(ref, ["op", "templateId", "args"], label);
    const selector = context.selectors[ref.templateId];
    invariant(selector !== undefined, label + " selector is not registered");
    invariant(
      Array.isArray(ref.args) &&
        ref.args.length >= selector.minArity &&
        ref.args.length <= selector.maxArity,
      label + " selector arity drift"
    );
    ref.args.forEach((argument, index) =>
      validateRefDescriptor(argument, context, label + ".args[" + index + "]", depth + 1, false)
    );
    return;
  }
  invariant(false, label + " has an unknown Ref opcode");
}

function captureNamesRequiredByRef(ref, context, output = []) {
  if (ref.op === "capture") output.push(ref.name);
  if (ref.op === "path") {
    const pathDescriptor = context.fixtureBlueprint.paths[ref.key];
    if (pathDescriptor && typeof pathDescriptor === "object") {
      for (const captureName of pathDescriptor.captures) output.push(captureName);
    }
  }
  if (ref.op === "selector") {
    for (const argument of ref.args) {
      captureNamesRequiredByRef(argument, context, output);
    }
  }
  return output;
}

function repositoryMutationPolicy(action, ast) {
  if (action.kind !== "screen") {
    return deepFreezeExact({ mode: "none", paths: [] });
  }
  const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
  invariant(descriptor !== undefined, action.id + " screenshot descriptor is not registered");
  invariant(ast.args.length === 1, action.id + " screenshot builder arity drift");
  const screenshotRef = compileArgumentRef(ast.args[0]);
  invariant(
    screenshotRef.op === "literal" && typeof screenshotRef.value === "string",
    action.id + " screenshot name must be literal"
  );
  const screenshotName = screenshotRef.value;
  invariant(
    descriptor.path === "_docs/_workflows/_smoke/task-540-wf540smoke-" + screenshotName + ".png",
    action.id + " screenshot builder/path identity drift"
  );
  return deepFreezeExact({ mode: "allowlist", paths: [descriptor.path] });
}

function parseAssertionName(builder) {
  const match = /^assert\(([^()]+)\)$/.exec(builder);
  return match?.[1] ?? null;
}

function capturePredicateRef(name) {
  return deepFreezeExact({ op: "capture", name });
}

function fixturePredicateRef(path) {
  return deepFreezeExact({ op: "fixture", path });
}

function priorPredicateRef(actionId, path = []) {
  return deepFreezeExact({ op: "prior", actionId, path });
}

function pathPredicateRef(key) {
  return deepFreezeExact({ op: "path", key });
}

function arrayPredicateRef(items) {
  return deepFreezeExact({ op: "array", items });
}

function subtractionPredicateRef(left, right) {
  return deepFreezeExact({ op: "sub", left, right });
}

function observationRef(path = []) {
  return outputRef(["observations", ...path]);
}

function observationEquals(path, expected) {
  return deepEqualPredicate(observationRef(path), literalPredicateRef(expected));
}

function observationEqualsRef(path, expected) {
  return deepEqualPredicate(observationRef(path), expected);
}

function observationNonEmpty(path) {
  return deepFreezeExact({ op: "nonEmptyString", value: observationRef(path) });
}

function observationLengthEquals(path, expected) {
  return deepEqualPredicate(lengthRef(observationRef(path)), literalPredicateRef(expected));
}

function positiveRectRefPredicate(ref) {
  return andPredicate([
    comparePredicate(
      "gt",
      deepFreezeExact({ ...ref, path: [...ref.path, "width"] }),
      literalPredicateRef(0)
    ),
    comparePredicate(
      "gt",
      deepFreezeExact({ ...ref, path: [...ref.path, "height"] }),
      literalPredicateRef(0)
    ),
  ]);
}

function zeroRectRefPredicate(ref) {
  return andPredicate([
    deepEqualPredicate(
      deepFreezeExact({ ...ref, path: [...ref.path, "width"] }),
      literalPredicateRef(0)
    ),
    deepEqualPredicate(
      deepFreezeExact({ ...ref, path: [...ref.path, "height"] }),
      literalPredicateRef(0)
    ),
  ]);
}

function everyPositiveObservationRect(path, variableName) {
  return everyPredicate(
    observationRef(path),
    variableName,
    positiveRectRefPredicate(varRef(variableName))
  );
}

function everyZeroObservationRect(path, variableName) {
  return everyPredicate(
    observationRef(path),
    variableName,
    zeroRectRefPredicate(varRef(variableName))
  );
}

function visibleStringSchema({ maxLength = 4096 } = {}) {
  return schemaString({ minLength: 1, maxLength });
}

function visibleIdSchema() {
  return schemaString({ minLength: 1, maxLength: 256 });
}

function visibleUrlSchema() {
  return schemaString({ minLength: 8, maxLength: 2048, format: "http-url" });
}

function visibleUuidSchema() {
  return schemaString({ minLength: 36, maxLength: 36, format: "uuid" });
}

function visibleStringArraySchema({
  minItems = 0,
  maxItems = 128,
  unique = false,
  maxLength = 4096,
} = {}) {
  return schemaArray(visibleStringSchema({ maxLength }), { minItems, maxItems, unique });
}

function visibleIdArraySchema({ minItems = 0, maxItems = 128, unique = true } = {}) {
  return schemaArray(visibleIdSchema(), { minItems, maxItems, unique });
}

function visibleUuidArraySchema({ minItems = 0, maxItems = 128 } = {}) {
  return schemaArray(visibleUuidSchema(), { minItems, maxItems, unique: true });
}

function visibleRectArraySchema({ minItems = 0, maxItems = 128 } = {}) {
  return schemaArray(createRectSchema(), { minItems, maxItems });
}

function createVisibleGeometrySampleSchema({ panelRequired = false } = {}) {
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

function createVisibleKeyStepSchema(key) {
  return schemaObject({
    key: schemaLiteral(key),
    focusedTabText: visibleStringSchema({ maxLength: 256 }),
    focusedTabId: visibleIdSchema(),
    selectedTabId: visibleIdSchema(),
    tabIndex: schemaInteger({ minimum: 0, maximum: 1024 }),
  });
}

function createVisibleAriaPairSchema() {
  return schemaObject({
    tabId: visibleIdSchema(),
    panelId: visibleIdSchema(),
    ariaControls: visibleIdSchema(),
    ariaLabelledBy: visibleIdSchema(),
    selected: schemaBoolean(),
    hidden: schemaBoolean(),
  });
}

function createVisibleAssertionSchemas() {
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

function visibleAssertionTargetRef(name) {
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

function visibleTargetPredicate(targetRef) {
  return deepEqualPredicate(outputRef(["target"]), targetRef);
}

function expectedTabIdsRef() {
  return arrayPredicateRef([
    fixturePredicateRef(["tabs", "defaults", "0", "id"]),
    fixturePredicateRef(["tabs", "defaults", "1", "id"]),
    fixturePredicateRef(["tabs", "added", "id"]),
  ]);
}

function expectedTabLabelsRef() {
  return arrayPredicateRef([
    fixturePredicateRef(["tabs", "authoredLabels", "tab-1"]),
    fixturePredicateRef(["tabs", "authoredLabels", "tab-2"]),
    fixturePredicateRef(["tabs", "authoredLabels", "tab-3"]),
  ]);
}

function expectedTabTextRef() {
  return arrayPredicateRef([
    fixturePredicateRef(["tabs", "text", "tab-1"]),
    fixturePredicateRef(["tabs", "text", "tab-2"]),
    fixturePredicateRef(["tabs", "text", "tab-3"]),
  ]);
}

function expectedRelatedIdsRef(group) {
  return arrayPredicateRef([
    capturePredicateRef(`related-entry-${group}1.id`),
    capturePredicateRef(`related-entry-${group}2.id`),
  ]);
}

function geometrySamplesPredicate(actionIds, { panel = false } = {}) {
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

function createVisibleAssertionPredicate(name, targetRef) {
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

function createSpecialVisibleAssertionContracts() {
  const boolean = schemaBoolean();
  const mediaCount = schemaInteger({ minimum: 0, maximum: 10_000 });
  return deepFreezeExact({
    "media-cache-cold-before-route": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        builderUrl: visibleUrlSchema(),
        builderMarkerVisible: boolean,
        localStorageAbsent: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        deepEqualPredicate(outputRef(["builderUrl"]), pathPredicateRef("builder")),
        outputEquals(["builderMarkerVisible"], true),
        outputEquals(["localStorageAbsent"], true),
        outputEquals(["mediaGetCount"], 0),
      ]),
    }),
    "prior-media-resolution-pending": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        overridePresent: boolean,
        imagePresent: boolean,
        placeholderVisible: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        outputEquals(["overridePresent"], true),
        outputEquals(["imagePresent"], false),
        outputEquals(["placeholderVisible"], true),
        outputEquals(["mediaGetCount"], 1),
      ]),
    }),
    "newer-media-winner-selected-pending": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        overridePresent: boolean,
        imagePresent: boolean,
        placeholderVisible: boolean,
        presentationDirtyVisible: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        outputEquals(["overridePresent"], false),
        outputEquals(["imagePresent"], false),
        outputEquals(["placeholderVisible"], true),
        outputEquals(["presentationDirtyVisible"], true),
        outputEquals(["mediaGetCount"], 1),
      ]),
    }),
    "stale-media-result-ignored": outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        overridePresent: boolean,
        imagePresent: boolean,
        placeholderVisible: boolean,
        acquiredUrlPresent: boolean,
        mediaGetCount: mediaCount,
      }),
      predicate: andPredicate([
        outputEquals(["overridePresent"], false),
        outputEquals(["imagePresent"], false),
        outputEquals(["placeholderVisible"], true),
        outputEquals(["acquiredUrlPresent"], false),
        outputEquals(["mediaGetCount"], 1),
      ]),
    }),
    "preference-a-write-hit-before-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(1),
      predicate: outputEquals([], 1),
    }),
    "preference-a-write-hit-after-release": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(1),
      predicate: outputEquals([], 1),
    }),
    "queued-a-write-zero-dispatch": outputContract({
      grammar: jsonTransport(),
      schema: schemaLiteral(0),
      predicate: outputEquals([], 0),
    }),
  });
}

function createVisibleAssertionTargetRegistry() {
  const registry = Object.create(null);
  for (const [, name] of RAW_VISIBLE_ASSERTION_ROWS) {
    invariant(!Object.hasOwn(registry, name), "duplicate visible assertion target: " + name);
    registry[name] = visibleAssertionTargetRef(name);
  }
  invariant(
    sameSet(
      Object.keys(registry),
      RAW_VISIBLE_ASSERTION_ROWS.map(([, name]) => name)
    ),
    "visible assertion target registry set drift"
  );
  return deepFreezeExact(registry);
}

function createVisibleAssertionRegistry(targets) {
  const registry = Object.create(null);
  const schemas = createVisibleAssertionSchemas();
  for (const [scenario, name, fields] of RAW_VISIBLE_ASSERTION_ROWS) {
    invariant(REQUIRED_SCENARIOS.includes(scenario), "assertion has an unknown scenario: " + name);
    invariant(
      REQUIRED_SMOKE_ASSERTIONS[scenario].includes(name),
      "assertion scenario ownership drift: " + name
    );
    invariant(
      typeof name === "string" &&
        Array.isArray(fields) &&
        fields.length > 0 &&
        new Set(fields).size === fields.length &&
        fields.every((field) => typeof field === "string" && field.length > 0),
      "ordinary visible assertion contract is invalid: " + name
    );
    invariant(!Object.hasOwn(registry, name), "duplicate visible assertion contract: " + name);
    invariant(
      Object.hasOwn(schemas, name),
      "ordinary visible assertion schema is missing: " + name
    );
    invariant(
      Object.hasOwn(targets, name),
      "ordinary visible assertion target is missing: " + name
    );
    invariant(
      sameSet(Object.keys(schemas[name].properties), fields),
      "ordinary visible assertion schema fields drift: " + name
    );
    registry[name] = outputContract({
      grammar: jsonTransport(),
      schema: schemaObject({
        assertion: schemaLiteral(name),
        target: visibleStringSchema({ maxLength: 2048 }),
        observations: schemas[name],
      }),
      predicate: createVisibleAssertionPredicate(name, targets[name]),
    });
  }
  invariant(
    sameSet(
      Object.keys(schemas),
      RAW_VISIBLE_ASSERTION_ROWS.map(([, name]) => name)
    ),
    "ordinary visible assertion schema set drift"
  );
  for (const [name, contract] of Object.entries(createSpecialVisibleAssertionContracts())) {
    invariant(!Object.hasOwn(registry, name), "duplicate special assertion contract: " + name);
    registry[name] = contract;
  }
  const required = Object.values(REQUIRED_SMOKE_ASSERTIONS).flat();
  invariant(sameSet(Object.keys(registry), required), "visible assertion registry set drift");
  return deepFreezeExact(registry);
}

function createObservationRegistry(manifest, fixtureBlueprint) {
  const names = [
    ...new Set(
      manifest
        .filter(({ kind }) => kind === "observe")
        .map(({ builder }) => parseBuilderAst(builder).args[0])
    ),
  ];
  invariant(
    sameSet(names, Object.keys(OBSERVATION_OUTPUT_FIELDS)),
    "observation registry set drift"
  );
  const canonicalAdminRootUrl = fixtureBlueprint.origins.admin + "/admin/";
  invariant(
    canonicalAdminRootUrl === "http://coderso-a.localhost:5173/admin/",
    "canonical Admin root URL drift"
  );
  return deepFreezeExact(
    Object.fromEntries(
      names.map((name) => [
        name,
        outputContract({
          grammar: jsonTransport(),
          schema: schemaObject(
            Object.fromEntries(
              OBSERVATION_OUTPUT_FIELDS[name].map((field) => [
                field,
                createObservationFieldSchema(name, field),
              ])
            )
          ),
          predicate: createObservationPredicate(name, canonicalAdminRootUrl),
        }),
      ])
    )
  );
}

function routeOutputSchemaId(key, operation) {
  const machine = ROUTE_STATE_MACHINES[key];
  invariant(machine !== undefined, "route key is not registered: " + key);
  if (operation === "route-setup") return "route-setup";
  if (operation === "unroute") return "route-unroute";
  if (operation === "route-release") {
    return machine.mode === "abort-aware-preference-write"
      ? "route-abort-release"
      : "route-release";
  }
  invariant(operation === "route-hit-read", "route operation is not registered: " + operation);
  if (machine.mode === "malformed") return "route-malformed-hit";
  if (machine.mode === "delayed-preference-read") return "route-preference-read-hit";
  if (key === "related-a-refresh") return "route-related-hit";
  if (machine.mode === "abort-aware-preference-write") return "route-preference-write-hit";
  return "route-delayed-hit";
}

function commandOutputSchemaId(action, ast) {
  if (action.id === "set-017-editable-type-proof") {
    return "editable-content-type-detail";
  }
  if (action.kind === "assert") return "assertion:" + ast.args[0];
  if (action.kind === "observe") return "observation:" + ast.args[0];
  if (action.kind === "route") return routeOutputSchemaId(ast.args[0], ast.args[1]);
  if (action.kind === "blocksBefore") return "block-id-set";
  if (action.kind === "captureNew") return "new-block";
  if (action.kind === "logs") return "log-channel";
  if (action.kind === "screen") return "screenshot";
  if (action.kind === "media-count-before-release" || action.kind === "media-count-after-release") {
    return "media-count";
  }
  if (action.kind === "dispatchAndCaptureSelectionHandle") return "selection-handle";
  if (action.kind === "authRateWindowBarrier") return "auth-rate-barrier";
  if (action.kind === "cleanup-release-unroute") return "cleanup-routes";
  if (action.kind === "cleanup-route-list") return "cleanup-route-list";
  if (
    action.kind === "cleanup-console-errors" ||
    action.kind === "cleanup-console-warnings" ||
    action.kind === "cleanup-page-errors"
  ) {
    return "cleanup-log-channel";
  }
  if (action.kind === "cleanup-session-absence") return "cleanup-session";
  if (action.kind === "cleanup-close") return "cleanup-close";
  if (RUNTIME_BUILDER_KINDS.includes(action.kind)) return "runtime-safe-projection";
  return "unit";
}

function createBuilderRegistry(manifest) {
  const executionClasses = new Set([...BROWSER_BUILDER_KINDS, ...RUNTIME_BUILDER_KINDS]);
  invariant(
    sameSet([...executionClasses], Object.keys(REQUIRED_BUILDER_KIND_COUNTS)),
    "builder execution-class registry set drift"
  );
  const registry = Object.create(null);
  for (const kind of Object.keys(REQUIRED_BUILDER_KIND_COUNTS)) {
    const allowedBuilders = [
      ...new Set(manifest.filter((action) => action.kind === kind).map(({ builder }) => builder)),
    ];
    invariant(allowedBuilders.length > 0, "builder kind has no exact invocations: " + kind);
    const arities = [
      ...new Set(allowedBuilders.map((builder) => parseBuilderAst(builder).args.length)),
    ];
    registry[kind] = deepFreezeExact({
      executionClass: BROWSER_BUILDER_KINDS.includes(kind) ? "browser" : "runtime",
      arities,
      allowedBuilders,
    });
  }
  return deepFreezeExact(registry);
}

function createOutputRegistry(observations, assertions, fixtureBlueprint) {
  const registry = { ...createBaseOutputSchemas(fixtureBlueprint) };
  for (const [name, descriptor] of Object.entries(observations)) {
    registry["observation:" + name] = descriptor;
  }
  for (const [name, descriptor] of Object.entries(assertions)) {
    registry["assertion:" + name] = descriptor;
  }
  return deepFreezeExact(registry);
}

function referencedCaptures(row) {
  const haystack = row.join("\n");
  const names = REQUIRED_CAPTURE_NAMES.filter((name) => haystack.includes(name));
  for (const [expression, captureName] of Object.entries(RUNTIME_CAPTURE_EXPRESSIONS)) {
    if (haystack.includes(expression) && !names.includes(captureName)) names.push(captureName);
  }
  for (const [expression, captureNames] of Object.entries(CAPTURE_INPUTS_BY_EXPRESSION)) {
    if (!haystack.includes(expression)) continue;
    for (const captureName of captureNames) {
      if (!names.includes(captureName)) names.push(captureName);
    }
  }
  return names;
}

function resolveDependencyId(token, allIds, currentIndex) {
  const priorIds = allIds.slice(0, currentIndex);
  if (priorIds.includes(token)) return token;
  const matches = priorIds.filter((id) => id.startsWith(token + "-"));
  invariant(matches.length === 1, token + " must resolve to exactly one prior action");
  return matches[0];
}

function nativeOperationIdForAction(actionId) {
  if (actionId === "set-005-open") return "open-about-blank";
  if (
    [
      "set-009-login-email",
      "set-010-login-password",
      "ru-042-a-password",
      "ru-068-b-password",
      "ru-078-a2-password",
      "ru-092-b2-password",
      "ru-104-a3-password",
    ].includes(actionId)
  ) {
    return "fill-secret";
  }
  if (actionId === "rc-019-related-tab-new") return "tab-new";
  if (actionId === "rc-022-related-tab-origin" || actionId === "rc-045-origin-proof") {
    return "tab-select";
  }
  if (actionId === "rc-044-close-second-tab") return "tab-close";
  if (actionId === "end-002-route-list") return "route-list";
  if (actionId === "end-006-close") return "close";
  invariant(false, "native action is not registered: " + actionId);
}

function compileExecutable(action, ast) {
  const refs =
    action.kind === "blocksBefore" || action.kind === "captureNew"
      ? ast.args.map((expression, index) => {
          if (index === 0) {
            const captureName = RUNTIME_CAPTURE_EXPRESSIONS[expression];
            invariant(captureName !== undefined, action.id + " runtime capture name drift");
            return literalRef(captureName);
          }
          return compileArgumentRef(expression);
        })
      : ast.args.map(compileArgumentRef);
  if (RUNTIME_BUILDER_KINDS.includes(action.kind)) {
    invariant(
      refs.every(({ op }) => op !== "secret"),
      action.id + " runtime Ref contains a secret"
    );
    return deepFreezeExact({
      type: "runtime-operation",
      operationId: "runtime/" + action.id,
      refs,
    });
  }
  if (REQUIRED_NATIVE_ACTION_IDS.includes(action.id)) {
    return deepFreezeExact({
      type: "browser-native",
      operationId: nativeOperationIdForAction(action.id),
      refs,
    });
  }
  if (action.kind === "screen") {
    invariant(refs.length === 1 && refs[0].op === "literal", action.id + " screenshot Ref drift");
    const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    invariant(descriptor !== undefined, action.id + " screenshot descriptor drift");
    return deepFreezeExact({
      type: "browser-screenshot",
      screenshotId: descriptor.screenshotId,
      fullPage: true,
    });
  }
  if (REQUIRED_GLOBAL_LIST_ACTION_IDS.includes(action.id)) {
    invariant(refs.length === 0, action.id + " global-list Ref drift");
    return deepFreezeExact({ type: "browser-global-list" });
  }
  invariant(
    refs.every(({ op }) => op !== "secret"),
    action.id + " run-code Ref contains a secret"
  );
  return deepFreezeExact({
    type: "browser-run-code",
    sourceId: "run-code/" + action.id,
    refs,
  });
}

function compileAction(row, index, allRows) {
  invariant(Array.isArray(row) && row.length === 5, "action row must have five cells");
  const [id, page, builder, transition, dependencyAndRoute] = row;
  invariant(
    [id, page, builder, transition, dependencyAndRoute].every((item) => typeof item === "string"),
    "action cells must be strings"
  );
  const prefix = id.split("-", 1)[0];
  const scenario = SCENARIO_BY_PREFIX[prefix];
  const pageIdentity = PAGE_IDENTITY[page];
  invariant(scenario !== undefined, "unknown scenario prefix for " + id);
  invariant(pageIdentity !== undefined, "unknown page identity for " + id);

  const transitionParts = transition.split(" -> ");
  invariant(
    transitionParts.length === 3 && transitionParts.every(Boolean),
    id + " must have exact pre/output/post clauses"
  );
  const dependencyRouteParts = dependencyAndRoute.split(" / ");
  invariant(dependencyRouteParts.length === 2, id + " must have exact dependency/route clauses");
  const dependencyTokens =
    dependencyRouteParts[0] === "-"
      ? []
      : dependencyRouteParts[0].split(",").map((dependency) => dependency.trim());
  const allIds = allRows.map(([candidateId]) => candidateId);
  const dependencies = dependencyTokens.map((dependency) =>
    resolveDependencyId(dependency, allIds, index)
  );
  const routeParts = dependencyRouteParts[1].split(" -> ");
  invariant(
    routeParts.length === 2 && routeParts.every(Boolean),
    id + " must have exact route before/after clauses"
  );

  const auditIdentity = {
    ordinal: index + 1,
    id,
    scenario,
    pageId: pageIdentity.pageId,
    tabIndex: pageIdentity.tabIndex,
    kind: parseBuilderKind(builder),
    builder,
    precondition: transitionParts[0],
    captureInput: referencedCaptures(row),
    captureOutput: transitionParts[1],
    postcondition: transitionParts[2],
    assertionDependencies: dependencies,
    routeStateBefore: routeParts[0],
    routeStateAfter: routeParts[1],
  };
  const ast = parseBuilderAst(builder);
  return deepFreezeExact({
    ...auditIdentity,
    executable: compileExecutable(auditIdentity, ast),
    outputSchemaId: commandOutputSchemaId(auditIdentity, ast),
    repositoryMutationPolicy: repositoryMutationPolicy(auditIdentity, ast),
  });
}

function selectorTemplate(parts, slots = [], optionalDefaults = {}) {
  invariant(
    Array.isArray(parts) &&
      parts.length === slots.length + 1 &&
      parts.every((part) => typeof part === "string") &&
      slots.every(
        (slot) =>
          slot &&
          Number.isInteger(slot.argIndex) &&
          slot.argIndex >= 0 &&
          slot.encoding === "css-string"
      ) &&
      optionalDefaults &&
      Object.getPrototypeOf(optionalDefaults) === Object.prototype,
    "selector template is invalid"
  );
  const arity = slots.length === 0 ? 0 : Math.max(...slots.map(({ argIndex }) => argIndex)) + 1;
  invariant(
    slots.length === 0 || new Set(slots.map(({ argIndex }) => argIndex)).size === arity,
    "selector arguments must be dense"
  );
  const optionalIndexes = Object.keys(optionalDefaults).map(Number);
  invariant(
    optionalIndexes.every(
      (index, offset) =>
        Number.isInteger(index) &&
        index === arity - optionalIndexes.length + offset &&
        typeof optionalDefaults[index] === "string"
    ),
    "selector optional arguments must be a dense trailing suffix"
  );
  return deepFreezeExact({
    kind: "selector-template",
    minArity: arity - optionalIndexes.length,
    maxArity: arity,
    parts,
    slots,
    optionalDefaults,
  });
}

function staticSelector(value) {
  return selectorTemplate([value]);
}

function createSelectorRegistry() {
  const slot = (argIndex) => ({ argIndex, encoding: "css-string" });
  return deepFreezeExact({
    loginEmail: staticSelector('input#email[name="email"][type="email"]'),
    loginPassword: staticSelector('input#password[name="password"][type="password"]'),
    loginSubmit: staticSelector('button[type="submit"]:text-is("Sign in")'),
    canvas: staticSelector('[data-screen-authoring-canvas="true"]'),
    blockRoot: selectorTemplate(['[data-screen-block-id="', '"]'], [slot(0)]),
    insertPanel: staticSelector('button[data-screen-toolbar-panel="insert"][aria-label="Insert"]'),
    blockLibrary: staticSelector('[data-screen-block-library="true"]'),
    palette: selectorTemplate(
      ['div[data-screen-block-library="true"] button:text-is("', '")'],
      [slot(0)]
    ),
    selectBlock: selectorTemplate(['button[data-screen-select-block="', '"]'], [slot(0)]),
    buttonAffordance: selectorTemplate(
      ['[data-screen-block-id="', '"] [data-screen-button-affordance="true"]'],
      [slot(0)]
    ),
    boundField: staticSelector('[data-screen-bound-field="true"]'),
    fieldOption: selectorTemplate(
      ['[role="option"]:has(span:text-is("', " (", ')"))'],
      [slot(0), slot(1)]
    ),
    staticLink: staticSelector('button:text-is("Use static link")'),
    staticLinkInput: staticSelector('input[placeholder="https://…"]'),
    paragraph: staticSelector('textarea[placeholder="Paragraph text"]'),
    tabLabel: selectorTemplate(['[data-screen-tab-label="', '"]'], [slot(0)]),
    editTab: selectorTemplate(['button[aria-label="Edit content for ', '"]'], [slot(0)]),
    addTab: staticSelector('button:text-is("Add tab")'),
    runtimeTab: selectorTemplate(['[role="tab"]:text-is("', '")'], [slot(0)]),
    scopedRuntimeTab: selectorTemplate(
      ["", ' [data-screen-block-id="', '"] [role="tab"]:text-is("', '")'],
      [slot(2), slot(0), slot(1)],
      { 2: "" }
    ),
    previewRuntimeTab: selectorTemplate(
      [
        '[data-preview-shell="roomy"] [data-preview-device="desktop"] [data-screen-block-id="',
        '"] [role="tab"]:text-is("',
        '")',
      ],
      [slot(0), slot(1)]
    ),
    runtimePanel: selectorTemplate(
      ['[role="tabpanel"][data-screen-runtime-tab="', '"]'],
      [slot(0)]
    ),
    builderSave: staticSelector('button:text-is("Save")'),
    preview: staticSelector('button:text-is("Preview")'),
    previewShell: staticSelector('[data-preview-shell="roomy"] [data-preview-device="desktop"]'),
    previewClose: staticSelector('[data-preview-shell="roomy"] button[data-slot="dialog-close"]'),
    keepEditing: staticSelector('button:text-is("Keep editing")'),
    discard: staticSelector('button:text-is("Discard and continue")'),
    entrySave: staticSelector('button:text-is("Save")'),
    presentationSave: staticSelector('button:text-is("Save presentation")'),
    presentationClear: staticSelector('button:text-is("Clear selected presentation")'),
    relatedListRoot: selectorTemplate(['[data-screen-block-id="', '"]'], [slot(0)]),
    relatedRow: selectorTemplate(
      ['[data-screen-block-id="', '"] [data-screen-related-entry="', '"]'],
      [slot(0), slot(1)]
    ),
    relatedSkeletonChip: selectorTemplate(
      ['[data-screen-block-id="', '"] span:text-is("Chip")'],
      [slot(0)]
    ),
    relatedEmpty: selectorTemplate(
      ['[data-screen-block-id="', '"] p:text-is("No related ', '.")'],
      [slot(0), slot(1)]
    ),
    fieldBadge: selectorTemplate(
      ['[data-screen-block-id="', '"] [data-slot="badge"]:text-is("', '")'],
      [slot(0), slot(1)]
    ),
    relatedAlert: staticSelector(
      '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable"))'
    ),
    relatedRetry: staticSelector(
      '[role="alert"]:has([data-slot="alert-title"]:text-is("Related records unavailable")) button:text-is("Retry")'
    ),
    metadata: staticSelector('button[aria-label="Show field metadata"]'),
    browseMedia: staticSelector(
      '[data-custom-screen-entry-presentation-panel="true"] button:text-is("Browse media")'
    ),
    mediaCard: selectorTemplate(['button:has(p:text-is("', '"))'], [slot(0)]),
    relationEntry: selectorTemplate(
      ['[data-screen-block-id="', '"] button:has(p:text-is("', '"))'],
      [slot(0), slot(1)]
    ),
    contentEditable: selectorTemplate(
      ['[data-screen-block-id="', '"] [role="textbox"][aria-label="', '"]'],
      [slot(0), slot(1)]
    ),
    toneTrigger: staticSelector('[data-presentation-control="tone"] button[role="combobox"]'),
    muted: staticSelector('[role="option"]:text-is("Muted")'),
    recordsLink: selectorTemplate(
      ['a[href="/admin/advanced/custom-screens/', '/entries"]'],
      [slot(0)]
    ),
    recordActions: staticSelector('button[aria-label="Record actions"]'),
    editRecord: staticSelector('[role="menuitem"]:text-is("Edit record")'),
    builderLink: selectorTemplate(['a[href="/admin/advanced/custom-screens/', '"]'], [slot(0)]),
    userMenu: selectorTemplate(
      ['header button:has(span.block.text-sm:text-is("', '"))'],
      [slot(0)]
    ),
    bootstrapUserMenu: staticSelector(
      'header button[data-slot="dropdown-menu-trigger"]:has(span.block.text-sm)'
    ),
    signOut: staticSelector('[role="menuitem"]:text-is("Sign out")'),
    colorMode: staticSelector('button[aria-label="Toggle dark mode"]'),
    panelHide: staticSelector('button[aria-label="Hide panel"][aria-pressed="true"]'),
    panelShow: staticSelector('button[aria-label="Show panel"][aria-pressed="false"]'),
    canvasScroller: staticSelector('[data-screen-editor-canvas-scroller="true"]'),
    editorPanel: staticSelector('[data-screen-editor-panel="true"][role="region"]'),
    secondTabTitle: staticSelector('textarea[placeholder="Enter post title..."]'),
    secondTabSave: staticSelector('button:text-is("Save draft")'),
  });
}

function buildFixtureBlueprint(nonce) {
  const NONCE = nonce;
  const PREFIX = `wf540-${NONCE}`;
  const capture = (name) => Object.freeze({ capture: name });
  const runtimeBlock = (name, expectedType) =>
    Object.freeze({ captureNewBlock: name, expectedType });
  return deepFreezeExact({
    schemaVersion: 1,
    fixturePrefix: PREFIX,
    origins: {
      admin: "http://coderso-a.localhost:5173",
      front: "http://coderso-a.localhost:3000",
      routeBacking: "http://127.0.0.1:5173",
    },
    userAgents: {
      browser: `${PREFIX}-browser`,
      publicPreflight: `${PREFIX}-public-preflight`,
      apiBootstrap: `${PREFIX}-api-bootstrap`,
      apiUserA: `${PREFIX}-api-user-a`,
    },
    paths: {
      login: "/admin/login",
      screens: "/admin/advanced/custom-screens",
      builder: { template: "/admin/advanced/custom-screens/{screen.id}", captures: ["screen.id"] },
      records: {
        template: "/admin/advanced/custom-screens/{screen.id}/entries",
        captures: ["screen.id"],
      },
      entry: {
        template: "/admin/advanced/custom-screens/{screen.id}/entries/{entry.id}",
        captures: ["screen.id", "entry.id"],
      },
      retryEntry: {
        template: "/admin/advanced/custom-screens/{retry-screen.id}/entries/{entry.id}",
        captures: ["retry-screen.id", "entry.id"],
      },
      relatedEntryA1Editor: {
        template: `/admin/advanced/entries/${PREFIX}-related-a/{related-entry-a1.id}`,
        captures: ["related-entry-a1.id"],
      },
      safeFront: `http://coderso-a.localhost:3000/#${PREFIX}-safe`,
      nestedHash: `#${PREFIX}-nested`,
    },
    users: {
      bootstrap: { emailEnv: "ADMIN_EMAIL", passwordEnv: "ADMIN_PASSWORD" },
      a: {
        id: capture("user-a.id"),
        email: `wf540-a-${NONCE}@example.test`,
        displayName: `WF540 User A ${NONCE}`,
        passwordEnv: "ADMIN_PASSWORD",
        role: "Admin",
        preferenceBaseline: false,
        theme: "light",
      },
      b: {
        id: capture("user-b.id"),
        email: `wf540-b-${NONCE}@example.test`,
        displayName: `WF540 User B ${NONCE}`,
        passwordEnv: "ADMIN_PASSWORD",
        role: "Admin",
        preferenceBaseline: false,
        theme: "dark",
      },
    },
    contentTypes: {
      editable: {
        id: capture("content-type-editable.id"),
        name: `${PREFIX} Records`,
        slug: `${PREFIX}-records`,
        fields: [
          { id: "field-primaryUrl", name: "primaryUrl", label: "Primary URL", type: "text" },
          { id: "field-secondaryUrl", name: "secondaryUrl", label: "Secondary URL", type: "text" },
          { id: "field-headline", name: "headline", label: "Headline", type: "text" },
          { id: "field-raceImageId", name: "raceImageId", label: "Race image ID", type: "text" },
          {
            id: "field-mediaAsset",
            name: "mediaAsset",
            label: "Media asset",
            type: "media",
            media: { multiple: false, accept: ["image/*"] },
          },
          {
            id: "field-relationA",
            name: "relationA",
            label: "Related A",
            type: "relation",
            relation: { target: `${PREFIX}-related-a`, multiple: true },
          },
          {
            id: "field-relationB",
            name: "relationB",
            label: "Related B",
            type: "relation",
            relation: { target: `${PREFIX}-related-b`, multiple: true },
          },
          {
            id: "field-relationFailure",
            name: "relationFailure",
            label: "Related failure fixture",
            type: "relation",
            relation: { target: `${PREFIX}-related-failure`, multiple: true },
          },
          {
            id: "field-unrelatedNote",
            name: "unrelatedNote",
            label: "Unrelated note",
            type: "text",
          },
        ],
      },
      relatedA: {
        id: capture("content-type-related-a.id"),
        name: `${PREFIX} Related A`,
        slug: `${PREFIX}-related-a`,
        fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
      },
      relatedB: {
        id: capture("content-type-related-b.id"),
        name: `${PREFIX} Related B`,
        slug: `${PREFIX}-related-b`,
        fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
      },
      relatedFailure: {
        id: capture("content-type-related-failure.id"),
        name: `${PREFIX} Related failure`,
        slug: `${PREFIX}-related-failure`,
        fields: [{ id: "field-label", name: "label", label: "Label", type: "text" }],
      },
    },
    relatedEntries: {
      a1: {
        id: capture("related-entry-a1.id"),
        title: `${PREFIX} Related A One`,
        slug: `${PREFIX}-related-a-one`,
        updatedTitle: `${PREFIX}-related-a-updated`,
        data: { label: "A-one" },
      },
      a2: {
        id: capture("related-entry-a2.id"),
        title: `${PREFIX} Related A Two`,
        slug: `${PREFIX}-related-a-two`,
        data: { label: "A-two" },
      },
      b1: {
        id: capture("related-entry-b1.id"),
        title: `${PREFIX} Related B One`,
        slug: `${PREFIX}-related-b-one`,
        data: { label: "B-one" },
      },
      b2: {
        id: capture("related-entry-b2.id"),
        title: `${PREFIX} Related B Two`,
        slug: `${PREFIX}-related-b-two`,
        data: { label: "B-two" },
      },
      failure1: {
        id: capture("related-entry-failure1.id"),
        title: `${PREFIX} Related failure One`,
        slug: `${PREFIX}-related-failure-one`,
        data: { label: "failure-one" },
      },
    },
    media: {
      id: capture("media.id"),
      title: `${PREFIX} Safe image`,
      originalName: `${PREFIX}-safe.png`,
      mimeType: "image/png",
      uploadFixture: {
        encoding: "base64",
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        decodedSizeBytes: 68,
        sha256: "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
      },
      resolvedUrl: capture("media.resolved-url"),
      storageKey: capture("media.storage-key"),
      missingBoundMediaId: "54000000-0000-4000-8000-000000000001",
    },
    entry: {
      id: capture("entry.id"),
      title: `${PREFIX} Editable entry`,
      slug: `${PREFIX}-editable-entry`,
      baseline: {
        primaryUrl: `http://coderso-a.localhost:3000/#${PREFIX}-safe`,
        secondaryUrl: "javascript:alert(1)",
        headline: `${PREFIX} headline baseline`,
        raceImageId: "54000000-0000-4000-8000-000000000001",
        mediaAsset: capture("media.id"),
        relationA: [capture("related-entry-a1.id"), capture("related-entry-a2.id")],
        relationB: [],
        relationFailure: [capture("related-entry-failure1.id")],
        unrelatedNote: `${PREFIX} unrelated baseline`,
      },
      contentDraft: `${PREFIX} headline dirty draft`,
      presentationDraft: { tone: "muted" },
      relatedUnrelatedDraft: `${PREFIX} unrelated relation-race draft`,
      spacePhrase: "Alpha beta gamma delta",
    },
    screen: {
      id: capture("screen.id"),
      name: `${PREFIX} Entry screen`,
      status: "active",
      showInSidebar: true,
      sidebarLabel: `${PREFIX} Records`,
      mode: "editor-view",
      contentTypeId: capture("content-type-editable.id"),
      blockIds: {
        raceImage: `${PREFIX}-race-image`,
        mediaField: `${PREFIX}-media-field`,
        headlineField: `${PREFIX}-headline-field`,
        relationAField: `${PREFIX}-relation-a-field`,
        relationBField: `${PREFIX}-relation-b-field`,
        readOnlyField: `${PREFIX}-read-only-field`,
        relatedListA: `${PREFIX}-related-list-a`,
        relatedListB: `${PREFIX}-related-list-b`,
        spaceGroup: `${PREFIX}-space-group`,
        spaceNoteField: `${PREFIX}-space-note-field`,
        spaceLink: `${PREFIX}-space-link`,
      },
      definitionTemplate: {
        schemaVersion: 4,
        listView: {
          materializerId: "buildDefaultListViewDefinition",
          privateProjectionAuthorityId: "editable-content-type-detail",
        },
        editorView: {
          saveMode: "entry",
          interactionMode: "inline",
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: `${PREFIX}-section-main`,
                type: "section",
                data: {},
                blocks: [
                  {
                    id: `${PREFIX}-race-image`,
                    type: "image",
                    data: { label: `${PREFIX} race image` },
                  },
                  {
                    id: `${PREFIX}-media-field`,
                    type: "field",
                    data: { field: "mediaAsset", label: "Media asset" },
                  },
                  {
                    id: `${PREFIX}-headline-field`,
                    type: "field",
                    data: { field: "headline", label: "Headline" },
                  },
                  {
                    id: `${PREFIX}-relation-a-field`,
                    type: "field",
                    data: { field: "relationA", label: "Related A" },
                  },
                  {
                    id: `${PREFIX}-relation-b-field`,
                    type: "field",
                    data: { field: "relationB", label: "Related B" },
                  },
                  {
                    id: `${PREFIX}-related-list-a`,
                    type: "related-list",
                    data: {
                      label: "Related A",
                      target: `${PREFIX}-related-a`,
                      displayField: "title",
                      variant: "cards",
                      limit: 10,
                      field: "relationA",
                    },
                  },
                  {
                    id: `${PREFIX}-related-list-b`,
                    type: "related-list",
                    data: {
                      label: "Related B",
                      target: `${PREFIX}-related-b`,
                      displayField: "title",
                      variant: "cards",
                      limit: 10,
                      field: "relationB",
                    },
                  },
                  {
                    id: `${PREFIX}-read-only-field`,
                    type: "field",
                    data: { field: "primaryUrl", label: "Read-only URL" },
                  },
                  {
                    id: `${PREFIX}-space-group`,
                    type: "field-group",
                    data: { title: "Nested controls", description: "" },
                    slots: {
                      content: [
                        {
                          id: `${PREFIX}-space-note-field`,
                          type: "field",
                          data: { field: "unrelatedNote", label: "Unrelated note" },
                        },
                        {
                          id: `${PREFIX}-space-link`,
                          type: "button",
                          data: {
                            label: "Nested destination",
                            action: "link",
                            href: `#${PREFIX}-nested`,
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          bindings: [
            {
              id: `${PREFIX}-bind-race-image`,
              blockId: `${PREFIX}-race-image`,
              propPath: "src",
              source: "entry",
              field: "raceImageId",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-media-field`,
              blockId: `${PREFIX}-media-field`,
              propPath: "value",
              source: "entry",
              field: "mediaAsset",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-headline`,
              blockId: `${PREFIX}-headline-field`,
              propPath: "value",
              source: "entry",
              field: "headline",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-relation-a-field`,
              blockId: `${PREFIX}-relation-a-field`,
              propPath: "value",
              source: "entry",
              field: "relationA",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-relation-b-field`,
              blockId: `${PREFIX}-relation-b-field`,
              propPath: "value",
              source: "entry",
              field: "relationB",
              mode: "readwrite",
            },
            {
              id: `${PREFIX}-bind-related-a`,
              blockId: `${PREFIX}-related-list-a`,
              propPath: "items",
              source: "entry",
              field: "relationA",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-related-b`,
              blockId: `${PREFIX}-related-list-b`,
              propPath: "items",
              source: "entry",
              field: "relationB",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-read-only`,
              blockId: `${PREFIX}-read-only-field`,
              propPath: "value",
              source: "entry",
              field: "primaryUrl",
              mode: "read",
            },
            {
              id: `${PREFIX}-bind-space-note`,
              blockId: `${PREFIX}-space-note-field`,
              propPath: "value",
              source: "entry",
              field: "unrelatedNote",
              mode: "readwrite",
            },
          ],
        },
      },
    },
    retryScreen: {
      id: capture("retry-screen.id"),
      name: `${PREFIX} Retry screen`,
      status: "active",
      showInSidebar: true,
      sidebarLabel: `${PREFIX} Retry records`,
      contentTypeId: capture("content-type-editable.id"),
      relatedListBlockId: `${PREFIX}-retry-related-list-failure`,
      definitionTemplate: {
        schemaVersion: 4,
        listView: {
          materializerId: "buildDefaultListViewDefinition",
          privateProjectionAuthorityId: "editable-content-type-detail",
        },
        editorView: {
          saveMode: "entry",
          interactionMode: "inline",
          document: {
            schemaVersion: 1,
            sections: [
              {
                id: `${PREFIX}-retry-section`,
                type: "section",
                data: {},
                blocks: [
                  {
                    id: `${PREFIX}-retry-related-list-failure`,
                    type: "related-list",
                    data: {
                      label: "Related failure retry",
                      target: `${PREFIX}-related-failure`,
                      displayField: "title",
                      variant: "cards",
                      limit: 10,
                      field: "relationFailure",
                    },
                  },
                ],
              },
            ],
          },
          bindings: [
            {
              id: `${PREFIX}-retry-bind-related-failure`,
              blockId: `${PREFIX}-retry-related-list-failure`,
              propPath: "items",
              source: "entry",
              field: "relationFailure",
              mode: "read",
            },
          ],
        },
      },
    },
    paletteBlocks: {
      button: runtimeBlock("palette.button", "button"),
      image: runtimeBlock("palette.image", "image"),
      mediaField: runtimeBlock("palette.media-field", "field"),
      outerTabs: runtimeBlock("palette.outer-tabs", "tabs"),
      tabOneText: runtimeBlock("palette.tab-one-text", "text"),
      tabTwoText: runtimeBlock("palette.tab-two-text", "text"),
      tabThreeText: runtimeBlock("palette.tab-three-text", "text"),
      innerTabs: runtimeBlock("palette.inner-tabs", "tabs"),
      dirtyText: runtimeBlock("palette.dirty-text", "text"),
    },
    tabs: {
      defaults: [
        { id: "tab-1", label: "Tab 1" },
        { id: "tab-2", label: "Tab 2" },
      ],
      added: { id: "tab-3", label: "Tab 3" },
      authoredLabels: { "tab-1": "Overview", "tab-2": "Details", "tab-3": "History" },
      text: {
        "tab-1": `${PREFIX} overview text`,
        "tab-2": `${PREFIX} details text`,
        "tab-3": `${PREFIX} history text`,
      },
    },
    overrides: {
      directImageSafe: [{ blockId: `${PREFIX}-race-image`, mediaAssetId: capture("media.id") }],
      directImageCleared: [],
    },
    routes: {
      "media-prior-resolution": { method: "GET", pattern: "/admin/api/media", kind: "delayed" },
      "entry-save-failure": {
        method: "PATCH",
        pattern: {
          template: `/admin/api/content/${PREFIX}-records/entries/{entry.id}`,
          captures: ["entry.id"],
        },
        kind: "malformed",
      },
      "related-first-failure": {
        method: "GET",
        pattern: `/admin/api/content/${PREFIX}-related-failure/entries`,
        kind: "malformed",
      },
      "related-a-refresh": {
        method: "GET",
        pattern: `/admin/api/content/${PREFIX}-related-a/entries`,
        kind: "delayed",
      },
      "preference-a-read-refresh": {
        method: "GET",
        pattern: "/admin/api/user-settings/customScreens.entry.preferences",
        kind: "delayed",
      },
      "preference-a-write-exit": {
        method: "PATCH",
        pattern: "/admin/api/user-settings/customScreens.entry.preferences",
        kind: "delayed",
      },
    },
    screenshotPaths: REQUIRED_SCREENSHOT_PATHS,
  });
}

function collectTaggedReferences(value, key, output = []) {
  if (!value || typeof value !== "object") return output;
  const keys = Reflect.ownKeys(value);
  if (keys.includes(key) && typeof value[key] === "string") output.push(value[key]);
  for (const childKey of keys) {
    if (childKey !== key) collectTaggedReferences(value[childKey], key, output);
  }
  return output;
}

function validateFixtureBlueprint(blueprint) {
  exactKeys(
    blueprint,
    [
      "schemaVersion",
      "fixturePrefix",
      "origins",
      "userAgents",
      "paths",
      "users",
      "contentTypes",
      "relatedEntries",
      "media",
      "entry",
      "screen",
      "retryScreen",
      "paletteBlocks",
      "tabs",
      "overrides",
      "routes",
      "screenshotPaths",
    ],
    "fixture blueprint"
  );
  assertClosedDataTree(blueprint, "fixture blueprint");
  const prefixMatch = /^wf540-([a-f0-9]{12})$/u.exec(blueprint.fixturePrefix);
  invariant(prefixMatch !== null, "fixture prefix drift");
  const canonicalBlueprint = buildFixtureBlueprint(prefixMatch[1]);
  invariant(
    JSON.stringify(blueprint) === JSON.stringify(canonicalBlueprint),
    "fixture blueprint recursively rejects unknown or altered values"
  );
  invariant(blueprint.schemaVersion === 1, "fixture schema version drift");
  invariant(
    sameSet(Object.keys(blueprint.contentTypes), [
      "editable",
      "relatedA",
      "relatedB",
      "relatedFailure",
    ]),
    "content-type blueprint drift"
  );
  invariant(
    sameSet(
      blueprint.contentTypes.editable.fields.map(({ name }) => name),
      [
        "primaryUrl",
        "secondaryUrl",
        "headline",
        "raceImageId",
        "mediaAsset",
        "relationA",
        "relationB",
        "relationFailure",
        "unrelatedNote",
      ]
    ),
    "editable field blueprint drift"
  );
  invariant(
    sameSet(Object.keys(blueprint.relatedEntries), ["a1", "a2", "b1", "b2", "failure1"]),
    "related-entry blueprint drift"
  );
  invariant(
    sameSet(Object.keys(blueprint.routes), REQUIRED_ROUTE_KEYS),
    "route-key blueprint drift"
  );
  invariant(
    sameSet(blueprint.screenshotPaths, REQUIRED_SCREENSHOT_PATHS),
    "screenshot blueprint drift"
  );
  invariant(
    sameSet([...new Set(collectTaggedReferences(blueprint, "capture"))], REQUIRED_CAPTURE_NAMES),
    "fixture capture-reference drift"
  );
  invariant(
    sameSet(
      [...new Set(collectTaggedReferences(blueprint, "captureNewBlock"))],
      REQUIRED_RUNTIME_BLOCK_CAPTURES
    ),
    "runtime block-reference drift"
  );
  invariant(
    new Set(Object.values(blueprint.userAgents)).size === 4,
    "smoke User-Agent values must be unique"
  );
  for (const descriptor of [
    blueprint.screen.definitionTemplate.listView,
    blueprint.retryScreen.definitionTemplate.listView,
  ]) {
    exactKeys(
      descriptor,
      ["materializerId", "privateProjectionAuthorityId"],
      "private list-view materializer"
    );
    invariant(
      descriptor.materializerId === "buildDefaultListViewDefinition" &&
        descriptor.privateProjectionAuthorityId === "editable-content-type-detail",
      "private list-view materializer drift"
    );
  }
  const uploadFixture = blueprint.media.uploadFixture;
  exactKeys(
    uploadFixture,
    ["encoding", "data", "decodedSizeBytes", "sha256"],
    "media upload fixture"
  );
  const decodedPng = Buffer.from(uploadFixture.data, "base64");
  invariant(
    uploadFixture.encoding === "base64" &&
      decodedPng.toString("base64") === uploadFixture.data &&
      uploadFixture.decodedSizeBytes === 68 &&
      decodedPng.length === 68 &&
      decodedPng.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" &&
      createHash("sha256").update(decodedPng).digest("hex") === uploadFixture.sha256 &&
      uploadFixture.sha256 === "431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460",
    "canonical PNG upload fixture drift"
  );
  invariant(
    blueprint.screenshotPaths.every((relativePath) =>
      /^_docs\/_workflows\/_smoke\/task-540-[a-z0-9-]+\.png$/u.test(relativePath)
    ),
    "canonical screenshot path drift"
  );
}

function expandCleanupActions(acquiredSubjects) {
  invariant(Array.isArray(acquiredSubjects), "cleanup subjects must be an array");
  const seen = new Set();
  const actions = [];
  for (const subject of acquiredSubjects) {
    exactKeys(subject, ["kind", "id"], "cleanup subject");
    invariant(
      REQUIRED_FIXTURE_SUBJECT_KEYS.includes(subject.kind) &&
        typeof subject.id === "string" &&
        subject.id.length > 0 &&
        subject.id.length <= 240,
      "cleanup subject is invalid"
    );
    const subjectKey = subject.kind + ":" + subject.id;
    invariant(!seen.has(subjectKey), "cleanup subject must be unique");
    seen.add(subjectKey);
    for (const operation of ["cleanup-provenance", "cleanup-delete", "cleanup-absence"]) {
      actions.push(
        deepFreezeExact({
          id: operation + ":" + subjectKey,
          operation,
          subjectKind: subject.kind,
          subjectIdentifier: subject.id,
        })
      );
    }
  }
  invariant(actions.length === acquiredSubjects.length * 3, "cleanup expansion drift");
  return Object.freeze(actions);
}

function assertOrderedActionIds(manifest, ids, label) {
  let prior = -1;
  for (const id of ids) {
    const index = manifest.findIndex((action) => action.id === id);
    invariant(index > prior, label + " action order drift at " + id);
    prior = index;
  }
}

function executableRefs(executable) {
  return Object.hasOwn(executable, "refs") ? executable.refs : [];
}

function validateExecutableShape(action) {
  const executable = action.executable;
  invariant(
    executable && typeof executable === "object" && !Array.isArray(executable),
    action.id + " executable must be an object"
  );
  const expectedKeys = EXECUTABLE_KEYS_BY_TYPE[executable.type];
  invariant(expectedKeys !== undefined, action.id + " executable type is unknown");
  exactKeys(executable, expectedKeys, action.id + " executable");
  const refs = executableRefs(executable);
  invariant(Array.isArray(refs), action.id + " executable refs must be an array");
  if (executable.type === "runtime-operation") {
    invariant(
      executable.operationId === "runtime/" + action.id &&
        RUNTIME_BUILDER_KINDS.includes(action.kind) &&
        refs.flatMap((ref) => collectRefDescriptors(ref)).every(({ op }) => op !== "secret"),
      action.id + " runtime executable drift"
    );
  } else if (executable.type === "browser-run-code") {
    invariant(
      executable.sourceId === "run-code/" + action.id &&
        !RUNTIME_BUILDER_KINDS.includes(action.kind) &&
        !REQUIRED_NATIVE_ACTION_IDS.includes(action.id) &&
        action.kind !== "screen" &&
        !REQUIRED_GLOBAL_LIST_ACTION_IDS.includes(action.id) &&
        refs.flatMap((ref) => collectRefDescriptors(ref)).every(({ op }) => op !== "secret"),
      action.id + " run-code executable drift"
    );
  } else if (executable.type === "browser-native") {
    invariant(
      REQUIRED_NATIVE_ACTION_IDS.includes(action.id) &&
        BROWSER_NATIVE_OPERATION_IDS.includes(executable.operationId) &&
        executable.operationId === nativeOperationIdForAction(action.id),
      action.id + " native executable drift"
    );
    const secretRefs = refs.filter(({ op }) => op === "secret");
    invariant(
      (executable.operationId === "fill-secret" && secretRefs.length === 1 && refs.length === 2) ||
        (executable.operationId !== "fill-secret" && secretRefs.length === 0),
      action.id + " native secret placement drift"
    );
    const recursiveSecrets = refs
      .flatMap((ref) => collectRefDescriptors(ref))
      .filter(({ op }) => op === "secret");
    invariant(
      recursiveSecrets.length === secretRefs.length,
      action.id + " nested native secret Ref drift"
    );
    if (executable.operationId === "fill-secret") {
      const expectedSelector = action.id === "set-009-login-email" ? "loginEmail" : "loginPassword";
      const expectedSecret = action.id === "set-009-login-email" ? "ADMIN_EMAIL" : "ADMIN_PASSWORD";
      invariant(
        refs[0]?.op === "selector" &&
          refs[0].templateId === expectedSelector &&
          refs[0].args.length === 0 &&
          refs[1]?.op === "secret" &&
          refs[1].name === expectedSecret,
        action.id + " native fill selector/secret identity drift"
      );
    }
  } else if (executable.type === "browser-screenshot") {
    invariant(
      action.kind === "screen" &&
        executable.screenshotId === "screenshot/" + action.id &&
        executable.fullPage === true,
      action.id + " screenshot executable drift"
    );
  } else {
    invariant(
      executable.type === "browser-global-list" &&
        REQUIRED_GLOBAL_LIST_ACTION_IDS.includes(action.id),
      action.id + " global-list executable drift"
    );
  }
  invariant(
    typeof action.outputSchemaId === "string" && action.outputSchemaId.length > 0,
    action.id + " output schema ID is invalid"
  );
  exactKeys(
    action.repositoryMutationPolicy,
    ["mode", "paths"],
    action.id + " repository mutation policy"
  );
  invariant(
    (action.repositoryMutationPolicy.mode === "none" &&
      action.repositoryMutationPolicy.paths.length === 0) ||
      (executable.type === "browser-screenshot" &&
        action.repositoryMutationPolicy.mode === "allowlist" &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        REQUIRED_SCREENSHOT_PATHS.includes(action.repositoryMutationPolicy.paths[0])),
    action.id + " repository mutation policy drift"
  );
}

function canonicalContractJson(value) {
  const normalize = (candidate) => {
    if (candidate === null || typeof candidate !== "object") return candidate;
    if (Array.isArray(candidate)) return candidate.map(normalize);
    return Object.fromEntries(
      Object.keys(candidate)
        .sort()
        .map((key) => [key, normalize(candidate[key])])
    );
  };
  return JSON.stringify(normalize(value));
}

function deriveAuthRateProducerActionIds(manifest) {
  const conditionalProducerIds = new Set(Object.keys(AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.producers));
  const conditionalCachedIds = new Set(Object.keys(AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.cached));
  const conditionalIds = new Set([...conditionalProducerIds, ...conditionalCachedIds]);
  invariant(
    conditionalIds.size === conditionalProducerIds.size + conditionalCachedIds.size,
    "conditional CSRF classifications must be disjoint"
  );

  const manifestIds = new Set(manifest.map(({ id }) => id));
  invariant(
    conditionalIds.size > 0 && [...conditionalIds].every((id) => manifestIds.has(id)),
    "conditional CSRF classification/manifest drift"
  );

  const producerIds = new Set();
  const seenConditionalIds = new Set();
  for (const action of manifest) {
    const conditionalBuilder =
      AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.producers[action.id] ??
      AUTH_RATE_CONDITIONAL_CSRF_ACTIONS.cached[action.id];
    if (conditionalBuilder !== undefined) {
      invariant(
        action.kind === "click" && action.builder === conditionalBuilder,
        action.id + " conditional CSRF signature drift"
      );
      seenConditionalIds.add(action.id);
    }
    if (action.builder === "click(S.entrySave)" || action.builder === "click(S.metadata)") {
      invariant(
        conditionalBuilder !== undefined,
        action.id + " lacks an explicit conditional CSRF classification"
      );
    }
    if (
      AUTH_RATE_ALWAYS_PRODUCER_KINDS.includes(action.kind) ||
      AUTH_RATE_ALWAYS_PRODUCER_BUILDERS.includes(action.builder) ||
      conditionalProducerIds.has(action.id)
    ) {
      producerIds.add(action.id);
    }
  }
  invariant(
    seenConditionalIds.size === conditionalIds.size,
    "conditional CSRF classification coverage drift"
  );
  return producerIds;
}

function assertAuthRateProducerCoverage(manifest, costsByAction) {
  const producerActionIds = deriveAuthRateProducerActionIds(manifest);
  const costActionIds = new Set(Object.keys(costsByAction));
  invariant(
    sameSet([...producerActionIds], [...costActionIds]),
    "auth rate producer classification/cost ledger drift"
  );
}

function computeAuthRatePlan(manifest, costsByAction = AUTH_RATE_COSTS_BY_ACTION) {
  assertAuthRateProducerCoverage(manifest, costsByAction);
  const costActionIds = new Set(Object.keys(costsByAction));
  const seenCostActionIds = new Set();
  const epochs = [];
  let current = new Map();
  const closeEpoch = (endsAtBarrierActionId) => {
    const maximumRequestsByIdentity = Object.fromEntries(
      [...current.entries()].sort(([left], [right]) => left.localeCompare(right))
    );
    invariant(
      Object.keys(maximumRequestsByIdentity).length > 0,
      "auth rate epoch may not be empty"
    );
    epochs.push({ endsAtBarrierActionId, maximumRequestsByIdentity });
    current = new Map();
  };
  for (const action of manifest) {
    const costs = costsByAction[action.id];
    if (costs !== undefined) {
      seenCostActionIds.add(action.id);
      for (const [identity, count] of Object.entries(costs)) {
        invariant(
          Number.isSafeInteger(count) && count >= 1,
          action.id + " auth rate action cost drift"
        );
        current.set(identity, (current.get(identity) ?? 0) + count);
      }
    }
    if (action.kind === "authRateWindowBarrier") closeEpoch(action.id);
  }
  closeEpoch(null);
  invariant(
    costActionIds.size === seenCostActionIds.size &&
      [...costActionIds].every((id) => seenCostActionIds.has(id)),
    "auth rate action cost registry/manifest drift"
  );
  return deepFreezeExact({
    epochs,
    requiredEnabledMaxRequests: 10,
    requiredEnabledWindowSecondsMin: 1,
    requiredEnabledWindowSecondsMax: 60,
  });
}

function validateManifest(manifest) {
  invariant(manifest.length === REQUIRED_ACTION_COUNT, "expected 496 actions");
  const ids = manifest.map(({ id }) => id);
  invariant(new Set(ids).size === ids.length, "action IDs must be unique");
  const seen = new Set();
  const scenarioCounts = Object.create(null);
  const assertions = [];
  const builderKindCounts = Object.create(null);
  const executableTypeCounts = Object.create(null);
  let routeState = "absent";
  for (const [index, action] of manifest.entries()) {
    exactKeys(action, ACTION_KEYS, action.id);
    validateExecutableShape(action);
    executableTypeCounts[action.executable.type] =
      (executableTypeCounts[action.executable.type] ?? 0) + 1;
    invariant(action.ordinal === index + 1, action.id + " has a non-dense ordinal");
    for (const dependency of action.assertionDependencies) {
      invariant(
        seen.has(dependency),
        action.id + " has a missing or future dependency " + dependency
      );
    }
    seen.add(action.id);
    scenarioCounts[action.scenario] = (scenarioCounts[action.scenario] ?? 0) + 1;
    builderKindCounts[action.kind] = (builderKindCounts[action.kind] ?? 0) + 1;
    const assertion = parseAssertionName(action.builder);
    if (assertion !== null) assertions.push(assertion);
    if (action.routeStateBefore !== "absent" || action.routeStateAfter !== "absent") {
      if (action.routeStateBefore !== "all terminal") {
        invariant(
          action.routeStateBefore === routeState,
          action.id + " route state is discontinuous"
        );
      }
      routeState = action.routeStateAfter;
    }
  }
  invariant(routeState === "absent", "route state must terminate absent");
  invariant(
    canonicalContractJson(computeAuthRatePlan(manifest)) ===
      canonicalContractJson(REQUIRED_AUTH_RATE_PLAN),
    "auth rate action ledger/epoch plan drift"
  );
  invariant(scenarioCounts.setup === REQUIRED_SETUP_ACTION_COUNT, "setup count drift");
  invariant(scenarioCounts.cleanup === REQUIRED_TERMINAL_ACTION_COUNT, "cleanup count drift");
  for (const scenario of REQUIRED_SCENARIOS) {
    invariant(
      scenarioCounts[scenario] === REQUIRED_FLOW_ACTION_COUNTS[scenario],
      scenario + " count drift"
    );
  }
  invariant(
    REQUIRED_SCENARIOS.reduce((total, scenario) => total + scenarioCounts[scenario], 0) ===
      REQUIRED_FLOW_ACTION_COUNT,
    "flow action count drift"
  );
  const requiredAssertions = Object.values(REQUIRED_SMOKE_ASSERTIONS).flat();
  invariant(sameSet(assertions, requiredAssertions), "exact 55-name assertion universe drift");
  invariant(assertions.length === 55, "assertion count drift");
  invariant(
    !assertions.includes("media-get-count-before-release") &&
      !assertions.includes("media-get-count-after-release"),
    "media count operations must not be assertions"
  );
  invariant(
    manifest.some(({ builder }) => builder === "media-count-before-release") &&
      manifest.some(({ builder }) => builder === "media-count-after-release"),
    "media count operations are missing"
  );
  invariant(
    manifest.filter(({ kind }) => kind === "logs").length === 7 * 3 * 2,
    "aggregate/per-page log action cardinality drift"
  );
  invariant(
    sameSet(Object.values(FIXTURE_CAPTURE_BY_ACTION).flat(), REQUIRED_CAPTURE_NAMES),
    "fixture single-assignment capture map drift"
  );
  invariant(
    sameSet(Object.keys(FIXTURE_SUBJECT_CAPTURE), REQUIRED_FIXTURE_SUBJECT_KEYS) &&
      Object.values(FIXTURE_SUBJECT_CAPTURE).every((name) => REQUIRED_CAPTURE_NAMES.includes(name)),
    "fixture subject/capture identity map drift"
  );
  invariant(
    sameSet(Object.values(RUNTIME_CAPTURE_BY_ACTION).flat(), REQUIRED_RUNTIME_BLOCK_CAPTURES),
    "runtime single-assignment capture map drift"
  );
  for (const [id, captureNames] of Object.entries({
    ...FIXTURE_CAPTURE_BY_ACTION,
    ...RUNTIME_CAPTURE_BY_ACTION,
  })) {
    const action = manifest.find((candidate) => candidate.id === id);
    invariant(action !== undefined, "capture owner action is missing: " + id);
    invariant(
      captureNames.length === new Set(captureNames).size,
      id + " capture output is duplicated"
    );
  }
  assertOrderedActionIds(manifest, REQUIRED_ISOLATED_API_ACTION_IDS, "isolated API");
  assertOrderedActionIds(manifest, REQUIRED_SIGNOUT_SETTLEMENT_IDS, "sign-out settlement");
  const authRateBarrierIds = REQUIRED_AUTH_RATE_PLAN.epochs.flatMap(({ endsAtBarrierActionId }) =>
    endsAtBarrierActionId === null ? [] : [endsAtBarrierActionId]
  );
  assertOrderedActionIds(manifest, authRateBarrierIds, "auth rate barrier");
  invariant(
    authRateBarrierIds.every(
      (id) => manifest.find((action) => action.id === id)?.kind === "authRateWindowBarrier"
    ) &&
      REQUIRED_AUTH_RATE_PLAN.epochs.at(-1)?.endsAtBarrierActionId === null &&
      REQUIRED_AUTH_RATE_PLAN.epochs
        .slice(0, -1)
        .every(({ endsAtBarrierActionId }) => typeof endsAtBarrierActionId === "string") &&
      REQUIRED_AUTH_RATE_PLAN.epochs.every(({ maximumRequestsByIdentity }) =>
        Object.values(maximumRequestsByIdentity).every(
          (count) =>
            Number.isSafeInteger(count) &&
            count >= 1 &&
            count <= REQUIRED_AUTH_RATE_PLAN.requiredEnabledMaxRequests
        )
      ),
    "auth rate barrier action kind drift"
  );
  for (const [id, expectedValue] of Object.entries(REQUIRED_METADATA_STATE_VALUES)) {
    const action = manifest.find((candidate) => candidate.id === id);
    invariant(action !== undefined, "metadata-state action is missing: " + id);
    invariant(
      action.captureOutput.includes(String(expectedValue)) ||
        action.postcondition.includes(String(expectedValue)),
      id + " does not bind its required metadata value"
    );
  }
  invariant(
    MAX_PREFERENCE_UNMOUNT_WINDOW_MS < SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
    "preference remount window must remain below retention"
  );
  invariant(
    sameSet(Object.keys(builderKindCounts), Object.keys(REQUIRED_BUILDER_KIND_COUNTS)) &&
      Object.entries(REQUIRED_BUILDER_KIND_COUNTS).every(
        ([kind, count]) => builderKindCounts[kind] === count
      ),
    "builder registry/count drift"
  );
  invariant(
    sameSet(Object.keys(executableTypeCounts), Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS)) &&
      Object.entries(REQUIRED_EXECUTABLE_TYPE_COUNTS).every(
        ([type, count]) => executableTypeCounts[type] === count
      ),
    "executable type/count drift"
  );
}

function assertOrderedTransitions(manifest, transitions, label) {
  let priorIndex = -1;
  let state = transitions[0]?.from;
  for (const transition of transitions) {
    exactKeys(transition, ["actionId", "from", "to"], label + " transition");
    const index = manifest.findIndex(({ id }) => id === transition.actionId);
    invariant(index > priorIndex, label + " transition order drift at " + transition.actionId);
    invariant(
      transition.from === state,
      label + " transition discontinuity at " + transition.actionId
    );
    priorIndex = index;
    state = transition.to;
  }
  return state;
}

function validateStateMachines(manifest) {
  const scenarioOrder = [];
  for (const { scenario } of manifest) {
    if (scenarioOrder.at(-1) !== scenario) scenarioOrder.push(scenario);
  }
  invariant(
    sameSet(scenarioOrder, ["setup", ...REQUIRED_SCENARIOS, "cleanup"]) &&
      scenarioOrder.every(
        (scenario, index) => scenario === ["setup", ...REQUIRED_SCENARIOS, "cleanup"][index]
      ),
    "top-level scenario state-machine drift"
  );

  const themeToggles = manifest.filter(
    ({ kind, builder }) => kind === "click" && builder === "click(S.colorMode)"
  );
  invariant(themeToggles.length === THEME_STATE_TRANSITIONS.length, "theme toggle count drift");
  let themeState = "light";
  let priorThemeIndex = manifest.findIndex(({ id }) => id === "bi-001-light-proof");
  invariant(priorThemeIndex >= 0, "initial light proof is missing");
  for (const transition of THEME_STATE_TRANSITIONS) {
    exactKeys(transition, ["actionId", "proofActionId", "from", "to"], "theme transition");
    const actionIndex = manifest.findIndex(({ id }) => id === transition.actionId);
    const proofIndex = manifest.findIndex(({ id }) => id === transition.proofActionId);
    invariant(
      actionIndex > priorThemeIndex && proofIndex > actionIndex,
      "theme proof order drift at " + transition.actionId
    );
    invariant(
      manifest[actionIndex].builder === "click(S.colorMode)" && transition.from === themeState,
      "theme transition drift at " + transition.actionId
    );
    themeState = transition.to;
    priorThemeIndex = proofIndex;
  }
  invariant(themeState === "light", "theme machine must terminate light");

  const pageTerminal = assertOrderedTransitions(manifest, PAGE_STATE_TRANSITIONS, "page");
  invariant(pageTerminal === "closed", "page machine must terminate closed");
  const authTerminal = assertOrderedTransitions(manifest, AUTH_STATE_TRANSITIONS, "auth");
  invariant(authTerminal === "user-a", "auth machine must end in user A before final cleanup");

  for (const [key, machine] of Object.entries(ROUTE_STATE_MACHINES)) {
    const actions = manifest.filter(({ kind, builder }) => {
      if (kind !== "route") return false;
      return parseBuilderAst(builder).args[0] === key;
    });
    invariant(actions.length === machine.operations.length, key + " route operation count drift");
    for (const [index, action] of actions.entries()) {
      const ast = parseBuilderAst(action.builder);
      invariant(ast.args[1] === machine.operations[index], key + " route operation order drift");
      invariant(
        action.routeStateBefore === machine.states[index] &&
          action.routeStateAfter === machine.states[index + 1],
        key + " route transition drift at " + action.id
      );
    }
  }
}

function createRouteRegistry(fixtureBlueprint) {
  const registry = Object.create(null);
  for (const [key, machine] of Object.entries(ROUTE_STATE_MACHINES)) {
    invariant(Object.hasOwn(fixtureBlueprint.routes, key), "fixture route is missing: " + key);
    registry[key] = deepFreezeExact({
      mode: machine.mode,
      method: machine.method,
      operations: machine.operations,
      states: machine.states,
      fixture: fixtureBlueprint.routes[key],
    });
  }
  return deepFreezeExact(registry);
}

function createStateMachineRegistry() {
  return deepFreezeExact({
    topLevel: {
      initial: "stopped",
      orderedStates: ["setup", ...REQUIRED_SCENARIOS, "cleanup"],
      terminal: "evidence-sealed",
    },
    page: {
      initial: "closed",
      transitions: PAGE_STATE_TRANSITIONS,
      terminal: "closed",
    },
    auth: {
      initial: "anonymous",
      transitions: AUTH_STATE_TRANSITIONS,
      terminalBeforeCleanup: "user-a",
    },
    theme: {
      initial: "light",
      transitions: THEME_STATE_TRANSITIONS,
      terminal: "light",
    },
    routes: ROUTE_STATE_MACHINES,
  });
}

function publicOutputContract(contract, label) {
  exactKeys(contract, ["grammar", "schema", "predicate", "rememberAs"], label);
  return deepFreezeExact({
    grammar: contract.grammar,
    schema: contract.schema,
    predicate: contract.predicate,
    rememberAs: contract.rememberAs,
  });
}

function publicOutputRegistry(registry, label) {
  return deepFreezeExact(
    Object.fromEntries(
      Object.entries(registry).map(([id, contract]) => [
        id,
        publicOutputContract(contract, label + "." + id),
      ])
    )
  );
}

function assertUniqueRegistryEntries(entries, label) {
  invariant(Array.isArray(entries), label + " entries must be an array");
  const keys = entries.map(([key]) => key);
  invariant(new Set(keys).size === keys.length, label + " contains a duplicate key");
}

function validateExecutableRegistryProjection(registries, manifest) {
  exactKeys(
    registries,
    ["runtimeOperations", "browserRunCodeSources", "browserNativeOperations", "screenshotPaths"],
    "executable registries"
  );
  assertClosedDataTree(registries, "executable registries");
  invariant(
    Object.getPrototypeOf(registries) === Object.prototype,
    "executable registry container must be plain"
  );
  for (const registryName of [
    "runtimeOperations",
    "browserRunCodeSources",
    "browserNativeOperations",
    "screenshotPaths",
  ]) {
    invariant(
      [Object.prototype, null].includes(Object.getPrototypeOf(registries[registryName])),
      registryName + " registry prototype drift"
    );
  }
  const expectedKeys = {
    runtimeOperations: manifest
      .filter(({ executable }) => executable.type === "runtime-operation")
      .map(({ executable }) => executable.operationId),
    browserRunCodeSources: manifest
      .filter(({ executable }) => executable.type === "browser-run-code")
      .map(({ executable }) => executable.sourceId),
  };
  for (const registryName of ["runtimeOperations", "browserRunCodeSources"]) {
    const keys = Object.keys(registries[registryName]);
    invariant(sameSet(keys, expectedKeys[registryName]), registryName + " manifest set drift");
    const keySha256 = createHash("sha256").update(JSON.stringify(keys)).digest("hex");
    invariant(
      keySha256 === EXECUTABLE_REGISTRY_KEY_SHA256[registryName],
      registryName + " physical key drift: " + keySha256
    );
  }
  for (const action of manifest) {
    const executable = action.executable;
    if (executable.type === "runtime-operation") {
      const descriptor = registries.runtimeOperations[executable.operationId];
      invariant(
        Object.getPrototypeOf(descriptor) === Object.prototype,
        executable.operationId + " descriptor prototype drift"
      );
      exactKeys(descriptor, ["actionId", "refCount"], executable.operationId);
      invariant(
        descriptor.actionId === action.id && descriptor.refCount === executable.refs.length,
        executable.operationId + " descriptor/action Ref drift"
      );
    } else if (executable.type === "browser-run-code") {
      const descriptor = registries.browserRunCodeSources[executable.sourceId];
      invariant(
        Object.getPrototypeOf(descriptor) === Object.prototype,
        executable.sourceId + " descriptor prototype drift"
      );
      exactKeys(descriptor, ["actionId", "refCount"], executable.sourceId);
      invariant(
        descriptor.actionId === action.id && descriptor.refCount === executable.refs.length,
        executable.sourceId + " descriptor/action Ref drift"
      );
    }
  }
  invariant(
    sameSet(Object.keys(registries.browserNativeOperations), BROWSER_NATIVE_OPERATION_IDS),
    "native registry key drift"
  );
  for (const operationId of BROWSER_NATIVE_OPERATION_IDS) {
    const descriptor = registries.browserNativeOperations[operationId];
    invariant(
      Object.getPrototypeOf(descriptor) === Object.prototype,
      operationId + " native descriptor prototype drift"
    );
    exactKeys(descriptor, ["operationId", "actionIds"], operationId + " native descriptor");
    invariant(
      descriptor.operationId === operationId &&
        JSON.stringify(descriptor.actionIds) ===
          JSON.stringify(
            manifest
              .filter(
                ({ executable }) =>
                  executable.type === "browser-native" && executable.operationId === operationId
              )
              .map(({ id }) => id)
          ),
      operationId + " native action mapping drift"
    );
  }
  invariant(
    JSON.stringify(registries.screenshotPaths) ===
      JSON.stringify(
        Object.fromEntries(
          Object.values(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID).map(({ screenshotId, path }) => [
            screenshotId,
            path,
          ])
        )
      ),
    "screenshot registry literal mapping drift"
  );
}

function createExecutableRegistries(manifest) {
  const runtimeOperations = Object.create(null);
  const browserRunCodeSources = Object.create(null);
  const browserNativeOperations = Object.create(null);
  const screenshotPaths = Object.create(null);
  invariant(
    sameSet(
      manifest
        .filter(({ executable }) => executable.type === "browser-screenshot")
        .map(({ id }) => id),
      Object.keys(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID)
    ),
    "screenshot action/descriptor key drift"
  );
  for (const operationId of BROWSER_NATIVE_OPERATION_IDS) {
    browserNativeOperations[operationId] = deepFreezeExact({
      operationId,
      actionIds: manifest
        .filter(
          ({ executable }) =>
            executable.type === "browser-native" && executable.operationId === operationId
        )
        .map(({ id }) => id),
    });
  }
  for (const action of manifest) {
    const { executable } = action;
    if (executable.type === "runtime-operation") {
      invariant(
        !Object.hasOwn(runtimeOperations, executable.operationId),
        "duplicate runtime operation"
      );
      runtimeOperations[executable.operationId] = deepFreezeExact({
        actionId: action.id,
        refCount: executable.refs.length,
      });
    } else if (executable.type === "browser-run-code") {
      invariant(
        !Object.hasOwn(browserRunCodeSources, executable.sourceId),
        "duplicate run-code source"
      );
      browserRunCodeSources[executable.sourceId] = deepFreezeExact({
        actionId: action.id,
        refCount: executable.refs.length,
      });
    }
  }
  for (const descriptor of Object.values(SCREENSHOT_DESCRIPTOR_BY_ACTION_ID)) {
    invariant(!Object.hasOwn(screenshotPaths, descriptor.screenshotId), "duplicate screenshot ID");
    screenshotPaths[descriptor.screenshotId] = descriptor.path;
  }
  for (const action of manifest.filter(
    ({ executable }) => executable.type === "browser-screenshot"
  )) {
    const descriptor = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    invariant(
      action.executable.screenshotId === descriptor.screenshotId &&
        action.repositoryMutationPolicy.paths.length === 1 &&
        action.repositoryMutationPolicy.paths[0] === descriptor.path &&
        screenshotPaths[descriptor.screenshotId] === descriptor.path,
      action.id + " screenshot descriptor mapping drift"
    );
  }
  invariant(Object.keys(runtimeOperations).length === 76, "runtime registry cardinality drift");
  invariant(
    Object.keys(browserRunCodeSources).length === 392,
    "run-code registry cardinality drift"
  );
  invariant(Object.keys(browserNativeOperations).length === 7, "native registry cardinality drift");
  invariant(Object.keys(screenshotPaths).length === 13, "screenshot registry cardinality drift");
  invariant(
    sameSet(Object.values(screenshotPaths), REQUIRED_SCREENSHOT_PATHS),
    "screenshot registry path-set drift"
  );
  const registries = deepFreezeExact({
    runtimeOperations,
    browserRunCodeSources,
    browserNativeOperations,
    screenshotPaths,
  });
  validateExecutableRegistryProjection(registries, manifest);
  return registries;
}

function createRegistries(manifest, fixtureBlueprint) {
  const privateObservations = createObservationRegistry(manifest, fixtureBlueprint);
  const visibleAssertionTargets = createVisibleAssertionTargetRegistry();
  const privateVisibleAssertions = createVisibleAssertionRegistry(visibleAssertionTargets);
  const privateOutputs = createOutputRegistry(
    privateObservations,
    privateVisibleAssertions,
    fixtureBlueprint
  );
  const privateBuilders = createBuilderRegistry(manifest);
  const selectors = createSelectorRegistry();
  const executableRegistries = createExecutableRegistries(manifest);
  const builders = deepFreezeExact(
    Object.fromEntries(
      Object.entries(privateBuilders).map(([kind, descriptor]) => [
        kind,
        deepFreezeExact({
          executionClass: descriptor.executionClass,
          arities: descriptor.arities,
          allowedBuilders: descriptor.allowedBuilders,
        }),
      ])
    )
  );
  const observations = publicOutputRegistry(privateObservations, "observations");
  const visibleAssertions = publicOutputRegistry(privateVisibleAssertions, "visible assertions");
  const outputs = publicOutputRegistry(privateOutputs, "outputs");
  const registries = deepFreezeExact({
    selectors,
    paths: fixtureBlueprint.paths,
    builders,
    runtimeOperations: executableRegistries.runtimeOperations,
    browserRunCodeSources: executableRegistries.browserRunCodeSources,
    browserNativeOperations: executableRegistries.browserNativeOperations,
    screenshotPaths: executableRegistries.screenshotPaths,
    observations,
    visibleAssertionTargets,
    visibleAssertions,
    routes: createRouteRegistry(fixtureBlueprint),
    outputs,
    privateProjectionBindings: deepFreezeExact({
      authorityId: "editable-content-type-detail",
      outputSchemaId: "editable-content-type-detail",
      materializerId: "buildDefaultListViewDefinition",
      producerActionIds: ["set-017-editable-type-proof"],
      consumerActionIds: ["set-035-screen-create", "set-037-retry-screen-create"],
    }),
  });
  exactKeys(
    registries,
    [
      "selectors",
      "paths",
      "builders",
      "runtimeOperations",
      "browserRunCodeSources",
      "browserNativeOperations",
      "screenshotPaths",
      "observations",
      "visibleAssertionTargets",
      "visibleAssertions",
      "routes",
      "outputs",
      "privateProjectionBindings",
    ],
    "smoke registries"
  );
  const privateBinding = registries.privateProjectionBindings;
  exactKeys(
    privateBinding,
    ["authorityId", "outputSchemaId", "materializerId", "producerActionIds", "consumerActionIds"],
    "private projection binding"
  );
  invariant(
    privateBinding.authorityId === "editable-content-type-detail" &&
      privateBinding.outputSchemaId === "editable-content-type-detail" &&
      privateBinding.materializerId === "buildDefaultListViewDefinition" &&
      JSON.stringify(privateBinding.producerActionIds) ===
        JSON.stringify(["set-017-editable-type-proof"]) &&
      JSON.stringify(privateBinding.consumerActionIds) ===
        JSON.stringify(["set-035-screen-create", "set-037-retry-screen-create"]),
    "private projection authority drift"
  );
  const privateProducer = manifest.find(({ id }) => id === privateBinding.producerActionIds[0]);
  invariant(
    privateProducer?.outputSchemaId === privateBinding.outputSchemaId,
    "private projection producer schema drift"
  );
  for (const consumerId of privateBinding.consumerActionIds) {
    const consumer = manifest.find(({ id }) => id === consumerId);
    invariant(
      consumer?.executable.type === "runtime-operation" &&
        consumer.ordinal > privateProducer.ordinal,
      consumerId + " private projection consumer drift"
    );
  }
  const refContext = {
    fixtureBlueprint,
    selectors,
    fixtureRefPaths: REQUIRED_FIXTURE_REF_PATHS,
    captureNames: [...REQUIRED_CAPTURE_NAMES, ...REQUIRED_RUNTIME_BLOCK_CAPTURES],
    actionIds: manifest.map(({ id }) => id),
  };
  const captureProducerByName = Object.fromEntries(
    Object.entries({
      ...FIXTURE_CAPTURE_BY_ACTION,
      ...RUNTIME_CAPTURE_BY_ACTION,
    }).flatMap(([actionId, names]) => names.map((name) => [name, actionId]))
  );
  const usedFixturePaths = [];
  const usedRefOperations = [];
  for (const action of manifest) {
    const ast = parseBuilderAst(action.builder);
    const builder = privateBuilders[action.kind];
    invariant(
      builder.allowedBuilders.includes(action.builder),
      action.id + " builder is not allowlisted"
    );
    invariant(
      builder.arities.includes(ast.args.length),
      action.id + " builder arity is not allowlisted"
    );
    invariant(
      commandOutputSchemaId(action, ast) === action.outputSchemaId,
      action.id + " output schema/parser identity drift"
    );
    invariant(registries.outputs[action.outputSchemaId] !== undefined, action.id + " output drift");
    const refs = executableRefs(action.executable);
    const expectedRefs =
      action.kind === "blocksBefore" || action.kind === "captureNew"
        ? ast.args.map((expression, index) =>
            index === 0
              ? literalRef(RUNTIME_CAPTURE_EXPRESSIONS[expression])
              : compileArgumentRef(expression)
          )
        : ast.args.map(compileArgumentRef);
    invariant(
      JSON.stringify(refs) === JSON.stringify(expectedRefs) ||
        action.executable.type === "browser-screenshot" ||
        action.executable.type === "browser-global-list",
      action.id + " executable Ref identity drift"
    );
    refs.forEach((ref, index) => {
      const allowSecret =
        action.executable.type === "browser-native" &&
        action.executable.operationId === "fill-secret" &&
        index === 1;
      validateRefDescriptor(
        ref,
        refContext,
        action.id + ".executable.refs[" + index + "]",
        0,
        allowSecret
      );
      for (const descriptor of collectRefDescriptors(ref)) {
        usedRefOperations.push(descriptor.op);
        if (descriptor.op === "fixture") usedFixturePaths.push(descriptor.path.join("."));
      }
      for (const captureName of captureNamesRequiredByRef(ref, refContext)) {
        const producerId = captureProducerByName[captureName];
        const producerIndex = manifest.findIndex(({ id }) => id === producerId);
        invariant(
          producerId !== undefined,
          action.id + " capture producer is missing: " + captureName
        );
        invariant(
          producerIndex >= 0 && producerIndex < action.ordinal - 1,
          action.id + " capture producer is not earlier: " + captureName
        );
      }
    });
    if (action.kind === "assert") {
      const assertionName = ast.args[0];
      const targetRef = registries.visibleAssertionTargets[assertionName];
      if (targetRef !== undefined) {
        validateRefDescriptor(targetRef, refContext, action.id + ".visibleAssertionTarget");
        for (const captureName of captureNamesRequiredByRef(targetRef, refContext)) {
          const producerId = captureProducerByName[captureName];
          const producerIndex = manifest.findIndex(({ id }) => id === producerId);
          invariant(
            producerId !== undefined && producerIndex >= 0 && producerIndex < action.ordinal - 1,
            action.id + " target capture producer is not earlier: " + captureName
          );
        }
        for (const ref of collectRefDescriptors(targetRef)) {
          usedRefOperations.push(ref.op);
          if (ref.op === "fixture") usedFixturePaths.push(ref.path.join("."));
          if (ref.op !== "capture") continue;
          const producerId = Object.entries({
            ...FIXTURE_CAPTURE_BY_ACTION,
            ...RUNTIME_CAPTURE_BY_ACTION,
          }).find(([, names]) => names.includes(ref.name))?.[0];
          invariant(
            producerId !== undefined,
            action.id + " target capture producer is missing: " + ref.name
          );
          const producerOrdinal = manifest.findIndex(({ id }) => id === producerId);
          invariant(
            producerOrdinal >= 0 && producerOrdinal < action.ordinal - 1,
            action.id + " target capture is not available yet: " + ref.name
          );
        }
      }
    }
  }
  invariant(
    sameSet(
      [...new Set(usedRefOperations)],
      ["literal", "path", "selector", "secret", "capture", "fixture"]
    ),
    "exact Ref operation universe drift"
  );
  invariant(
    sameSet([...new Set(usedFixturePaths)], REQUIRED_FIXTURE_REF_PATHS),
    "fixture leaf registry usage drift"
  );
  return registries;
}

export function buildTask540SmokePlan(input) {
  invariant(arguments.length === 1, "plan builder requires one argument object");
  invariant(
    input !== null &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      Object.getPrototypeOf(input) === Object.prototype,
    "plan input must be a plain object"
  );
  const descriptors = Object.getOwnPropertyDescriptors(input);
  exactKeys(descriptors, ["nonce"], "plan input descriptors");
  const nonceDescriptor = descriptors.nonce;
  invariant(
    Object.hasOwn(nonceDescriptor, "value") &&
      !Object.hasOwn(nonceDescriptor, "get") &&
      !Object.hasOwn(nonceDescriptor, "set") &&
      nonceDescriptor.enumerable === true,
    "plan nonce must be one enumerable data property"
  );
  const nonce = nonceDescriptor.value;
  invariant(
    typeof nonce === "string" && NONCE_PATTERN.test(nonce),
    "nonce must be 12 lowercase hex characters"
  );
  const manifest = RAW_ACTION_ROWS.map(compileAction);
  validateManifest(manifest);
  validateStateMachines(manifest);
  const fixtureBlueprint = buildFixtureBlueprint(nonce);
  validateFixtureBlueprint(fixtureBlueprint);
  const registries = createRegistries(manifest, fixtureBlueprint);
  return deepFreezeExact({
    schemaVersion: 1,
    nonce,
    prefix: fixtureBlueprint.fixturePrefix,
    fixtureBlueprint,
    actionManifest: manifest,
    requiredScenarios: REQUIRED_SCENARIOS,
    requiredAssertions: REQUIRED_SMOKE_ASSERTIONS,
    requiredFixtureSubjectKeys: REQUIRED_FIXTURE_SUBJECT_KEYS,
    requiredCaptureNames: REQUIRED_CAPTURE_NAMES,
    requiredRuntimeBlockCaptures: REQUIRED_RUNTIME_BLOCK_CAPTURES,
    requiredScreenshotPaths: REQUIRED_SCREENSHOT_PATHS,
    requiredBuilderKindCounts: REQUIRED_BUILDER_KIND_COUNTS,
    fixtureCaptureBindings: FIXTURE_CAPTURE_BY_ACTION,
    runtimeCaptureBindings: RUNTIME_CAPTURE_BY_ACTION,
    fixtureSubjectCapture: FIXTURE_SUBJECT_CAPTURE,
    requiredIsolatedApiActionIds: REQUIRED_ISOLATED_API_ACTION_IDS,
    requiredSignoutSettlementIds: REQUIRED_SIGNOUT_SETTLEMENT_IDS,
    requiredMetadataStateValues: REQUIRED_METADATA_STATE_VALUES,
    requiredAuthRatePlan: REQUIRED_AUTH_RATE_PLAN,
    maxPreferenceUnmountWindowMs: MAX_PREFERENCE_UNMOUNT_WINDOW_MS,
    screenPreferenceSettledRetentionMs: SCREEN_PREFERENCE_SETTLED_RETENTION_MS,
    stateMachines: createStateMachineRegistry(),
    registries,
  });
}

function expectContractFailure(callback, label) {
  let failed = false;
  try {
    callback();
  } catch {
    failed = true;
  }
  invariant(failed, label + " must fail closed");
}

function assertRecursivelyFrozen(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return;
  if (seen.has(value)) return;
  seen.add(value);
  invariant(Object.isFrozen(value), "plan contains a mutable nested value");
  for (const key of Reflect.ownKeys(value)) assertRecursivelyFrozen(value[key], seen);
}

function assertJsonSerializablePlan(value, path = "$", ancestors = new WeakSet()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    invariant(Number.isFinite(value), path + " contains a non-finite number");
    return;
  }
  invariant(typeof value === "object", path + " contains a non-JSON value");
  invariant(!ancestors.has(value), path + " contains a cycle");
  const prototype = Object.getPrototypeOf(value);
  invariant(
    Array.isArray(value) || prototype === Object.prototype || prototype === null,
    path + " contains a non-plain object"
  );
  const ownKeys = Object.keys(value);
  const reflectedKeys = Reflect.ownKeys(value);
  if (Array.isArray(value)) {
    invariant(
      ownKeys.length === value.length &&
        ownKeys.every((key, index) => key === String(index)) &&
        reflectedKeys.length === ownKeys.length + 1 &&
        reflectedKeys.at(-1) === "length",
      path + " contains an array hole or custom key"
    );
  } else {
    invariant(
      reflectedKeys.length === ownKeys.length &&
        reflectedKeys.every((key, index) => key === ownKeys[index]),
      path + " contains a non-enumerable or symbol key"
    );
  }
  ancestors.add(value);
  for (const key of ownKeys) {
    assertJsonSerializablePlan(value[key], path + "." + key, ancestors);
  }
  ancestors.delete(value);
}

function assertCanonicalJsonRoundTrip(value) {
  assertJsonSerializablePlan(value);
  const serialized = JSON.stringify(value);
  invariant(typeof serialized === "string", "plan did not serialize to JSON");
  const reparsed = JSON.parse(serialized);
  invariant(
    JSON.stringify(reparsed) === serialized,
    "plan JSON round-trip changed its canonical byte representation"
  );
}

function replaceManifestAction(manifest, index, overrides, extra = null) {
  const values = { ...manifest[index], ...overrides };
  const replacement = Object.fromEntries(ACTION_KEYS.map((key) => [key, values[key]]));
  if (extra) Object.assign(replacement, extra);
  const copy = manifest.slice();
  copy[index] = deepFreezeExact(replacement);
  return Object.freeze(copy);
}

function collectRefDescriptors(ref, output = []) {
  output.push(ref);
  if (ref.op === "selector") {
    ref.args.forEach((item) => collectRefDescriptors(item, output));
  }
  return output;
}

function lookupExecutableRegistryDescriptor(plan, action) {
  const executable = action.executable;
  if (executable.type === "runtime-operation") {
    const descriptor = plan.registries.runtimeOperations[executable.operationId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " runtime registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-run-code") {
    const descriptor = plan.registries.browserRunCodeSources[executable.sourceId];
    invariant(
      descriptor?.actionId === action.id && descriptor.refCount === executable.refs.length,
      action.id + " run-code registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-native") {
    const descriptor = plan.registries.browserNativeOperations[executable.operationId];
    invariant(
      descriptor?.operationId === executable.operationId &&
        descriptor.actionIds.includes(action.id),
      action.id + " native registry lookup drift"
    );
    return descriptor;
  }
  if (executable.type === "browser-screenshot") {
    const expected = SCREENSHOT_DESCRIPTOR_BY_ACTION_ID[action.id];
    const registeredPath = plan.registries.screenshotPaths[executable.screenshotId];
    invariant(
      expected?.screenshotId === executable.screenshotId &&
        expected.path === registeredPath &&
        action.repositoryMutationPolicy.paths[0] === registeredPath,
      action.id + " screenshot registry lookup drift"
    );
    return registeredPath;
  }
  invariant(
    executable.type === "browser-global-list" && action.id === "end-007-session-absence",
    action.id + " global-list registry lookup drift"
  );
  return true;
}

function runHermeticOneLoopExecutorSelfTest(plan) {
  const completed = new Set();
  const captures = new Map();
  const actionDispatches = [];
  const actionReceipts = [];
  const refContext = { fixtureBlueprint: plan.fixtureBlueprint };
  for (const action of plan.actionManifest) {
    invariant(action.ordinal === completed.size + 1, "one-loop ordinal drift");
    lookupExecutableRegistryDescriptor(plan, action);
    invariant(
      action.assertionDependencies.every((dependency) => completed.has(dependency)),
      action.id + " one-loop dependency drift"
    );
    for (const ref of executableRefs(action.executable)) {
      for (const captureName of captureNamesRequiredByRef(ref, refContext)) {
        invariant(captures.has(captureName), action.id + " resolved an unbound capture");
      }
    }
    actionDispatches.push(deepFreezeExact({ ordinal: action.ordinal, actionId: action.id }));
    for (const captureName of [
      ...(plan.fixtureCaptureBindings[action.id] ?? []),
      ...(plan.runtimeCaptureBindings[action.id] ?? []),
    ]) {
      invariant(!captures.has(captureName), action.id + " rebound a capture");
      captures.set(captureName, "self-test:" + captureName);
    }
    completed.add(action.id);
    actionReceipts.push(
      deepFreezeExact({
        ordinal: action.ordinal,
        actionId: action.id,
        partition: action.ordinal <= 55 ? "setup" : action.ordinal <= 489 ? "flow" : "terminal",
      })
    );
  }
  invariant(completed.size === 496, "one-loop completion drift");
  invariant(captures.size === 26, "one-loop capture binding drift");
  return deepFreezeExact({ actionDispatches, actionReceipts });
}

function createPrivateProjectionSelfTestHarness(plan) {
  const values = new WeakMap();
  const binding = plan.registries.privateProjectionBindings;
  const expectedSchema = materializeEditableContentSchema(
    plan.fixtureBlueprint.contentTypes.editable.fields
  );
  const bind = (authority, actionId, value) => {
    invariant(actionId === binding.producerActionIds[0], "private projection bind owner drift");
    invariant(authority && typeof authority === "object", "private projection authority drift");
    exactKeys(value, ["id", "slug", "name", "schema"], "private projection value");
    invariant(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.id) &&
        value.slug === plan.fixtureBlueprint.contentTypes.editable.slug &&
        value.name === plan.fixtureBlueprint.contentTypes.editable.name &&
        JSON.stringify(value.schema) === JSON.stringify(expectedSchema),
      "private projection value drift"
    );
    invariant(!values.has(authority), "private projection rebound");
    values.set(authority, deepFreezeExact(structuredClone(value)));
  };
  const read = (authority, actionId, authorityId) => {
    invariant(authorityId === binding.authorityId, "private projection authority ID drift");
    invariant(binding.consumerActionIds.includes(actionId), "private projection reader drift");
    const value = values.get(authority);
    invariant(value !== undefined, "private projection read before bind");
    return value;
  };
  return { bind, read, expectedSchema };
}

export function runTask540SmokeContractSelfTest() {
  const plan = buildTask540SmokePlan({ nonce: "0123456789ab" });
  let negativeCases = 0;
  const negative = (callback, label) => {
    negativeCases += 1;
    expectContractFailure(callback, label);
  };
  invariant(plan.actionManifest.length === 496, "self-test action cardinality");
  invariant(plan.requiredFixtureSubjectKeys.length === 15, "self-test fixture cardinality");
  invariant(plan.requiredCaptureNames.length === 17, "self-test capture cardinality");
  invariant(
    plan.requiredRuntimeBlockCaptures.length === 9,
    "self-test runtime capture cardinality"
  );
  invariant(plan.requiredScreenshotPaths.length === 13, "self-test screenshot cardinality");
  const dirtyFlowHandoff = plan.actionManifest.find(({ id }) => id === "dg-003-builder");
  invariant(
    dirtyFlowHandoff?.precondition === "backend reset proven with browser draft dirty" &&
      dirtyFlowHandoff.captureOutput ===
        "exactly one accepted beforeunload plus exact URL/canvas" &&
      dirtyFlowHandoff.postcondition === "builder visible and Playwright dialog listener restored",
    "self-test dirty-flow beforeunload handoff drift"
  );
  invariant(
    RAW_VISIBLE_ASSERTION_ROWS.length === 48 &&
      RAW_VISIBLE_ASSERTION_ROWS.every((row) => row.length === 3),
    "self-test ordinary assertion metadata drift"
  );
  const assertionContracts = Object.values(plan.registries.visibleAssertions);
  invariant(assertionContracts.length === 55, "self-test visible assertion cardinality");
  for (const contract of assertionContracts) {
    exactKeys(
      contract,
      ["grammar", "schema", "predicate", "rememberAs"],
      "visible assertion contract"
    );
    invariant(
      contract.grammar.encoding === "json" &&
        contract.schema?.type !== undefined &&
        contract.predicate !== null &&
        typeof contract.predicate === "object" &&
        contract.rememberAs === null,
      "self-test visible assertion OutputContract drift"
    );
  }
  invariant(
    assertionContracts.filter(({ schema }) => schema.properties?.assertion !== undefined).length ===
      48,
    "self-test ordinary assertion OutputContract cardinality"
  );
  const canonicalAdminRootUrl = plan.fixtureBlueprint.origins.admin + "/admin/";
  const expectedAuthObservationPredicate = andPredicate([
    outputEquals(["url"], canonicalAdminRootUrl),
    outputEquals(["userMenuVisible"], true),
    outputNonEmpty(["userName"]),
  ]);
  const assertExactAuthObservationPredicate = (predicate, label) => {
    invariant(
      JSON.stringify(predicate) === JSON.stringify(expectedAuthObservationPredicate),
      label + " exact canonical Admin-root predicate drift"
    );
  };
  for (const name of [
    "bootstrap-auth-identity-settled",
    "auth-identity-settled-users-a",
    "auth-identity-settled-users-b",
  ]) {
    assertExactAuthObservationPredicate(plan.registries.observations[name].predicate, name);
  }
  const missingAuthUrlPredicate = structuredClone(expectedAuthObservationPredicate);
  missingAuthUrlPredicate.items.shift();
  negative(
    () => assertExactAuthObservationPredicate(missingAuthUrlPredicate, "missing URL"),
    "auth observation missing exact Admin-root URL"
  );
  const wrongAuthUrlPredicate = structuredClone(expectedAuthObservationPredicate);
  wrongAuthUrlPredicate.items[0].right.value = plan.fixtureBlueprint.origins.admin + "/admin";
  negative(
    () => assertExactAuthObservationPredicate(wrongAuthUrlPredicate, "wrong URL"),
    "auth observation wrong canonical Admin-root URL"
  );
  const expectedUnitContract = outputContract({
    grammar: jsonTransport(),
    schema: schemaObject({ ok: schemaLiteral(true) }),
    predicate: outputEquals([], deepFreezeExact({ ok: true })),
  });
  invariant(
    JSON.stringify(plan.registries.outputs.unit) === JSON.stringify(expectedUnitContract),
    "self-test exact unit OutputContract drift"
  );
  assertExactUnitOutputValue({ ok: true });
  negative(() => assertExactUnitOutputValue(true), "scalar unit output");
  negative(
    () => assertExactUnitOutputValue({ ok: true, unknown: true }),
    "unknown unit output key"
  );
  negative(() => assertExactUnitOutputValue({ ok: false }), "false unit output value");
  assertRecursivelyFrozen(plan);
  assertCanonicalJsonRoundTrip(plan);
  const refs = plan.actionManifest.flatMap(({ executable }) =>
    executableRefs(executable).flatMap((ref) => collectRefDescriptors(ref))
  );
  invariant(
    sameSet(
      [...new Set(refs.map(({ op }) => op))],
      ["literal", "path", "selector", "secret", "capture", "fixture"]
    ),
    "self-test executable Ref discriminant drift"
  );
  invariant(
    refs
      .filter(({ op }) => op === "secret")
      .every(({ name }) => ["ADMIN_EMAIL", "ADMIN_PASSWORD"].includes(name)),
    "self-test secret Ref allowlist drift"
  );
  const mediaFieldOptionActions = plan.actionManifest.filter(({ id }) =>
    ["bi-049-image-bound-media", "bi-054-field-bound-media"].includes(id)
  );
  invariant(
    mediaFieldOptionActions.length === 2 &&
      mediaFieldOptionActions.every(
        ({ executable }) =>
          executable.type === "browser-run-code" &&
          executable.refs.length === 1 &&
          JSON.stringify(executable.refs[0]) ===
            JSON.stringify({
              op: "selector",
              templateId: "fieldOption",
              args: [
                { op: "literal", value: "Media Asset" },
                { op: "literal", value: "media" },
              ],
            })
      ),
    "self-test media field-option rendered label drift"
  );
  const mutationPaths = plan.actionManifest.flatMap(({ repositoryMutationPolicy }) => {
    invariant(
      (repositoryMutationPolicy.mode === "none" && repositoryMutationPolicy.paths.length === 0) ||
        (repositoryMutationPolicy.mode === "allowlist" &&
          repositoryMutationPolicy.paths.length === 1),
      "self-test repository mutation policy drift"
    );
    return repositoryMutationPolicy.paths;
  });
  invariant(
    sameSet(mutationPaths, REQUIRED_SCREENSHOT_PATHS),
    "self-test repository mutation path set drift"
  );
  const executableCounts = Object.fromEntries(
    Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS).map((type) => [
      type,
      plan.actionManifest.filter(({ executable }) => executable.type === type).length,
    ])
  );
  invariant(
    JSON.stringify(executableCounts) === JSON.stringify(REQUIRED_EXECUTABLE_TYPE_COUNTS),
    "self-test executable partition drift"
  );
  invariant(
    Object.keys(plan.registries.runtimeOperations).length === 76 &&
      Object.keys(plan.registries.browserRunCodeSources).length === 392 &&
      Object.keys(plan.registries.browserNativeOperations).length === 7 &&
      Object.keys(plan.registries.screenshotPaths).length === 13,
    "self-test executable registry cardinality drift"
  );
  const oneLoopTrace = runHermeticOneLoopExecutorSelfTest(plan);
  invariant(
    oneLoopTrace.actionDispatches.length === 496 &&
      oneLoopTrace.actionReceipts.length === 496 &&
      oneLoopTrace.actionReceipts.every(
        (receipt, index) =>
          receipt.ordinal === index + 1 && receipt.actionId === plan.actionManifest[index].id
      ),
    "self-test one-loop execution/receipt drift"
  );
  invariant(
    oneLoopTrace.actionReceipts.filter(({ partition }) => partition === "setup").length === 55 &&
      oneLoopTrace.actionReceipts.filter(({ partition }) => partition === "flow").length === 434 &&
      oneLoopTrace.actionReceipts.filter(({ partition }) => partition === "terminal").length === 7,
    "self-test one-loop receipt partition drift"
  );
  const acquiredSubjects = REQUIRED_FIXTURE_SUBJECT_KEYS.map((kind, index) => ({
    kind,
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  }));
  const cleanup = expandCleanupActions(acquiredSubjects);
  invariant(cleanup.length === acquiredSubjects.length * 3, "dynamic cleanup cardinality");
  invariant(new Set(cleanup.map(({ id }) => id)).size === cleanup.length, "dynamic cleanup IDs");
  const incompleteAuthRateCosts = { ...AUTH_RATE_COSTS_BY_ACTION };
  delete incompleteAuthRateCosts["dg-029-save-click"];
  negative(
    () => computeAuthRatePlan(plan.actionManifest, incompleteAuthRateCosts),
    "missing auth rate producer cost"
  );
  const conditionalCsrfIndex = plan.actionManifest.findIndex(
    ({ id }) => id === "ru-046-a-metadata-enable"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, conditionalCsrfIndex, {
          builder: "click(S.metadata-unknown)",
        })
      ),
    "conditional CSRF producer signature drift"
  );
  negative(() => buildTask540SmokePlan({ nonce: "bad" }), "invalid nonce");
  negative(
    () => buildTask540SmokePlan({ nonce: "0123456789ab", unknown: true }),
    "unknown plan key"
  );
  let nonceGetterCalls = 0;
  const accessorInput = {};
  Object.defineProperty(accessorInput, "nonce", {
    enumerable: true,
    get() {
      nonceGetterCalls += 1;
      return "0123456789ab";
    },
  });
  negative(() => buildTask540SmokePlan(accessorInput), "accessor plan nonce");
  invariant(nonceGetterCalls === 0, "plan nonce getter was invoked");
  negative(
    () => validateManifest(replaceManifestAction(plan.actionManifest, 0, {}, { unknown: true })),
    "unknown action key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          executable: { ...plan.actionManifest[0].executable, unknown: true },
        })
      ),
    "unknown executable key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          executable: { type: "runtime-operation", refs: [] },
        })
      ),
    "missing executable key"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 0, {
          assertionDependencies: [plan.actionManifest[1].id],
        })
      ),
    "future dependency"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, 1, { id: plan.actionManifest[0].id })
      ),
    "duplicate action ID"
  );
  const routeIndex = plan.actionManifest.findIndex(({ id }) => id === "bi-020-media-route-setup");
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, routeIndex, { routeStateBefore: "hit" })
      ),
    "route state mismatch"
  );
  const malformedRow = RAW_ACTION_ROWS[0].slice();
  malformedRow[3] = "missing -> terminal";
  negative(() => compileAction(malformedRow, 0, [malformedRow]), "malformed transition");
  negative(
    () => expandCleanupActions([{ kind: "media", id: "one", unknown: true }]),
    "unknown cleanup subject key"
  );
  negative(() => assertJsonSerializablePlan({ executable: () => true }), "function-valued plan");
  negative(() => assertJsonSerializablePlan({ missing: undefined }), "undefined-valued plan");
  negative(
    () => assertJsonSerializablePlan({ infinite: Number.POSITIVE_INFINITY }),
    "non-finite plan number"
  );
  const cyclicPlan = {};
  cyclicPlan.self = cyclicPlan;
  negative(() => assertJsonSerializablePlan(cyclicPlan), "cyclic plan");
  negative(() => assertJsonSerializablePlan({ date: new Date(0) }), "non-plain plan value");
  negative(() => compileArgumentRef("$UNREGISTERED_SECRET"), "unknown secret Ref");
  const refContext = {
    fixtureBlueprint: plan.fixtureBlueprint,
    selectors: plan.registries.selectors,
    fixtureRefPaths: REQUIRED_FIXTURE_REF_PATHS,
    captureNames: [...plan.requiredCaptureNames, ...plan.requiredRuntimeBlockCaptures],
    actionIds: plan.actionManifest.map(({ id }) => id),
  };
  negative(
    () => validateRefDescriptor({ op: "unknown" }, refContext, "unknown Ref"),
    "unknown Ref opcode"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "fixture", path: ["screen", "id"] },
        refContext,
        "capture bypass Ref"
      ),
    "fixture capture bypass"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "selector", templateId: "missing", args: [] },
        refContext,
        "unknown selector Ref"
      ),
    "unknown selector Ref"
  );
  negative(
    () =>
      repositoryMutationPolicy(
        { id: "self-test-screen", kind: "screen" },
        { args: ["unregistered-shot"] }
      ),
    "unregistered screenshot mutation"
  );

  const manifestWithAction = (index, replacement) => {
    const copy = plan.actionManifest.slice();
    copy[index] = deepFreezeExact(replacement);
    return Object.freeze(copy);
  };
  const executableExampleByType = Object.fromEntries(
    Object.keys(REQUIRED_EXECUTABLE_TYPE_COUNTS).map((type) => [
      type,
      plan.actionManifest.findIndex(({ executable }) => executable.type === type),
    ])
  );
  for (const [type, index] of Object.entries(executableExampleByType)) {
    const action = plan.actionManifest[index];
    const requiredKeys = EXECUTABLE_KEYS_BY_TYPE[type];
    const missingKey = requiredKeys.at(-1);
    const missingExecutable = { ...action.executable };
    delete missingExecutable[missingKey];
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: missingExecutable,
          })
        ),
      type + " missing executable-union key"
    );
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: { ...action.executable, extra: true },
          })
        ),
      type + " extra executable-union key"
    );
  }
  negative(
    () => validateManifest(Object.freeze(plan.actionManifest.slice(0, -1))),
    "incomplete 495-action mapping"
  );
  const firstActionWithoutOrdinal = { ...plan.actionManifest[0] };
  delete firstActionWithoutOrdinal.ordinal;
  negative(
    () => validateManifest(manifestWithAction(0, firstActionWithoutOrdinal)),
    "missing action key"
  );
  const runtimeIndex = executableExampleByType["runtime-operation"];
  const runCodeIndex = executableExampleByType["browser-run-code"];
  const nativeIndex = executableExampleByType["browser-native"];
  const screenshotIndex = executableExampleByType["browser-screenshot"];
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, runtimeIndex, {
          executable: {
            ...plan.actionManifest[runtimeIndex].executable,
            operationId: "runtime/unknown-action",
          },
        })
      ),
    "unknown runtime operation"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, runCodeIndex, {
          executable: {
            ...plan.actionManifest[runCodeIndex].executable,
            sourceId: "run-code/unknown-action",
          },
        })
      ),
    "unknown run-code source"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, nativeIndex, {
          executable: {
            ...plan.actionManifest[nativeIndex].executable,
            operationId: "unknown-native",
          },
        })
      ),
    "unknown native operation"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, screenshotIndex, {
          executable: {
            ...plan.actionManifest[screenshotIndex].executable,
            screenshotId: "screenshot/unknown-action",
          },
        })
      ),
    "unknown screenshot ID"
  );

  for (const unsupportedOp of [
    "rootPath",
    "array",
    "object",
    "prior",
    "output",
    "var",
    "sub",
    "length",
    "changedKeys",
  ]) {
    negative(
      () => validateRefDescriptor({ op: unsupportedOp }, refContext, unsupportedOp + " Ref"),
      "unsupported Ref discriminant " + unsupportedOp
    );
  }
  for (const invalidLiteral of [null, true, {}, [], "$ADMIN_PASSWORD", "ADMIN_PASSWORD"]) {
    negative(
      () =>
        validateRefDescriptor(
          { op: "literal", value: invalidLiteral },
          refContext,
          "invalid literal Ref"
        ),
      "invalid or secret-shaped literal Ref"
    );
  }
  negative(
    () =>
      validateRefDescriptor(
        { op: "capture", name: "ADMIN_PASSWORD" },
        refContext,
        "secret-shaped capture Ref"
      ),
    "raw secret disguised as capture"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "fixture", path: ["users", "bootstrap", "passwordEnv"] },
        refContext,
        "secret-shaped fixture Ref"
      ),
    "raw secret disguised as fixture"
  );
  negative(
    () =>
      validateRefDescriptor(
        {
          op: "selector",
          templateId: "palette",
          args: [{ op: "secret", name: "ADMIN_PASSWORD" }],
        },
        refContext,
        "nested selector secret Ref"
      ),
    "nested selector secret"
  );
  negative(
    () =>
      validateRefDescriptor(
        { op: "secret", name: "ADMIN_PASSWORD" },
        refContext,
        "non-native secret Ref"
      ),
    "secret outside native fill"
  );
  const emailFillIndex = plan.actionManifest.findIndex(({ id }) => id === "set-009-login-email");
  const emailFill = plan.actionManifest[emailFillIndex];
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, emailFillIndex, {
          executable: {
            ...emailFill.executable,
            refs: [emailFill.executable.refs[1], emailFill.executable.refs[0]],
          },
        })
      ),
    "native secret wrong index"
  );
  negative(
    () =>
      validateManifest(
        replaceManifestAction(plan.actionManifest, emailFillIndex, {
          executable: {
            ...emailFill.executable,
            refs: [
              { op: "selector", templateId: "loginPassword", args: [] },
              emailFill.executable.refs[1],
            ],
          },
        })
      ),
    "native secret wrong selector"
  );
  for (const index of [runtimeIndex, runCodeIndex]) {
    const action = plan.actionManifest[index];
    negative(
      () =>
        validateManifest(
          replaceManifestAction(plan.actionManifest, index, {
            executable: {
              ...action.executable,
              refs: [{ op: "secret", name: "ADMIN_PASSWORD" }, ...action.executable.refs],
            },
          })
        ),
      action.executable.type + " secret placement"
    );
  }

  const earlyPathAction = {
    ...plan.actionManifest[6],
    builder: "goto(paths.entry)",
    executable: {
      ...plan.actionManifest[6].executable,
      refs: [{ op: "path", key: "entry" }],
    },
  };
  negative(
    () => createRegistries(manifestWithAction(6, earlyPathAction), plan.fixtureBlueprint),
    "path capture producer after consumer"
  );
  const outputMismatchIndex = plan.actionManifest.findIndex(
    ({ id }) => id === "set-017-editable-type-proof"
  );
  negative(
    () =>
      createRegistries(
        replaceManifestAction(plan.actionManifest, outputMismatchIndex, {
          outputSchemaId: "runtime-safe-projection",
        }),
        plan.fixtureBlueprint
      ),
    "private output schema/parser mismatch"
  );

  for (const registryName of ["runtimeOperations", "browserRunCodeSources"]) {
    const missing = {
      runtimeOperations: { ...plan.registries.runtimeOperations },
      browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
      browserNativeOperations: { ...plan.registries.browserNativeOperations },
      screenshotPaths: { ...plan.registries.screenshotPaths },
    };
    delete missing[registryName][Object.keys(missing[registryName])[0]];
    negative(
      () => validateExecutableRegistryProjection(missing, plan.actionManifest),
      registryName + " missing registry entry"
    );
    const extra = {
      ...missing,
      [registryName]: {
        ...plan.registries[registryName],
        extra: { actionId: "extra", refCount: 0 },
      },
    };
    negative(
      () => validateExecutableRegistryProjection(extra, plan.actionManifest),
      registryName + " extra registry entry"
    );
    const corrupt = {
      runtimeOperations: { ...plan.registries.runtimeOperations },
      browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
      browserNativeOperations: { ...plan.registries.browserNativeOperations },
      screenshotPaths: { ...plan.registries.screenshotPaths },
    };
    const corruptKey = Object.keys(corrupt[registryName])[0];
    corrupt[registryName][corruptKey] = { actionId: "wrong-action", refCount: 999 };
    negative(
      () => validateExecutableRegistryProjection(corrupt, plan.actionManifest),
      registryName + " corrupt descriptor"
    );
  }
  negative(
    () =>
      assertUniqueRegistryEntries(
        [
          ["one", 1],
          ["one", 2],
        ],
        "self-test registry"
      ),
    "duplicate registry key"
  );
  const nativeRegistryDrift = {
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: {
      ...plan.registries.browserNativeOperations,
      "open-about-blank": {
        ...plan.registries.browserNativeOperations["open-about-blank"],
        actionIds: ["wrong-action"],
      },
    },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  };
  negative(
    () => validateExecutableRegistryProjection(nativeRegistryDrift, plan.actionManifest),
    "native descriptor action mapping"
  );
  const cloneExecutableRegistries = () => ({
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: { ...plan.registries.browserNativeOperations },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  });
  const inheritedRegistry = cloneExecutableRegistries();
  inheritedRegistry.runtimeOperations = Object.assign(
    Object.create({ inheritedUnknown: true }),
    inheritedRegistry.runtimeOperations
  );
  negative(
    () => validateExecutableRegistryProjection(inheritedRegistry, plan.actionManifest),
    "inherited runtime registry member"
  );
  const inheritedDescriptorRegistry = cloneExecutableRegistries();
  const inheritedDescriptorKey = Object.keys(inheritedDescriptorRegistry.runtimeOperations)[0];
  inheritedDescriptorRegistry.runtimeOperations[inheritedDescriptorKey] = Object.assign(
    Object.create({ inheritedUnknown: true }),
    inheritedDescriptorRegistry.runtimeOperations[inheritedDescriptorKey]
  );
  negative(
    () => validateExecutableRegistryProjection(inheritedDescriptorRegistry, plan.actionManifest),
    "inherited runtime descriptor member"
  );
  for (const [label, install] of [
    [
      "undefined",
      (registry) => {
        registry.runtimeOperations.unknown = undefined;
      },
    ],
    [
      "symbol",
      (registry) => {
        registry.runtimeOperations[Symbol("unknown")] = true;
      },
    ],
    [
      "non-enumerable",
      (registry) => {
        Object.defineProperty(registry.runtimeOperations, "unknown", { value: true });
      },
    ],
  ]) {
    const registry = cloneExecutableRegistries();
    install(registry);
    negative(
      () => validateExecutableRegistryProjection(registry, plan.actionManifest),
      "registry non-data member: " + label
    );
  }
  let registryAccessorReads = 0;
  const accessorRegistry = cloneExecutableRegistries();
  Object.defineProperty(accessorRegistry.runtimeOperations, "unknown", {
    enumerable: true,
    get() {
      registryAccessorReads += 1;
      return true;
    },
  });
  negative(
    () => validateExecutableRegistryProjection(accessorRegistry, plan.actionManifest),
    "registry accessor member"
  );
  invariant(registryAccessorReads === 0, "registry accessor was invoked");
  const screenshotRegistryDrift = {
    runtimeOperations: { ...plan.registries.runtimeOperations },
    browserRunCodeSources: { ...plan.registries.browserRunCodeSources },
    browserNativeOperations: { ...plan.registries.browserNativeOperations },
    screenshotPaths: { ...plan.registries.screenshotPaths },
  };
  const screenshotIds = Object.keys(screenshotRegistryDrift.screenshotPaths);
  [
    screenshotRegistryDrift.screenshotPaths[screenshotIds[0]],
    screenshotRegistryDrift.screenshotPaths[screenshotIds[1]],
  ] = [
    screenshotRegistryDrift.screenshotPaths[screenshotIds[1]],
    screenshotRegistryDrift.screenshotPaths[screenshotIds[0]],
  ];
  negative(
    () => validateExecutableRegistryProjection(screenshotRegistryDrift, plan.actionManifest),
    "screenshot ID/path swap"
  );

  const mutateBlueprint = (mutator) => {
    const blueprint = structuredClone(plan.fixtureBlueprint);
    mutator(blueprint);
    return blueprint;
  };
  for (const [label, mutator] of [
    [
      "origin",
      (blueprint) => {
        blueprint.origins.unknown = true;
      },
    ],
    [
      "user",
      (blueprint) => {
        blueprint.users.a.unknown = true;
      },
    ],
    [
      "content-type field",
      (blueprint) => {
        blueprint.contentTypes.editable.fields[0].unknown = true;
      },
    ],
  ]) {
    negative(
      () => validateFixtureBlueprint(mutateBlueprint(mutator)),
      "nested blueprint unknown key: " + label
    );
  }
  for (const [label, mutator] of [
    [
      "undefined",
      (blueprint) => {
        blueprint.users.a.unknown = undefined;
      },
    ],
    [
      "symbol",
      (blueprint) => {
        blueprint.users.a[Symbol("unknown")] = true;
      },
    ],
    [
      "non-enumerable",
      (blueprint) => {
        Object.defineProperty(blueprint.users.a, "unknown", { value: true });
      },
    ],
    [
      "custom prototype",
      (blueprint) => {
        Object.setPrototypeOf(blueprint.users.a, { inheritedUnknown: true });
      },
    ],
  ]) {
    negative(
      () => validateFixtureBlueprint(mutateBlueprint(mutator)),
      "nested blueprint non-data key: " + label
    );
  }
  let blueprintAccessorReads = 0;
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          Object.defineProperty(blueprint.users.a, "unknown", {
            enumerable: true,
            get() {
              blueprintAccessorReads += 1;
              return true;
            },
          });
        })
      ),
    "nested blueprint accessor"
  );
  invariant(blueprintAccessorReads === 0, "nested blueprint accessor was invoked");
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.data =
            "jVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
        })
      ),
    "altered PNG bytes"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.data = blueprint.media.uploadFixture.data.slice(0, -1);
        })
      ),
    "non-canonical PNG base64 spelling"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.encoding = "hex";
        })
      ),
    "altered PNG encoding"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.sha256 = "0".repeat(64);
        })
      ),
    "altered PNG digest"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.decodedSizeBytes = 67;
        })
      ),
    "altered PNG size"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.unknown = true;
        })
      ),
    "extra PNG fixture key"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.path = "fixture.png";
        })
      ),
    "PNG fixture path authority"
  );
  negative(
    () =>
      validateFixtureBlueprint(
        mutateBlueprint((blueprint) => {
          blueprint.media.uploadFixture.bytes = [137, 80, 78, 71];
        })
      ),
    "second PNG byte authority"
  );

  const projectionHarness = createPrivateProjectionSelfTestHarness(plan);
  const projectionAuthority = {};
  const projectionValue = {
    id: "00000000-0000-4000-8000-000000000017",
    slug: plan.fixtureBlueprint.contentTypes.editable.slug,
    name: plan.fixtureBlueprint.contentTypes.editable.name,
    schema: projectionHarness.expectedSchema,
  };
  projectionHarness.bind(projectionAuthority, "set-017-editable-type-proof", projectionValue);
  const firstProjectionRead = projectionHarness.read(
    projectionAuthority,
    "set-035-screen-create",
    "editable-content-type-detail"
  );
  invariant(
    firstProjectionRead ===
      projectionHarness.read(
        projectionAuthority,
        "set-037-retry-screen-create",
        "editable-content-type-detail"
      ) && Object.isFrozen(firstProjectionRead),
    "private projection single-bind/read identity drift"
  );
  negative(
    () =>
      projectionHarness.bind(projectionAuthority, "set-017-editable-type-proof", projectionValue),
    "private projection second bind"
  );
  negative(
    () => projectionHarness.bind({}, "set-016-editable-type-create", projectionValue),
    "private projection wrong binder"
  );
  negative(
    () => projectionHarness.read({}, "set-035-screen-create", "editable-content-type-detail"),
    "private projection read before bind"
  );
  negative(
    () =>
      projectionHarness.read(
        projectionAuthority,
        "set-036-screen-proof",
        "editable-content-type-detail"
      ),
    "private projection wrong reader"
  );
  negative(
    () => projectionHarness.read(projectionAuthority, "set-035-screen-create", "wrong-authority"),
    "private projection wrong authority ID"
  );
  negative(
    () =>
      projectionHarness.bind({}, "set-017-editable-type-proof", {
        ...projectionValue,
        schema: { ...projectionValue.schema, additionalProperties: true },
      }),
    "private projection altered schema"
  );

  const reorderedPlan = {
    ...plan,
    actionManifest: Object.freeze([
      plan.actionManifest[1],
      plan.actionManifest[0],
      ...plan.actionManifest.slice(2),
    ]),
  };
  negative(() => runHermeticOneLoopExecutorSelfTest(reorderedPlan), "reordered ordinal loop");
  const corruptLoopRegistries = {
    ...plan.registries,
    runtimeOperations: {
      ...plan.registries.runtimeOperations,
      [plan.actionManifest[runtimeIndex].executable.operationId]: {
        actionId: "wrong-action",
        refCount: 999,
      },
    },
  };
  negative(
    () =>
      runHermeticOneLoopExecutorSelfTest({
        ...plan,
        registries: corruptLoopRegistries,
      }),
    "one-loop corrupt executable registry lookup"
  );
  const replayedPlan = {
    ...plan,
    actionManifest: Object.freeze([
      plan.actionManifest[0],
      plan.actionManifest[0],
      ...plan.actionManifest.slice(2),
    ]),
  };
  negative(() => runHermeticOneLoopExecutorSelfTest(replayedPlan), "replayed ordinal loop");
  return Object.freeze({
    pass: true,
    actions: plan.actionManifest.length,
    setupActions: REQUIRED_SETUP_ACTION_COUNT,
    flowActions: REQUIRED_FLOW_ACTION_COUNT,
    cleanupActions: REQUIRED_TERMINAL_ACTION_COUNT,
    fixtures: plan.requiredFixtureSubjectKeys.length,
    captures: plan.requiredCaptureNames.length,
    screenshots: plan.requiredScreenshotPaths.length,
    assertions: Object.values(plan.requiredAssertions).flat().length,
    expandedCleanupActions: cleanup.length,
    executableTypeCounts: executableCounts,
    oneLoopReceipts: oneLoopTrace.actionReceipts.length,
    negativeCases,
  });
}

if (
  process.argv[1]?.endsWith("/task-540-smoke-contract.mjs") &&
  process.argv.includes("--self-test")
) {
  process.stdout.write(JSON.stringify(runTask540SmokeContractSelfTest()));
}
