import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from "react";

import { cacheKeys } from "@/services/cachePolicy";
import { listEntriesCached } from "@/services/entriesClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import type {
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../../services/customScreens/customScreenSchemas";
import {
  resolveRelatedEntries,
  type RelatedEntrySummary,
} from "../../../../services/customScreens/relatedEntryResolver";
import { collectScreenDocumentBlocks } from "../../../../services/customScreens/screenDocumentOps";
import { readBindingPathValue } from "../../../../services/utils/bindingPath";
import type { ContentField } from "../../content-types/SchemaBuilder";

export type RelatedAttemptCause = "initial" | "input-change" | "manual-retry" | "cache-event";

export type RelatedBlockProjection = {
  blockId: string;
  bindingPath: string;
  target: string;
  selectedIds: readonly string[];
  displayField: string | null;
  limit: number;
};

export type NormalizedRelatedPlan = {
  blocks: readonly RelatedBlockProjection[];
  targetSlugs: readonly string[];
  targetLoadKey: string;
  requestKey: string;
};

export type RelatedAttempt = {
  inputKey: string;
  requestKey: string;
  targetLoadKey: string;
  token: number;
  cause: RelatedAttemptCause;
  force: boolean;
  plan: NormalizedRelatedPlan;
};

export type RelatedEntriesCommit = {
  requestKey: string | null;
  attemptToken: number | null;
  items: Record<string, RelatedEntrySummary[]>;
  error: string | null;
};

export type RelatedEntriesState = {
  items: Record<string, RelatedEntrySummary[]>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  targetSlugs: readonly string[];
  retry: () => void;
};

export type UseScreenRelatedEntriesInput = {
  enabled: boolean;
  document: ScreenDocumentV1;
  bindings: readonly ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: readonly ContentField[];
};

export const RELATED_LOAD_ERROR = "Related records could not be loaded.";

const resolveRelatedLoadMessage = (_error: unknown): string => RELATED_LOAD_ERROR;

type RelatedProjectionTuple = readonly [
  blockId: string,
  bindingPath: string,
  target: string,
  selectedIds: readonly string[],
  displayField: string | null,
  limit: number,
];

const toRelatedProjectionTuple = (block: RelatedBlockProjection): RelatedProjectionTuple => [
  block.blockId,
  block.bindingPath,
  block.target,
  block.selectedIds,
  block.displayField,
  block.limit,
];

const serializeRelatedProjection = (blocks: readonly RelatedBlockProjection[]) =>
  JSON.stringify(blocks.map(toRelatedProjectionTuple));

const serializeRelatedTargets = (targets: readonly string[]) => JSON.stringify(targets);

const RELATED_PATH_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const RELATED_UNSAFE_PATH_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const RELATED_PATH_MAX_LENGTH = 160;
const RELATED_LIMIT_MAX = 50;

function normalizeRelatedPath(value: unknown, maxLength: number | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    (maxLength !== null && normalized.length > maxLength) ||
    !RELATED_PATH_PATTERN.test(normalized)
  ) {
    return null;
  }
  const segments = normalized.split(".");
  if (
    segments.some((segment) => segment.length === 0 || RELATED_UNSAFE_PATH_SEGMENTS.has(segment))
  ) {
    return null;
  }
  return normalized;
}

const normalizeCanonicalRelatedPath = (value: unknown): string | null => {
  const normalized = normalizeRelatedPath(value, RELATED_PATH_MAX_LENGTH);
  return normalized !== null && normalized === value ? normalized : null;
};

const normalizeRelatedBlockId = normalizeCanonicalRelatedPath;
const normalizeRelatedBindingPath = normalizeCanonicalRelatedPath;
const normalizeTargetSlug = normalizeCanonicalRelatedPath;

const normalizeDisplayField = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return normalizeCanonicalRelatedPath(value);
};

const normalizeSelectedResourceIds = (value: unknown): readonly string[] =>
  (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value])
    .map(String)
    .filter((id) => id.length > 0);

const normalizeRelatedLimit = (value: unknown, selectedCount: number): number => {
  const candidate =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : selectedCount;
  return Math.min(RELATED_LIMIT_MAX, selectedCount, Math.max(0, candidate));
};

