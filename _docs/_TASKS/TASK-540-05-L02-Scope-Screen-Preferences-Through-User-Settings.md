# TASK-540-05-L02: Scope Screen Preferences Through User Settings

# FileName: TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-05
**Priority:** Medium
**Category:** User Settings / Custom Screens / Privacy
**Estimated Effort:** Medium
**Dependencies:** TASK-540-05-L01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/services/settings/userSettingsService.ts`
- new Bun-free `core/services/settings/screenEntryPreferencesContract.ts`
- `core/admin/services/userSettingsClient.ts`
- `core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts`
- `core/server/httpServer.ts`, limited to the central `errorResponse` mapping for
  `user_settings_key_invalid` and `user_settings_value_invalid`
- compatibility-expectation updates required before this source gate in
  `tests/unit/settings/userSettingsService.test.ts`,
  `tests/vitest/admin/userSettingsClient.test.ts`,
  `tests/vitest/ui/use-screen-entry-preferences.test.ts`, and
  `tests/integration/routes/userSettings.test.ts`
- new sole-owner UI integration suite
  `tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx`

`tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx` is a
read-only compatibility gate here. TASK-540-04-L03 is its sole writer and removes
the stale localStorage-specific assertion before this leaf starts; this leaf must
not edit it. The new persistence suite above is the only integration test that
TASK-540-05-L02 creates or edits.

No user-settings route source or DB schema edit is needed. Do not move the mapping into
`userSettingsRoutes.ts`: the real runtime catches these plain machine-readable service
errors in `httpServer.ts`. Update the named behavior tests before this leaf's gate;
TASK-540-06 owns docs and only aggregate test additions.

## Grounded anchors

- Service key/value map, defaults, allowlist, validator:
  `userSettingsService.ts:33-80,99-260`.
- DB rows are already scoped by `userId`: `:263-320`.
- Client typed map/cache/write: `userSettingsClient.ts:12-24,31-85`.
- Current global localStorage-only hook:
  `useScreenEntryPreferences.ts:3-77`.
- Existing self-scoped routes: `userSettingsRoutes.ts:33-56` and
  strict envelope `settingsSchemas.ts:16-23`.
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
export function normalizeScreenEntryPreferencesSetting(value: unknown) {
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

// httpServer.ts: keep this narrow mapping at the actual central boundary.
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

// userSettingsClient.ts: these exact self-scoped transports never inspect, merge,
// invalidate, or populate the process-global aggregate userSettingsReadCache.
export async function getUserSettingIsolated<K extends keyof UserSettings>(
  key: K
): Promise<{ key: K; value: UserSettings[K] }> {
  return apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    { method: "GET" }
  );
}

export async function setUserSettingIsolated<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<{ key: K; value: UserSettings[K] }> {
  return apiRequest<{ key: K; value: UserSettings[K] }>(
    `/user-settings/${encodeURIComponent(key)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    },
    { withCsrf: true }
  );
}

type LocalPreferenceView = Readonly<{
  generation: number;
  view: ScreenEntryPreferences;
}>;
type ScopedPreferenceViews = ReadonlyMap<string, LocalPreferenceView>;
type PreferenceWriteOutcome =
  | { ok: true; preferences: ScreenEntryPreferences }
  | { ok: false };
type PreferenceCoordinatorSnapshot = Readonly<{
  generation: number;
  phase: "pending" | "succeeded" | "failed" | "hydrated";
  view: ScreenEntryPreferences;
  tail: Promise<PreferenceWriteOutcome> | null;
}>;
type CoordinatedPreferenceRead = Readonly<{
  writeGeneration: number;
  promise: Promise<ScreenEntryPreferences>;
}>;

// Module-scoped write authority is shared by every hook instance. It contains
// only identity-keyed preference views and in-flight promises; it never reads or
// mutates userSettingsReadCache and never enters browser storage.
const preferenceStateByUser = new Map<string, PreferenceCoordinatorSnapshot>();
const preferenceGenerationByUser = new Map<string, number>();
const preferenceListenersByUser = new Map<string, Set<() => void>>();
const preferenceReadByUser = new Map<string, CoordinatedPreferenceRead>();
const preferencePruneTimerByUser = new Map<
  string,
  ReturnType<typeof setTimeout>
