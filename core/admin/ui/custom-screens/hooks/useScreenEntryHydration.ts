import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import { cacheKeys } from "@/services/cachePolicy";
import { listContentTypesCached, type ContentTypeSummary } from "@/services/contentTypesClient";
import {
  getCustomScreenCached,
  getScreenEntryOverridesCached,
  type CustomScreenEntryPresentationOverride,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import { getEntryCached, type EntryDetail } from "@/services/entriesClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { isDraftAuthorityClean } from "../customScreenEntryPresentation";
import type {
  PresentationErrorCommit,
  RouteMessageCommit,
  RouteVisit,
} from "../customScreenEntryRuntime";

type NumberRef = MutableRefObject<number>;
type BooleanRef = MutableRefObject<boolean>;

type HydrationAuthority = {
  mountedRef: BooleanRef;
  routeGenerationRef: NumberRef;
  draftMutationGenerationRef: NumberRef;
  entryLoadGenerationRef: NumberRef;
  overrideLoadGenerationRef: NumberRef;
  contentDirtyRef: BooleanRef;
  presentationDirtyRef: BooleanRef;
};

type HydrationCommit = {
  applyEntry: (
    screen: CustomScreenRecord,
    contentType: ContentTypeSummary,
    entry: EntryDetail | null,
    contentTypes: ContentTypeSummary[],
    routeVisit: RouteVisit
  ) => void;
  applyOverrides: (
    overrides: CustomScreenEntryPresentationOverride[],
    routeVisit: RouteVisit
  ) => void;
  setEntryError: Dispatch<SetStateAction<RouteMessageCommit | null>>;
  setPresentationError: Dispatch<SetStateAction<PresentationErrorCommit | null>>;
  setRemoteEntryWarning: Dispatch<SetStateAction<RouteVisit | null>>;
  setRemotePresentationWarning: Dispatch<SetStateAction<RouteVisit | null>>;
  setEntryActivity: Dispatch<SetStateAction<RouteVisit | null>>;
  setPresentationActivity: Dispatch<SetStateAction<RouteVisit | null>>;
};

export type ScreenEntryHydrationInput = {
  screenId: string | null;
  entryId: string | null;
  isCreateMode: boolean;
  routeKey: string;
  routeVisit: RouteVisit;
  currentContentTypeSlug: string | null;
  overrideCacheKey: string | null;
  authority: HydrationAuthority;
  commit: HydrationCommit;
};

type LoadChannel = "entry" | "override";
type LoadToken = {
  channel: LoadChannel;
  routeKey: string;
  routeVisit: RouteVisit;
  routeGeneration: number;
  loadGeneration: number;
  draftGeneration: number;
};

export function useScreenEntryHydration(input: ScreenEntryHydrationInput) {
  const {
    screenId,
    entryId,
    isCreateMode,
    routeKey,
    routeVisit,
    currentContentTypeSlug,
    overrideCacheKey,
    authority,
    commit,
  } = input;
  const {
    mountedRef,
    routeGenerationRef,
    draftMutationGenerationRef,
    entryLoadGenerationRef,
    overrideLoadGenerationRef,
    contentDirtyRef,
    presentationDirtyRef,
  } = authority;
  const {
    applyEntry,
    applyOverrides,
    setEntryError,
    setPresentationError,
    setRemoteEntryWarning,
    setRemotePresentationWarning,
    setEntryActivity,
    setPresentationActivity,
  } = commit;

  const captureLoadToken = useCallback(
    (channel: LoadChannel): LoadToken => ({
      channel,
      routeKey,
      routeVisit,
      routeGeneration: routeGenerationRef.current,
      loadGeneration:
        channel === "entry"
          ? ++entryLoadGenerationRef.current
          : ++overrideLoadGenerationRef.current,
      draftGeneration: draftMutationGenerationRef.current,
    }),
    [
      draftMutationGenerationRef,
      entryLoadGenerationRef,
      overrideLoadGenerationRef,
      routeGenerationRef,
      routeKey,
      routeVisit,
    ]
  );

  const isLoadIdentityCurrent = useCallback(
    (token: LoadToken) => {
      const generation =
        token.channel === "entry"
          ? entryLoadGenerationRef.current
          : overrideLoadGenerationRef.current;
      return (
        mountedRef.current &&
        token.routeKey === routeKey &&
        token.routeVisit === routeVisit &&
        token.routeGeneration === routeGenerationRef.current &&
        token.loadGeneration === generation
      );
    },
    [
      entryLoadGenerationRef,
      mountedRef,
      overrideLoadGenerationRef,
      routeGenerationRef,
      routeKey,
      routeVisit,
    ]
  );

  const didCompleteDraftRemainClean = useCallback(
    (token: LoadToken) =>
      isDraftAuthorityClean({
        capturedGeneration: token.draftGeneration,
        currentGeneration: draftMutationGenerationRef.current,
        contentDirty: contentDirtyRef.current,
        presentationDirty: presentationDirtyRef.current,
      }),
    [contentDirtyRef, draftMutationGenerationRef, presentationDirtyRef]
  );
  const mayApplyAuthoritativeDraft = useCallback(
    (token: LoadToken) => isLoadIdentityCurrent(token) && didCompleteDraftRemainClean(token),
    [didCompleteDraftRemainClean, isLoadIdentityCurrent]
  );

  const loadEntryRoute = useCallback(
    async (force: boolean) => {
      if (!screenId || !entryId) throw new Error("custom_screen_entry_route_invalid");
      const nextScreen = await getCustomScreenCached(screenId, { force });
      if (!nextScreen) throw new Error("custom_screen_not_found");
      const contentTypes = await listContentTypesCached({ force });
      const nextContentType =
        contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
      if (!nextContentType) throw new Error("content_type_not_found");
      const nextEntry = isCreateMode
        ? null
        : await getEntryCached(nextContentType.slug, entryId, { force });
      if (!isCreateMode && !nextEntry) throw new Error("entry_not_found");
      return { nextScreen, nextContentType, nextEntry, contentTypes };
    },
    [entryId, isCreateMode, screenId]
  );

  const runEntryHydration = useCallback(
    async (force: boolean, isActive: () => boolean) => {
      const token = captureLoadToken("entry");
      setEntryActivity(token.routeVisit);
      try {
        const result = await loadEntryRoute(force);
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        if (!mayApplyAuthoritativeDraft(token)) {
          setRemoteEntryWarning(token.routeVisit);
          return;
        }
        applyEntry(
          result.nextScreen,
          result.nextContentType,
          result.nextEntry,
          result.contentTypes,
          token.routeVisit
        );
      } catch {
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        setEntryError({
          routeVisit: token.routeVisit,
          message: didCompleteDraftRemainClean(token)
            ? "Failed to load record."
            : "Could not check for record updates. Local changes are unchanged.",
        });
      } finally {
        if (isActive() && isLoadIdentityCurrent(token)) {
          setEntryActivity((current) => (current === token.routeVisit ? null : current));
        }
      }
    },
    [
      applyEntry,
      captureLoadToken,
      didCompleteDraftRemainClean,
      isLoadIdentityCurrent,
      loadEntryRoute,
      mayApplyAuthoritativeDraft,
      setEntryActivity,
      setEntryError,
      setRemoteEntryWarning,
    ]
  );

  const runOverrideHydration = useCallback(
    async (force: boolean, isActive: () => boolean) => {
      const token = captureLoadToken("override");
      setPresentationActivity(token.routeVisit);
      try {
        const overrides =
          !screenId || !entryId || isCreateMode
            ? []
            : await getScreenEntryOverridesCached(screenId, entryId, { force });
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        if (!mayApplyAuthoritativeDraft(token)) {
          setRemotePresentationWarning(token.routeVisit);
          return;
        }
        applyOverrides(overrides, token.routeVisit);
      } catch {
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        setPresentationError({
          routeVisit: token.routeVisit,
          kind: "load",
          message: didCompleteDraftRemainClean(token)
            ? "Failed to load presentation overrides."
            : "Could not check for presentation updates. Local changes are unchanged.",
        });
      } finally {
        if (isActive() && isLoadIdentityCurrent(token)) {
          setPresentationActivity((current) => (current === token.routeVisit ? null : current));
        }
      }
    },
    [
      applyOverrides,
      captureLoadToken,
      didCompleteDraftRemainClean,
      entryId,
      isCreateMode,
      isLoadIdentityCurrent,
      mayApplyAuthoritativeDraft,
      screenId,
      setPresentationActivity,
      setPresentationError,
      setRemotePresentationWarning,
    ]
  );

  const refresh = useCallback(
    (force = false) => runEntryHydration(force, () => true),
    [runEntryHydration]
  );
  const refreshPresentation = useCallback(
    (force = false) => runOverrideHydration(force, () => true),
    [runOverrideHydration]
  );

  useEffect(() => {
    if (!screenId || !entryId) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (active) void runEntryHydration(true, () => active);
    });
    return () => {
      active = false;
    };
  }, [entryId, runEntryHydration, screenId]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void runOverrideHydration(true, () => active);
    });
    return () => {
      active = false;
    };
  }, [runOverrideHydration]);

  useEffect(() => {
    if (!screenId || !entryId || !currentContentTypeSlug) return undefined;
    return subscribeCacheEvents((event) => {
      if (overrideCacheKey && event.key === overrideCacheKey) {
        void refreshPresentation(true);
        return;
      }
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (!isCreateMode && event.key === cacheKeys.entryDetail(currentContentTypeSlug, entryId))
      ) {
        void refresh(true);
      }
    });
  }, [
    currentContentTypeSlug,
    entryId,
    isCreateMode,
    overrideCacheKey,
    refresh,
    refreshPresentation,
    screenId,
  ]);

  return { refresh, refreshPresentation };
}
