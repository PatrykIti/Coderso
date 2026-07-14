import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getAdminAuthIdentity,
  subscribeAdminAuthIdentity,
  type AdminAuthIdentitySnapshot,
} from "@/services/adminAuthIdentity";
import { getUserSettingIsolated, setUserSettingIsolated } from "@/services/userSettingsClient";
import { useAdminAuth } from "@/ui/contexts/AdminAuthContext";
import {
  DEFAULT_SCREEN_ENTRY_PREFERENCES,
  normalizeScreenEntryPreferences,
  normalizeScreenEntryPreferencesSetting,
  toScreenEntryPreferencesSetting,
  toScreenEntryPreferencesView,
  type ScreenEntryPreferences,
} from "../../../../services/settings/screenEntryPreferencesContract";

export {
  DEFAULT_SCREEN_ENTRY_PREFERENCES,
  normalizeScreenEntryPreferences,
  type ScreenEntryPreferences,
} from "../../../../services/settings/screenEntryPreferencesContract";

type PreferenceVersion = Readonly<{
  generation: number;
  pruneEpoch: number;
}>;

type LocalPreferenceView = PreferenceVersion & Readonly<{ view: ScreenEntryPreferences }>;
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

const preferenceStateByUser = new Map<string, PreferenceCoordinatorSnapshot>();
const preferenceGenerationByUser = new Map<string, number>();
const preferenceListenersByUser = new Map<string, Set<() => void>>();
const preferenceReadByUser = new Map<string, CoordinatedPreferenceRead>();
const preferencePruneTimerByUser = new Map<string, ReturnType<typeof setTimeout>>();
const preferencePruneEpochByUser = new Map<string, number>();
const preferencePruneTombstoneByUser = new Map<string, PreferencePruneTombstone>();
const activePreferenceTransports = new Map<symbol, ActivePreferenceTransport>();
let preferenceAuthIdentity = getAdminAuthIdentity();

subscribeAdminAuthIdentity((next) => {
  preferenceAuthIdentity = next;
  for (const transport of activePreferenceTransports.values()) {
    if (transport.userId !== next.userId || transport.authEpoch !== next.epoch) {
      transport.controller.abort();
    }
  }
});

export const SCREEN_PREFERENCE_SETTLED_RETENTION_MS = 30_000;

function preferencesEqual(left: ScreenEntryPreferences, right: ScreenEntryPreferences): boolean {
  return left.showFieldMetadata === right.showFieldMetadata;
}

function versionsEqual(left: PreferenceVersion, right: PreferenceVersion): boolean {
  return left.generation === right.generation && left.pruneEpoch === right.pruneEpoch;
}

function getPreferencePruneEpoch(userId: string): number {
  return preferencePruneEpochByUser.get(userId) ?? 0;
}

function getPreferenceGeneration(userId: string): number {
  return preferenceGenerationByUser.get(userId) ?? 0;
}

function isPreferenceAuthIdentityCurrent(userId: string, authEpoch: number): boolean {
  return preferenceAuthIdentity.userId === userId && preferenceAuthIdentity.epoch === authEpoch;
}

function capturePreferenceAuthIdentity(userId: string): AdminAuthIdentitySnapshot | null {
  return preferenceAuthIdentity.userId === userId ? preferenceAuthIdentity : null;
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
    ) {
      return;
    }
    if (preferenceReadByUser.has(userId)) {
      schedulePreferencePrune(userId);
      return;
    }
    const epoch = getPreferencePruneEpoch(userId) + 1;
    preferencePruneEpochByUser.set(userId, epoch);
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
  if (shared && versionsEqual(local, shared) && preferencesEqual(local.view, shared.view)) {
    return true;
  }
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

function publishPreferenceSnapshot(userId: string, snapshot: PreferenceCoordinatorSnapshot): void {
  preferenceStateByUser.set(userId, snapshot);
  notifyPreferenceSubscribers(userId);
}

function subscribePreferenceCoordinator(userId: string, listener: () => void): () => void {
  cancelPreferencePrune(userId);
  const listeners = preferenceListenersByUser.get(userId) ?? new Set<() => void>();
  listeners.add(listener);
  preferenceListenersByUser.set(userId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    preferenceListenersByUser.delete(userId);
    if (preferenceStateByUser.get(userId)?.tail === null) {
      schedulePreferencePrune(userId);
    }
  };
}

function getPreferenceCoordinatorSnapshot(
  userId: string | null
): PreferenceCoordinatorSnapshot | null {
  return userId ? (preferenceStateByUser.get(userId) ?? null) : null;
}