>();
export const SCREEN_PREFERENCE_SETTLED_RETENTION_MS = 30_000;

function cancelPreferencePrune(userId: string) {
  const timer = preferencePruneTimerByUser.get(userId);
  if (timer !== undefined) clearTimeout(timer);
  preferencePruneTimerByUser.delete(userId);
}

function schedulePreferencePrune(userId: string) {
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
    preferenceStateByUser.delete(userId);
    preferenceGenerationByUser.delete(userId);
  }, SCREEN_PREFERENCE_SETTLED_RETENTION_MS);
  preferencePruneTimerByUser.set(userId, timer);
}

function notifyPreferenceSubscribers(userId: string) {
  for (const listener of preferenceListenersByUser.get(userId) ?? []) listener();
}

function publishPreferenceSnapshot(
  userId: string,
  snapshot: PreferenceCoordinatorSnapshot
) {
  preferenceStateByUser.set(userId, snapshot);
  notifyPreferenceSubscribers(userId);
}

function subscribePreferenceCoordinator(userId: string, listener: () => void) {
  cancelPreferencePrune(userId);
  const listeners = preferenceListenersByUser.get(userId) ?? new Set();
  listeners.add(listener);
  preferenceListenersByUser.set(userId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    preferenceListenersByUser.delete(userId);
    // Pending work survives an unmount. Settled state gets a bounded handoff
    // window so render -> subscribe/remount cannot lose the just-observed value.
    if (preferenceStateByUser.get(userId)?.tail === null) {
      schedulePreferencePrune(userId);
    }
  };
}

function getPreferenceCoordinatorSnapshot(userId: string | null) {
  return userId ? preferenceStateByUser.get(userId) ?? null : null;
}

function getPreferenceGeneration(userId: string) {
  return preferenceGenerationByUser.get(userId) ?? 0;
}

function getOrCreatePreferenceRead(userId: string): CoordinatedPreferenceRead {
  const writeGeneration = getPreferenceGeneration(userId);
  const existing = preferenceReadByUser.get(userId);
  if (existing?.writeGeneration === writeGeneration) return existing;

  const promise = getUserSettingIsolated("customScreens.entry.preferences").then(
    ({ value }) => toScreenEntryPreferencesView(value)
  );
  const read = { writeGeneration, promise };
  preferenceReadByUser.set(userId, read);
  const removeIfCurrent = () => {
    if (preferenceReadByUser.get(userId) === read) {
      preferenceReadByUser.delete(userId);
      if ((preferenceListenersByUser.get(userId)?.size ?? 0) === 0) {
        schedulePreferencePrune(userId);
      }
    }
  };
  void promise.then(removeIfCurrent, removeIfCurrent);
  return read;
}

