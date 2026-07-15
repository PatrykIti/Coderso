# TASK-540-05-L02: Scope Screen Preferences Through User Settings

# FileName: TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** User Settings / Custom Screens / Privacy
**Estimated Effort:** Medium
**Dependencies:** TASK-540-05-L01
**Status:** ✅ Done
**Started:** 2026-07-14
**Completed:** 2026-07-14
**Revalidation:** 2026-07-14 — `core` lint/typecheck, root typecheck, exact six-file Vitest matrix 65/65, DB preflight, exact three-file Bun matrix 27/27 (162 expectations), and `git diff --check` all green
**Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings on the corrected working tree
**Previous Completion:** 2026-07-14
**Previous Targeted Gate:** 2026-07-14 — `core lint:types`, `core lint`, root `tsc`, the exact six-file Vitest matrix (64/64), the exact two-file Bun/DB matrix (20/20), and `git diff --check`
**Reopened:** 2026-07-14 (trusted cross-origin Admin preflight must allow the expected-user header)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/settings/userSettingsService.ts`
- new Bun-free `core/services/settings/screenEntryPreferencesContract.ts`
- new Bun-free `core/admin/services/adminAuthIdentity.ts`, the route-persistent
  authenticated-identity epoch publisher/subscription boundary
- `core/admin/services/userSettingsClient.ts`
- `core/admin/ui/contexts/AdminAuthContext.tsx`, limited to publishing the
  provider's exact `user.id`/null identity in a publish-only layout effect and
  clearing it from a separate stable-token cleanup-only unmount effect; permission
  behavior and public context shape stay unchanged
- `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts`
- `core/server/routes/userSettingsRoutes.ts`, limited to the optional
  `X-Coderso-Expected-User-Id` PATCH guard after session auth and before the
  first settings write
- `core/server/httpServer.ts`, limited to the central `errorResponse` mapping for
  `user_settings_key_invalid`, `user_settings_value_invalid`, and
  `user_setting_identity_changed`
- `core/services/settings/securitySettings.ts` and
  `core/server/middleware/cors.ts`, limited to making
  `X-Coderso-Expected-User-Id` a case-insensitive server-required CORS header while
  preserving every configured header and supporting already-persisted settings
- `tests/integration/routes/cors.test.ts`, limited to trusted-origin OPTIONS coverage
  for that backward-compatible required-header union
- compatibility-expectation updates required before this source gate in
  `tests/unit/settings/userSettingsService.test.ts`,
  `tests/vitest/admin/userSettingsClient.test.ts`,
  `tests/vitest/ui/use-screen-entry-preferences.test.ts`, and
  `tests/integration/routes/userSettings.test.ts`
- new sole-owner UI integration suite
  `tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx`
- new `tests/vitest/ui/admin-auth-identity.test.tsx`, limited to the
  route-persistent provider publisher's A/B/null/unmount and stale-cleanup
  semantics
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`, limited to adding the new
  required `UserSettings` key to its typed aggregate fixture; its Assistant behavior
  assertions remain read-only

`tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` is a
read-only compatibility gate here. TASK-540-04-L03 is its sole writer and removes
the stale localStorage-specific assertion before this leaf starts; this leaf must
not edit it. The new persistence suite remains the only UI integration test this leaf
creates or edits; the reopened correction additionally owns only the narrow CORS route
test named above.

No new user-settings endpoint or DB schema edit is needed. The existing PATCH route
compares the optional expected-owner header with its already authenticated
`ctx.user.id`; omission preserves every legacy caller, while the Screen transport
always sends it. Keep all three plain machine-readable error mappings at the real
central `httpServer.ts` boundary. Trusted cross-origin Admin deployments must also pass
browser preflight: the CORS middleware unions the expected-owner header into configured
allowed headers case-insensitively at response time, so already-persisted settings work,
and the default settings include it for new/default configurations. Update the named
behavior tests before this leaf's gate; TASK-540-06 owns source-of-truth docs and only
aggregate test additions.

## Grounded anchors

- Service key/value map, defaults, allowlist, validator:
  `userSettingsService.ts:33-80,99-260`.
- DB rows are already scoped by `userId`: `:263-320`.
- Client typed map/cache/write: `userSettingsClient.ts:12-24,31-85`.
- Current global localStorage-only hook:
  `useScreenEntryPreferences.ts:3-77`.
- Route-persistent provider mount and provider source:
  `AdminApp.tsx:1212-1234`, `AdminAuthContext.tsx:1-47`.
- Existing L03-owned transport-neutral hook call site, read-only in this leaf:
  `CustomScreenEntryEditor.tsx:717-719`.
- Additional exact `UserSettings` fixture which must compile with the new required key:
  `assistant-panel-interaction.test.tsx:81-107`.
- Existing self-scoped routes: `userSettingsRoutes.ts:33-56` and
  strict envelope `settingsSchemas.ts:16-23`.
- Request headers are lower-cased into the shared route context before auth,
  rate-limit, CSRF, and handlers run: `router.ts:1-15`,
  `httpServer.ts:348-428`.
- Central runtime boundary and middleware order: `httpServer.ts:110-170,378-428`;
  today both user-settings service errors miss `errorResponse` and become 500.

## Implementation Pseudocode

Use the key `customScreens.entry.preferences`. The new Bun-free contract module owns the
stored/view shapes, defaults, validation, and conversion without importing DB/admin code:

