import { RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getCachedContentTypes,
  listContentTypesCached,
  type ContentTypeSummary,
} from "@/services/contentTypesClient";
import {
  getCachedScreenEntryOverrides,
  getCachedCustomScreen,
  getCustomScreenCached,
  getScreenEntryOverridesCached,
  replaceScreenEntryOverrides,
  type CustomScreenEntryPresentationOverride,
  type CustomScreenRecord,
} from "@/services/customScreensClient";
import {
  createEntry,
  getCachedEntryDetail,
  getEntryCached,
  updateEntry,
  type EntryDetail,
} from "@/services/entriesClient";
import { listMediaCached, type MediaRecord } from "@/services/mediaClient";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import {
  clearActiveAssistantSurfaceContext,
  setActiveAssistantSurfaceContext,
} from "@/ui/assistant/activeSurfaceContext";
import { EditorShell } from "@/ui/layouts/EditorShell";
import { CanvasEditor } from "@/ui/shared/CanvasEditor";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useAdminDirtyNavigationGuard } from "@/ui/shared/AdminDirtyNavigationGuard";
import { fieldsFromSchema } from "@/ui/content-types/schemaMapping";
import { MediaPicker } from "@/ui/media/MediaPicker";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import {
  isScreenMediaAssetUuid,
  normalizeCustomScreenDefinitionForRead,
  type CustomScreenDefinition,
  type CustomScreenEditorViewDefinitionV4,
  type ScreenBlockV1,
  type ScreenDocumentV1,
  type ScreenFieldBinding,
} from "../../../services/customScreens/customScreenSchemas";
import {
  screenEntryPresentationTextEmphasisValues,
  screenEntryPresentationTextSizes,
  screenEntryPresentationToneValues,
  type ScreenEntryPresentationOverridePropPath,
} from "../../../services/customScreens/screenEntryPresentationOverrideContract";
import {
  collectScreenDocumentBlocks,
  findScreenBlockById,
  getFirstScreenBlockId,
} from "../../../services/customScreens/screenDocumentOps";
import type { RelatedEntrySummary } from "../../../services/customScreens/relatedEntryResolver";
import { readBindingPathValue } from "../../../services/utils/bindingPath";

import { CustomScreenPreview } from "./CustomScreenPreview";
import { CustomScreenEntryCanvas } from "./CustomScreenEntryCanvas";
import { useScreenEntryPreferences } from "./hooks/useScreenEntryPreferences";
import { useScreenRelatedEntries } from "./hooks/useScreenRelatedEntries";
import { buildCustomScreenAssistantSurface } from "./assistantSurface";
import { buildCustomScreenWorkspacePath, resolveCustomScreenEntryParams } from "./routeParams";
import { resolveCustomScreenCapabilities } from "../../../services/customScreens/capabilities";
import type { ContentField } from "../content-types/SchemaBuilder";
import {
  buildEditorViewCreatePayload,
  buildEditorViewUpdatePayload,
  buildInitialEntryDraft,
  hydrateEditorViewDraft,
  resolveEntryFieldErrorsFromApiError,
  validateEntryDraft,
  type CustomScreenEntryDraft,
} from "./customScreenEntryDraft";

const emptyScreenDocument: ScreenDocumentV1 = {
  schemaVersion: 1,
  sections: [],
};
const emptyContentFields: ContentField[] = [];
const emptyFieldValues: Record<string, unknown> = {};
const emptyPresentationOverrides: CustomScreenEntryPresentationOverride[] = [];

const emptyEditorView: CustomScreenEditorViewDefinitionV4 = {
  document: emptyScreenDocument,
  bindings: [],
  saveMode: "entry",
  interactionMode: "inline",
};

const resolveRuntimeDefinition = (screen: CustomScreenRecord): CustomScreenDefinition =>
  normalizeCustomScreenDefinitionForRead({
    definition: screen.definition,
    schemaVersion: screen.schemaVersion,
    blocks: screen.blocks,
    bindings: screen.bindings,
  });

const resolveRuntimeEditorView = (screen: CustomScreenRecord) =>
  resolveRuntimeDefinition(screen).editorView;

const resolveRuntimeDocument = (screen: CustomScreenRecord | null) =>
  screen ? resolveRuntimeDefinition(screen).editorView.document : emptyScreenDocument;

const resolveRuntimeBindings = (screen: CustomScreenRecord | null) =>
  screen ? resolveRuntimeDefinition(screen).editorView.bindings : [];

const preserveSelectedElementAcrossRefresh = (input: {
  selectedBlockId: string | null;
  nextDocument: ScreenDocumentV1;
}) => {
  if (!input.selectedBlockId) {
    return getFirstScreenBlockId(input.nextDocument);
  }
  return findScreenBlockById(input.nextDocument, input.selectedBlockId)
    ? input.selectedBlockId
    : getFirstScreenBlockId(input.nextDocument);
};

const inheritPresentationValue = "__inherit__";
const recordHeaderPresentationBindingPaths = new Set([
  "title",
  "eyebrow",
  "subtitle",
  "description",
  "badge",
]);
const systemPresentationFieldNames = new Set([
  "title",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

type PresentationTarget = {
  block: ScreenBlockV1;
  label: string;
  supportsText: boolean;
  mediaField: ContentField | null;
  supportsDirectImage: boolean;
};

const presentationTextSizeOptions = screenEntryPresentationTextSizes.map((value) => ({
  value,
  label: value.toUpperCase(),
}));

const presentationTextEmphasisOptions = screenEntryPresentationTextEmphasisValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const presentationToneOptions = screenEntryPresentationToneValues.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

const presentationOverrideSort = (
  left: CustomScreenEntryPresentationOverride,
  right: CustomScreenEntryPresentationOverride
) => {
  const blockCompare = left.blockId.localeCompare(right.blockId);
  return blockCompare === 0 ? left.propPath.localeCompare(right.propPath) : blockCompare;
};

const normalizePresentationOverrideOrder = (overrides: CustomScreenEntryPresentationOverride[]) =>
  [...overrides].sort(presentationOverrideSort);

const serializePresentationOverrides = (overrides: CustomScreenEntryPresentationOverride[]) =>
  JSON.stringify(normalizePresentationOverrideOrder(overrides));

export function resolvePresentationDraftTransition(input: {
  saved: readonly CustomScreenEntryPresentationOverride[];
  current: readonly CustomScreenEntryPresentationOverride[];
  update: (
    current: readonly CustomScreenEntryPresentationOverride[]
  ) => CustomScreenEntryPresentationOverride[];
}) {
  const nextDraft = normalizePresentationOverrideOrder(input.update(input.current));
  return {
    nextDraft,
    dirty:
      serializePresentationOverrides([...input.saved]) !==
      serializePresentationOverrides(nextDraft),
  };
}

export const isDraftAuthorityClean = (input: {
  capturedGeneration: number;
  currentGeneration: number;
  contentDirty: boolean;
  presentationDirty: boolean;
}) =>
  input.capturedGeneration === input.currentGeneration &&
  !input.contentDirty &&
  !input.presentationDirty;

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const findBinding = (bindings: ScreenFieldBinding[], blockId: string, propPath: string) =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === propPath) ?? null;

const findContentField = (fields: ContentField[], fieldName: string) =>
  fields.find((field) => field.name === fieldName) ?? null;

const isResolvablePresentationField = (fields: ContentField[], fieldName: string) =>
  systemPresentationFieldNames.has(fieldName) || Boolean(findContentField(fields, fieldName));

const resolveFieldBlockFieldName = (block: ScreenBlockV1, bindings: ScreenFieldBinding[]) => {
  const binding = findBinding(bindings, block.id, "value");
  return binding?.field ?? readString(block.data.field);
};

const resolveBlockLabel = (block: ScreenBlockV1, fields: ContentField[]) => {
  const dataLabel =
    readString(block.data.label) ||
    readString(block.data.title) ||
    readString(block.data.content) ||
    readString(block.label);
  if (dataLabel) return dataLabel;
  if (block.type === "field") {
    const field = findContentField(fields, readString(block.data.field));
    return field?.label ?? "Field";
  }
  if (block.type === "record-header") return "Record header";
  if (block.type === "rich-text") return "Shared text";
  return "Selected block";
};

const resolvePresentationTarget = (input: {
  block: ScreenBlockV1 | null;
  bindings: ScreenFieldBinding[];
  fields: ContentField[];
}): PresentationTarget | null => {
  const { block, bindings, fields } = input;
  if (!block) return null;

  if (block.type === "rich-text") {
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: true,
      mediaField: null,
      supportsDirectImage: false,
    };
  }

  if (block.type === "record-header") {
    const bindingsForHeader = bindings.filter(
      (binding) =>
        binding.blockId === block.id && recordHeaderPresentationBindingPaths.has(binding.propPath)
    );
    const bindingsResolvable = bindingsForHeader.every((binding) =>
      isResolvablePresentationField(fields, binding.field)
    );
    if (!bindingsResolvable) return null;
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: true,
      mediaField: null,
      supportsDirectImage: false,
    };
  }

  if (block.type === "image") {
    return {
      block,
      label: resolveBlockLabel(block, fields),
      supportsText: false,
      mediaField: null,
      supportsDirectImage: true,
    };
  }

  if (block.type !== "field") return null;
  const fieldName = resolveFieldBlockFieldName(block, bindings);
  if (!fieldName || !isResolvablePresentationField(fields, fieldName)) return null;
  const field = findContentField(fields, fieldName);
  return {
    block,
    label: resolveBlockLabel(block, fields),
    supportsText: true,
    mediaField: field?.type === "media" ? field : null,
    supportsDirectImage: false,
  };
};

