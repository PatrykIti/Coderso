import {
  isScreenMediaAssetUuid,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import type { ScreenEntryPresentationOverrideDraft } from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import { collectScreenDocumentBlocks } from "../../../services/customScreens/screenDocumentOps";
import { readBindingPathValue } from "../../../services/utils/bindingPath";

export type MediaAttemptCause = "initial" | "manual-retry" | "cache-event";
export type MediaAttempt = {
  requestKey: string;
  token: number;
  cause: MediaAttemptCause;
  force: boolean;
  requestedIds: readonly string[];
};
export type MediaMachineState = {
  lastToken: number;
  settledToken: number | null;
  requestKey: string;
  attempt: MediaAttempt | null;
};
export type MediaAttemptInput = {
  requestKey: string;
  requestedIds: readonly string[];
};
export type MediaAttemptAction =
  | { type: "sync-request"; requestKey: string; requestedIds: readonly string[] }
  | { type: "retry"; requestKey: string; cause: "manual-retry" | "cache-event" }
  | { type: "settled"; requestKey: string; token: number };

export type PresentationMediaProjectionRecord = Readonly<{
  id: string;
  type: string;
  url: string;
}>;

export type PresentationMediaErrorKind = "load" | "overflow";

export type BoundedPresentationMediaRequestPlan = Readonly<{
  requestKey: string;
  requestedIds: readonly string[];
  error: string | null;
  errorKind: "overflow" | null;
}>;

export const PRESENTATION_MEDIA_LOAD_ERROR = "Presentation image could not be loaded.";
// A schema-valid entry can resolve more winning direct-image UUIDs than the bounded
// request key permits. That overflow is structural, not a transient read failure:
// re-reading media cannot shrink the requested-id count, so this cause is
// non-retryable and must not borrow the retryable load-error message above.
export const PRESENTATION_MEDIA_OVERFLOW_ERROR =
  "Too many presentation images to display. This record references more than 200 direct images.";
const emptyPresentationMediaIds: readonly string[] = Object.freeze([]);
const invalidPresentationMediaKey = () => new Error("custom_screen_presentation_media_invalid");

const parsePresentationMediaJson = (value: string): unknown => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw invalidPresentationMediaKey();
  }
};

export function buildEntryRouteKey(input: {
  screenId: string | null;
  entryId: string | null;
  isCreateMode: boolean;
}): string {
  return JSON.stringify([input.screenId ?? "", input.entryId ?? "", input.isCreateMode]);
}

const decodeAndValidateEntryRouteKey = (routeKey: string) => {
  const tuple = parsePresentationMediaJson(routeKey);
  if (
    !Array.isArray(tuple) ||
    tuple.length !== 3 ||
    typeof tuple[0] !== "string" ||
    typeof tuple[1] !== "string" ||
    typeof tuple[2] !== "boolean"
  ) {
    throw invalidPresentationMediaKey();
  }
  return Object.freeze([tuple[0], tuple[1], tuple[2]] as const);
};

const assertScreenMediaAssetUuid = (value: unknown): string => {
  if (!isScreenMediaAssetUuid(value)) throw invalidPresentationMediaKey();
  return value;
};

export function buildPresentationMediaRequestKey(
  routeKey: string,
  requestedIds: readonly string[]
): string {
  decodeAndValidateEntryRouteKey(routeKey);
  const ids = [...new Set(requestedIds.map(assertScreenMediaAssetUuid))].sort();
  if (ids.length > 200) throw invalidPresentationMediaKey();
  return JSON.stringify([routeKey, ids]);
}

export function decodeAndValidatePresentationMediaRequestKey(key: string): {
  routeKey: string;
  requestedIds: readonly string[];
} {
  const tuple = parsePresentationMediaJson(key);
  if (
    !Array.isArray(tuple) ||
    tuple.length !== 2 ||
    typeof tuple[0] !== "string" ||
    !Array.isArray(tuple[1]) ||
    tuple[1].length > 200
  ) {
    throw invalidPresentationMediaKey();
  }
  decodeAndValidateEntryRouteKey(tuple[0]);
  const requestedIds = Object.freeze(tuple[1].map(assertScreenMediaAssetUuid));
  if (new Set(requestedIds).size !== requestedIds.length) {
    throw invalidPresentationMediaKey();
  }
  if (requestedIds.some((id, index) => index > 0 && requestedIds[index - 1]! > id)) {
    throw invalidPresentationMediaKey();
  }
  return { routeKey: tuple[0], requestedIds };
}

export const readRequestedIdsFromMediaRequestKey = (key: string): readonly string[] =>
  Object.freeze([...decodeAndValidatePresentationMediaRequestKey(key).requestedIds]);