```ts
export type ScreenEntryPreferencesSettingValue = {
  version: 1;
  showFieldMetadata: boolean;
};

export type ScreenEntryPreferences = {
  showFieldMetadata: boolean;
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES: ScreenEntryPreferences = {
  showFieldMetadata: false,
};

export const DEFAULT_SCREEN_ENTRY_PREFERENCES_SETTING = {
  version: 1,
  showFieldMetadata: false,
} as const;

// Preserve the pre-existing public view normalizer. It accepts the versionless
// hook/UI shape and keeps its coerce-to-default compatibility behavior.
export function normalizeScreenEntryPreferences(value: unknown): ScreenEntryPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_SCREEN_ENTRY_PREFERENCES;
  }
  const record = value as Record<string, unknown>;
  return {
    showFieldMetadata:
      typeof record.showFieldMetadata === "boolean"
        ? record.showFieldMetadata
        : DEFAULT_SCREEN_ENTRY_PREFERENCES.showFieldMetadata,
  };
}

// Stored transport/service values are a separate strict, versioned contract.
export function normalizeScreenEntryPreferencesSetting(
  value: unknown
): ScreenEntryPreferencesSettingValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("user_settings_value_invalid");
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some(
    (key) => key !== "version" && key !== "showFieldMetadata"
  )) {
    throw new Error("user_settings_value_invalid");
  }
  if (record.version !== 1 || typeof record.showFieldMetadata !== "boolean") {
    throw new Error("user_settings_value_invalid");
  }
  return { version: 1, showFieldMetadata: record.showFieldMetadata };
}

export function toScreenEntryPreferencesView(
  value: ScreenEntryPreferencesSettingValue
): ScreenEntryPreferences {
  return { showFieldMetadata: value.showFieldMetadata };
}

export function toScreenEntryPreferencesSetting(
  value: ScreenEntryPreferences
): ScreenEntryPreferencesSettingValue {
  return { version: 1, showFieldMetadata: value.showFieldMetadata };
}

// adminAuthIdentity.ts: the route-persistent provider, not a Screen consumer,
// owns this identity epoch. A publisher token prevents a stale provider cleanup
// from clearing a newer provider instance.
export type AdminAuthIdentitySnapshot = Readonly<{
  userId: string | null;
  epoch: number;
}>;
type AdminAuthIdentityListener = (next: AdminAuthIdentitySnapshot) => void;

let adminAuthIdentity: AdminAuthIdentitySnapshot = { userId: null, epoch: 0 };
let activeAdminAuthPublisher: symbol | null = null;
const adminAuthIdentityListeners = new Set<AdminAuthIdentityListener>();

export function getAdminAuthIdentity(): AdminAuthIdentitySnapshot {
  return adminAuthIdentity;
}

export function subscribeAdminAuthIdentity(
  listener: AdminAuthIdentityListener
): () => void {
  adminAuthIdentityListeners.add(listener);
  return () => adminAuthIdentityListeners.delete(listener);
}

export function publishAdminAuthIdentity(
  publisher: symbol,
  userId: string | null
): AdminAuthIdentitySnapshot {
  if (
    activeAdminAuthPublisher === publisher &&
    adminAuthIdentity.userId === userId
  ) return adminAuthIdentity;
  activeAdminAuthPublisher = publisher;
  adminAuthIdentity = { userId, epoch: adminAuthIdentity.epoch + 1 };
  for (const listener of adminAuthIdentityListeners) listener(adminAuthIdentity);
  return adminAuthIdentity;
}

export function clearAdminAuthIdentity(publisher: symbol): void {
  if (activeAdminAuthPublisher !== publisher) return;
  activeAdminAuthPublisher = null;
  adminAuthIdentity = { userId: null, epoch: adminAuthIdentity.epoch + 1 };
  for (const listener of adminAuthIdentityListeners) listener(adminAuthIdentity);
}

// AdminAuthContext.tsx: AdminApp keeps this provider mounted above route
// elements. Identity publication and provider-unmount cleanup are separate so
// A→B performs exactly one publish/epoch advance and never emits transitional null.
// A Screen hook unmount does not own or clear global auth identity.
const [authIdentityPublisher] = useState(() => Symbol("admin-auth-provider"));
useLayoutEffect(() => {
  publishAdminAuthIdentity(authIdentityPublisher, user?.id ?? null);
}, [authIdentityPublisher, user?.id]);
useLayoutEffect(
  () => () => clearAdminAuthIdentity(authIdentityPublisher),
  [authIdentityPublisher]
);

// userSettingsRoutes.ts: extend its local RouteContext with the already supplied
// shared-router header shape; do not add a new route or request-body field.
type RouteContext = {
  // existing params/query/body/user fields stay byte-identical
  headers?: Record<string, string | undefined>;
};

// headersObj is lower-cased by httpServer. This guard is
// optional for compatibility, but every Screen PATCH sends it. Compare before
// validation/setUserSetting so a stale A owner under session B performs no write.
const expectedUserId = ctx.headers?.["x-coderso-expected-user-id"];
if (expectedUserId !== undefined && expectedUserId !== ctx.user.id) {
  throw new Error("user_setting_identity_changed");
}

// httpServer.ts: keep these narrow mappings at the actual central boundary.
if (error.message === "user_setting_identity_changed") {
  return jsonResponse(
    toErrorResponse(
      new ApiError(
        "user_setting_identity_changed",
        "Authenticated user changed",
        409
      )
    ),
    { status: 409 }
  );
}
if (
  error.message === "user_settings_key_invalid" ||
  error.message === "user_settings_value_invalid"
) {
  const code = error.message;
  const message =
    code === "user_settings_key_invalid"
      ? "Invalid user setting key"
      : "Invalid user setting value";
  return jsonResponse(toErrorResponse(new ApiError(code, message, 400)), {
    status: 400,
  });
}

// userSettingsClient.ts: validate the untrusted JSON envelope before the generic
// return type is allowed to describe it. Value validation remains domain-owned;
// the Screen hook applies normalizeScreenEntryPreferencesSetting below.
function normalizeIsolatedUserSettingResponse<K extends keyof UserSettings>(
  expectedKey: K,
  payload: unknown
): { key: K; value: unknown } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("user_settings_response_invalid");
  }
  const record = payload as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !("key" in record) ||
    !("value" in record) ||
    record.key !== expectedKey
  ) {
    throw new Error("user_settings_response_invalid");
  }
  return { key: expectedKey, value: record.value };
}

// These exact self-scoped transports never inspect, merge, invalidate, or
// populate the process-global aggregate userSettingsReadCache.
export async function getUserSettingIsolated<K extends keyof UserSettings>(
  key: K
): Promise<{ key: K; value: UserSettings[K] }> {
  const payload = await apiRequest<unknown>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
  const response = normalizeIsolatedUserSettingResponse(key, payload);
  return { key: response.key, value: response.value as UserSettings[K] };
}

export async function setUserSettingIsolated<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
  options: Readonly<{ expectedUserId: string; signal?: AbortSignal }>
): Promise<{ key: K; value: UserSettings[K] }> {
  const payload = await apiRequest<unknown>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Coderso-Expected-User-Id": options.expectedUserId,
      },
      body: JSON.stringify({ value }),
      signal: options.signal,
    },
    { withCsrf: true }
  );
  const response = normalizeIsolatedUserSettingResponse(key, payload);
  return { key: response.key, value: response.value as UserSettings[K] };
}

// securitySettings.ts includes the header in defaults. cors.ts also owns a
// server-required union so older persisted allowedHeaders arrays remain usable.
const REQUIRED_ADMIN_CORS_HEADERS = ["x-coderso-expected-user-id"] as const;

function allowedCorsHeaders(configured: readonly string[]) {
  const byLowerCase = new Map(configured.map((header) => [header.toLowerCase(), header]));
  for (const required of REQUIRED_ADMIN_CORS_HEADERS) {
    if (!byLowerCase.has(required)) byLowerCase.set(required, required);
  }
  return [...byLowerCase.values()];
}

// A trusted-origin OPTIONS response lists content-type, x-csrf-token, and the
// expected-user header even when its supplied config models an older persisted value.
headers.set("Access-Control-Allow-Headers", allowedCorsHeaders(config.allowedHeaders).join(", "));

type PreferenceVersion = Readonly<{
  generation: number;
  pruneEpoch: number;
}>;
type LocalPreferenceView = PreferenceVersion &
  Readonly<{ view: ScreenEntryPreferences }>;
type ScopedPreferenceViews = ReadonlyMap<string, LocalPreferenceView>;
type PreferenceWriteOutcome =
  | Readonly<{ ok: true; preferences: ScreenEntryPreferences }>
  | Readonly<{ ok: false; reason: "identity_changed" | "transport" }>;
type PreferenceCoordinatorSnapshot = LocalPreferenceView &
  Readonly<{
    phase: "pending" | "succeeded" | "failed" | "hydrated";
    tail: Promise<PreferenceWriteOutcome> | null;
  }>;
type CoordinatedPreferenceRead = PreferenceVersion &
  Readonly<{
    authEpoch: number;
    promise: Promise<ScreenEntryPreferences>;
  }>;
type PreferencePruneTombstone = Readonly<{
  epoch: number;
  prunedVersion: PreferenceVersion;
  view: ScreenEntryPreferences;
}>;
type ActivePreferenceTransport = Readonly<{
  userId: string;
  authEpoch: number;
  controller: AbortController;
}>;

// Module-scoped authority is shared by all hook instances. Every value remains
// keyed by authenticated user identity; none enters browser storage or the
// aggregate user-settings cache.
const preferenceStateByUser = new Map<string, PreferenceCoordinatorSnapshot>();
const preferenceGenerationByUser = new Map<string, number>();
const preferenceListenersByUser = new Map<string, Set<() => void>>();
const preferenceReadByUser = new Map<string, CoordinatedPreferenceRead>();
const preferencePruneTimerByUser = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
const preferencePruneEpochByUser = new Map<string, number>();
const preferencePruneTombstoneByUser = new Map<
  string,
  PreferencePruneTombstone
>();
const activePreferenceTransports = new Map<symbol, ActivePreferenceTransport>();
let preferenceAuthIdentity = getAdminAuthIdentity();
// Module-scoped subscription survives the last Screen consumer unmount. The
// route-persistent provider can therefore cancel A work while no Screen hook is
// mounted. App/provider teardown publishes null through the same path.
subscribeAdminAuthIdentity((next) => {
  preferenceAuthIdentity = next;
  for (const transport of activePreferenceTransports.values()) {
    if (
      transport.userId !== next.userId ||
      transport.authEpoch !== next.epoch
    ) transport.controller.abort();
  }
});
export const SCREEN_PREFERENCE_SETTLED_RETENTION_MS = 30_000;

function preferencesEqual(
  left: ScreenEntryPreferences,
  right: ScreenEntryPreferences
): boolean {
  return left.showFieldMetadata === right.showFieldMetadata;
}

function versionsEqual(
  left: PreferenceVersion,
  right: PreferenceVersion
): boolean {
  return (
    left.generation === right.generation &&
    left.pruneEpoch === right.pruneEpoch
  );
}

function getPreferencePruneEpoch(userId: string): number {
  return preferencePruneEpochByUser.get(userId) ?? 0;
}

function getPreferenceGeneration(userId: string): number {
  return preferenceGenerationByUser.get(userId) ?? 0;
}

function isPreferenceAuthIdentityCurrent(
  userId: string,
  authEpoch: number
): boolean {
  return (
    preferenceAuthIdentity.userId === userId &&
    preferenceAuthIdentity.epoch === authEpoch
  );
}

function capturePreferenceAuthIdentity(
  userId: string
): AdminAuthIdentitySnapshot | null {
  return preferenceAuthIdentity.userId === userId
    ? preferenceAuthIdentity
    : null;
}

function cancelPreferencePrune(userId: string): void {
  const timer = preferencePruneTimerByUser.get(userId);
  if (timer !== undefined) clearTimeout(timer);
  preferencePruneTimerByUser.delete(userId);
}

function schedulePreferencePrune(userId: string): void {
  cancelPreferencePrune(userId);
  const expected = preferenceStateByUser.get(userId);
  if (!expected || expected.tail) return;
  const timer = setTimeout(() => {
    if (preferencePruneTimerByUser.get(userId) !== timer) return;
    preferencePruneTimerByUser.delete(userId);
    if (
      (preferenceListenersByUser.get(userId)?.size ?? 0) > 0 ||
      preferenceStateByUser.get(userId) !== expected
    ) return;
    if (preferenceReadByUser.has(userId)) {
      schedulePreferencePrune(userId);
      return;
    }
    const epoch = getPreferencePruneEpoch(userId) + 1;
    preferencePruneEpochByUser.set(userId, epoch);
    // Keep only a tombstone for the exact pruned snapshot. It synchronously
    // rejects an older hook-local fallback with the same generation but a
    // different value. A hook that stayed mounted may carry this exact view
    // across A→B→A; a new remount has no local copy and must read the server.
    preferencePruneTombstoneByUser.set(userId, {
      epoch,
      prunedVersion: {
        generation: expected.generation,
        pruneEpoch: expected.pruneEpoch,
      },
      view: normalizeScreenEntryPreferences(expected.view),
    });
    preferenceStateByUser.delete(userId);
    preferenceGenerationByUser.delete(userId);
  }, SCREEN_PREFERENCE_SETTLED_RETENTION_MS);
  preferencePruneTimerByUser.set(userId, timer);
}

function isLocalPreferenceRetained(
  userId: string,
  local: LocalPreferenceView | undefined
): local is LocalPreferenceView {
  if (!local) return false;
  const shared = preferenceStateByUser.get(userId);
  if (
    shared &&
    versionsEqual(local, shared) &&
    preferencesEqual(local.view, shared.view)
  ) return true;
  const tombstone = preferencePruneTombstoneByUser.get(userId);
  return Boolean(
    tombstone &&
      tombstone.epoch === getPreferencePruneEpoch(userId) &&
      versionsEqual(local, tombstone.prunedVersion) &&
      preferencesEqual(local.view, tombstone.view)
  );
}

function notifyPreferenceSubscribers(userId: string): void {
  for (const listener of preferenceListenersByUser.get(userId) ?? []) listener();
}

function publishPreferenceSnapshot(
  userId: string,
  snapshot: PreferenceCoordinatorSnapshot
): void {
  preferenceStateByUser.set(userId, snapshot);
  notifyPreferenceSubscribers(userId);
}

function subscribePreferenceCoordinator(
  userId: string,
  listener: () => void
): () => void {
  cancelPreferencePrune(userId);
  const listeners = preferenceListenersByUser.get(userId) ?? new Set();
  listeners.add(listener);
  preferenceListenersByUser.set(userId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    preferenceListenersByUser.delete(userId);
    // Pending work survives navigation. Settled state gets a bounded handoff
    // window before it is reduced to the exact-view prune tombstone above.
    if (preferenceStateByUser.get(userId)?.tail === null) {
      schedulePreferencePrune(userId);
    }
  };
}

function getPreferenceCoordinatorSnapshot(
  userId: string | null
): PreferenceCoordinatorSnapshot | null {
  return userId ? preferenceStateByUser.get(userId) ?? null : null;
}

function getOrCreatePreferenceRead(
  userId: string,
  authEpoch: number
): CoordinatedPreferenceRead {
  const generation = getPreferenceGeneration(userId);
  const pruneEpoch = getPreferencePruneEpoch(userId);
  const existing = preferenceReadByUser.get(userId);
  if (
    existing?.generation === generation &&
    existing.pruneEpoch === pruneEpoch &&
    existing.authEpoch === authEpoch
  ) return existing;

  const promise = isPreferenceAuthIdentityCurrent(userId, authEpoch)
    ? getUserSettingIsolated("customScreens.entry.preferences").then(
        ({ value }) =>
          toScreenEntryPreferencesView(
            normalizeScreenEntryPreferencesSetting(value)
          )
      )
    : Promise.reject(new Error("preference_identity_changed"));
  const read = { generation, pruneEpoch, authEpoch, promise };
  preferenceReadByUser.set(userId, read);
  const removeIfCurrent = (): void => {
    if (preferenceReadByUser.get(userId) !== read) return;
    preferenceReadByUser.delete(userId);
    if ((preferenceListenersByUser.get(userId)?.size ?? 0) === 0) {
      schedulePreferencePrune(userId);
    }
  };
  // Success, transport rejection, malformed envelope, and malformed stored
  // value all evict this exact registry entry. The current mounted effect stays
  // fail-closed and does not spin; a later identity visit or a fully fresh
  // remount creates a fresh GET.
  void promise.then(removeIfCurrent, removeIfCurrent);
  return read;
}

function enqueuePreferenceWrite(
  userId: string,
  authIdentity: AdminAuthIdentitySnapshot,
  view: ScreenEntryPreferences
): PreferenceVersion & Readonly<{ tail: Promise<PreferenceWriteOutcome> }> {
  const generation = getPreferenceGeneration(userId) + 1;
  const pruneEpoch = getPreferencePruneEpoch(userId);
  cancelPreferencePrune(userId);
  preferenceGenerationByUser.set(userId, generation);
  // A new write makes an older coordinated read unjoinable. Its identity-guarded
  // cleanup cannot delete a later read installed in the same slot.
  preferenceReadByUser.delete(userId);
  const previousTail = preferenceStateByUser.get(userId)?.tail;
  const start = previousTail
    ? previousTail.then(() => undefined, () => undefined)
    : Promise.resolve();
  let tail: Promise<PreferenceWriteOutcome>;
  tail = start
    .then(async (): Promise<PreferenceWriteOutcome> => {
      // This check is deliberately after the preceding tail. Capturing A at
      // enqueue time is insufficient because PATCH transport starts later.
      if (!isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)) {
        return { ok: false, reason: "identity_changed" };
      }
      const controller = new AbortController();
      const token = Symbol("screen-preference-write");
      activePreferenceTransports.set(token, {
        userId,
        authEpoch: authIdentity.epoch,
        controller,
      });
      try {
        if (!isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)) {
          controller.abort();
          return { ok: false, reason: "identity_changed" };
        }
        const { value } = await setUserSettingIsolated(
          "customScreens.entry.preferences",
          toScreenEntryPreferencesSetting(view),
          { expectedUserId: userId, signal: controller.signal }
        );
        if (!isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)) {
          return { ok: false, reason: "identity_changed" };
        }
        return {
          ok: true,
          preferences: toScreenEntryPreferencesView(
            normalizeScreenEntryPreferencesSetting(value)
          ),
        };
      } catch {
        return {
          ok: false,
          reason:
            controller.signal.aborted ||
            !isPreferenceAuthIdentityCurrent(userId, authIdentity.epoch)
              ? "identity_changed"
              : "transport",
        };
      } finally {
        const active = activePreferenceTransports.get(token);
        if (active?.controller === controller) {
          activePreferenceTransports.delete(token);
        }
      }
    })
    .then((outcome): PreferenceWriteOutcome => {
      const current = preferenceStateByUser.get(userId);
      if (
        current?.generation !== generation ||
        current.pruneEpoch !== pruneEpoch ||
        current.tail !== tail
      ) return outcome;
      const settled: PreferenceCoordinatorSnapshot = {
        generation,
        pruneEpoch,
        phase: outcome.ok ? "succeeded" : "failed",
        // A failed or malformed PATCH may retain only the captured normalized
        // local intent as unsynced state. No response-derived value is published.
        view: outcome.ok ? outcome.preferences : view,
        tail: null,
      };
      publishPreferenceSnapshot(userId, settled);
      if ((preferenceListenersByUser.get(userId)?.size ?? 0) === 0) {
        schedulePreferencePrune(userId);
      }
      return outcome;
    });
  publishPreferenceSnapshot(userId, {
    generation,
    pruneEpoch,
    phase: "pending",
    view,
    tail,
  });
  return { generation, pruneEpoch, tail };
}

function publishHydratedPreference(
  userId: string,
  version: PreferenceVersion,
  view: ScreenEntryPreferences
): boolean {
  const current = preferenceStateByUser.get(userId);
  if (
    getPreferenceGeneration(userId) !== version.generation ||
    getPreferencePruneEpoch(userId) !== version.pruneEpoch ||
    current?.tail ||
    current?.phase === "failed"
  ) return false;
  publishPreferenceSnapshot(userId, {
    ...version,
    phase: "hydrated",
    view,
    tail: null,
  });
  return true;
}

export function useScreenEntryPreferences(): Readonly<{
  preferences: ScreenEntryPreferences;
  setPreferences: (next: ScreenEntryPreferences) => void;
}> {
  const { user } = useAdminAuth();
  const userId = user?.id ?? null;
  const [observedByUser, setObservedByUser] =
    useState<ScopedPreferenceViews>(() => new Map());
  const [optimisticByUser, setOptimisticByUser] =
    useState<ScopedPreferenceViews>(() => new Map());
  // This state belongs only to this hook mount. It is neither keyed globally nor
  // transported/stored, and a fresh remount therefore starts from OFF again.
  const [noUserPreferences, setNoUserPreferences] =
    useState<ScreenEntryPreferences>(() => DEFAULT_SCREEN_ENTRY_PREFERENCES);
  const requestGeneration = useRef(0);
  const localUnsyncedByUser = useRef(new Map<string, LocalPreferenceView>());
  const currentUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const subscribe = useCallback(
    (listener: () => void): (() => void) =>
      userId
        ? subscribePreferenceCoordinator(userId, () => {
            // Layout cleanup wins over the later passive subscription cleanup.
            // A deferred coordinator publish in that window must not call any
            // React setter or notify useSyncExternalStore for this hook.
            if (!mountedRef.current || currentUserIdRef.current !== userId) return;
            const snapshot = getPreferenceCoordinatorSnapshot(userId);
            if (snapshot) {
              const exact: LocalPreferenceView = {
                generation: snapshot.generation,
                pruneEpoch: snapshot.pruneEpoch,
                view: normalizeScreenEntryPreferences(snapshot.view),
              };
              // Mirror generation + prune epoch + exact view before React's
              // render notification. Recording generation alone lets H1 revive
              // its old OFF view after H2 has published ON.
              setObservedByUser((current) => {
                const present = current.get(userId);
                if (
                  present &&
                  versionsEqual(present, exact) &&
                  preferencesEqual(present.view, exact.view)
                ) return current;
                const next = new Map(current);
                next.set(userId, exact);
                return next;
              });
              const localUnsynced = localUnsyncedByUser.current.get(userId);
              if (localUnsynced && !versionsEqual(localUnsynced, exact)) {
                localUnsyncedByUser.current.delete(userId);
                setOptimisticByUser((current) => {
                  if (!versionsEqual(current.get(userId) ?? exact, localUnsynced)) {
                    return current;
                  }
                  const next = new Map(current);
                  next.delete(userId);
                  return next;
                });
              }
            }
            listener();
          })
        : () => undefined,
    [userId]
  );
  const readSnapshot = useCallback(
    (): PreferenceCoordinatorSnapshot | null =>
      getPreferenceCoordinatorSnapshot(userId),
    [userId]
  );
  const sharedSnapshot = useSyncExternalStore(
    subscribe,
    readSnapshot,
    readSnapshot
  );
  const localOptimistic = userId ? optimisticByUser.get(userId) : undefined;
  const localObserved = userId ? observedByUser.get(userId) : undefined;
  const preferences = userId
    ? sharedSnapshot?.view ??
      (isLocalPreferenceRetained(userId, localOptimistic)
        ? localOptimistic.view
        : undefined) ??
      (isLocalPreferenceRetained(userId, localObserved)
        ? localObserved.view
        : undefined) ??
      DEFAULT_SCREEN_ENTRY_PREFERENCES
    : noUserPreferences;

  useLayoutEffect((): (() => void) => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect((): (() => void) => {
    // This hook tracks only its own render authority. AdminAuthProvider is the
    // sole identity-epoch publisher, so unmounting the final Screen consumer
    // cannot strand queued A work outside future A→B/null notifications.
    currentUserIdRef.current = userId;
    return () => {
      if (currentUserIdRef.current === userId) currentUserIdRef.current = null;
      requestGeneration.current += 1;
    };
  }, [userId]);

  useEffect((): (() => void) => {
    const capturedUserId = userId;
    const request = ++requestGeneration.current;
    const authIdentity = capturedUserId
      ? capturePreferenceAuthIdentity(capturedUserId)
      : null;
    let active = true;
    if (!capturedUserId || !authIdentity) return () => { active = false; };
    void (async (): Promise<void> => {
      // Re-read the tail after every await so a write appended while waiting is
      // also part of the returning identity's barrier.
      while (active) {
        const tail = preferenceStateByUser.get(capturedUserId)?.tail;
        if (!tail) break;
        await tail; // handled outcomes never reject
        if (
          !active ||
          currentUserIdRef.current !== capturedUserId ||
          requestGeneration.current !== request ||
          !isPreferenceAuthIdentityCurrent(
            capturedUserId,
            authIdentity.epoch
          )
        ) return;
      }

      const unsynced = localUnsyncedByUser.current.get(capturedUserId);
      if (
        isLocalPreferenceRetained(capturedUserId, unsynced) ||
        preferenceStateByUser.get(capturedUserId)?.phase === "failed"
      ) return;

      const coordinatedRead = getOrCreatePreferenceRead(
        capturedUserId,
        authIdentity.epoch
      );
      const readVersion: PreferenceVersion = {
        generation: coordinatedRead.generation,
        pruneEpoch: coordinatedRead.pruneEpoch,
      };
      const hydrated = await coordinatedRead.promise;
      const readIsAuthoritative = (): boolean =>
        active &&
        mountedRef.current &&
        currentUserIdRef.current === capturedUserId &&
        requestGeneration.current === request &&
        isPreferenceAuthIdentityCurrent(capturedUserId, authIdentity.epoch) &&
        getPreferenceGeneration(capturedUserId) === readVersion.generation &&
        getPreferencePruneEpoch(capturedUserId) === readVersion.pruneEpoch &&
        !preferenceStateByUser.get(capturedUserId)?.tail &&
        preferenceStateByUser.get(capturedUserId)?.phase !== "failed" &&
        !isLocalPreferenceRetained(
          capturedUserId,
          localUnsyncedByUser.current.get(capturedUserId)
        );
      if (!readIsAuthoritative()) return;
      if (
        !publishHydratedPreference(capturedUserId, readVersion, hydrated) ||
        !readIsAuthoritative()
      ) return;
      setObservedByUser((current) => {
        if (!readIsAuthoritative()) return current;
        const next = new Map(current);
        next.set(capturedUserId, { ...readVersion, view: hydrated });
        return next;
      });
      setOptimisticByUser((current) => {
        if (!readIsAuthoritative()) return current;
        const next = new Map(current);
        next.delete(capturedUserId);
        return next;
      });
    })().catch(() => undefined); // unavailable/invalid response => safe current/default view
    return () => { active = false; };
  }, [userId]);

  const setPreferences = useCallback(
    (next: ScreenEntryPreferences): void => {
      // Normalize both authenticated and no-user actions through the public view
      // contract. No-user actions update only mount-local ephemeral state.
      const normalized = normalizeScreenEntryPreferences(next);
      if (!userId) {
        setNoUserPreferences(normalized);
        return;
      }
      const capturedUserId = userId;
      const authIdentity = capturePreferenceAuthIdentity(capturedUserId);
      if (!authIdentity) return;
      // The public normalizer owns UI compatibility. Boolean(...) would turn an
      // invalid truthy value into an authored true and diverge from that contract.
      const { generation, pruneEpoch, tail } = enqueuePreferenceWrite(
        capturedUserId,
        authIdentity,
        normalized
      );
      const optimistic = { generation, pruneEpoch, view: normalized } as const;
      setOptimisticByUser((current) => {
        const nextByUser = new Map(current);
        nextByUser.set(capturedUserId, optimistic);
        return nextByUser;
      });
      localUnsyncedByUser.current.set(capturedUserId, optimistic);
      void tail.then((outcome): void => {
        const currentVersion: PreferenceVersion = {
          generation: getPreferenceGeneration(capturedUserId),
          pruneEpoch: getPreferencePruneEpoch(capturedUserId),
        };
        if (!versionsEqual(currentVersion, optimistic)) {
          // Drop only this hook's superseded marker/view. A newer generation from
          // this or another instance remains authoritative.
          const marker = localUnsyncedByUser.current.get(capturedUserId);
          if (marker && versionsEqual(marker, optimistic)) {
            localUnsyncedByUser.current.delete(capturedUserId);
            if (mountedRef.current) {
              setOptimisticByUser((current) => {
                const present = current.get(capturedUserId);
                if (!present || !versionsEqual(present, optimistic)) return current;
                const nextByUser = new Map(current);
                nextByUser.delete(capturedUserId);
                return nextByUser;
              });
            }
          }
          return;
        }
        if (!outcome.ok) {
          // Identity cancellation and transport failure are handled unsynced A
          // state. Neither auto-replays under B; a later explicit action while A
          // is current captures A's fresh epoch and safely retries.
          return;
        }
        const marker = localUnsyncedByUser.current.get(capturedUserId);
        if (marker && versionsEqual(marker, optimistic)) {
          localUnsyncedByUser.current.delete(capturedUserId);
        }
        if (!mountedRef.current) return;
        setObservedByUser((current) => {
          const latest: PreferenceVersion = {
            generation: getPreferenceGeneration(capturedUserId),
            pruneEpoch: getPreferencePruneEpoch(capturedUserId),
          };
          if (!versionsEqual(latest, optimistic)) return current;
          const nextByUser = new Map(current);
          nextByUser.set(capturedUserId, {
            ...optimistic,
            view: outcome.preferences,
          });
          return nextByUser;
        });
        setOptimisticByUser((current) => {
          const present = current.get(capturedUserId);
          if (!present || !versionsEqual(present, optimistic)) return current;
          const nextByUser = new Map(current);
          nextByUser.delete(capturedUserId);
          return nextByUser;
        });
      });
    },
    [userId]
  );
  return { preferences, setPreferences };
}
```