const findExactItemsBinding = (
  bindings: readonly ScreenFieldBinding[],
  blockId: string
): ScreenFieldBinding | null =>
  bindings.find((binding) => binding.blockId === blockId && binding.propPath === "items") ?? null;

const findRelationField = (
  fields: readonly ContentField[] | undefined,
  bindingPath: string
): ContentField | null => fields?.find((field) => field.name === bindingPath) ?? null;

const compareCanonicalText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const compareNormalizedProjectionTuple = (
  left: RelatedBlockProjection,
  right: RelatedBlockProjection
): number =>
  compareCanonicalText(
    JSON.stringify(toRelatedProjectionTuple(left)),
    JSON.stringify(toRelatedProjectionTuple(right))
  );

type BuildNormalizedRelatedPlanInput = {
  document: ScreenDocumentV1;
  bindings: readonly ScreenFieldBinding[];
  values: Record<string, unknown>;
  fields?: readonly ContentField[];
};

const createEmptyRelatedPlan = (): NormalizedRelatedPlan => {
  const blocks = Object.freeze([]) as readonly RelatedBlockProjection[];
  const targetSlugs = Object.freeze([]) as readonly string[];
  return Object.freeze({
    blocks,
    targetSlugs,
    targetLoadKey: serializeRelatedTargets(targetSlugs),
    requestKey: serializeRelatedProjection(blocks),
  });
};

export function buildNormalizedRelatedPlan(
  input: BuildNormalizedRelatedPlanInput
): NormalizedRelatedPlan {
  const documentBlocks = collectScreenDocumentBlocks(input.document);
  const documentBlockIds = documentBlocks.map((block) => normalizeRelatedBlockId(block.id));
  if (
    documentBlockIds.some((id) => id === null) ||
    new Set(documentBlockIds).size !== documentBlockIds.length
  ) {
    return createEmptyRelatedPlan();
  }

  const blocks = documentBlocks.flatMap((block): RelatedBlockProjection[] => {
    if (block.type !== "related-list") return [];
    const blockId = normalizeRelatedBlockId(block.id);
    if (!blockId) return [];
    const binding = findExactItemsBinding(input.bindings, blockId);
    if (!binding) return [];
    const bindingPath = normalizeRelatedBindingPath(binding.field);
    if (!bindingPath) return [];
    const selectedIds = normalizeSelectedResourceIds(
      readBindingPathValue(input.values, bindingPath)
    );
    if (selectedIds.length === 0) return [];
    const target = normalizeTargetSlug(
      findRelationField(input.fields, bindingPath)?.relation?.target ?? block.data.target
    );
    if (!target) return [];
    const rawDisplayField = block.data.displayField;
    const displayField = normalizeDisplayField(rawDisplayField);
    if (
      rawDisplayField !== undefined &&
      rawDisplayField !== null &&
      rawDisplayField !== "" &&
      displayField === null
    ) {
      return [];
    }
    return [
      {
        blockId,
        bindingPath,
        target,
        selectedIds,
        displayField,
        limit: normalizeRelatedLimit(block.data.limit, selectedIds.length),
      },
    ];
  });

  blocks.sort(compareNormalizedProjectionTuple);
  const frozenBlocks = blocks.map((block) =>
    Object.freeze({
      ...block,
      selectedIds: Object.freeze([...block.selectedIds]),
    })
  );
  const targetSlugs = [...new Set(frozenBlocks.map((block) => block.target))].sort(
    compareCanonicalText
  );

  return Object.freeze({
    blocks: Object.freeze(frozenBlocks),
    targetSlugs: Object.freeze(targetSlugs),
    targetLoadKey: serializeRelatedTargets(targetSlugs),
    requestKey: serializeRelatedProjection(frozenBlocks),
  });
}