export function buildBoundedPresentationMediaRequestPlan(
  routeKey: string,
  requestedIds: readonly string[]
): BoundedPresentationMediaRequestPlan {
  const emptyRequestKey = buildPresentationMediaRequestKey(routeKey, emptyPresentationMediaIds);
  try {
    const requestKey = buildPresentationMediaRequestKey(routeKey, requestedIds);
    return Object.freeze({
      requestKey,
      requestedIds: readRequestedIdsFromMediaRequestKey(requestKey),
      error: null,
      errorKind: null,
    });
  } catch {
    return Object.freeze({
      requestKey: emptyRequestKey,
      requestedIds: emptyPresentationMediaIds,
      error: PRESENTATION_MEDIA_OVERFLOW_ERROR,
      errorKind: "overflow",
    });
  }
}

export function allocateMediaAttempt(
  state: MediaMachineState,
  input: MediaAttemptInput,
  cause: MediaAttemptCause,
  force: boolean
): MediaMachineState {
  const token = state.lastToken + 1;
  return {
    ...state,
    lastToken: token,
    requestKey: input.requestKey,
    attempt: Object.freeze({
      requestKey: input.requestKey,
      token,
      cause,
      force,
      requestedIds: Object.freeze([...input.requestedIds]),
    }),
  };
}

const assertNeverMediaAttemptAction = (action: never): never => {
  throw new Error(`Unhandled media-attempt action: ${String(action)}`);
};

export function mediaAttemptReducer(
  state: MediaMachineState,
  action: MediaAttemptAction
): MediaMachineState {
  switch (action.type) {
    case "sync-request": {
      if (action.requestKey === state.requestKey) return state;
      if (action.requestedIds.length === 0) {
        return { ...state, requestKey: action.requestKey, attempt: null };
      }
      const priorPending = state.attempt !== null && state.attempt.token !== state.settledToken;
      const inheritForce = priorPending && state.attempt?.force === true;
      return allocateMediaAttempt(
        state,
        action,
        inheritForce ? state.attempt!.cause : "initial",
        inheritForce
      );
    }
    case "retry":
      if (action.requestKey !== state.requestKey || !state.attempt) return state;
      return allocateMediaAttempt(
        state,
        { requestKey: state.requestKey, requestedIds: state.attempt.requestedIds },
        action.cause,
        true
      );
    case "settled":
      if (
        state.attempt?.requestKey !== action.requestKey ||
        state.attempt.token !== action.token ||
        state.settledToken === action.token
      ) {
        return state;
      }
      return { ...state, settledToken: action.token };
    default:
      return assertNeverMediaAttemptAction(action);
  }
}

export function initializeMediaMachineState(input: MediaAttemptInput): MediaMachineState {
  const empty: MediaMachineState = {
    lastToken: 0,
    settledToken: null,
    requestKey: input.requestKey,
    attempt: null,
  };
  return input.requestedIds.length === 0
    ? empty
    : allocateMediaAttempt(empty, input, "initial", false);
}

const firstMediaAssetUuid = (value: unknown): string | null => {
  const values = Array.isArray(value) ? value : [value];
  return values.find(isScreenMediaAssetUuid) ?? null;
};

export function collectWinningDirectImageAssetIds(input: {
  document: ScreenDocumentV1;
  bindings: readonly ScreenFieldBinding[];
  values: Record<string, unknown>;
  overrides: readonly ScreenEntryPresentationOverrideDraft[];
}): string[] {
  const ids = new Set<string>();
  for (const block of collectScreenDocumentBlocks(input.document)) {
    if (block.type !== "image") continue;
    const authoredMediaAsset = input.overrides.find(
      (override) => override.blockId === block.id && override.propPath === "mediaAssetId"
    );
    const authoredLegacyImage = input.overrides.find(
      (override) => override.blockId === block.id && override.propPath === "image"
    );
    const authored = authoredMediaAsset ?? authoredLegacyImage;
    if (authored) {
      if (isScreenMediaAssetUuid(authored.value)) ids.add(authored.value);
      continue;
    }
    const binding = input.bindings.find(
      (candidate) => candidate.blockId === block.id && candidate.propPath === "src"
    );
    const boundId = binding
      ? firstMediaAssetUuid(readBindingPathValue(input.values, binding.field))
      : null;
    if (boundId) ids.add(boundId);
  }
  return [...ids].sort();
}

export function projectExactRequestedMediaUrls(
  records: readonly PresentationMediaProjectionRecord[],
  requestedIds: readonly string[]
): Readonly<Record<string, string>> {
  const recordsByCanonicalId = new Map<string, PresentationMediaProjectionRecord>();
  for (const record of records) {
    if (isScreenMediaAssetUuid(record.id) && !recordsByCanonicalId.has(record.id.toLowerCase())) {
      recordsByCanonicalId.set(record.id.toLowerCase(), record);
    }
  }
  const result: Record<string, string> = {};
  for (const requestedId of requestedIds) {
    if (!isScreenMediaAssetUuid(requestedId)) continue;
    const record = recordsByCanonicalId.get(requestedId.toLowerCase());
    if (record?.type === "image" && typeof record.url === "string") {
      result[requestedId] = record.url;
    }
  }
  return Object.freeze(result);
}