Both isolated helpers request `unknown`, reject non-exact `{key,value}` envelopes and
only then expose the requested generic key/value shape. `userSettingsService.ts`,
`UserSettings`, and the hook
import these exact types/helpers; the hook re-exports its pre-existing public view type,
default, and `normalizeScreenEntryPreferences` name from the Bun-free owner for source
compatibility. The public view normalizer remains versionless and coerce-to-default;
it is not an alias of the strict, versioned `normalizeScreenEntryPreferencesSetting`.
Both isolated GET and PATCH responses cross the exact-envelope guard and then the
Screen value crosses its strict stored-value normalizer before the hook may use it; a
TypeScript response generic is not runtime validation. The
PATCH `AbortSignal` is passed in the same `RequestInit` that `apiRequest` reuses for its
PATCH attempts. The existing CSRF-token fetch does not consume that signal and may
finish after identity cancellation; immediately afterward the initial or retry PATCH
still receives the already-aborted signal and emits no PATCH request. Every Screen
PATCH also sends `X-Coderso-Expected-User-Id` from its captured identity. If another
tab changes the cookie to B before this tab observes auth B, the server compares that
captured A header with authenticated B and returns
`user_setting_identity_changed`/409 before writing.
No `JSON_HEADERS`, `DEFAULT_WITHOUT_VERSION_VIEW`, `normalizeView`, `toView`, or `toStored`
placeholder remains.