function enqueuePreferenceWrite(
  userId: string,
  view: ScreenEntryPreferences
): { generation: number; tail: Promise<PreferenceWriteOutcome> } {
  const generation = getPreferenceGeneration(userId) + 1;
  cancelPreferencePrune(userId);
  preferenceGenerationByUser.set(userId, generation);
  // An already-issued read may finish, but the generation guard makes it stale.
  // Removing its registry entry prevents any later instance joining stale work.
  preferenceReadByUser.delete(userId);
  const previousTail = preferenceStateByUser.get(userId)?.tail;
  const start = previousTail
    ? previousTail.then(() => undefined, () => undefined)
    : Promise.resolve();
  let tail: Promise<PreferenceWriteOutcome>;
  tail = start
    .then(async (): Promise<PreferenceWriteOutcome> => {
      try {
        const { value } = await setUserSettingIsolated(
          "customScreens.entry.preferences",
          toScreenEntryPreferencesSetting(view)
        );
        return {
          ok: true,
          preferences: toScreenEntryPreferencesView(value),
        };
      } catch {
        return { ok: false };
      }
    })
    .then((outcome) => {
      const current = preferenceStateByUser.get(userId);
      if (current?.generation !== generation || current.tail !== tail) {
        return outcome;
      }
      const settled: PreferenceCoordinatorSnapshot = {
        generation,
        phase: outcome.ok ? "succeeded" : "failed",
        view: outcome.ok ? outcome.preferences : view,
        tail: null,
      };
      if ((preferenceListenersByUser.get(userId)?.size ?? 0) === 0) {
        // Retain the exact settled snapshot only for the bounded render/subscribe
        // handoff window; an identity-guarded timer prunes it and its generation.
        publishPreferenceSnapshot(userId, settled);
        schedulePreferencePrune(userId);
      } else {
        publishPreferenceSnapshot(userId, settled);
      }
      return outcome;
    });
  publishPreferenceSnapshot(userId, {
    generation,
    phase: "pending",
    view,
    tail,
  });
  return { generation, tail };
}

function publishHydratedPreference(
  userId: string,
  generation: number,
  view: ScreenEntryPreferences
) {
  const current = preferenceStateByUser.get(userId);
  if (
    getPreferenceGeneration(userId) !== generation ||
    current?.tail ||
    current?.phase === "failed"
  ) return false;
  publishPreferenceSnapshot(userId, {
    generation,
    phase: "hydrated",
    view,
    tail: null,
  });
  return true;
}