const upsertPresentationOverride = (
  overrides: readonly CustomScreenEntryPresentationOverride[],
  blockId: string,
  propPath: ScreenEntryPresentationOverridePropPath,
  value: string | null
) => {
  const withoutTarget = overrides.filter((override) => {
    if (override.blockId !== blockId) return true;
    if (propPath === "mediaAssetId") {
      return override.propPath !== "mediaAssetId" && override.propPath !== "image";
    }
    return override.propPath !== propPath;
  });
  if (!value) return normalizePresentationOverrideOrder(withoutTarget);
  return normalizePresentationOverrideOrder([
    ...withoutTarget,
    {
      blockId,
      propPath,
      value,
    },
  ]);
};

const removePresentationOverridesForBlock = (
  overrides: readonly CustomScreenEntryPresentationOverride[],
  blockId: string
) => overrides.filter((override) => override.blockId !== blockId);

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

type MediaCommit = {
  routeVisit: RouteVisit | null;
  requestKey: string | null;
  attemptToken: number | null;
  urlsById: Readonly<Record<string, string>>;
  error: string | null;
};

type RouteVisit = Readonly<{ routeKey: string }>;
type RouteMessageCommit = { routeVisit: RouteVisit; message: string };
type PresentationErrorCommit = RouteMessageCommit & { kind: "load" | "save" };

export const PRESENTATION_MEDIA_LOAD_ERROR = "Presentation image could not be loaded.";

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
  overrides: readonly CustomScreenEntryPresentationOverride[];
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
  records: readonly MediaRecord[],
  requestedIds: readonly string[]
): Readonly<Record<string, string>> {
  const requested = new Set(requestedIds);
  const result: Record<string, string> = {};
  for (const record of records) {
    if (
      requested.has(record.id) &&
      isScreenMediaAssetUuid(record.id) &&
      record.type === "image" &&
      typeof record.url === "string"
    ) {
      result[record.id] = record.url;
    }
  }
  return Object.freeze(result);
}

export function CustomScreenEntryEditor() {
  const { path } = useAdminRouter();
  const { screenId, entryId } = useMemo(() => resolveCustomScreenEntryParams(path), [path]);
  const isCreateMode = entryId === "new";
  const routeKey = buildEntryRouteKey({ screenId, entryId, isCreateMode });

  return (
    <CustomScreenEntryRouteSession
      key={routeKey}
      screenId={screenId}
      entryId={entryId}
      isCreateMode={isCreateMode}
      routeKey={routeKey}
    />
  );
}