Remove all reads/writes of
`coderso.screens.entry.preferences.v1`. Do not replace it with another global
browser key. The hook reads `user.id` from the existing `AdminAuthContext`; no caller
prop changes. The route-persistent `AdminAuthProvider` publishes identity before
passive Screen work. Its publish-only layout effect handles A/B/null prop values, while
a separate stable-token cleanup-only effect clears authority on actual provider
unmount; therefore A→B emits exactly one epoch/event and never an intermediate null.
Screen consumer unmount never clears that authority. `getUserSettingIsolated` and
`setUserSettingIsolated` are the only client functions this hook uses. Existing
aggregate-aware `getUserSetting` /
`setUserSetting` keep their legacy transport (or may delegate isolated GET only), and
only those aggregate-aware wrappers may touch `userSettingsReadCache`; they need not
send the optional expected-user header. The isolated Screen setter requires an exact
`expectedUserId` and always emits it. In particular, a delayed isolated PATCH from user
A cannot merge into an aggregate cache populated after a switch to user B. The existing
hook call site remains source-compatible.

## Security Contract

- Existing internal user-settings route family; authenticated session and
  server-derived `ctx.user.id` scope every read/write.
- PATCH retains CSRF and resolves to the existing `admin_write` rate-limit bucket;
  GET resolves to `admin_read`. Schema rejects unknown envelope keys and service
  rejects unknown setting keys plus unknown value keys/version/type.
