import type {
  FullSiteInstallOperation,
  FullSiteInstallResourceKind,
} from "../fullSiteInstallTypes";
import type { JsonObject, JsonValue } from "../fullSitePackage/types";

export const LIFECYCLE_CAPABLE_PUBLISH_KINDS = Object.freeze([
  "content_entry",
  "detail_page",
  "page",
  "menu",
] as const satisfies readonly FullSiteInstallResourceKind[]);

export type LifecycleCapablePublishKind = (typeof LIFECYCLE_CAPABLE_PUBLISH_KINDS)[number];

export const isLifecycleCapablePublishKind = (
  kind: FullSiteInstallResourceKind
): kind is LifecycleCapablePublishKind =>
  (LIFECYCLE_CAPABLE_PUBLISH_KINDS as readonly string[]).includes(kind);

export type FullSiteNativeSnapshot = Readonly<{
  id: string;
  desired: JsonObject;
}>;

export type RestoreSnapshotAtomicInput = Readonly<{
  id: string;
  expectedCurrent: FullSiteNativeSnapshot;
  target: FullSiteNativeSnapshot;
  actorId: string;
}>;

export type DeleteSnapshotAtomicInput = Readonly<{
  id: string;
  expectedCurrent: FullSiteNativeSnapshot;
  actorId: string;
}>;

export type PublishSnapshotAtomicInput = Readonly<{
  id: string;
  expectedCurrent: FullSiteNativeSnapshot;
  target: FullSiteNativeSnapshot;
  actorId: string;
}>;

export type AdapterApplyInput = Readonly<{
  operation: Exclude<FullSiteInstallOperation, "conflict" | "noop">;
  currentId: string | null;
  key: string;
  desired: JsonObject;
  actorId: string;
}>;

export type FullSiteSagaAdapterPrepareInput =
  | (AdapterApplyInput &
      Readonly<{
        operation: "create";
        currentId: null;
        intendedId: string;
        expectedSnapshot: null;
      }>)
  | (AdapterApplyInput &
      Readonly<{
        operation: "update";
        currentId: string;
        intendedId: null;
        expectedSnapshot: FullSiteNativeSnapshot;
      }>);

export type FullSiteSagaAdapterApplyInput = FullSiteSagaAdapterPrepareInput &
  Readonly<{
    targetSnapshot: FullSiteNativeSnapshot;
  }>;

export type FullSitePreparedNativeTargets = Readonly<{
  staged: FullSiteNativeSnapshot | null;
  complete: FullSiteNativeSnapshot;
}>;

export type FullSiteNativeReversal =
  | Readonly<{
      operation: "create";
      id: string;
      expectedCurrent: FullSiteNativeSnapshot;
      target: null;
    }>
  | Readonly<{
      operation: "update";
      id: string;
      expectedCurrent: FullSiteNativeSnapshot;
      target: FullSiteNativeSnapshot;
    }>;

export type ReverseSettingsBatchInput = Readonly<{
  items: readonly FullSiteNativeReversal[];
  actorId: string;
}>;

export type FullSiteSettingsApplyBatchInput = Readonly<{
  items: readonly FullSiteSagaAdapterApplyInput[];
  actorId: string;
}>;

export type AdapterApplyResult = Readonly<{
  id: string;
  desired: JsonObject;
}>;

export type ResourceAdapter = {
  validateDesired(input: AdapterApplyInput): JsonObject | void | Promise<JsonObject | void>;
  applyDesired(input: AdapterApplyInput): Promise<AdapterApplyResult>;
  applyBatch?(inputs: readonly AdapterApplyInput[]): Promise<readonly AdapterApplyResult[]>;
  applyStaged(input: AdapterApplyInput): Promise<AdapterApplyResult>;
  publish(id: string, actorId: string): Promise<void>;
  prepareNativeTargets?(
    input: FullSiteSagaAdapterPrepareInput
  ): Promise<FullSitePreparedNativeTargets>;
  captureSnapshotById?(id: string): Promise<FullSiteNativeSnapshot>;
  deleteSnapshotAtomic?(input: DeleteSnapshotAtomicInput): Promise<void>;
  restoreSnapshotAtomic?(input: RestoreSnapshotAtomicInput): Promise<void>;
  publishSnapshotAtomic?(input: PublishSnapshotAtomicInput): Promise<void>;
  applySettingsBatchAtomic?(
    input: FullSiteSettingsApplyBatchInput
  ): Promise<readonly FullSiteNativeSnapshot[]>;
  reverseSettingsBatch?(input: ReverseSettingsBatchInput): Promise<void>;
};

export type NativeAtomicResourceAdapter = ResourceAdapter &
  Required<
    Pick<
      ResourceAdapter,
      | "prepareNativeTargets"
      | "captureSnapshotById"
      | "deleteSnapshotAtomic"
      | "restoreSnapshotAtomic"
    >
  >;

export type FullSiteResourceAdapterRegistry = Record<
  Exclude<FullSiteInstallResourceKind, "setting">,
  NativeAtomicResourceAdapter
> & {
  setting: NativeAtomicResourceAdapter &
    Required<Pick<ResourceAdapter, "applySettingsBatchAtomic" | "reverseSettingsBatch">>;
};

export type RollbackResourceAdapter = Required<
  Pick<ResourceAdapter, "restoreSnapshotAtomic" | "deleteSnapshotAtomic">
> &
  Readonly<{
    captureSnapshotByIdOrNull(id: string): Promise<FullSiteNativeSnapshot | null>;
  }>;