function CustomScreenEntryRouteSession({
  screenId,
  entryId,
  isCreateMode,
  routeKey,
}: {
  screenId: string | null;
  entryId: string | null;
  isCreateMode: boolean;
  routeKey: string;
}) {
  const { navigate } = useAdminRouter();
  const [routeVisit] = useState<RouteVisit>(() => Object.freeze({ routeKey }));
  const initialScreen = useMemo(
    () => (screenId ? (getCachedCustomScreen(screenId) ?? null) : null),
    [screenId]
  );
  const initialContentType = useMemo(
    () =>
      initialScreen
        ? (getCachedContentTypes()?.find((item) => item.id === initialScreen.contentTypeId) ?? null)
        : null,
    [initialScreen]
  );
  const initialEntry = useMemo(
    () =>
      initialContentType && entryId && !isCreateMode
        ? (getCachedEntryDetail(initialContentType.slug, entryId) ?? null)
        : null,
    [entryId, initialContentType, isCreateMode]
  );
  const initialFields = useMemo(
    () => (initialContentType ? fieldsFromSchema(initialContentType.schema) : []),
    [initialContentType]
  );
  const initialDraft = useMemo<CustomScreenEntryDraft | null>(() => {
    if (!initialScreen || !initialContentType) return null;
    if (isCreateMode) {
      return buildInitialEntryDraft({
        contentType: initialContentType,
        editorView: resolveRuntimeEditorView(initialScreen),
      });
    }
    if (!initialEntry) return null;
    return hydrateEditorViewDraft({
      contentType: initialContentType,
      editorView: resolveRuntimeEditorView(initialScreen),
      entry: initialEntry,
    });
  }, [initialContentType, initialEntry, initialScreen, isCreateMode]);
  const initialCachedPresentationOverrides = useMemo(
    () =>
      screenId && entryId && !isCreateMode
        ? getCachedScreenEntryOverrides(screenId, entryId)
        : null,
    [entryId, isCreateMode, screenId]
  );
  const initialPresentationOverrides = initialCachedPresentationOverrides ?? [];
  const initialEntryRouteReady = Boolean(
    initialScreen && initialContentType && (isCreateMode || initialEntry)
  );
  const initialPresentationRouteReady = isCreateMode || initialCachedPresentationOverrides !== null;

  const [screen, setScreen] = useState<CustomScreenRecord | null>(initialScreen);
  const [contentType, setContentType] = useState<ContentTypeSummary | null>(initialContentType);
  const [entry, setEntry] = useState<EntryDetail | null>(initialEntry);
  const [fields, setFields] = useState<ContentField[]>(initialFields);
  const [values, setValues] = useState<Record<string, unknown>>(initialDraft?.data ?? {});
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [slug, setSlug] = useState(initialDraft?.slug ?? "");
  const [editableFields, setEditableFields] = useState<string[]>(
    initialDraft?.editableFields ?? []
  );
  const [originalData, setOriginalData] = useState<Record<string, unknown>>(
    initialDraft?.originalData ?? {}
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [committedEntryVisit, setCommittedEntryVisit] = useState<RouteVisit | null>(
    initialEntryRouteReady ? routeVisit : null
  );
  const [committedOverrideVisit, setCommittedOverrideVisit] = useState<RouteVisit | null>(
    initialPresentationRouteReady ? routeVisit : null
  );
  const [entryErrorCommit, setEntryErrorCommit] = useState<RouteMessageCommit | null>(null);
  const [presentationErrorCommit, setPresentationErrorCommit] =
    useState<PresentationErrorCommit | null>(null);
  const [remoteEntryWarningVisit, setRemoteEntryWarningVisit] = useState<RouteVisit | null>(null);
  const [remotePresentationWarningVisit, setRemotePresentationWarningVisit] =
    useState<RouteVisit | null>(null);
  const [entryLoadActivityVisit, setEntryLoadActivityVisit] = useState<RouteVisit | null>(
    initialEntryRouteReady ? null : routeVisit
  );
  const [presentationLoadActivityVisit, setPresentationLoadActivityVisit] =
    useState<RouteVisit | null>(
      !isCreateMode && initialCachedPresentationOverrides === null ? routeVisit : null
    );
  const [contentSaveActivityVisit, setContentSaveActivityVisit] = useState<RouteVisit | null>(null);
  const [presentationSaveActivityVisit, setPresentationSaveActivityVisit] =
    useState<RouteVisit | null>(null);
  const [saveNoticeCommit, setSaveNoticeCommit] = useState<RouteMessageCommit | null>(null);
  const [presentationSaveNoticeCommit, setPresentationSaveNoticeCommit] =
    useState<RouteMessageCommit | null>(null);
  const [, setSavedOverrides] = useState<CustomScreenEntryPresentationOverride[]>(
    initialPresentationOverrides
  );
  const [draftOverrides, setDraftOverrides] = useState<CustomScreenEntryPresentationOverride[]>(
    initialPresentationOverrides
  );
  const [hasUnsavedPresentationChanges, setHasUnsavedPresentationChanges] = useState(false);
  const [selectedRuntimeBlockId, setSelectedRuntimeBlockId] = useState<string | null>(null);
  // Entry-view badge preferences are owned by the dedicated hook (default OFF).
  const { preferences: entryPreferences, setPreferences: setEntryPreferences } =
    useScreenEntryPreferences();
  // TASK-496-02: host-owned controlled flag for the shared `CanvasEditor` shell
  // (bottom-docked inline format/presentation panel).
  const [panelOpen, setPanelOpen] = useState(true);
  const [relationTargets, setRelationTargets] = useState<Array<{ slug: string; name: string }>>(
    () =>
      (getCachedContentTypes() ?? []).map((item) => ({
        slug: item.slug,
        name: item.name,
      }))
  );

  const contentDirtyRef = useRef(false);
  const presentationDirtyRef = useRef(false);
  const savedOverridesRef = useRef(initialPresentationOverrides);
  const draftOverridesRef = useRef(initialPresentationOverrides);
  const draftMutationGenerationRef = useRef(0);
  const entryLoadGenerationRef = useRef(0);
  const overrideLoadGenerationRef = useRef(0);
  const contentSaveGenerationRef = useRef(0);
  const presentationSaveGenerationRef = useRef(0);
  const mediaLoadGenerationRef = useRef(0);
  const mediaPendingAttemptRef = useRef<{
    attempt: MediaAttempt;
    promise: Promise<MediaRecord[]>;
  } | null>(null);
  const mountedRef = useRef(true);
  const routeGenerationRef = useRef(0);
  const persistedEntryTargetRef = useRef<{
    routeVisit: RouteVisit;
    routeGeneration: number;
    id: string;
  } | null>(null);

  const entryRouteReady = committedEntryVisit === routeVisit;
  const overrideRouteReady = committedOverrideVisit === routeVisit;
  const error = entryErrorCommit?.routeVisit === routeVisit ? entryErrorCommit.message : null;
  const presentationError =
    presentationErrorCommit?.routeVisit === routeVisit ? presentationErrorCommit.message : null;
  const presentationErrorKind =
    presentationErrorCommit?.routeVisit === routeVisit ? presentationErrorCommit.kind : null;
  const remoteUpdatePending = remoteEntryWarningVisit === routeVisit;
  const remotePresentationUpdatePending = remotePresentationWarningVisit === routeVisit;
  const isLoading = entryLoadActivityVisit === routeVisit || (!entryRouteReady && error === null);
  const isPresentationLoading =
    presentationLoadActivityVisit === routeVisit ||
    (!isCreateMode && !overrideRouteReady && presentationError === null);
  const isSaving = contentSaveActivityVisit === routeVisit;
  const isPresentationSaving = presentationSaveActivityVisit === routeVisit;
  const currentSaveNotice =
    saveNoticeCommit?.routeVisit === routeVisit ? saveNoticeCommit.message : null;
  const currentPresentationSaveNotice =
    presentationSaveNoticeCommit?.routeVisit === routeVisit
      ? presentationSaveNoticeCommit.message
      : null;
  const currentScreen = entryRouteReady ? screen : null;
  const currentContentType = entryRouteReady ? contentType : null;
  const currentEntry = entryRouteReady ? entry : null;
  const currentFields = entryRouteReady ? fields : emptyContentFields;
  const currentDraftOverrides = overrideRouteReady ? draftOverrides : emptyPresentationOverrides;

  const schemaFieldNames = useMemo(
    () => new Set(currentFields.map((field) => field.name)),
    [currentFields]
  );
  const screenCapabilities = useMemo(
    () =>
      currentScreen?.capabilities ??
      resolveCustomScreenCapabilities({
        definition: currentScreen ? resolveRuntimeDefinition(currentScreen) : undefined,
      }),
    [currentScreen]
  );
  const canEditInScreen = screenCapabilities.supportsDedicatedEditor;
  const runtimeDocument = useMemo(() => resolveRuntimeDocument(currentScreen), [currentScreen]);
  const runtimeBindings = useMemo(() => resolveRuntimeBindings(currentScreen), [currentScreen]);
  const selectedRuntimeBlock = useMemo(
    () =>
      selectedRuntimeBlockId ? findScreenBlockById(runtimeDocument, selectedRuntimeBlockId) : null,
    [runtimeDocument, selectedRuntimeBlockId]
  );
  const selectedPresentationTarget = useMemo(
    () =>
      resolvePresentationTarget({
        block: selectedRuntimeBlock,
        bindings: runtimeBindings,
        fields: currentFields,
      }),
    [currentFields, runtimeBindings, selectedRuntimeBlock]
  );
  const overrideCacheKey = useMemo(
    () =>
      screenId && entryId && !isCreateMode
        ? cacheKeys.customScreenEntryOverrides(screenId, entryId)
        : null,
    [entryId, isCreateMode, screenId]
  );

  useEffect(() => {
    if (!currentScreen || !screenId || !entryId) {
      clearActiveAssistantSurfaceContext();
      return undefined;
    }

    setActiveAssistantSurfaceContext(
      buildCustomScreenAssistantSurface({
        screen: currentScreen,
        blocks: runtimeDocument.sections.flatMap((section) => section.blocks),
        bindings: runtimeBindings,
        capabilities: screenCapabilities,
        selectedBlockId: selectedRuntimeBlockId,
        selectedEntryId: entryId,
        warnings: [
          ...(hasUnsavedChanges ? ["custom_screen_entry_has_unsaved_changes"] : []),
          ...(hasUnsavedPresentationChanges
            ? ["custom_screen_entry_presentation_has_unsaved_changes"]
            : []),
          ...(remoteUpdatePending ? ["custom_screen_entry_remote_update_pending"] : []),
          ...(remotePresentationUpdatePending
            ? ["custom_screen_entry_presentation_remote_update_pending"]
            : []),
        ],
      })
    );

    return () => {
      clearActiveAssistantSurfaceContext();
    };
  }, [
    entryId,
    hasUnsavedChanges,
    hasUnsavedPresentationChanges,
    remoteUpdatePending,
    remotePresentationUpdatePending,
    currentScreen,
    screenCapabilities,
    screenId,
    runtimeDocument.sections,
    runtimeBindings,
    selectedRuntimeBlockId,
  ]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    routeGenerationRef.current += 1;
    return () => {
      clearActiveAssistantSurfaceContext();
      persistedEntryTargetRef.current = null;
      mountedRef.current = false;
      routeGenerationRef.current += 1;
      entryLoadGenerationRef.current += 1;
      overrideLoadGenerationRef.current += 1;
      contentSaveGenerationRef.current += 1;
      presentationSaveGenerationRef.current += 1;
      mediaLoadGenerationRef.current += 1;
    };
  }, [routeKey]);

  const mayMutateCurrentEntry = () => entryRouteReady && currentContentType !== null;
  const mayMutateCurrentPresentation = () => entryRouteReady && overrideRouteReady && !isCreateMode;

  const applyLoadedState = useCallback(
    (
      nextScreen: CustomScreenRecord,
      nextContentType: ContentTypeSummary,
      nextEntry: EntryDetail | null,
      acceptedRouteVisit: RouteVisit
    ) => {
      const nextFields = fieldsFromSchema(nextContentType.schema);
      const editorView = resolveRuntimeEditorView(nextScreen);
      const nextDraft = nextEntry
        ? hydrateEditorViewDraft({ contentType: nextContentType, editorView, entry: nextEntry })
        : buildInitialEntryDraft({ contentType: nextContentType, editorView });
      setScreen(nextScreen);
      setContentType(nextContentType);
      setEntry(nextEntry);
      setFields(nextFields);
      setTitle(nextDraft.title);
      setSlug(nextDraft.slug);
      setValues(nextDraft.data);
      setEditableFields(nextDraft.editableFields);
      setOriginalData(nextDraft.originalData);
      setFieldErrors({});
      contentDirtyRef.current = false;
      setHasUnsavedChanges(false);
      setRemoteEntryWarningVisit(null);
      setSelectedRuntimeBlockId((current) =>
        preserveSelectedElementAcrossRefresh({
          selectedBlockId: current,
          nextDocument: resolveRuntimeDocument(nextScreen),
        })
      );
      setEntryErrorCommit(null);
      setCommittedEntryVisit(acceptedRouteVisit);
    },
    []
  );

  const applyAuthoritativePresentationState = useCallback(
    (overrides: CustomScreenEntryPresentationOverride[], acceptedRouteVisit: RouteVisit) => {
      const ordered = normalizePresentationOverrideOrder(overrides);
      savedOverridesRef.current = ordered;
      draftOverridesRef.current = ordered;
      presentationDirtyRef.current = false;
      setSavedOverrides(ordered);
      setDraftOverrides(ordered);
      setHasUnsavedPresentationChanges(false);
      setPresentationErrorCommit(null);
      setRemotePresentationWarningVisit(null);
      setCommittedOverrideVisit(acceptedRouteVisit);
    },
    []
  );

  type LoadChannel = "entry" | "override";
  type LoadToken = {
    channel: LoadChannel;
    routeKey: string;
    routeVisit: RouteVisit;
    routeGeneration: number;
    loadGeneration: number;
    draftGeneration: number;
  };

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
    [routeKey, routeVisit]
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
    [routeKey, routeVisit]
  );

  const mayApplyAuthoritativeDraft = useCallback(
    (token: LoadToken) =>
      isLoadIdentityCurrent(token) &&
      isDraftAuthorityClean({
        capturedGeneration: token.draftGeneration,
        currentGeneration: draftMutationGenerationRef.current,
        contentDirty: contentDirtyRef.current,
        presentationDirty: presentationDirtyRef.current,
      }),
    [isLoadIdentityCurrent]
  );

  const didCompleteDraftRemainClean = useCallback(
    (token: LoadToken) =>
      isDraftAuthorityClean({
        capturedGeneration: token.draftGeneration,
        currentGeneration: draftMutationGenerationRef.current,
        contentDirty: contentDirtyRef.current,
        presentationDirty: presentationDirtyRef.current,
      }),
    []
  );

  const loadEntryRoute = useCallback(
    async (force: boolean) => {
      if (!screenId || !entryId) throw new Error("custom_screen_entry_route_invalid");
      const nextScreen = await getCustomScreenCached(screenId, { force });
      if (!nextScreen) throw new Error("custom_screen_not_found");
      const contentTypes = await listContentTypesCached({ force: true });
      const nextContentType =
        contentTypes.find((item) => item.id === nextScreen.contentTypeId) ?? null;
      if (!nextContentType) throw new Error("content_type_not_found");
      const nextEntry = isCreateMode
        ? null
        : await getEntryCached(nextContentType.slug, entryId, { force });
      if (!isCreateMode && !nextEntry) throw new Error("entry_not_found");
      return { nextScreen, nextContentType, nextEntry };
    },
    [entryId, isCreateMode, screenId]
  );

  const runEntryHydration = useCallback(
    async (force: boolean, isActive: () => boolean) => {
      const token = captureLoadToken("entry");
      setEntryLoadActivityVisit(token.routeVisit);
      try {
        const result = await loadEntryRoute(force);
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        if (!mayApplyAuthoritativeDraft(token)) {
          setRemoteEntryWarningVisit(token.routeVisit);
          return;
        }
        applyLoadedState(
          result.nextScreen,
          result.nextContentType,
          result.nextEntry,
          token.routeVisit
        );
      } catch {
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        setEntryErrorCommit({
          routeVisit: token.routeVisit,
          message: didCompleteDraftRemainClean(token)
            ? "Failed to load record."
            : "Could not check for record updates. Local changes are unchanged.",
        });
      } finally {
        if (isActive() && isLoadIdentityCurrent(token)) {
          setEntryLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
        }
      }
    },
    [
      applyLoadedState,
      captureLoadToken,
      didCompleteDraftRemainClean,
      isLoadIdentityCurrent,
      loadEntryRoute,
      mayApplyAuthoritativeDraft,
    ]
  );

  const runOverrideHydration = useCallback(
    async (force: boolean, isActive: () => boolean) => {
      const token = captureLoadToken("override");
      setPresentationLoadActivityVisit(token.routeVisit);
      try {
        const overrides =
          !screenId || !entryId || isCreateMode
            ? []
            : await getScreenEntryOverridesCached(screenId, entryId, { force });
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        if (!mayApplyAuthoritativeDraft(token)) {
          setRemotePresentationWarningVisit(token.routeVisit);
          return;
        }
        applyAuthoritativePresentationState(overrides, token.routeVisit);
      } catch {
        if (!isActive() || !isLoadIdentityCurrent(token)) return;
        setPresentationErrorCommit({
          routeVisit: token.routeVisit,
          kind: "load",
          message: didCompleteDraftRemainClean(token)
            ? "Failed to load presentation overrides."
            : "Could not check for presentation updates. Local changes are unchanged.",
        });
      } finally {
        if (isActive() && isLoadIdentityCurrent(token)) {
          setPresentationLoadActivityVisit((current) =>
            current === token.routeVisit ? null : current
          );
        }
      }
    },
    [
      applyAuthoritativePresentationState,
      captureLoadToken,
      didCompleteDraftRemainClean,
      entryId,
      isCreateMode,
      isLoadIdentityCurrent,
      mayApplyAuthoritativeDraft,
      screenId,
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
    listContentTypesCached({ force: true })
      .then((items) =>
        setRelationTargets(items.map((item) => ({ slug: item.slug, name: item.name })))
      )
      .catch(() => undefined);
  }, []);

  const markContentMutation = () => {
    if (!mayMutateCurrentEntry()) return false;
    draftMutationGenerationRef.current += 1;
    contentDirtyRef.current = true;
    setHasUnsavedChanges(true);
    return true;
  };

  const handleFieldChange = (name: string, value: unknown) => {
    if (!markContentMutation()) return;
    setValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setEntryErrorCommit(null);
  };

  const handleTitleChange = (value: string) => {
    if (!markContentMutation()) return;
    setTitle(value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.title;
      return next;
    });
    if (schemaFieldNames.has("title")) {
      setValues((current) => ({ ...current, title: value }));
    }
  };

  const handleSlugChange = (value: string) => {
    if (!markContentMutation()) return;
    setSlug(value);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.slug;
      return next;
    });
    if (schemaFieldNames.has("slug")) {
      setValues((current) => ({ ...current, slug: value }));
    }
  };

  const buildPayloadData = () => {
    const data: Record<string, unknown> = { ...originalData };
    editableFields.forEach((key) => {
      data[key] = values[key];
    });
    if (schemaFieldNames.has("title")) data.title = title;
    if (schemaFieldNames.has("slug")) data.slug = slug;
    return data;
  };

  const buildCanvasFieldValues = () => ({
    ...buildPayloadData(),
    title,
    slug,
    status: currentEntry?.status ?? "draft",
    createdAt: currentEntry?.createdAt ?? null,
    updatedAt: currentEntry?.updatedAt ?? null,
    publishedAt: currentEntry?.publishedAt ?? null,
  });

  // TASK-498-03 B3.4 — STABLE `values` source for the related-list precompute effect.
  // buildPayloadData/buildCanvasFieldValues return a FRESH object every render; feeding
  // that straight into the effect would loop (fresh values → effect → setState → re-render).
  // Memoize the merged payload over its real inputs so the effect only re-runs when the
  // underlying entry data actually changes. Fed to BOTH the canvas renderer AND the effect.
  const canvasFieldValues = useMemo<Record<string, unknown>>(
    () => buildCanvasFieldValues(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originalData, editableFields, values, schemaFieldNames, title, slug, currentEntry]
  );

  const relatedState = useScreenRelatedEntries({
    enabled: entryRouteReady,
    document: runtimeDocument,
    bindings: runtimeBindings,
    values: entryRouteReady ? canvasFieldValues : emptyFieldValues,
    fields: currentFields,
  });
  const relatedEntries: Record<string, RelatedEntrySummary[]> = relatedState.items;

  const requestedIdsPlan = useMemo(
    () =>
      collectWinningDirectImageAssetIds({
        document: runtimeDocument,
        bindings: runtimeBindings,
        values: entryRouteReady ? canvasFieldValues : emptyFieldValues,
        overrides: currentDraftOverrides,
      }),
    [canvasFieldValues, currentDraftOverrides, entryRouteReady, runtimeBindings, runtimeDocument]
  );
  const mediaRequestKey = buildPresentationMediaRequestKey(routeKey, requestedIdsPlan);
  const [mediaMachine, dispatchMediaAttempt] = useReducer(
    mediaAttemptReducer,
    { requestKey: mediaRequestKey, requestedIds: requestedIdsPlan },
    initializeMediaMachineState
  );
  useEffect(() => {
    if (mediaMachine.requestKey === mediaRequestKey) return undefined;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      mediaLoadGenerationRef.current += 1;
      dispatchMediaAttempt({
        type: "sync-request",
        requestKey: mediaRequestKey,
        requestedIds: readRequestedIdsFromMediaRequestKey(mediaRequestKey),
      });
    });
    return () => {
      active = false;
    };
  }, [mediaMachine.requestKey, mediaRequestKey]);

  const attempt = mediaMachine.requestKey === mediaRequestKey ? mediaMachine.attempt : null;
  const attemptToken = attempt?.token ?? null;
  const [mediaCommit, setMediaCommit] = useState<MediaCommit>({
    routeVisit: null,
    requestKey: null,
    attemptToken: null,
    urlsById: {},
    error: null,
  });
  const beginMediaAttempt = useCallback(
    (cause: "manual-retry" | "cache-event") => {
      mediaLoadGenerationRef.current += 1;
      dispatchMediaAttempt({ type: "retry", requestKey: mediaRequestKey, cause });
    },
    [mediaRequestKey]
  );
  const hasRequestedMediaIds = requestedIdsPlan.length > 0;
  useEffect(
    () =>
      subscribeCacheEvents((event) => {
        if (event.key === cacheKeys.mediaList && hasRequestedMediaIds) {
          beginMediaAttempt("cache-event");
        }
      }),
    [beginMediaAttempt, hasRequestedMediaIds]
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
      pending = {
        attempt,
        promise: listMediaCached({ force: attempt.force }),
      };
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
  }, [attempt, mediaRequestKey, routeVisit]);

  const mediaMatchesRequest =
    mediaCommit.routeVisit === routeVisit && mediaCommit.requestKey === mediaRequestKey;
  const presentationMediaState =
    requestedIdsPlan.length === 0
      ? { urlsById: {}, loading: false, refreshing: false, error: null }
      : mediaMatchesRequest
        ? {
            urlsById: mediaCommit.urlsById,
            loading: false,
            refreshing: mediaCommit.attemptToken !== attemptToken,
            error: mediaCommit.attemptToken === attemptToken ? mediaCommit.error : null,
          }
        : { urlsById: {}, loading: true, refreshing: false, error: null };

  useEffect(() => {
    if (!screenId || !entryId || !currentContentType) return undefined;
    return subscribeCacheEvents((event) => {
      if (overrideCacheKey && event.key === overrideCacheKey) {
        void refreshPresentation(true);
        return;
      }
      if (
        event.key === cacheKeys.customScreensList ||
        event.key === cacheKeys.customScreenDetail(screenId) ||
        (!isCreateMode && event.key === cacheKeys.entryDetail(currentContentType.slug, entryId))
      ) {
        void refresh(true);
      }
    });
  }, [
    currentContentType,
    entryId,
    isCreateMode,
    overrideCacheKey,
    refresh,
    refreshPresentation,
    screenId,
  ]);

  const applyPresentationDraftMutation = (
    update: (
      current: readonly CustomScreenEntryPresentationOverride[]
    ) => CustomScreenEntryPresentationOverride[]
  ) => {
    if (!mayMutateCurrentPresentation()) return false;
    const transition = resolvePresentationDraftTransition({
      saved: savedOverridesRef.current,
      current: draftOverridesRef.current,
      update,
    });
    const nextDraft = transition.nextDraft;
    if (
      serializePresentationOverrides(nextDraft) ===
      serializePresentationOverrides(draftOverridesRef.current)
    ) {
      return false;
    }
    draftMutationGenerationRef.current += 1;
    draftOverridesRef.current = nextDraft;
    const dirty = transition.dirty;
    presentationDirtyRef.current = dirty;
    setDraftOverrides(nextDraft);
    setHasUnsavedPresentationChanges(dirty);
    return true;
  };

  const clearUnsavedPresentationDraftWithoutPersisting = () => {
    const saved = savedOverridesRef.current;
    draftOverridesRef.current = saved;
    presentationDirtyRef.current = false;
    setDraftOverrides(saved);
    setHasUnsavedPresentationChanges(false);
  };

  const { dialog: dirtyNavigationDialog } = useAdminDirtyNavigationGuard({
    blocked: hasUnsavedChanges || hasUnsavedPresentationChanges,
    title: "Discard unsaved entry changes?",
    description: "Content or presentation changes have not been saved.",
    confirmLabel: "Discard and continue",
    cancelLabel: "Keep editing",
    onConfirmDiscard: () => {
      contentDirtyRef.current = false;
      presentationDirtyRef.current = false;
      draftMutationGenerationRef.current += 1;
      entryLoadGenerationRef.current += 1;
      overrideLoadGenerationRef.current += 1;
      contentSaveGenerationRef.current += 1;
      presentationSaveGenerationRef.current += 1;
      mediaLoadGenerationRef.current += 1;
      persistedEntryTargetRef.current = null;
      setCommittedEntryVisit(null);
      setCommittedOverrideVisit(null);
      setEntryLoadActivityVisit(null);
      setPresentationLoadActivityVisit(null);
      setContentSaveActivityVisit(null);
      setPresentationSaveActivityVisit(null);
      setEntryErrorCommit(null);
      setPresentationErrorCommit(null);
      setRemoteEntryWarningVisit(null);
      setRemotePresentationWarningVisit(null);
      setSaveNoticeCommit(null);
      setPresentationSaveNoticeCommit(null);
      setHasUnsavedChanges(false);
      clearUnsavedPresentationDraftWithoutPersisting();
    },
  });

  type SaveChannel = "content" | "presentation";
  type SaveToken = {
    channel: SaveChannel;
    routeKey: string;
    routeVisit: RouteVisit;
    routeGeneration: number;
    saveGeneration: number;
    draftGeneration: number;
    createRouteVisit: RouteVisit | null;
  };

  const captureSaveToken = (channel: SaveChannel): SaveToken => ({
    channel,
    routeKey,
    routeVisit,
    routeGeneration: routeGenerationRef.current,
    saveGeneration:
      channel === "content"
        ? ++contentSaveGenerationRef.current
        : ++presentationSaveGenerationRef.current,
    draftGeneration: draftMutationGenerationRef.current,
    createRouteVisit: isCreateMode ? routeVisit : null,
  });

  const isSaveIdentityCurrent = (token: SaveToken) => {
    const generation =
      token.channel === "content"
        ? contentSaveGenerationRef.current
        : presentationSaveGenerationRef.current;
    return (
      mountedRef.current &&
      token.routeKey === routeKey &&
      token.routeVisit === routeVisit &&
      token.routeGeneration === routeGenerationRef.current &&
      token.saveGeneration === generation
    );
  };

  const isExactSaveDraft = (token: SaveToken) =>
    isSaveIdentityCurrent(token) && token.draftGeneration === draftMutationGenerationRef.current;

  const updatePersistedEntryBaselineWithoutReplacingDraft = (saved: EntryDetail) => {
    setEntry(saved);
    setOriginalData(saved.data);
  };

  const applySavedEntryAndBaseline = (
    saved: EntryDetail,
    savedContentType: ContentTypeSummary,
    savedScreen: CustomScreenRecord | null
  ) => {
    const savedDraft = hydrateEditorViewDraft({
      contentType: savedContentType,
      editorView: savedScreen ? resolveRuntimeEditorView(savedScreen) : emptyEditorView,
      entry: saved,
    });
    setEntry(saved);
    setTitle(saved.title);
    setSlug(saved.slug);
    setValues(savedDraft.data);
    setEditableFields(savedDraft.editableFields);
    setOriginalData(savedDraft.originalData);
    setFieldErrors({});
  };

  const handleSave = async () => {
    if (!mayMutateCurrentEntry() || !currentContentType || !entryId) return;
    const capturedContentType = currentContentType;
    const capturedScreen = currentScreen;
    const draft: CustomScreenEntryDraft = {
      title,
      slug,
      data: values,
      editableFields,
      originalData,
      fieldErrors,
    };
    const nextFieldErrors = validateEntryDraft({ contentType: capturedContentType, draft });
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setEntryErrorCommit({
        routeVisit,
        message: "Fix the highlighted fields before saving.",
      });
      return;
    }
    const token = captureSaveToken("content");
    setContentSaveActivityVisit(token.routeVisit);
    setEntryErrorCommit(null);
    setFieldErrors({});
    try {
      const capturedTarget = persistedEntryTargetRef.current;
      const targetId = !isCreateMode
        ? entryId
        : capturedTarget?.routeVisit === routeVisit &&
            capturedTarget.routeGeneration === routeGenerationRef.current
          ? capturedTarget.id
          : null;
      const saved = targetId
        ? await updateEntry(
            capturedContentType.slug,
            targetId,
            buildEditorViewUpdatePayload({ contentType: capturedContentType, draft })
          )
        : await createEntry(
            capturedContentType.slug,
            buildEditorViewCreatePayload({ contentType: capturedContentType, draft })
          );
      if (!isSaveIdentityCurrent(token)) return;
      entryLoadGenerationRef.current += 1;
      setEntryLoadActivityVisit((current) => (current === token.routeVisit ? null : current));
      setRemoteEntryWarningVisit(null);
      if (!isExactSaveDraft(token)) {
        updatePersistedEntryBaselineWithoutReplacingDraft(saved);
        if (token.createRouteVisit !== null) {
          persistedEntryTargetRef.current = {
            routeVisit: token.createRouteVisit,
            routeGeneration: token.routeGeneration,
            id: saved.id,
          };
        }
        setSaveNoticeCommit({
          routeVisit: token.routeVisit,
          message: "Saved server version; newer local changes remain unsaved.",
        });
        return;
      }
      contentDirtyRef.current = false;
      persistedEntryTargetRef.current = null;
      applySavedEntryAndBaseline(saved, capturedContentType, capturedScreen);
      setHasUnsavedChanges(false);
      setSaveNoticeCommit(null);
      if (isCreateMode && screenId) {
        navigate(buildCustomScreenWorkspacePath({ screenId, entryId: saved.id }), {
          skipBlockers: true,
        });
      }
    } catch (err) {
      if (!isSaveIdentityCurrent(token)) return;
      if (isApiClientError(err)) {
        const nextFieldErrors = resolveEntryFieldErrorsFromApiError({
          contentType: capturedContentType,
          error: err,
        });
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          setEntryErrorCommit({
            routeVisit: token.routeVisit,
            message: "Fix the highlighted fields before saving.",
          });
        } else {
          setEntryErrorCommit({ routeVisit: token.routeVisit, message: err.message });
        }
      } else {
        setEntryErrorCommit({
          routeVisit: token.routeVisit,
          message: "Failed to save record.",
        });
      }
    } finally {
      if (isSaveIdentityCurrent(token)) {
        setContentSaveActivityVisit((current) => (current === token.routeVisit ? null : current));
      }
    }
  };

  const readSelectedPresentationOverride = (propPath: ScreenEntryPresentationOverridePropPath) => {
    if (!selectedPresentationTarget) return null;
    return (
      currentDraftOverrides.find(
        (override) =>
          override.blockId === selectedPresentationTarget.block.id && override.propPath === propPath
      )?.value ?? null
    );
  };

  const handleSelectedPresentationChange = (
    propPath: ScreenEntryPresentationOverridePropPath,
    value: string | null
  ) => {
    if (!selectedPresentationTarget) return;
    const changed = applyPresentationDraftMutation((current) =>
      upsertPresentationOverride(current, selectedPresentationTarget.block.id, propPath, value)
    );
    if (changed) {
      setPresentationErrorCommit((current) =>
        current?.routeVisit === routeVisit && current.kind === "save" ? null : current
      );
    }
  };

  const handleClearSelectedPresentation = () => {
    if (!selectedPresentationTarget) return;
    const changed = applyPresentationDraftMutation((current) =>
      removePresentationOverridesForBlock(current, selectedPresentationTarget.block.id)
    );
    if (changed) {
      setPresentationErrorCommit((current) =>
        current?.routeVisit === routeVisit && current.kind === "save" ? null : current
      );
    }
  };

  const handleSavePresentation = async () => {
    if (!mayMutateCurrentPresentation() || !screenId || !entryId) return;
    const token = captureSaveToken("presentation");
    const capturedDraft = [...draftOverridesRef.current];
    setPresentationSaveActivityVisit(token.routeVisit);
    setPresentationErrorCommit((current) =>
      current?.routeVisit === routeVisit && current.kind === "save" ? null : current
    );
    try {
      const saved = await replaceScreenEntryOverrides(screenId, entryId, capturedDraft);
      if (!isSaveIdentityCurrent(token)) return;
      overrideLoadGenerationRef.current += 1;
      setPresentationLoadActivityVisit((current) =>
        current === token.routeVisit ? null : current
      );
      setRemotePresentationWarningVisit(null);
      const ordered = normalizePresentationOverrideOrder(saved);
      savedOverridesRef.current = ordered;
      setSavedOverrides(ordered);
      if (!isExactSaveDraft(token)) {
        const stillDirty =
          serializePresentationOverrides(ordered) !==
          serializePresentationOverrides(draftOverridesRef.current);
        presentationDirtyRef.current = stillDirty;
        setHasUnsavedPresentationChanges(stillDirty);
        setPresentationSaveNoticeCommit(
          stillDirty
            ? {
                routeVisit: token.routeVisit,
                message: "Saved server presentation; newer local changes remain unsaved.",
              }
            : null
        );
        return;
      }
      presentationDirtyRef.current = false;
      draftOverridesRef.current = ordered;
      setDraftOverrides(ordered);
      setHasUnsavedPresentationChanges(false);
      setPresentationSaveNoticeCommit(null);
    } catch (err) {
      if (!isSaveIdentityCurrent(token)) return;
      if (isApiClientError(err)) {
        setPresentationErrorCommit({
          routeVisit: token.routeVisit,
          kind: "save",
          message: err.message,
        });
      } else {
        setPresentationErrorCommit({
          routeVisit: token.routeVisit,
          kind: "save",
          message: "Failed to save presentation overrides.",
        });
      }
    } finally {
      if (isSaveIdentityCurrent(token)) {
        setPresentationSaveActivityVisit((current) =>
          current === token.routeVisit ? null : current
        );
      }
    }
  };

  const handleReloadPresentation = () => {
    void refreshPresentation(true);
  };

  const selectedPresentationOverrideCount = selectedPresentationTarget
    ? currentDraftOverrides.filter(
        (override) => override.blockId === selectedPresentationTarget.block.id
      ).length
    : 0;
  const selectedTextSize = readSelectedPresentationOverride("textSize") ?? inheritPresentationValue;
  const selectedTextEmphasis =
    readSelectedPresentationOverride("textEmphasis") ?? inheritPresentationValue;
  const selectedTone = readSelectedPresentationOverride("tone") ?? inheritPresentationValue;
  const selectedMediaAssetId =
    readSelectedPresentationOverride("mediaAssetId") ??
    readSelectedPresentationOverride("image") ??
    null;

  const presentationPanel =
    currentScreen &&
    canEditInScreen &&
    !isCreateMode &&
    overrideRouteReady &&
    !isPresentationLoading &&
    selectedPresentationTarget ? (
      <div
        className="rounded-2xl border border-border bg-card p-4 shadow-soft"
        data-custom-screen-entry-presentation-panel="true"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Presentation</p>
              <Badge variant="outline" className="text-[10px] uppercase">
                {selectedPresentationTarget.label}
              </Badge>
              {hasUnsavedPresentationChanges ? (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Unsaved presentation
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Overrides are scoped to this record and selected block.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={handleSavePresentation}
              disabled={
                isPresentationSaving || isPresentationLoading || !hasUnsavedPresentationChanges
              }
            >
              <Save className="h-4 w-4" />
              {isPresentationSaving ? "Saving..." : "Save presentation"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleReloadPresentation}
              disabled={isPresentationSaving || isPresentationLoading}
            >
              <RefreshCw className="h-4 w-4" />
              Reload presentation
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleClearSelectedPresentation}
              disabled={selectedPresentationOverrideCount === 0 || isPresentationSaving}
            >
              <Trash2 className="h-4 w-4" />
              Clear selected presentation
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {selectedPresentationTarget.supportsText ? (
            <>
              <div className="space-y-1" data-presentation-control="textSize">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Text size
                </label>
                <Select
                  value={selectedTextSize}
                  onValueChange={(next) =>
                    handleSelectedPresentationChange(
                      "textSize",
                      next === inheritPresentationValue ? null : next
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                    {presentationTextSizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1" data-presentation-control="textEmphasis">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Emphasis
                </label>
                <Select
                  value={selectedTextEmphasis}
                  onValueChange={(next) =>
                    handleSelectedPresentationChange(
                      "textEmphasis",
                      next === inheritPresentationValue ? null : next
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                    {presentationTextEmphasisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1" data-presentation-control="tone">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tone
                </label>
                <Select
                  value={selectedTone}
                  onValueChange={(next) =>
                    handleSelectedPresentationChange(
                      "tone",
                      next === inheritPresentationValue ? null : next
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Inherit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={inheritPresentationValue}>Inherit</SelectItem>
                    {presentationToneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
        </div>

        {selectedPresentationTarget.mediaField || selectedPresentationTarget.supportsDirectImage ? (
          <div className="mt-4" data-presentation-control="mediaAssetId">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Media override
            </label>
            <MediaPicker
              value={selectedMediaAssetId}
              onChange={(next) =>
                handleSelectedPresentationChange(
                  "mediaAssetId",
                  typeof next === "string" && next.trim() ? next : null
                )
              }
              multiple={false}
              accept={
                selectedPresentationTarget.mediaField?.media?.accept ??
                (selectedPresentationTarget.supportsDirectImage ? ["image/*"] : undefined)
              }
            />
          </div>
        ) : null}
      </div>
    ) : null;

  const screenRecordsHref = screenId
    ? `/advanced/custom-screens/${encodeURIComponent(screenId)}/entries`
    : "/advanced/custom-screens";

  return (
    <>
      {dirtyNavigationDialog}
      <EditorShell
        activeHref={screenRecordsHref}
        breadcrumbs={
          currentScreen?.name
            ? [
                "Coderso",
                "Screens",
                currentScreen.name,
                isCreateMode
                  ? "New record"
                  : currentEntry?.title?.trim()
                    ? currentEntry.title
                    : "Record",
              ]
            : [
                "Coderso",
                "Screens",
                isCreateMode
                  ? "New record"
                  : currentEntry?.title?.trim()
                    ? currentEntry.title
                    : "Record",
              ]
        }
        topbarActions={
          <div className="flex items-center gap-2">
            {currentEntry ? (
              <Badge
                variant={currentEntry.status === "published" ? "default" : "outline"}
                className="ml-1 text-[10px] uppercase"
              >
                {currentEntry.status}
              </Badge>
            ) : null}
            {hasUnsavedChanges ? (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                Unsaved changes
              </span>
            ) : null}
            {currentScreen && canEditInScreen && !isLoading ? (
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={isSaving || isLoading || !currentContentType}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            ) : null}
          </div>
        }
        variant="canvas"
      >
        {error ||
        presentationError ||
        remoteUpdatePending ||
        remotePresentationUpdatePending ||
        currentSaveNotice ||
        currentPresentationSaveNotice ||
        relatedState.error ||
        presentationMediaState.error ||
        (currentScreen !== null && !canEditInScreen) ? (
          <div className="shrink-0 space-y-3 px-6 pt-4">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Custom screen record error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {presentationError ? (
              <Alert
                variant="destructive"
                data-custom-screen-presentation-error={presentationErrorKind ?? "unknown"}
              >
                <AlertTitle>Presentation error</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{presentationError}</span>
                  {presentationErrorKind === "load" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReloadPresentation}
                      disabled={isPresentationLoading}
                    >
                      Retry presentation load
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}
            {remoteUpdatePending ? (
              <Alert>
                <AlertTitle>Updated in another tab</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>New changes are available. Refresh to load the latest version.</span>
                  <Button variant="outline" size="sm" onClick={() => refresh(true)}>
                    Refresh
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {remotePresentationUpdatePending ? (
              <Alert>
                <AlertTitle>Presentation updated elsewhere</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>New presentation changes are available for this record.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleReloadPresentation}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reload presentation
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {currentSaveNotice ? (
              <Alert>
                <AlertTitle>Record saved</AlertTitle>
                <AlertDescription>{currentSaveNotice}</AlertDescription>
              </Alert>
            ) : null}
            {currentPresentationSaveNotice ? (
              <Alert>
                <AlertTitle>Presentation saved</AlertTitle>
                <AlertDescription>{currentPresentationSaveNotice}</AlertDescription>
              </Alert>
            ) : null}
            {relatedState.error && !relatedState.loading && !relatedState.refreshing ? (
              <Alert variant="destructive">
                <AlertTitle>Related records unavailable</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{relatedState.error}</span>
                  <Button type="button" variant="outline" size="sm" onClick={relatedState.retry}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {presentationMediaState.error &&
            !presentationMediaState.loading &&
            !presentationMediaState.refreshing ? (
              <Alert variant="destructive">
                <AlertTitle>Presentation image unavailable</AlertTitle>
                <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span>{PRESENTATION_MEDIA_LOAD_ERROR}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => beginMediaAttempt("manual-retry")}
                  >
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            {currentScreen !== null && !canEditInScreen ? (
              <Alert>
                <AlertTitle>Workspace upgrade required</AlertTitle>
                <AlertDescription>
                  This screen is not yet ready for the dedicated editor workflow. Add writable
                  bindings in the builder before using this route as the active screen-owned editor.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mx-6 mb-6 flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground shadow-card">
            Loading custom screen record...
          </div>
        ) : currentScreen && canEditInScreen ? (
          <div className="flex min-h-0 flex-1 flex-col" data-custom-screen-entry-document="true">
            <CanvasEditor
              header={
                <PageHeader
                  className="mb-0 shrink-0 px-6 pb-3 pt-4"
                  title={currentEntry?.title?.trim() || (isCreateMode ? "New record" : "Record")}
                  description={
                    canEditInScreen
                      ? "The canvas is the active editing surface for this record."
                      : "This screen still needs writable bindings before it can replace legacy editing paths."
                  }
                />
              }
              title="Entry content"
              badge={
                hasUnsavedChanges ? (
                  <Badge variant="warning" className="text-[10px] font-semibold uppercase">
                    Unsaved
                  </Badge>
                ) : null
              }
              toolbar={
                <label
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
                  data-screen-entry-metadata-toggle="true"
                >
                  <span>Field metadata</span>
                  <Switch
                    size="sm"
                    checked={entryPreferences.showFieldMetadata}
                    onCheckedChange={(checked) =>
                      setEntryPreferences({
                        ...entryPreferences,
                        showFieldMetadata: checked,
                      })
                    }
                    aria-label="Show field metadata"
                  />
                </label>
              }
              panelPosition="bottom"
              panel={presentationPanel}
              panelOpen={panelOpen}
              onPanelOpenChange={setPanelOpen}
              panelAriaLabel="Record presentation"
              panelDataProps={{ "data-screen-editor-panel": "true" }}
              canvas={
                <div
                  className="min-h-0 flex-1 overflow-auto overscroll-contain p-6 lg:p-8"
                  data-screen-editor-canvas-scroller="true"
                  style={panelOpen && presentationPanel ? { paddingBottom: 260 } : undefined}
                  onClick={() => {
                    setSelectedRuntimeBlockId(null);
                  }}
                >
                  <div className="mx-auto w-full max-w-3xl">
                    <CustomScreenEntryCanvas
                      document={runtimeDocument}
                      bindings={runtimeBindings}
                      fieldValues={canvasFieldValues}
                      fieldErrors={fieldErrors}
                      fields={currentFields}
                      relationTargets={relationTargets}
                      relatedEntries={relatedEntries}
                      onFieldChange={handleFieldChange}
                      onTitleChange={handleTitleChange}
                      onSlugChange={handleSlugChange}
                      presentationOverrides={currentDraftOverrides}
                      presentationMediaUrlsById={presentationMediaState.urlsById}
                      selectedBlockId={selectedRuntimeBlockId}
                      onSelectBlock={setSelectedRuntimeBlockId}
                      showFieldMetadata={entryPreferences.showFieldMetadata}
                    />
                  </div>
                </div>
              }
            />
          </div>
        ) : currentScreen ? (
          <div className="min-h-0 flex-1 overflow-auto px-6 py-8">
            <div className="mx-auto max-w-5xl">
              <CustomScreenPreview
                document={runtimeDocument}
                bindings={runtimeBindings}
                data={buildPayloadData()}
                fields={currentFields}
                relatedEntries={relatedEntries}
                presentationOverrides={currentDraftOverrides}
                presentationMediaUrlsById={presentationMediaState.urlsById}
                emptyTitle="Editor upgrade required"
                emptyMessage="Add writable screen blocks and bindings in the builder before using this route as the dedicated record editor."
              />
            </div>
          </div>
        ) : (
          <div className="mx-6 mb-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-card">
            Screen record unavailable.
          </div>
        )}
      </EditorShell>
    </>
  );
}