async function projectRelatedBlocksFromTargetRows(
  plan: NormalizedRelatedPlan,
  rowsByTarget: ReadonlyMap<string, Awaited<ReturnType<typeof listEntriesCached>>>
): Promise<Record<string, RelatedEntrySummary[]>> {
  const pairs = await Promise.all(
    plan.blocks.map(
      async (block) =>
        [
          block.blockId,
          await resolveRelatedEntries({
            ids: [...block.selectedIds],
            target: block.target,
            displayField: block.displayField ?? undefined,
            limit: block.limit,
            readEntries: async (target) =>
              (rowsByTarget.get(target) ?? []) as unknown as Array<Record<string, unknown>>,
          }),
        ] as const
    )
  );
  return Object.fromEntries(pairs);
}

async function loadEachTargetOnce(
  plan: NormalizedRelatedPlan,
  force: boolean
): Promise<Record<string, RelatedEntrySummary[]>> {
  const rowsByTarget = new Map(
    await Promise.all(
      plan.targetSlugs.map(
        async (slug) => [slug, await listEntriesCached(slug, { force })] as const
      )
    )
  );
  return projectRelatedBlocksFromTargetRows(plan, rowsByTarget);
}

export function buildRelatedMachineInputKey(enabled: boolean, plan: NormalizedRelatedPlan): string {
  return JSON.stringify([enabled ? 1 : 0, plan.blocks.map(toRelatedProjectionTuple)]);
}

const invalidRelatedPlan = (): never => {
  throw new Error("related_plan_invalid");
};

export function decodeRelatedMachineInputKey(inputKey: string): {
  enabled: boolean;
  plan: NormalizedRelatedPlan;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(inputKey);
  } catch {
    return invalidRelatedPlan();
  }
  if (!Array.isArray(parsed) || parsed.length !== 2 || (parsed[0] !== 0 && parsed[0] !== 1)) {
    return invalidRelatedPlan();
  }
  if (!Array.isArray(parsed[1])) return invalidRelatedPlan();

  const blocks = parsed[1].map((value): RelatedBlockProjection => {
    if (!Array.isArray(value) || value.length !== 6) return invalidRelatedPlan();
    const [blockId, bindingPath, target, selectedIds, displayField, limit] = value;
    if (
      typeof blockId !== "string" ||
      normalizeRelatedBlockId(blockId) !== blockId ||
      typeof bindingPath !== "string" ||
      normalizeRelatedBindingPath(bindingPath) !== bindingPath ||
      typeof target !== "string" ||
      normalizeTargetSlug(target) !== target ||
      !Array.isArray(selectedIds) ||
      selectedIds.length === 0 ||
      !selectedIds.every((id): id is string => typeof id === "string") ||
      JSON.stringify(normalizeSelectedResourceIds(selectedIds)) !== JSON.stringify(selectedIds) ||
      (displayField !== null && typeof displayField !== "string") ||
      normalizeDisplayField(displayField) !== displayField ||
      typeof limit !== "number" ||
      !Number.isInteger(limit) ||
      normalizeRelatedLimit(limit, selectedIds.length) !== limit
    ) {
      return invalidRelatedPlan();
    }
    return Object.freeze({
      blockId,
      bindingPath,
      target,
      selectedIds: Object.freeze([...selectedIds]),
      displayField,
      limit,
    });
  });

  if (new Set(blocks.map((block) => block.blockId)).size !== blocks.length) {
    return invalidRelatedPlan();
  }
  blocks.sort(compareNormalizedProjectionTuple);
  const targetSlugs = Object.freeze(
    [...new Set(blocks.map((block) => block.target))].sort(compareCanonicalText)
  );
  const plan = Object.freeze({
    blocks: Object.freeze(blocks),
    targetSlugs,
    targetLoadKey: serializeRelatedTargets(targetSlugs),
    requestKey: serializeRelatedProjection(blocks),
  });
  const enabled = parsed[0] === 1;
  if (buildRelatedMachineInputKey(enabled, plan) !== inputKey) {
    return invalidRelatedPlan();
  }
  return { enabled, plan };
}

export type RelatedAttemptMachine = {
  inputKey: string;
  enabled: boolean;
  requestKey: string;
  targetLoadKey: string;
  hasTargets: boolean;
  lastToken: number;
  settledToken: number | null;
  attempt: RelatedAttempt | null;
  commit: RelatedEntriesCommit;
};