- The optional `X-Coderso-Expected-User-Id` header is compared exactly with the
  already authenticated session user before the Screen write. Legacy omission remains
  accepted; every Screen PATCH sends the captured owner. A mismatch performs no write
  and returns machine-readable `user_setting_identity_changed` at HTTP 409.
- The central boundary returns `{error:{code,message}}` with status 400 for the
  exact `user_settings_key_invalid` and `user_settings_value_invalid` codes; it
  returns status 409 for exact `user_setting_identity_changed`. It does not expose
  a stack or turn any of those client errors into 500.
- No public mode, nonce/captcha, secret, entry content, or migration.
- With no authenticated identity, the hook's OFF→toggle behavior is strictly
  hook-mount-local: it makes no user-settings request, browser-storage write, or
  module-scoped publication and resets to OFF on a fresh remount.

## Error/compatibility flow

- Missing row returns server default. Invalid stored row falls back through the
  existing service behavior. A malformed runtime GET or PATCH response is rejected by
  the strict stored-value normalizer and no response-derived value can become hook
  state. For malformed PATCH, the normalized locally authored per-user optimistic view
  remains visible as failed/unsynced state; it is not evidence of response acceptance,
  never auto-replays, and only a later explicit setter action retries it.
- Network/auth failure leaves a functional in-memory default/current value and
  never leaks another user's cache or localStorage value. In the no-user case, the
  functional value is an ephemeral mount-local OFF default that may be toggled locally
  and resets on remount without transport or storage.
- A rejected GET, malformed exact envelope, or malformed Screen value removes only its
  identity-matched read-registry entry on settlement. The same mounted effect remains
  fail-closed and does not auto-loop. Fully unmounting and freshly mounting the Screen
  consumer, or visiting another identity and returning, starts a fresh GET. A failed
  PATCH never self-replays: only a new visible setter action creates one new generation
  and retry attempt; failure followed by that fresh action can succeed.
- PATCH operations are serialized independently per user by a module-scoped
  coordinator shared across hook instances. Each intent captures `{userId, authEpoch}`
  when queued and rechecks it immediately before its delayed PATCH starts. The
  route-persistent provider—not a Screen hook—advances the module epoch for A→B/null
  and provider unmount, then aborts every old-epoch active transport. Consequently this
  still works after the last Screen consumer unmounts. A mere Screen-route navigation
  remount does not change provider identity. CSRF acquisition itself may finish, but
  every subsequent PATCH/retry receives the same already-aborted signal and emits zero
  PATCHes. The server expected-owner comparison independently closes the cross-tab
  cookie-change window. Identity cancellation resolves as handled unsynced A state and
  never auto-replays; a later explicit action while A is current captures the fresh A
  epoch and retries safely.
- A newer same-user toggle waits for the prior handled outcome and is persisted in UI
  order, so a slow ON cannot overwrite a later OFF across rapid actions, same-user
  navigation remounts, or two concurrent consumers. Failure of an earlier PATCH does
  not block the later queued PATCH. Only the current `{generation, pruneEpoch, tail}` may
  settle shared state, and every tail resolves to a handled outcome.
- A transition to a different user immediately derives the default and never exposes
  the prior user's state. Pending state survives the last unsubscribe until settlement.
  Settled state gets one identity-guarded 30-second render/subscription handoff window,
  cancelled by a subscriber or new write. Pruning removes shared state/generation and
  advances a persistent prune epoch while retaining a tombstone of the exact pruned
  `{generation, pruneEpoch, view}`.
