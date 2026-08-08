import { asc, inArray, sql } from "drizzle-orm";

import { acquireNativeCmsWriterFence } from "../../db/nativeCmsWriterFence";
import { db } from "../../db/client";
import { settings } from "../../db/schema";
import type { JsonValue } from "../kits/fullSitePackage/types";
import { fullSiteJsonValuesEqual } from "../kits/fullSiteInstall/staging";
import {
  invalidateSiteShellCachesForKeys,
  lockContentRouteSettingRootsTx,
  normalizeSettingValueForWrite,
  resolveSettingKey,
  type SettingKey,
} from "./settingsService";

export type FullSiteRawSettingState =
  | Readonly<{ key: SettingKey; present: false }>
  | Readonly<{ key: SettingKey; present: true; value: JsonValue }>;

export type FullSiteSettingsAtomicBatchInput = Readonly<{
  expectedCurrent: readonly FullSiteRawSettingState[];
  target: readonly FullSiteRawSettingState[];
}>;

type AtomicMode = "normalized_apply" | "trusted_restore";
type SettingsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const isDirectPlainObject = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const hasExactOwnKeys = (value: Record<PropertyKey, unknown>, keys: readonly string[]): boolean => {
  const ownKeys = Reflect.ownKeys(value);
  return (
    ownKeys.length === keys.length &&
    ownKeys.every((key) => typeof key === "string" && keys.includes(key))
  );
};

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isDirectPlainObject(value)) return false;
  return Reflect.ownKeys(value).every(
    (key) => typeof key === "string" && isJsonValue(Reflect.get(value, key))
  );
};

const cloneState = (state: FullSiteRawSettingState): FullSiteRawSettingState =>
  state.present
    ? Object.freeze({ key: state.key, present: true, value: structuredClone(state.value) })
    : Object.freeze({ key: state.key, present: false });

const normalizeRawStates = (
  value: readonly FullSiteRawSettingState[],
  mode: AtomicMode | "expected"
): readonly FullSiteRawSettingState[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("settings_payload_invalid");
  }
  const output: FullSiteRawSettingState[] = [];
  let previousKey: string | null = null;
  for (const raw of value as readonly unknown[]) {
    if (!isDirectPlainObject(raw)) throw new Error("settings_payload_invalid");
    const present = Reflect.get(raw, "present");
    if (
      (present !== true && present !== false) ||
      !hasExactOwnKeys(raw, present ? ["key", "present", "value"] : ["key", "present"])
    ) {
      throw new Error("settings_payload_invalid");
    }
    const rawKey = Reflect.get(raw, "key");
    if (typeof rawKey !== "string") throw new Error("settings_payload_invalid");
    const key = resolveSettingKey(rawKey);
    if (key !== rawKey || (previousKey !== null && previousKey.localeCompare(key) >= 0)) {
      throw new Error("settings_payload_invalid");
    }
    previousKey = key;
    if (!present) {
      output.push(Object.freeze({ key, present: false }));
      continue;
    }
    const rawValue = Reflect.get(raw, "value");
    if (!isJsonValue(rawValue)) throw new Error("settings_payload_invalid");
    const normalizedValue =
      mode === "normalized_apply" ? normalizeSettingValueForWrite(key, rawValue).value : rawValue;
    if (!isJsonValue(normalizedValue)) throw new Error("settings_payload_invalid");
    output.push(
      Object.freeze({
        key,
        present: true,
        value: structuredClone(normalizedValue),
      })
    );
  }
  return Object.freeze(output);
};

const assertIdenticalKeySets = (
  expected: readonly FullSiteRawSettingState[],
  target: readonly FullSiteRawSettingState[]
): void => {
  if (
    expected.length !== target.length ||
    expected.some((state, index) => state.key !== target[index]?.key)
  ) {
    throw new Error("settings_payload_invalid");
  }
};

const statesEqual = (left: FullSiteRawSettingState, right: FullSiteRawSettingState): boolean =>
  left.key === right.key &&
  left.present === right.present &&
  (!left.present || (right.present && fullSiteJsonValuesEqual(left.value, right.value)));

const readRawStatesTx = async (
  tx: SettingsTransaction,
  keys: readonly SettingKey[],
  lockRows: boolean
): Promise<readonly FullSiteRawSettingState[]> => {
  const select = tx
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...keys]))
    .orderBy(asc(settings.key));
  const rows = lockRows ? await select.for("update") : await select;
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return keys.map((key) => {
    if (!byKey.has(key)) return Object.freeze({ key, present: false as const });
    const value = byKey.get(key);
    if (!isJsonValue(value)) throw new Error("site_package_state_changed");
    return Object.freeze({
      key,
      present: true as const,
      value: structuredClone(value),
    });
  });
};

const mutateSettingsBatch = async (
  input: FullSiteSettingsAtomicBatchInput,
  mode: AtomicMode
): Promise<readonly FullSiteRawSettingState[]> => {
  const expectedCurrent = normalizeRawStates(input.expectedCurrent, "expected");
  const target = normalizeRawStates(input.target, mode);
  assertIdenticalKeySets(expectedCurrent, target);
  const keys = target.map((state) => state.key);

  await db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    const routes = target.find((state) => state.key === "site.contentRoutes");
    await lockContentRouteSettingRootsTx(tx, routes?.present ? routes.value : null);
    await tx.execute(sql`lock table ${settings} in share row exclusive mode`);
    const current = await readRawStatesTx(tx, keys, true);
    if (current.some((state, index) => !statesEqual(state, expectedCurrent[index]!))) {
      throw new Error("site_package_state_changed");
    }
    const now = new Date();
    for (const state of target) {
      if (!state.present) {
        await tx.delete(settings).where(sql`${settings.key} = ${state.key}`);
        continue;
      }
      await tx
        .insert(settings)
        .values({ key: state.key, value: state.value, updatedAt: now })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: state.value, updatedAt: now },
        });
    }
  });

  invalidateSiteShellCachesForKeys(keys);
  return Object.freeze(target.map(cloneState));
};

export const captureFullSiteSettingsBatchRaw = async (
  keysInput: readonly string[]
): Promise<readonly FullSiteRawSettingState[]> => {
  if (!Array.isArray(keysInput) || keysInput.length === 0) {
    throw new Error("settings_payload_invalid");
  }
  const keys = keysInput.map(resolveSettingKey);
  if (
    keys.some((key, index) => key !== keysInput[index]) ||
    keys.some((key, index) => index > 0 && keys[index - 1]!.localeCompare(key) >= 0)
  ) {
    throw new Error("settings_payload_invalid");
  }
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx);
    return readRawStatesTx(tx, keys, false);
  });
};

export const applyFullSiteSettingsBatchAtomic = (
  input: FullSiteSettingsAtomicBatchInput
): Promise<readonly FullSiteRawSettingState[]> => mutateSettingsBatch(input, "normalized_apply");

export const restoreFullSiteSettingsBatchRawAtomic = (
  input: FullSiteSettingsAtomicBatchInput
): Promise<readonly FullSiteRawSettingState[]> => mutateSettingsBatch(input, "trusted_restore");