export type FullSiteRollbackAdapters = Record<
  Exclude<FullSiteInstallResourceKind, "setting">,
  RollbackResourceAdapter
> & {
  setting: RollbackResourceAdapter & Required<Pick<ResourceAdapter, "reverseSettingsBatch">>;
};

const APPLY_INPUT_KEYS = new Set<PropertyKey>([
  "operation",
  "currentId",
  "key",
  "desired",
  "actorId",
  "intendedId",
  "expectedSnapshot",
  "targetSnapshot",
]);
const SNAPSHOT_KEYS = new Set<PropertyKey>(["id", "desired"]);

export const isDirectPlainObject = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const hasExactOwnKeys = (
  value: Record<PropertyKey, unknown>,
  expected: ReadonlySet<PropertyKey>
): boolean => {
  try {
    const keys = Reflect.ownKeys(value);
    return keys.length === expected.size && keys.every((key) => expected.has(key));
  } catch {
    return false;
  }
};

export const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isDirectPlainObject(value)) return false;
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && isJsonValue(Reflect.get(value, key))
  );
};

export const isFullSiteNativeSnapshot = (value: unknown): value is FullSiteNativeSnapshot => {
  if (!isDirectPlainObject(value) || !hasExactOwnKeys(value, SNAPSHOT_KEYS)) return false;
  const id = Reflect.get(value, "id");
  const desired = Reflect.get(value, "desired");
  return (
    typeof id === "string" && id.length > 0 && isDirectPlainObject(desired) && isJsonValue(desired)
  );
};

export function isFullSiteSagaAdapterApplyInput(
  input: AdapterApplyInput
): input is FullSiteSagaAdapterApplyInput {
  if (!isDirectPlainObject(input) || !hasExactOwnKeys(input, APPLY_INPUT_KEYS)) return false;
  const currentId = Reflect.get(input, "currentId");
  const intendedId = Reflect.get(input, "intendedId");
  const expectedSnapshot = Reflect.get(input, "expectedSnapshot");
  const targetSnapshot = Reflect.get(input, "targetSnapshot");
  if (!isFullSiteNativeSnapshot(targetSnapshot)) return false;
  if (input.operation === "create") {
    return (
      currentId === null &&
      typeof intendedId === "string" &&
      intendedId.length > 0 &&
      expectedSnapshot === null &&
      targetSnapshot.id === intendedId
    );
  }
  return (
    input.operation === "update" &&
    typeof currentId === "string" &&
    currentId.length > 0 &&
    intendedId === null &&
    isFullSiteNativeSnapshot(expectedSnapshot) &&
    expectedSnapshot.id === currentId &&
    targetSnapshot.id === currentId
  );
}

export function assertFullSiteSagaAdapterApplyInput(
  input: AdapterApplyInput
): asserts input is FullSiteSagaAdapterApplyInput {
  if (!isFullSiteSagaAdapterApplyInput(input)) throw new Error("site_package_invalid");
}

export const validateJsonDesired = (input: AdapterApplyInput): void => {
  if (!isDirectPlainObject(input.desired) || !isJsonValue(input.desired)) {
    throw new Error(`${input.key}_invalid`);
  }
};

export const assertDesiredKeys = (
  input: AdapterApplyInput,
  allowed: readonly string[],
  required: readonly string[]
): void => {
  const keys = Object.keys(input.desired);
  if (
    keys.some((key) => !allowed.includes(key)) ||
    required.some((key) => !Object.prototype.hasOwnProperty.call(input.desired, key))
  ) {
    throw new Error(`${input.key}_invalid`);
  }
};

export const assertLifecycleStatus = (value: unknown, code: string): void => {
  if (value !== "draft" && value !== "published") throw new Error(code);
};

export const unsupportedStage = async (): Promise<AdapterApplyResult> => {
  throw new Error("site_package_stage_unsupported");
};

export const unsupportedPublish = async (): Promise<void> => {
  throw new Error("site_package_publish_unsupported");
};

export const requireId = <T extends { id: string } | null | undefined>(
  value: T,
  code: string
): Exclude<T, null | undefined> => {
  if (!value) throw new Error(code);
  return value as Exclude<T, null | undefined>;
};

export const withoutKeys = (value: JsonObject, keys: readonly string[]): JsonObject =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key))) as JsonObject;

export const projectNormalizedDesired = (
  input: AdapterApplyInput,
  normalized: object,
  required: readonly string[],
  code: string
): JsonObject => {
  const source = normalized as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(input.desired), ...required])];
  const projected = Object.fromEntries(keys.map((key) => [key, source[key] ?? null]));
  try {
    const parsed = JSON.parse(JSON.stringify(projected)) as unknown;
    if (!isDirectPlainObject(parsed) || !isJsonValue(parsed)) throw new Error(code);
    return parsed as JsonObject;
  } catch {
    throw new Error(code);
  }
};

export const desiredInput = <T>(desired: unknown): T => desired as T;

export const toPersistedJsonValue = (value: unknown): JsonValue => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("menu_document_invalid");
  return JSON.parse(serialized) as JsonValue;
};

export const createOrUpdate = async <T extends { id: string }>(
  input: AdapterApplyInput,
  create: () => Promise<T | null | undefined>,
  update: (id: string) => Promise<T | null | undefined>,
  code: string
): Promise<T> =>
  requireId(
    input.operation === "create" ? await create() : await update(input.currentId ?? ""),
    code
  );