- Every subscriber mirrors that exact triple before React's render notification. After
  pruning, the tombstone synchronously rejects any older/superseded hook-local fallback,
  including an H1 OFF value when H2's latest shared value was ON. A hook that remained
  mounted across A→B→A may continue painting only its exact tombstone-matching view while
  a fresh authoritative GET runs, so it need not flash default or stale H1 state. A new
  remount has no hook-local copy and therefore starts from the safe default and server
  GET. Tests must keep those two cases distinct; they must not demand no-default paint
  from a brand-new mount without Suspense or another synchronous durable source.
- Returning to the same user first waits until its shared write tail is stable. A
  replacement instance mounted before settlement renders the coordinator's pending view
  and cannot GET an older durable value. A failed or identity-cancelled latest tail keeps
  only that user's exact optimistic view plus unsynced marker. Superseded markers are
  compared by generation and prune epoch and removed by the shared subscription; mere
  marker presence never suppresses a newer read.
- If the server-side A value changed while B was active and A has no pending/unsynced
  write, the returning A read replaces A's retained exact view. Concurrent consumers
  join one GET only for the same `{userId, authEpoch, generation, pruneEpoch}`; a write
  invalidates that registry entry, and the settled promise is removed with an identity
  guard. GET may commit only while auth identity, request generation, write generation,
  prune epoch, tail absence, and unsynced absence remain unchanged, including inside the
  React state updater. The layout-bound identity guard rejects late A in the
  render(B)→passive-cleanup window, and a newer local A toggle beats delayed refresh.
- The isolated writer has no aggregate-cache side effect. Successful inactive-user
  work can update only its own keyed coordinator state; unmounted hooks never call React
  state setters. An undispatched A intent is cancelled by provider A→B/null even when no
  Screen consumer remains. If a stale tab nevertheless transports expected A with
  session B, the route returns 409 before persistence. Neither path can resurrect or
  mutate B's snapshot or aggregate cache.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `tests/unit/settings/userSettingsService.test.ts`: exact value schema,
  unknown/type/version rejection, per-user isolation/default; the strict stored
  normalizer rejects the versionless view while the separate public view normalizer
  accepts `{showFieldMetadata:boolean}` and preserves legacy coerce-to-default behavior.
- `tests/vitest/admin/userSettingsClient.test.ts`: exact isolated typed read/write exports;
  both bypass aggregate reads/writes; the setter forwards the exact caller
  `AbortSignal` and captured expected user as
  `X-Coderso-Expected-User-Id` in `RequestInit`, including the request object reused by
  the CSRF retry. Hold CSRF acquisition, abort, then release it and prove the CSRF GET
  may finish while the native/mock transport rejects the already-aborted PATCH before
  a server hit; repeat after a refreshable-CSRF response and prove the retry receives
  the already-aborted signal and produces zero further PATCH network hits.
  Both isolated helpers reject a non-object, missing/extra-key, or wrong-key response
  envelope before returning a value.
  Defer A's PATCH, populate aggregate state for B, resolve/abort A, and prove B's
  aggregate remains byte-identical.
- `tests/integration/routes/cors.test.ts`: a trusted-origin OPTIONS response built from
  an older configured header list still includes the expected-user header exactly once,
  case-insensitive configured duplicates do not duplicate it, and configured custom
  headers plus credentials/origin behavior remain unchanged. A separate assertion reads
  `SECURITY_SETTINGS_DEFAULTS.cors.allowedHeaders` and pins the new expected-user header
  in the default itself.
- `tests/vitest/ui/admin-auth-identity.test.tsx`: render the real
  `AdminAuthProvider`, assert exact A publication, no epoch change for a same-ID prop
  update, exactly one A→B publication/epoch advance with no transitional null, one null
  publication for an actual null prop, provider-unmount cleanup, and a stale old
  provider cleanup that cannot clear a newer publisher token. This suite tests only
  the boundary and does not duplicate the Screen coordinator.
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`: add only
  `"customScreens.entry.preferences": {version:1, showFieldMetadata:false}` to its
  typed complete-`UserSettings` fixture. Do not alter Assistant behavior assertions.
- `tests/vitest/ui/use-screen-entry-preferences.test.ts` owns the coordinator matrix:
  async hydrate; no localStorage; no-user mount-local OFF→toggle behavior with zero
  GET/PATCH/storage calls and reset to OFF after full remount; public-view normalization
  versus strict stored-setting normalization; invalid truthy input passed to the setter
  follows the public normalizer rather than `Boolean(...)`; malformed GET and PATCH
  response-derived values never enter state; a malformed PATCH retains the already
  normalized local per-user optimistic intent as failed/unsynced without auto-replay,
  then one later explicit setter action makes exactly one retry; optimistic
  success/failure/unmount; and no unhandled rejection or synchronous effect-body state
  update.
- The same hook suite serializes rapid ON→OFF and two opposite simultaneous same-user
  consumers (one PATCH in flight, deterministic server order, final durable/UI OFF),
  proves an earlier transport failure releases the later queued action, and proves a
  same-user Screen navigation remount under the still-mounted provider neither advances
  the auth epoch nor aborts pending work. Explicitly reject one GET/malformed envelope,
  prove the same mounted effect sends no retry loop, then fully remount (and separately
  visit B→A) and prove exactly one fresh GET succeeds. Reject one PATCH, prove no
  automatic retry, invoke the setter once more, and prove exactly one fresh PATCH
  succeeds. The replacement instance renders the shared pending value, performs no
  early GET, and revalidates only after settlement.
- Add the identity-race test explicitly: queue A ON then A OFF with the first PATCH
  unresolved, unmount the only Screen consumer while keeping the real provider mounted,
  rerender that provider A→B before the first tail releases, and then release it. Assert
  the active A signal is aborted, the queued second PATCH hit count remains zero, no A
  intent is emitted with B's session, and B remains default/unchanged even though no
  Screen consumer existed when identity changed. Both handled results retain only
  A-keyed unsynced state and never auto-replay. After returning to A, one explicit safe
  A action captures the fresh epoch and persists. Switching provider identity while
  CSRF acquisition/retry is waiting may let the CSRF GET finish, but every subsequent
  attempt receives the already-aborted signal and the PATCH hit count remains zero.
  Also reject an A GET/result settling in the render(B)→passive-cleanup window.
- Exercise shared-view retention non-symmetrically: H1 first observes durable OFF, only
  H2 publishes OFF→ON, and the coordinator callback mirrors exact ON plus its generation
  and prune epoch into both mounted consumers. Within the 30-second handoff, A→B→A
  renders ON with no default/old-OFF paint or redundant GET. After fake-timer pruning,
  the exact-view tombstone rejects H1's older OFF fallback; the same still-mounted hooks
  may carry only exact ON while one joined authoritative GET runs and then converge on
  its response. A changed server value replaces retained ON when no write is pending;
  a newer local toggle wins instead. By contrast, fully unmount those hooks after prune,
  create a fresh instance with no local exact view, and assert safe default plus a fresh
  GET before server convergence—do not impose the same-session no-default assertion on
  this new-remount case.
- Finish the hook matrix with an H1 failed write superseded by H2 success, cleanup of
  only the older `{generation, pruneEpoch}` marker/view, one GET shared by concurrent
  same-user hydrations, read-registry identity cleanup, state/generation/timer pruning,
  returning to A while A's tail is pending, failed/identity-cancelled A suppressing an
  older GET, and A/B keyed isolation for every delayed read/write result. Hold a
  coordinator settlement, run the hook's layout unmount cleanup while its passive
  subscription cleanup is still pending, then publish the settlement and prove the
  subscription wrapper observes `mountedRef.current === false`: zero React setters,
  zero listener notification, and no unmounted-update warning.
- `tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx`:
  mount the real entry toolbar under `AdminAuthProvider`, prove default OFF, toggle
  ON through the visible switch, await the isolated PATCH, remount as the same user
  and hydrate ON, then switch A→B and derive OFF immediately without reading or
  writing `coderso.screens.entry.preferences.v1`. On same-mounted-session B→A, render
  only A's exact latest keyed view during authoritative refresh; a changed response
  replaces it only when no newer local action exists. A fresh remount after prune starts
  safely from default and GET. Return while A's PATCH is pending waits for its tail;
  success revalidates durable A, while failure/identity cancellation preserves only A's
  unsynced view. Rapid visible ON→OFF persists in order with no concurrent PATCHes, and
  same-user navigation before settlement preserves pending UI. Deferred/cancelled A
  work cannot alter B and vice versa. This suite asserts visible switch state and owns
  the persistence/UI seam without duplicating the hook algorithm. It also keeps the
  provider mounted, removes the entry-toolbar consumer with A work queued, publishes B
  at the provider boundary, releases A's tail, and visibly proves B remains OFF while
  the queued A PATCH transport count is zero.
- `tests/integration/routes/userSettings.test.ts`: authenticated self-scope,
  strict `{value}` envelope, CSRF, `admin_read`/`admin_write` bucket selection,
  both 400 error mappings, and the expected-owner 409 mapping through the actual
  `startHttpServer` pipeline.
  Retain the route-registration assertion, then perform a DB preflight and start one
  real `startHttpServer({port:0})`. Resolve `adminPath` and the request `Host` from the
  configured `site.adminBaseUrl` with the bound host as fallback. Create two unique
  users and sessions through `createSession`, issue per-session CSRF values with
  `createCsrfToken` + `setCsrfToken`, and send the real session cookie, CSRF header, Host,
  and a suite-unique `User-Agent` marker on every request.
- Reset `resetRateLimitBuckets()` before and after the HTTP suite; pin GET/PATCH bucket
  selection with `resolveRateLimitBucket` and exercise both methods through the real
  middleware pipeline. Write different values through the two sessions and prove each
  GET sees only its server-derived self-scope. Missing authentication is 401;
  missing/invalid CSRF is 403; `{value, extra}` is `validation_error` 400; unknown key
  and invalid preference value retain their exact machine-readable codes at 400. With
  session B authenticated, send expected-user A and a valid B CSRF token, assert exact
  `user_setting_identity_changed`/409, then GET as B and query B's exact settings row to
  prove no write occurred. Omit the header in one legacy PATCH and prove it retains its
  existing authenticated self-scope.
- Every HTTP request in this suite goes through one `trackedFetch` helper. The helper
  appends exactly one completed-request expectation only after receiving a response;
  no test may call `fetch` directly. Use this executable shape (names may differ, values
  and invariants may not):

```ts
type AccessLogIdentity = Readonly<{
  userId: string | null;
  sessionId: string | null;
}>;
type ExpectedAccessLog = Readonly<{
  method: string;
  path: string;
  status: number;
  identity: AccessLogIdentity;
}>;