export type RelatedAttemptMachineInput = {
  enabled: boolean;
  requestKey: string;
  targetLoadKey: string;
  hasTargets: boolean;
  plan: NormalizedRelatedPlan;
};

export type RelatedAttemptAction =
  | {
      type: "sync-input";
      inputKey: string;
      enabled: boolean;
      plan: NormalizedRelatedPlan;
    }
  | {
      type: "force-attempt";
      requestKey: string;
      targetLoadKey: string;
      cause: "manual-retry" | "cache-event";
    }
  | {
      type: "settled-success";
      inputKey: string;
      requestKey: string;
      token: number;
      items: Record<string, RelatedEntrySummary[]>;
    }
  | {
      type: "settled-error";
      inputKey: string;
      requestKey: string;
      token: number;
      error: string;
    };

const assertNever = (value: never): never => {
  throw new Error(`Unhandled related-attempt action: ${String(value)}`);
};

function allocateRelatedAttempt(
  state: RelatedAttemptMachine,
  plan: NormalizedRelatedPlan,
  cause: RelatedAttemptCause,
  force: boolean
): RelatedAttemptMachine {
  const token = state.lastToken + 1;
  const attempt = Object.freeze({
    requestKey: state.requestKey,
    targetLoadKey: state.targetLoadKey,
    inputKey: state.inputKey,
    token,
    cause,
    force,
    plan,
  });
  return {
    ...state,
    lastToken: token,
    attempt,
  };
}

export function createRelatedAttemptMachine(
  input: RelatedAttemptMachineInput
): RelatedAttemptMachine {
  const state: RelatedAttemptMachine = {
    enabled: input.enabled,
    requestKey: input.requestKey,
    targetLoadKey: input.targetLoadKey,
    hasTargets: input.hasTargets,
    inputKey: buildRelatedMachineInputKey(input.enabled, input.plan),
    lastToken: 0,
    settledToken: null,
    attempt: null,
    commit: { requestKey: null, attemptToken: null, items: {}, error: null },
  };
  return input.enabled && input.hasTargets
    ? allocateRelatedAttempt(state, input.plan, "initial", false)
    : state;
}

export function relatedAttemptReducer(
  state: RelatedAttemptMachine,
  action: RelatedAttemptAction
): RelatedAttemptMachine {
  switch (action.type) {
    case "sync-input": {
      if (action.inputKey === state.inputKey) return state;
      const next: RelatedAttemptMachine = {
        ...state,
        inputKey: action.inputKey,
        enabled: action.enabled,
        requestKey: action.plan.requestKey,
        targetLoadKey: action.plan.targetLoadKey,
        hasTargets: action.plan.targetSlugs.length > 0,
        attempt: null,
      };
      if (!next.enabled || !next.hasTargets) return next;
      const priorPending = state.attempt !== null && state.attempt.token !== state.settledToken;
      const inheritForce =
        priorPending &&
        state.attempt?.force === true &&
        state.targetLoadKey === action.plan.targetLoadKey;
      return allocateRelatedAttempt(
        next,
        action.plan,
        inheritForce ? state.attempt!.cause : "input-change",
        inheritForce
      );
    }
    case "force-attempt":
      if (
        !state.enabled ||
        !state.hasTargets ||
        !state.attempt ||
        action.requestKey !== state.requestKey ||
        action.targetLoadKey !== state.targetLoadKey
      ) {
        return state;
      }
      return allocateRelatedAttempt(state, state.attempt.plan, action.cause, true);
    case "settled-success":
      if (
        state.inputKey !== action.inputKey ||
        state.attempt?.inputKey !== action.inputKey ||
        state.attempt.requestKey !== action.requestKey ||
        state.attempt.token !== action.token
      ) {
        return state;
      }
      return {
        ...state,
        settledToken: action.token,
        commit: {
          requestKey: action.requestKey,
          attemptToken: action.token,
          items: action.items,
          error: null,
        },
      };
    case "settled-error":
      if (
        state.inputKey !== action.inputKey ||
        state.attempt?.inputKey !== action.inputKey ||
        state.attempt.requestKey !== action.requestKey ||
        state.attempt.token !== action.token
      ) {
        return state;
      }
      return {
        ...state,
        settledToken: action.token,
        commit: {
          requestKey: action.requestKey,
          attemptToken: action.token,
          items: state.commit.requestKey === action.requestKey ? state.commit.items : {},
          error: action.error,
        },
      };
    default:
      return assertNever(action);
  }
}