export function useScreenEntryPreferences() {
  const { user } = useAdminAuth();
  const userId = user?.id ?? null;
  const [hydratedByUser, setHydratedByUser] =
    useState<ScopedPreferenceViews>(() => new Map());
  const [optimisticByUser, setOptimisticByUser] =
    useState<ScopedPreferenceViews>(() => new Map());
  const [seenGenerationByUser, setSeenGenerationByUser] =
    useState<ReadonlyMap<string, number>>(() => new Map());
  const requestGeneration = useRef(0);
  const localUnsyncedGenerationByUser = useRef(new Map<string, number>());
  const currentUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const subscribe = useCallback(
    (listener: () => void) =>
      userId
        ? subscribePreferenceCoordinator(userId, () => {
            const snapshot = getPreferenceCoordinatorSnapshot(userId);
            if (snapshot) {
              // Record authority before React schedules a render. A batched A→B
              // transition therefore cannot miss A's cross-instance generation.
              setSeenGenerationByUser((current) => {
                if (current.get(userId) === snapshot.generation) return current;
                const next = new Map(current);
                next.set(userId, snapshot.generation);
                return next;
              });
              const localUnsynced =
                localUnsyncedGenerationByUser.current.get(userId);
              if (
                localUnsynced !== undefined &&
                localUnsynced !== snapshot.generation
              ) {
                localUnsyncedGenerationByUser.current.delete(userId);
                setOptimisticByUser((current) => {
                  if (current.get(userId)?.generation === snapshot.generation) {
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
    () => getPreferenceCoordinatorSnapshot(userId),
    [userId]
  );
  const sharedSnapshot = useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
  const activeGeneration = userId
    ? sharedSnapshot?.generation ?? seenGenerationByUser.get(userId) ?? 0
    : 0;
  const localOptimistic = userId ? optimisticByUser.get(userId) : undefined;
  const localHydrated = userId ? hydratedByUser.get(userId) : undefined;
  const preferences = userId
    ? sharedSnapshot?.view ??
      (localOptimistic?.generation === activeGeneration
        ? localOptimistic.view
        : undefined) ??
      (localHydrated?.generation === activeGeneration
        ? localHydrated.view
        : undefined) ??
      DEFAULT_SCREEN_ENTRY_PREFERENCES
    : DEFAULT_SCREEN_ENTRY_PREFERENCES; // only the active identity's keyed state is eligible

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    // Commit-time identity changes before passive cleanup/read effects. A response
    // from A that settles after render(B) but before A's passive cleanup cannot commit.
    currentUserIdRef.current = userId;
    return () => {
      if (currentUserIdRef.current === userId) currentUserIdRef.current = null;
      requestGeneration.current += 1;
    };
  }, [userId]);

  useEffect(() => {
    const capturedUserId = userId;
    const generation = ++requestGeneration.current;
    let active = true;
    if (!capturedUserId) return () => { active = false; }; // no synchronous effect setState
    void (async () => {
      // A returning identity must first observe the final result of every write
      // already queued for that same user. Re-read the tail after every await so
      // a write appended while waiting also becomes part of the barrier.
      while (active) {
        const tail = preferenceStateByUser.get(capturedUserId)?.tail;
        if (!tail) break;
        await tail; // tails resolve to an outcome and never reject
        if (
          !active ||
          currentUserIdRef.current !== capturedUserId ||
          requestGeneration.current !== generation
        ) return;
      }

      // A failed latest write deliberately keeps the keyed optimistic session
      // value. Do not fetch an older durable value over it in this mount.
      if (
        localUnsyncedGenerationByUser.current.get(capturedUserId) ===
          getPreferenceGeneration(capturedUserId) ||
        preferenceStateByUser.get(capturedUserId)?.phase === "failed"
      ) return;

      // Concurrent hook instances join one user+write-generation GET. This avoids
      // an older parallel response publishing after a newer response, while a new
      // local write invalidates the registry entry and the generation guard.
      const coordinatedRead = getOrCreatePreferenceRead(capturedUserId);
      const writeGenerationAtReadStart = coordinatedRead.writeGeneration;
      const hydrated = await coordinatedRead.promise;
      const readIsAuthoritative = () =>
        active &&
        mountedRef.current &&
        currentUserIdRef.current === capturedUserId &&
        requestGeneration.current === generation &&
        getPreferenceGeneration(capturedUserId) === writeGenerationAtReadStart &&
        !preferenceStateByUser.get(capturedUserId)?.tail &&
        preferenceStateByUser.get(capturedUserId)?.phase !== "failed" &&
        localUnsyncedGenerationByUser.current.get(capturedUserId) !==
          writeGenerationAtReadStart;
      if (!readIsAuthoritative()) return;
      if (
        !publishHydratedPreference(
          capturedUserId,
          writeGenerationAtReadStart,
          hydrated
        ) ||
        !readIsAuthoritative()
      ) return;
      setSeenGenerationByUser((current) => {
        const next = new Map(current);
        next.set(capturedUserId, writeGenerationAtReadStart);
        return next;
      });

      setHydratedByUser((current) => {
        if (!readIsAuthoritative()) return current;
        const next = new Map(current);
        next.set(capturedUserId, {
          generation: writeGenerationAtReadStart,
          view: hydrated,
        });
        return next;
      });
      setOptimisticByUser((current) => {
        if (!readIsAuthoritative()) return current;
        const next = new Map(current);
        next.delete(capturedUserId);
        return next;
      });
    })().catch(() => undefined); // authenticated-service unavailable => in-memory state
    return () => { active = false; };
  }, [userId]);

  const setPreferences = useCallback((next: ScreenEntryPreferences) => {
    const normalized: ScreenEntryPreferences = {
      showFieldMetadata: Boolean(next.showFieldMetadata),
    };
    if (!userId) return;
    const capturedUserId = userId;
    const { generation: writeGeneration, tail } = enqueuePreferenceWrite(
      capturedUserId,
      normalized
    );
    setSeenGenerationByUser((current) => {
      const next = new Map(current);
      next.set(capturedUserId, writeGeneration);
      return next;
    });
    setOptimisticByUser((current) => {
      const nextByUser = new Map(current);
      nextByUser.set(capturedUserId, {
        generation: writeGeneration,
        view: normalized,
      });
      return nextByUser;
    });
    localUnsyncedGenerationByUser.current.set(capturedUserId, writeGeneration);
    void tail.then((outcome) => {
        if (getPreferenceGeneration(capturedUserId) !== writeGeneration) {
          // Another instance or a newer local action owns the shared generation.
          // Drop only this instance's superseded marker/view; never clear a newer
          // local optimistic value from the same instance.
          if (
            localUnsyncedGenerationByUser.current.get(capturedUserId) ===
            writeGeneration
          ) {
            localUnsyncedGenerationByUser.current.delete(capturedUserId);
            if (mountedRef.current) {
              setOptimisticByUser((current) => {
                if (
                  current.get(capturedUserId)?.generation !== writeGeneration
                ) return current;
                const nextByUser = new Map(current);
                nextByUser.delete(capturedUserId);
                return nextByUser;
              });
            }
          }
          return;
        }
        if (!outcome.ok) {
          // Retain the latest optimistic value and its unsynced marker. A later
          // toggle may retry; this handled result cannot block that queued write.
          return outcome;
        }
        if (
          localUnsyncedGenerationByUser.current.get(capturedUserId) ===
          writeGeneration
        ) {
          localUnsyncedGenerationByUser.current.delete(capturedUserId);
        }
        if (!mountedRef.current) return;
        setHydratedByUser((current) => {
          if (getPreferenceGeneration(capturedUserId) !== writeGeneration) return current;
          const nextByUser = new Map(current);
          nextByUser.set(capturedUserId, {
            generation: writeGeneration,
            view: outcome.preferences,
          });
          return nextByUser;
        });
        setOptimisticByUser((current) => {
          if (
            getPreferenceGeneration(capturedUserId) !== writeGeneration ||
            localUnsyncedGenerationByUser.current.get(capturedUserId) ===
              writeGeneration
          ) return current;
          const nextByUser = new Map(current);
          nextByUser.delete(capturedUserId);
          return nextByUser;
        });
      });
  }, [userId]);
  return { preferences, setPreferences };
}
```

The PATCH helper uses the same explicit `apiRequest<{ key: K; value:
UserSettings[K] }>` generic as GET. `userSettingsService.ts`, `UserSettings`, and the hook
import these exact types/helpers; the hook re-exports its pre-existing public view type,
default, and `normalizeScreenEntryPreferences` name from the Bun-free owner for source
compatibility. The public view normalizer remains versionless and coerce-to-default;
it is not an alias of the strict, versioned `normalizeScreenEntryPreferencesSetting`.
No `JSON_HEADERS`, `DEFAULT_WITHOUT_VERSION_VIEW`, `normalizeView`, `toView`, or `toStored`
placeholder remains.

Remove all reads/writes of
`coderso.screens.entry.preferences.v1`. Do not replace it with another global
browser key. The hook reads `user.id` from the existing `AdminAuthContext`; no caller
prop or route changes. `getUserSettingIsolated` and `setUserSettingIsolated` are the
only client functions this hook uses. Existing aggregate-aware `getUserSetting` /
`setUserSetting` may delegate network transport to the isolated helpers, but only those
aggregate-aware wrappers may touch `userSettingsReadCache`. In particular, a delayed
isolated PATCH from user A cannot merge into an aggregate cache populated after a switch
to user B. The existing hook call site remains source-compatible.

## Security Contract

- Existing internal user-settings route family; authenticated session and
  server-derived `ctx.user.id` scope every read/write.
- PATCH retains CSRF and resolves to the existing `admin_write` rate-limit bucket;
  GET resolves to `admin_read`. Schema rejects unknown envelope keys and service
  rejects unknown setting keys plus unknown value keys/version/type.
- The central boundary returns `{error:{code,message}}` with status 400 for the
  exact `user_settings_key_invalid` and `user_settings_value_invalid` codes; it
  does not expose a stack or turn either client error into 500.
- No public mode, nonce/captcha, secret, entry content, or migration.

## Error/compatibility flow

- Missing row returns server default. Invalid stored row falls back through the
  existing service behavior.
- Network/auth failure leaves a functional in-memory default/current value and
  never leaks another user's cache or localStorage value.
- PATCH operations are serialized independently per user by a module-scoped
  coordinator shared across hook instances. A newer toggle waits for the prior handled
  outcome and is then persisted in UI order, so a slow ON cannot overwrite a later OFF
  across rapid actions, navigation remounts, or two concurrent same-user consumers.
  Failure of an earlier PATCH does not block the later queued PATCH. Only the current
  tail/current generation may commit server state; every tail resolves to a handled
  outcome. Pending state survives the last unsubscribe until settlement. Settled state
  gets one identity-guarded 30-second render/subscription handoff window, cancelled by a
  subscriber or new write, then state/generation/timer are pruned so a later remount
  reads durable server truth.
- A transition to a different user immediately derives the default and never exposes
  the prior user's state. Returning to the same user in the same mounted session may
  reuse only that user's keyed optimistic/hydrated value. Its authoritative GET first
  waits until the shared write tail for that identity is stable. A replacement instance
  mounted before settlement renders the coordinator's pending view, then observes the
  successful durable result before revalidation; it cannot GET an older value while the
  prior instance's PATCH is in flight. A failed latest tail leaves the keyed optimistic
  state and an unsynced marker for current subscribers. A later toggle can retry; after
  the bounded settled handoff expires with no subscribers, a later remount starts from
  server truth. Superseded local failure markers are compared by generation and removed
  by the shared subscription; mere marker presence never suppresses a newer read.
- If the server-side A value changed while B was active and A has no pending/unsynced
  write, the returning A read replaces A's older keyed state. Concurrent mounted
  consumers join one GET for the same user/write generation; a write invalidates that
  registry entry, and the settled promise is removed with an identity guard. The GET may commit only
  when identity, request generation, write generation, tail absence, and unsynced
  absence remain unchanged, including inside the React state updater. The layout-bound
  current-user identity changes before passive cleanup, so late A cannot commit in the
  render(B)→A passive-cleanup window. A newer local A toggle wins over a delayed refresh.
- The isolated writer has no aggregate-cache side effect. Successful inactive-user
  writes update only that user's keyed hook state while mounted; unmounted hooks never
  set state. Hook-local optimistic/hydrated fallbacks carry their coordinator generation
  and render only when it equals the latest generation observed synchronously by that
  subscriber. This prevents an instance that did not initiate the latest write from
  resurrecting older hydrated state after the shared settled snapshot is pruned. A late
  prior-user PATCH cannot resurrect or mutate another user's snapshot.

## Gate tests owned here; aggregate additions owned by TASK-540-06

- `tests/unit/settings/userSettingsService.test.ts`: exact value schema,
  unknown/type/version rejection, per-user isolation/default; the strict stored
  normalizer rejects the versionless view while the separate public view normalizer
  accepts `{showFieldMetadata:boolean}` and preserves legacy coerce-to-default behavior.
- `tests/vitest/admin/userSettingsClient.test.ts`: exact isolated typed read/write exports;
  both bypass aggregate reads/writes; defer user A's PATCH, transition and populate the
  aggregate for user B, resolve A, and prove B's aggregate remains byte-identical.
- `tests/vitest/ui/use-screen-entry-preferences.test.ts`: async hydrate,
  separate public-view versus strict stored-setting normalizer behavior (including a
  versionless view accepted only by the public normalizer),
  optimistic write, failure/unmount, no localStorage, user A→B isolation with A's
  deferred GET and PATCH responses, a deferred initial GET losing to a local toggle,
  rapid ON→OFF with the first PATCH delayed (at most one PATCH in flight, server order
  ON then OFF, final durable/UI OFF), an earlier failed PATCH releasing a later toggle,
  no unhandled rejection, unmount→remount before the PATCH settles (the replacement
  renders the same pending value, performs no early GET, then revalidates the durable
  result), and two simultaneous same-user hook instances issuing opposite toggles
  (one shared in-flight PATCH, deterministic call order, both converge on the latest,
  and the superseded instance drops only its own stale optimistic marker/view), then
  both instances A→B→A after the shared snapshot is released (neither may resurrect a
  superseded local value; both rehydrate the same durable latest value), bounded
  coordinator cleanup after the last settled subscriber, and two simultaneous
  same-user hydrations joining exactly one GET and rendering the same result. Include a
  non-symmetric case where only H2 changes durable OFF→ON, both switch A→B→A after the
  shared snapshot is pruned, and H1 never paints its older hydrated OFF while reloading,
  an H1 failed write followed by H2 success (the superseded H1 failure marker cannot
  block hydration after A→B→A), and a render→last-unsubscribe→settlement→subscribe
  handoff within the 30-second retention window (no default flash or redundant GET),
  followed by fake-timer expiry proving state/generation/timer cleanup,
  a deferred A GET settling after render(B) but before A's passive cleanup and being
  rejected by the layout identity guard,
  immediate default derivation for a different identity, safe same-user in-session
  reuse plus write-tail-aware authoritative revalidation on A→B→A, returning to A while
  A's PATCH is pending (GET waits, success exposes durable A and then revalidates), a
  pending/failed A PATCH retaining only A's optimistic session value and suppressing an
  older GET, remount recovery from server truth, a server-side A change while B is active
  replacing stale A state only without pending/unsynced work, a newer local A write
  during refresh winning by per-user write generation, and no synchronous effect-body
  state update.
- `tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx`:
  mount the real entry toolbar under `AdminAuthProvider`, prove default OFF, toggle
  ON through the visible switch, await the isolated PATCH, remount as the same user
  and hydrate ON, then switch A→B and derive OFF immediately without reading or
  writing `coderso.screens.entry.preferences.v1`. On B→A, only A's keyed in-session
  value may render while a fresh authoritative A read runs; a changed authoritative
  A value replaces the older cached A value when no newer local write exists, while
  a local A toggle made during that read stays visible and rejects the delayed result.
  A return to A while A's PATCH is pending waits for the per-user tail before GET;
  successful completion revalidates durable A, while failure preserves A's unsynced
  in-session value without painting an older GET. Rapid visible ON→OFF persists in that
  order with no concurrent PATCHes. Navigating away and remounting before settlement
  also waits for the shared coordinator and cannot flash or hydrate the older server
  value.
  Deferred A work cannot alter B, including an A response settled in the
  render(B)→passive-cleanup window, and deferred B work cannot alter returned A. This suite owns the
  persistence/UI integration seam; it does not duplicate the hook's generation
  algorithm.
- `tests/integration/routes/userSettings.test.ts`: authenticated self-scope,
  strict `{value}` envelope, CSRF, `admin_read`/`admin_write` bucket selection,
  and both 400 error mappings through the actual `startHttpServer` pipeline.
  Create two uniquely scoped session users, write different values through their
  own valid CSRF sessions, prove each GET sees only its own value, and clean up
  only those users/sessions/settings rows. Missing authentication must be 401;
  missing/invalid CSRF must be 403; `{value, extra}` must be `validation_error`
  400; an unknown key and an invalid preference value must preserve their exact
  machine-readable codes at 400. Do not substitute direct handler invocation for
  these boundary assertions.

TASK-540-04-L03 removes the stale global-localStorage assertion from its sole-owned
restyle suite before this leaf begins. Run that file read-only after the transport
switch to prove the entry-toolbar behavior remains compatible. TASK-540-06 may add
two-user end-to-end coverage later but must not re-baseline the exact no-browser-
storage, per-user, or delayed-request assertions above.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/admin/userSettingsClient.test.ts \
  tests/vitest/ui/use-screen-entry-preferences.test.ts \
  tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx \
  tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx
set -a && source .env && set +a
bun test tests/unit/settings/userSettingsService.test.ts \
  tests/integration/routes/userSettings.test.ts
```

Verify DB reachability before DB-backed tests; rerun a named failure once.