const ACCESS_LOG_POLL_CADENCE_MS = 50;
const ACCESS_LOG_MIN_QUIET_MS = 250;
const ACCESS_LOG_POLL_TIMEOUT_MS = 5_000;
const ACCESS_LOG_REQUIRED_STABLE_POLLS = 3;
const accessLogMarker = `wf540-user-settings-${crypto.randomUUID()}`;
const completedRequestLedger: ExpectedAccessLog[] = [];

async function trackedFetch(
  input: string | URL,
  init: RequestInit,
  expected: ExpectedAccessLog
): Promise<Response> {
  const request = new Request(input, init);
  if (
    request.method.toUpperCase() !== expected.method ||
    new URL(request.url).pathname !== expected.path ||
    request.headers.get("user-agent") !== accessLogMarker
  ) throw new Error("access_log_request_ledger_invalid");
  const response = await fetch(request);
  // Record the declared expectation after the request completes but before its
  // response assertion, so a wrong response status is still represented in
  // cleanup and fails the DB multiset comparison rather than becoming unowned.
  completedRequestLedger.push(expected);
  expect(response.status).toBe(expected.status);
  return response;
}

function accessLogSignature(value: {
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}): string {
  return JSON.stringify([
    value.method,
    value.path,
    value.status,
    value.userId,
    value.sessionId,
  ]);
}

function expectedAccessLogSignature(value: ExpectedAccessLog): string {
  return accessLogSignature({
    method: value.method,
    path: value.path,
    status: value.status,
    userId: value.identity.userId,
    sessionId: value.identity.sessionId,
  });
}
```

The polling helper is dependency-injected for deterministic failure tests and follows
this state machine; `isSubmultiset` and `sameArray` compare counted sorted strings, not
truthy presence:

```ts
type AccessLogCandidate = Readonly<{
  id: string;
  userAgent: string | null;
  method: string;
  path: string;
  status: number;
  userId: string | null;
  sessionId: string | null;
}>;
type PollDeps = Readonly<{
  query: () => Promise<readonly AccessLogCandidate[]>;
  deleteExactIds: (ids: readonly string[]) => Promise<void>;
  now: () => number;
  wait: (ms: number) => Promise<void>;
}>;
type AccessLogScope = Readonly<{
  marker: string;
  userIds: ReadonlySet<string>;
  sessionIds: ReadonlySet<string>;
}>;
type StableAccessLogInventory = Readonly<{
  ids: readonly string[];
  behaviorError:
    | "access_log_missing"
    | "access_log_extra"
    | "access_log_late"
    | "access_log_unstable"
    | null;
  scopeInvalid: boolean;
}>;

function sameArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isSubmultiset(
  actual: readonly string[],
  expected: readonly string[]
): boolean {
  const remaining = new Map<string, number>();
  for (const value of expected) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  for (const value of actual) {
    const count = remaining.get(value) ?? 0;
    if (count === 0) return false;
    remaining.set(value, count - 1);
  }
  return true;
}

function isOwnedAccessLogCandidate(
  row: AccessLogCandidate,
  scope: AccessLogScope
): boolean {
  return (
    row.userAgent === scope.marker ||
    (row.userId !== null && scope.userIds.has(row.userId)) ||
    (row.sessionId !== null && scope.sessionIds.has(row.sessionId))
  );
}

async function observeStableAccessLogInventory(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[]
): Promise<StableAccessLogInventory> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  const expected = [...expectedSignatures].sort();
  let stableIds: readonly string[] | null = null;
  let stableSince = 0;
  let stablePolls = 0;
  let everExact = false;
  let changedAfterExact = false;
  let scopeInvalid = false;

  while (deps.now() <= deadline) {
    const rows = await deps.query();
    const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
    scopeInvalid ||= ownedRows.length !== rows.length;
    const rawIds = ownedRows.map((row) => row.id);
    scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
    const ids = [...new Set(rawIds)].sort();
    const actual = ownedRows.map(accessLogSignature).sort();
    const exact = ownedRows.length === expected.length && sameArray(actual, expected);

    if (!stableIds) {
      stableIds = ids;
      stableSince = deps.now();
      stablePolls = 1;
    } else if (!sameArray(ids, stableIds)) {
      if (everExact) changedAfterExact = true;
      stableIds = ids;
      stableSince = deps.now();
      stablePolls = 1;
    } else {
      stablePolls += 1;
    }
    if (exact) everExact = true;
    if (
      stablePolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
      deps.now() - stableSince >= ACCESS_LOG_MIN_QUIET_MS
    ) {
      return {
        ids: stableIds,
        behaviorError: changedAfterExact
          ? "access_log_late"
          : exact
            ? null
            : isSubmultiset(actual, expected)
              ? "access_log_missing"
              : "access_log_extra",
        scopeInvalid,
      };
    }
    if (deps.now() >= deadline) {
      return {
        ids: stableIds ?? [],
        behaviorError: "access_log_unstable",
        scopeInvalid,
      };
    }
    await deps.wait(
      Math.max(
        0,
        Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())
      )
    );
  }
  return {
    ids: stableIds ?? [],
    behaviorError: "access_log_unstable",
    scopeInvalid,
  };
}