export function useScreenRelatedEntries(input: UseScreenRelatedEntriesInput): RelatedEntriesState {
  const { enabled, document, bindings, values, fields } = input;
  const plan = useMemo(
    () => buildNormalizedRelatedPlan({ document, bindings, values, fields }),
    [document, bindings, values, fields]
  );
  const requestKey = plan.requestKey;
  const machineInputKey = buildRelatedMachineInputKey(enabled, plan);

  const [machine, dispatch] = useReducer(
    relatedAttemptReducer,
    {
      enabled,
      requestKey,
      targetLoadKey: plan.targetLoadKey,
      hasTargets: plan.targetSlugs.length > 0,
      plan,
    },
    createRelatedAttemptMachine
  );

  const currentInputKeyRef = useRef(machineInputKey);
  useLayoutEffect(() => {
    currentInputKeyRef.current = machineInputKey;
  }, [machineInputKey]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const normalized = decodeRelatedMachineInputKey(machineInputKey);
      dispatch({
        type: "sync-input",
        inputKey: machineInputKey,
        enabled: normalized.enabled,
        plan: normalized.plan,
      });
    });
    return () => {
      active = false;
    };
  }, [machineInputKey]);

  const attempt =
    machine.requestKey === requestKey && machine.inputKey === machineInputKey
      ? machine.attempt
      : null;
  const attemptToken = attempt?.token ?? null;

  const beginAttempt = useCallback(
    (cause: "manual-retry" | "cache-event") => {
      dispatch({
        type: "force-attempt",
        requestKey,
        targetLoadKey: plan.targetLoadKey,
        cause,
      });
    },
    [plan.targetLoadKey, requestKey]
  );

  useEffect(() => {
    if (!enabled || !attempt || attempt.plan.targetSlugs.length === 0) {
      return undefined;
    }
    const targetSlugs = attempt.plan.targetSlugs;
    return subscribeCacheEvents((event) => {
      if (targetSlugs.some((slug) => event.key === cacheKeys.entriesList(slug))) {
        beginAttempt("cache-event");
      }
    });
  }, [enabled, beginAttempt, attempt]);

  useEffect(() => {
    if (
      !enabled ||
      !attempt ||
      attempt.requestKey !== requestKey ||
      attempt.plan.targetSlugs.length === 0
    ) {
      return undefined;
    }
    const frozenAttemptToken = attempt.token;
    const frozenInputKey = attempt.inputKey;
    let active = true;
    void loadEachTargetOnce(attempt.plan, attempt.force)
      .then((items) => {
        if (!active || currentInputKeyRef.current !== frozenInputKey) return;
        dispatch({
          type: "settled-success",
          inputKey: frozenInputKey,
          requestKey,
          token: frozenAttemptToken,
          items,
        });
      })
      .catch((error: unknown) => {
        if (!active || currentInputKeyRef.current !== frozenInputKey) return;
        dispatch({
          type: "settled-error",
          inputKey: frozenInputKey,
          requestKey,
          token: frozenAttemptToken,
          error: resolveRelatedLoadMessage(error),
        });
      });
    return () => {
      active = false;
    };
  }, [enabled, requestKey, attempt]);

  const commit = machine.commit;
  const matchesRequest = commit.requestKey === requestKey;
  const refreshing = matchesRequest && commit.attemptToken !== attemptToken;
  const visible =
    !enabled || plan.targetSlugs.length === 0
      ? { items: {}, loading: false, refreshing: false, error: null }
      : matchesRequest
        ? {
            items: commit.items,
            loading: false,
            refreshing,
            error: refreshing ? null : commit.error,
          }
        : { items: {}, loading: true, refreshing: false, error: null };

  return {
    ...visible,
    targetSlugs: plan.targetSlugs,
    retry: () => beginAttempt("manual-retry"),
  };
}
