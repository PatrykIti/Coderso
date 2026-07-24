import { deepFreezeExact } from "./core.mjs";

export const NONCE_PATTERN = /^[a-f0-9]{12}$/;

export const ACTION_KEYS = Object.freeze([
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

export const EXECUTABLE_KEYS_BY_TYPE = deepFreezeExact({
  "runtime-operation": ["type", "operationId", "refs"],
  "browser-run-code": ["type", "sourceId", "refs"],
  "browser-native": ["type", "operationId", "refs"],
  "browser-screenshot": ["type", "screenshotId", "fullPage"],
  "browser-global-list": ["type"],
});

export const REQUIRED_EXECUTABLE_TYPE_COUNTS = deepFreezeExact({
  "runtime-operation": 76,
  "browser-run-code": 392,
  "browser-native": 14,
  "browser-screenshot": 13,
  "browser-global-list": 1,
});

export const REQUIRED_NATIVE_ACTION_IDS = Object.freeze([
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

export const BROWSER_NATIVE_OPERATION_IDS = Object.freeze([
  "open-about-blank",
  "fill-secret",
  "tab-new",
  "tab-select",
  "tab-close",
  "route-list",
  "close",
]);

export const REQUIRED_GLOBAL_LIST_ACTION_IDS = Object.freeze(["end-007-session-absence"]);

export const REQUIRED_SCENARIOS = Object.freeze([
  "button-image",
  "tabs-content",
  "tabs-keyboard-aria",
  "space-selection",
  "dirty-guards",
  "related-retry-cache",
  "responsive-users",
]);

export const REQUIRED_FLOW_ACTION_COUNTS = Object.freeze({
  "button-image": 76,
  "tabs-content": 49,
  "tabs-keyboard-aria": 36,
  "space-selection": 35,
  "dirty-guards": 49,
  "related-retry-cache": 54,
  "responsive-users": 135,
});

export const REQUIRED_SETUP_ACTION_COUNT = 55;
export const REQUIRED_FLOW_ACTION_COUNT = 434;
export const REQUIRED_TERMINAL_ACTION_COUNT = 7;
export const REQUIRED_ACTION_COUNT = 496;

export const REQUIRED_FIXTURE_SUBJECT_KEYS = Object.freeze([
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

export const REQUIRED_CAPTURE_NAMES = Object.freeze([
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

export const REQUIRED_RUNTIME_BLOCK_CAPTURES = Object.freeze([
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

export const REQUIRED_FIXTURE_REF_PATHS = Object.freeze([
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

export const REQUIRED_ISOLATED_API_ACTION_IDS = Object.freeze([
  "set-011b-bootstrap-api-login",
  "set-011c-bootstrap-csrf-capture",
  "ru-043b-a-api-login",
  "ru-043c-a-api-csrf-capture",
  "ru-047a-a-durable-proof",
  "ru-050-a-server-false",
  "ru-051-a-server-false-proof",
  "ru-061a-a-durable-bypass-read",
]);

export const REQUIRED_SIGNOUT_SETTLEMENT_IDS = Object.freeze([
  "ru-040a-bootstrap-signout-settled",
  "ru-066a-a-signout-settled",
  "ru-076a-b-signout-settled",
  "ru-090a-a-exit-signout-settled",
  "ru-102a-b2-signout-settled",
]);

export const REQUIRED_METADATA_STATE_VALUES = deepFreezeExact({
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

export const MAX_PREFERENCE_UNMOUNT_WINDOW_MS = 20_000;
export const SCREEN_PREFERENCE_SETTLED_RETENTION_MS = 30_000;
export const AUTH_RATE_ALWAYS_PRODUCER_KINDS = Object.freeze([
  "goto",
  "tab-new",
  "isolatedApiSessionLogin",
  "isolatedApiSessionCsrfCapture",
]);
export const AUTH_RATE_ALWAYS_PRODUCER_BUILDERS = Object.freeze([
  "apiPublicRead(auth-bot-protection)",
  "click(S.loginSubmit)",
  "click(S.signOut)",
  "click(S.builderSave)",
  "click(S.presentationSave)",
  "click(S.secondTabSave)",
]);
export const AUTH_RATE_CONDITIONAL_CSRF_ACTIONS = deepFreezeExact({
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
export const AUTH_RATE_COSTS_BY_ACTION = deepFreezeExact({
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
export const REQUIRED_AUTH_RATE_PLAN = deepFreezeExact({
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

export const REQUIRED_ROUTE_KEYS = Object.freeze([
  "media-prior-resolution",
  "entry-save-failure",
  "related-first-failure",
  "related-a-refresh",
  "preference-a-read-refresh",
  "preference-a-write-exit",
]);

export const REQUIRED_BUILDER_KIND_COUNTS = deepFreezeExact({
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

export const REQUIRED_SMOKE_ASSERTIONS = deepFreezeExact({
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