async function drainExactAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  initialIds: readonly string[]
): Promise<{
  lateAfterDelete: boolean;
  scopeInvalid: boolean;
  cleanupError: Error | null;
}> {
  const deadline = deps.now() + ACCESS_LOG_POLL_TIMEOUT_MS;
  let pendingIds = [...initialIds];
  let quietSince = deps.now();
  let emptyPolls = 0;
  let lateAfterDelete = false;
  let scopeInvalid = false;
  const cleanupErrors: Error[] = [];
  try {
    while (deps.now() <= deadline) {
      if (pendingIds.length > 0) {
        await deps.deleteExactIds(pendingIds);
        pendingIds = [];
      }
      const rows = await deps.query();
      const ownedRows = rows.filter((row) => isOwnedAccessLogCandidate(row, scope));
      scopeInvalid ||= ownedRows.length !== rows.length;
      const rawIds = ownedRows.map((row) => row.id);
      scopeInvalid ||= new Set(rawIds).size !== rawIds.length;
      const ids = [...new Set(rawIds)].sort();
      if (ids.length > 0) {
        // Preserve the validation failure, but still clean only the newly observed
        // exact owned UUIDs before proving absence.
        lateAfterDelete = true;
        pendingIds = ids;
        quietSince = deps.now();
        emptyPolls = 0;
        continue;
      }
      emptyPolls += 1;
      if (
        emptyPolls >= ACCESS_LOG_REQUIRED_STABLE_POLLS &&
        deps.now() - quietSince >= ACCESS_LOG_MIN_QUIET_MS
      ) return { lateAfterDelete, scopeInvalid, cleanupError: null };
      if (deps.now() >= deadline) {
        break;
      }
      await deps.wait(
        Math.max(
          0,
          Math.min(ACCESS_LOG_POLL_CADENCE_MS, deadline - deps.now())
        )
      );
    }
  } catch (error) {
    cleanupErrors.push(
      error instanceof Error ? error : new Error("access_log_drain_failed")
    );
  }
  // A query can cross the deadline after discovering a final late row. Make one
  // last exact-ID deletion attempt before reporting that quiet absence could not
  // be proven. Never widen the delete predicate.
  if (pendingIds.length > 0) {
    try {
      await deps.deleteExactIds(pendingIds);
    } catch (error) {
      cleanupErrors.push(
        error instanceof Error ? error : new Error("access_log_exact_delete_failed")
      );
    }
  }
  cleanupErrors.push(new Error("access_log_absence_unstable"));
  return {
    lateAfterDelete,
    scopeInvalid,
    cleanupError:
      cleanupErrors.length === 1
        ? cleanupErrors[0]
        : new AggregateError(cleanupErrors, "access_log_drain_failed"),
  };
}

async function validateAndCleanupAccessLogs(
  deps: PollDeps,
  scope: AccessLogScope,
  expectedSignatures: readonly string[],
  cleanupExactSettingsSessionsAndUsers: () => Promise<void>
): Promise<void> {
  const deferredErrors: Error[] = [];
  let initialIds: readonly string[] = [];
  try {
    const inventory = await observeStableAccessLogInventory(
      deps,
      scope,
      expectedSignatures
    );
    initialIds = inventory.ids;
    if (inventory.behaviorError) {
      deferredErrors.push(new Error(inventory.behaviorError));
    }
    if (inventory.scopeInvalid) deferredErrors.push(new Error("access_log_scope_invalid"));
  } catch (error) {
    deferredErrors.push(
      error instanceof Error ? error : new Error("access_log_inventory_failed")
    );
  }

  const drained = await drainExactAccessLogs(deps, scope, initialIds);
  if (
    drained.scopeInvalid &&
    !deferredErrors.some(({ message }) => message === "access_log_scope_invalid")
  ) {
    deferredErrors.push(new Error("access_log_scope_invalid"));
  }
  if (drained.lateAfterDelete) {
    deferredErrors.push(new Error("access_log_late_after_delete"));
  }
  if (drained.cleanupError) {
    deferredErrors.push(drained.cleanupError);
  } else {
    try {
      // Exact owned access-log absence is already proven here.
      await cleanupExactSettingsSessionsAndUsers();
    } catch (cleanupError) {
      deferredErrors.push(
        cleanupError instanceof Error ? cleanupError : new Error("access_log_cleanup_failed")
      );
    }
  }

  if (deferredErrors.length === 1) throw deferredErrors[0];
  if (deferredErrors.length > 1) {
    throw new AggregateError(deferredErrors, "access_log_validation_failed");
  }
}
```

- Every call declares its expected method, pathname, status, and identity up front. The
  identity is `{userId,sessionId}` for the exact authenticated synthetic session that
  made the request and `{userId:null,sessionId:null}` only for the intended
  unauthenticated cases. Each request carries the same suite-unique exact User-Agent
  marker. Multiset comparison flattens `expected.identity`, preserves duplicate
  requests, compares sorted signature arrays rather than a `Set`, and requires
  `candidateRows.length === completedRequestLedger.length`. Invoke stable observation
  with `completedRequestLedger.map(expectedAccessLogSignature)`; the helper sorts its
  copy. A fetch rejected after transport dispatch therefore remains an explicit
  `access_log_extra` validation failure if its owned row exists outside the completed
  ledger; cleanup still owns that row by exact UUID.
- Teardown first stops the Bun server and awaits its close so no new synthetic request
  can start. Candidate polling selects rows whose User-Agent equals the exact marker OR
  whose user/session UUID equals one of the exact synthetic UUIDs. Every selected row
  must satisfy at least one of those ownership predicates and carry a unique UUID;
  otherwise fail `access_log_scope_invalid` without a broad delete. Stable observation
  never throws merely because the behavior signature is wrong: after the same sorted
  UUID set is seen in at least three 50 ms-separated polls across 250 ms, it returns the
  exact UUID inventory plus independent deferred behavior (`access_log_missing`,
  `access_log_extra`, `access_log_late`, or `access_log_unstable`) and scope-invalid
  results, so neither can mask the other. Normal pre-equality convergence such as
  `[] -> partial -> exact -> stable` passes; `access_log_late` begins only after the
  first complete ledger equality. Mixed owned/out-of-scope observations retain
  `access_log_scope_invalid` while inventorying only owned UUIDs. Constant churn until
  the 5-second deadline returns `access_log_unstable` together with the latest exact
  owned UUID inventory and any scope-invalid result. Both are retained, not swallowed.
- In a `finally` path, delete only the stable inventory's exact UUID array—never by
  marker, user/session predicate, path, or prefix. Whether validation passed, returned a
  mismatch, or threw after transport, run the same exact-scope query again. Each late
  owned row is recorded as `access_log_late_after_delete`, deleted only by its newly
  observed exact UUID, and resets the quiet window. Require three empty polls separated
  by 50 ms across at least 250 ms before leaving cleanup; failure within 5 seconds is
  `access_log_absence_unstable`. Only after exact absence may teardown delete the suite's
  exact settings rows, sessions, and users. After cleanup completes, rethrow the retained
  validation error so wrong behavior remains a failing test. Failure ordering is exact:
  original inventory/behavior error first, then scope-invalid, then late-after-delete;
  one error is rethrown directly and multiple are one ordered `AggregateError`. If the
  final query crosses the deadline after discovering owned rows, cleanup makes one last
  exact-ID deletion attempt and still reports `access_log_absence_unstable` because the
  quiet window was not proven. The structured drain result retains scope-invalid and
  late-after-delete alongside that cleanup error. A drain or exact-fixture cleanup
  failure is appended after those retained errors; it is never masked. Exact settings,
  session, and user cleanup runs only after the drain proves quiet owned-row absence.
- The integration file owns deterministic helper tests with injected query/clock/wait:
  an initially incomplete multiset followed by exact rows and a stable UUID ledger
  passes; stable missing, duplicate/extra signature, wrong status/path/identity, changed
  or late UUID, post-dispatch fetch rejection, and a row appearing during the absence
  window each preserve the exact validation error while still deleting only every
  observed owned UUID and proving final owned-scope absence. A mixed owned/out-of-scope
  result deletes every owned exact UUID, retains the out-of-scope row, and reports
  `access_log_scope_invalid`. A deadline-crossing final poll proves the last observed
  owned UUID receives one exact delete attempt and the ordered error contains scope,
  late, and absence/deletion cleanup signals. A `trackedFetch` test rejects a declared method/path/marker mismatch
  before transport and proves a wrong response status still leaves its declared
  completed expectation in the validation ledger. Passing and failing cleanup tests
  assert at least three cadence-separated observations plus the 250 ms quiet window,
  zero remaining exact-scope rows, and no broad delete.

TASK-540-04-L03 removes the stale global-localStorage assertion from its sole-owned
restyle suite before this leaf begins. Run that file read-only after the transport
switch to prove the entry-toolbar behavior remains compatible. TASK-540-06 may add
two-user end-to-end coverage later but must not re-baseline the exact no-browser-
storage, per-user, or delayed-request assertions above.

`CustomScreenEntryEditor.tsx` remains byte-identical in this leaf. TASK-540-04-L03 is its
sole writer and has already made the hook-call comment transport-neutral; this leaf only
changes the hook implementation behind that existing call site.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
./node_modules/.bin/vitest run --config vitest.config.ts \
  tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/ui/admin-auth-identity.test.tsx \
  tests/vitest/ui/assistant-panel-interaction.test.tsx \
  tests/vitest/ui/use-screen-entry-preferences.test.ts \
  tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
./node_modules/.bin/tsc -p tsconfig.json --noEmit
set -a && source .env && set +a
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts \
  tests/integration/routes/cors.test.ts
```

Verify DB reachability before DB-backed tests; rerun a named failure once.