function getOrCreatePreferenceRead(userId: string, authEpoch: number): CoordinatedPreferenceRead {
  const generation = getPreferenceGeneration(userId);
  const pruneEpoch = getPreferencePruneEpoch(userId);
  const existing = preferenceReadByUser.get(userId);
  if (
    existing?.generation === generation &&
    existing.pruneEpoch === pruneEpoch &&
    existing.authEpoch === authEpoch
  ) {
    return existing;
  }

  const promise = isPreferenceAuthIdentityCurrent(userId, authEpoch)
    ? getUserSettingIsolated("customScreens.entry.preferences").then(({ value }) =>
        toScreenEntryPreferencesView(normalizeScreenEntryPreferencesSetting(value))
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
  preferenceReadByUser.delete(userId);
  const previousTail = preferenceStateByUser.get(userId)?.tail;
  const start = previousTail
    ? previousTail.then(
        () => undefined,
        () => undefined
      )
    : Promise.resolve();
  let tail: Promise<PreferenceWriteOutcome>;
  tail = start
    .then(async (): Promise<PreferenceWriteOutcome> => {
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
          preferences: toScreenEntryPreferencesView(normalizeScreenEntryPreferencesSetting(value)),
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
      ) {
        return outcome;
      }
      publishPreferenceSnapshot(userId, {
        generation,
        pruneEpoch,
        phase: outcome.ok ? "succeeded" : "failed",
        view: outcome.ok ? outcome.preferences : view,
        tail: null,
      });
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
  ) {
    return false;
  }
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
  const [observedByUser, setObservedByUser] = useState<ScopedPreferenceViews>(() => new Map());
  const [optimisticByUser, setOptimisticByUser] = useState<ScopedPreferenceViews>(() => new Map());
  const [noUserPreferences, setNoUserPreferences] = useState<ScreenEntryPreferences>(
    () => DEFAULT_SCREEN_ENTRY_PREFERENCES
  );
  const requestGeneration = useRef(0);
  const localUnsyncedByUser = useRef(new Map<string, LocalPreferenceView>());
  const currentUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  const subscribe = useCallback(
    (listener: () => void): (() => void) =>
      userId
        ? subscribePreferenceCoordinator(userId, () => {
            if (!mountedRef.current || currentUserIdRef.current !== userId) return;
            const snapshot = getPreferenceCoordinatorSnapshot(userId);
            if (snapshot) {
              const exact: LocalPreferenceView = {
                generation: snapshot.generation,
                pruneEpoch: snapshot.pruneEpoch,
                view: normalizeScreenEntryPreferences(snapshot.view),
              };
              setObservedByUser((current) => {
                const present = current.get(userId);
                if (
                  present &&
                  versionsEqual(present, exact) &&
                  preferencesEqual(present.view, exact.view)
                ) {
                  return current;
                }
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
    (): PreferenceCoordinatorSnapshot | null => getPreferenceCoordinatorSnapshot(userId),
    [userId]
  );
  const sharedSnapshot = useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
  const localOptimistic = userId ? optimisticByUser.get(userId) : undefined;
  const localObserved = userId ? observedByUser.get(userId) : undefined;
  const preferences = userId
    ? (sharedSnapshot?.view ??
      (isLocalPreferenceRetained(userId, localOptimistic) ? localOptimistic.view : undefined) ??
      (isLocalPreferenceRetained(userId, localObserved) ? localObserved.view : undefined) ??
      DEFAULT_SCREEN_ENTRY_PREFERENCES)
    : noUserPreferences;

  useLayoutEffect((): (() => void) => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useLayoutEffect((): (() => void) => {
    currentUserIdRef.current = userId;
    return () => {
      if (currentUserIdRef.current === userId) currentUserIdRef.current = null;
      requestGeneration.current += 1;
    };
  }, [userId]);

  useEffect((): (() => void) => {
    const capturedUserId = userId;
    const request = ++requestGeneration.current;
    const authIdentity = capturedUserId ? capturePreferenceAuthIdentity(capturedUserId) : null;
    let active = true;
    if (!capturedUserId || !authIdentity) {
      return () => {
        active = false;
      };
    }
    void (async (): Promise<void> => {
      while (active) {
        const tail = preferenceStateByUser.get(capturedUserId)?.tail;
        if (!tail) break;
        await tail;
        if (
          !active ||
          currentUserIdRef.current !== capturedUserId ||
          requestGeneration.current !== request ||
          !isPreferenceAuthIdentityCurrent(capturedUserId, authIdentity.epoch)
        ) {
          return;
        }
      }

      const unsynced = localUnsyncedByUser.current.get(capturedUserId);
      if (
        isLocalPreferenceRetained(capturedUserId, unsynced) ||
        preferenceStateByUser.get(capturedUserId)?.phase === "failed"
      ) {
        return;
      }

      const coordinatedRead = getOrCreatePreferenceRead(capturedUserId, authIdentity.epoch);
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
        !isLocalPreferenceRetained(capturedUserId, localUnsyncedByUser.current.get(capturedUserId));
      if (!readIsAuthoritative()) return;
      if (
        !publishHydratedPreference(capturedUserId, readVersion, hydrated) ||
        !readIsAuthoritative()
      ) {
        return;
      }
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
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId]);

  const setPreferences = useCallback(
    (next: ScreenEntryPreferences): void => {
      const normalized = normalizeScreenEntryPreferences(next);
      if (!userId) {
        setNoUserPreferences(normalized);
        return;
      }
      const capturedUserId = userId;
      const authIdentity = capturePreferenceAuthIdentity(capturedUserId);
      if (!authIdentity) return;
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
        if (!outcome.ok) return;
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
