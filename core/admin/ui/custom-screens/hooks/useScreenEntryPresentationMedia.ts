import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { cacheKeys } from "@/services/cachePolicy";
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../../services/customScreens/customScreenSchemas";
import type { ScreenEntryPresentationOverrideDraft } from "../../../../services/customScreens/screenEntryPresentationOverrideContract";

import {
  PRESENTATION_MEDIA_LOAD_ERROR,
  buildBoundedPresentationMediaRequestPlan,
  collectWinningDirectImageAssetIds,
  initializeMediaMachineState,
  mediaAttemptReducer,
  projectExactRequestedMediaUrls,
  readRequestedIdsFromMediaRequestKey,
  type MediaAttempt,
  type PresentationMediaErrorKind,
} from "../customScreenEntryPresentationMedia";
import type { RouteVisit } from "../customScreenEntryRuntime";

type MediaCommit = {
  routeVisit: RouteVisit | null;
  requestKey: string | null;
  attemptToken: number | null;
  urlsById: Readonly<Record<string, string>>;
  error: string | null;
};

export type ScreenEntryPresentationMediaState = {
  urlsById: Readonly<Record<string, string>>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  // Distinguishes a retryable transient media read failure ("load") from the
  // structural bounded-overflow cause ("overflow"), which re-reading cannot
  // clear. The layout gates the Retry affordance on this discriminant.
  errorKind: PresentationMediaErrorKind | null;
};

export function useScreenEntryPresentationMedia(input: {
  routeKey: string;
  routeVisit: RouteVisit;
  document: ScreenDocumentV1;
  bindings: readonly ScreenFieldBinding[];
  values: Record<string, unknown>;
  overrides: readonly ScreenEntryPresentationOverrideDraft[];
  mountedRef: MutableRefObject<boolean>;
}) {
  const { routeKey, routeVisit, document, bindings, values, overrides, mountedRef } = input;
  const mediaLoadGenerationRef = useRef(0);
  const mediaPendingAttemptRef = useRef<{
    attempt: MediaAttempt;
    promise: Promise<MediaRecord[]>;
  } | null>(null);

  const requestedIdsPlan = useMemo(
    () => collectWinningDirectImageAssetIds({ document, bindings, values, overrides }),
    [bindings, document, overrides, values]
  );
  const boundedRequestPlan = useMemo(
    () => buildBoundedPresentationMediaRequestPlan(routeKey, requestedIdsPlan),
    [requestedIdsPlan, routeKey]
  );
  const mediaRequestKey = boundedRequestPlan.requestKey;
  const [mediaMachine, dispatchMediaAttempt] = useReducer(
    mediaAttemptReducer,
    { requestKey: mediaRequestKey, requestedIds: boundedRequestPlan.requestedIds },
    initializeMediaMachineState
  );

  const invalidate = useCallback(() => {
    mediaLoadGenerationRef.current += 1;
  }, []);

  useEffect(() => {
    if (mediaMachine.requestKey === mediaRequestKey) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      invalidate();
      dispatchMediaAttempt({
        type: "sync-request",
        requestKey: mediaRequestKey,
        requestedIds: readRequestedIdsFromMediaRequestKey(mediaRequestKey),
      });
    });
    return () => {
      active = false;
    };
  }, [invalidate, mediaMachine.requestKey, mediaRequestKey]);

  const attempt = mediaMachine.requestKey === mediaRequestKey ? mediaMachine.attempt : null;
  const attemptToken = attempt?.token ?? null;
  const [mediaCommit, setMediaCommit] = useState<MediaCommit>({
    routeVisit: null,
    requestKey: null,
    attemptToken: null,
    urlsById: {},
    error: null,
  });
  const retry = useCallback(
    (cause: "manual-retry" | "cache-event" = "manual-retry") => {
      invalidate();
      dispatchMediaAttempt({ type: "retry", requestKey: mediaRequestKey, cause });
    },
    [invalidate, mediaRequestKey]
  );

  useEffect(
    () =>
      subscribeCacheEvents((event) => {
        if (event.key === cacheKeys.mediaList && boundedRequestPlan.requestedIds.length > 0) {
          retry("cache-event");
        }
      }),
    [boundedRequestPlan.requestedIds.length, retry]
  );

  useEffect(() => {
    if (!attempt || attempt.requestKey !== mediaRequestKey) return undefined;
    const frozenRouteVisit = routeVisit;
    const frozenRequestedIds = attempt.requestedIds;
    const frozenAttemptToken = attempt.token;
    let active = true;
    const generation = ++mediaLoadGenerationRef.current;
    const isCurrent = () =>
      active && mountedRef.current && generation === mediaLoadGenerationRef.current;
    let pending = mediaPendingAttemptRef.current;
    if (!pending || pending.attempt !== attempt) {
      pending = { attempt, promise: listMediaCached({ force: attempt.force }) };
      mediaPendingAttemptRef.current = pending;
    }
    void pending.promise
      .then((records) => {
        if (!isCurrent()) return;
        dispatchMediaAttempt({
          type: "settled",
          requestKey: mediaRequestKey,
          token: frozenAttemptToken,
        });
        setMediaCommit({
          routeVisit: frozenRouteVisit,
          requestKey: mediaRequestKey,
          attemptToken: frozenAttemptToken,
          urlsById: projectExactRequestedMediaUrls(records, frozenRequestedIds),
          error: null,
        });
      })
      .catch(() => {
        if (!isCurrent()) return;
        dispatchMediaAttempt({
          type: "settled",
          requestKey: mediaRequestKey,
          token: frozenAttemptToken,
        });
        setMediaCommit((previous) => ({
          routeVisit: frozenRouteVisit,
          requestKey: mediaRequestKey,
          attemptToken: frozenAttemptToken,
          urlsById:
            previous.routeVisit === frozenRouteVisit && previous.requestKey === mediaRequestKey
              ? previous.urlsById
              : {},
          error: PRESENTATION_MEDIA_LOAD_ERROR,
        }));
      });
    return () => {
      active = false;
    };
  }, [attempt, mediaRequestKey, mountedRef, routeVisit]);

  useEffect(() => () => invalidate(), [invalidate, routeKey]);

  const mediaMatchesRequest =
    mediaCommit.routeVisit === routeVisit && mediaCommit.requestKey === mediaRequestKey;
  const matchedTransientError =
    mediaCommit.attemptToken === attemptToken ? mediaCommit.error : null;
  const state: ScreenEntryPresentationMediaState =
    boundedRequestPlan.error !== null
      ? {
          urlsById: {},
          loading: false,
          refreshing: false,
          error: boundedRequestPlan.error,
          errorKind: boundedRequestPlan.errorKind,
        }
      : boundedRequestPlan.requestedIds.length === 0
        ? { urlsById: {}, loading: false, refreshing: false, error: null, errorKind: null }
        : mediaMatchesRequest
          ? {
              urlsById: mediaCommit.urlsById,
              loading: false,
              refreshing: mediaCommit.attemptToken !== attemptToken,
              error: matchedTransientError,
              errorKind: matchedTransientError !== null ? "load" : null,
            }
          : { urlsById: {}, loading: true, refreshing: false, error: null, errorKind: null };

  return { state, retry, invalidate };
}
