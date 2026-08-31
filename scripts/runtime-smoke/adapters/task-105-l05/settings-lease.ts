import { SmokeError } from "../../contracts";
import type { PlainJsonObject } from "../../workers/contracts";

/**
 * TASK-105 L05 settings lease (contract: TASK-105-08-05-L04).
 *
 * Protects exactly seven global keys through the existing DB writer fence,
 * locked settings table, raw JSON value, updatedAt, and xmin identity
 * patterns. The suite import graph must stay DB-free so the pure A lane runs
 * without DATABASE_URL; core database modules load lazily inside call paths.
 */

export const TASK105_L05_LEASED_SETTING_KEYS = Object.freeze([
  "assistant.enabled",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "site.homepageId",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.adminPath",
] as const);

export type Task105L05LeasedSettingKey = (typeof TASK105_L05_LEASED_SETTING_KEYS)[number];

const SITE_SHELL_KEYS: readonly Task105L05LeasedSettingKey[] = Object.freeze([
  "site.navigationMenuId",
  "site.footerTemplateId",
]);

const APPLY_KEYS: readonly Task105L05LeasedSettingKey[] = Object.freeze([
  "assistant.enabled",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "site.homepageId",
  "site.adminPath",
]);

/** Validated non-default task-local admin base path shape. */
export function validateTask105L05AdminBase(session: string, candidate: string): string {
  const expected = `/${session}-admin`;
  if (
    typeof candidate !== "string" ||
    candidate !== expected ||
    candidate.includes(".") ||
    candidate.includes("%") ||
    candidate.includes("?") ||
    candidate.includes("#") ||
    candidate === "/admin"
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 admin base path is invalid");
  }
  return expected;
}

export interface Task105L05SettingRowIdentity extends PlainJsonObject {
  readonly key: string;
  readonly valueJson: string;
  readonly updatedAt: string;
  readonly xmin: string;
}

export interface Task105L05SettingBaseline extends PlainJsonObject {
  readonly key: Task105L05LeasedSettingKey;
  readonly row: Task105L05SettingRowIdentity | null;
}

export interface Task105L05SettingsApplyResult extends PlainJsonObject {
  readonly baseline: readonly Task105L05SettingBaseline[];
  readonly owned: readonly Task105L05SettingRowIdentity[];
}

export interface Task105L05SettingsRestoreInput extends PlainJsonObject {
  readonly baseline: readonly Task105L05SettingBaseline[];
  readonly owned: readonly Task105L05SettingRowIdentity[];
}

interface LeaseDeps {
  /**
   * Private worker path: receipt-owned operations return only bounded success
   * flags, never baseline JSON/xmin values into the browser parent.
   */
  readonly applyPrivate?: (input: {
    readonly rows: readonly Readonly<{
      readonly key: Task105L05LeasedSettingKey;
      readonly valueJson: string;
    }>[];
  }) => Promise<void>;
  readonly claimPrivate?: (input: { readonly navigationMenuId: string }) => Promise<void>;
  readonly restorePrivate?: () => Promise<void>;
  /** Production path: one worker-owned transaction snapshots and applies all setup rows. */
  readonly apply?: (input: {
    readonly rows: readonly Readonly<{
      readonly key: Task105L05LeasedSettingKey;
      readonly valueJson: string;
    }>[];
  }) => Promise<Task105L05SettingsApplyResult>;
  /** Production path: one worker-owned transaction verifies and restores all owned rows. */
  readonly restore?: (input: Task105L05SettingsRestoreInput) => Promise<void>;
  /** Legacy test seam; production supplies apply/restore and only uses this for Site Shell claim. */
  readonly listRows: (
    keys: readonly string[]
  ) => Promise<ReadonlyMap<string, Task105L05SettingRowIdentity>>;
  readonly writeRow: (key: string, valueJson: string) => Promise<Task105L05SettingRowIdentity>;
  readonly deleteRow: (key: string, expected?: Task105L05SettingRowIdentity) => Promise<void>;
}

export const TASK105_L05_PRESET_VALUES: Readonly<
  Record<
    "assistant.enabled" | "assistant.launcher.avatarEnabled" | "assistant.launcher.avatarAsset",
    string
  >
> = Object.freeze({
  "assistant.enabled": "true",
  "assistant.launcher.avatarEnabled": "false",
  "assistant.launcher.avatarAsset": JSON.stringify(""),
});

const SETUP_ROWS: readonly Readonly<{
  readonly key: Task105L05LeasedSettingKey;
  readonly valueJson: string;
}>[] = Object.freeze([
  Object.freeze({
    key: "assistant.enabled",
    valueJson: TASK105_L05_PRESET_VALUES["assistant.enabled"],
  }),
  Object.freeze({
    key: "assistant.launcher.avatarEnabled",
    valueJson: TASK105_L05_PRESET_VALUES["assistant.launcher.avatarEnabled"],
  }),
  Object.freeze({
    key: "assistant.launcher.avatarAsset",
    valueJson: TASK105_L05_PRESET_VALUES["assistant.launcher.avatarAsset"],
  }),
]);

interface LeaseState {
  readonly baseline: ReadonlyMap<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity | null>;
  readonly owned: ReadonlyMap<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity>;
  readonly privateReceipt: boolean;
}

function baselineMap(
  rows: readonly Task105L05SettingBaseline[]
): ReadonlyMap<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity | null> {
  if (rows.length !== TASK105_L05_LEASED_SETTING_KEYS.length) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-105 L05 settings baseline cardinality is invalid"
    );
  }
  const out = new Map<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity | null>();
  for (const expectedKey of TASK105_L05_LEASED_SETTING_KEYS) {
    const item = rows.find(({ key }) => key === expectedKey);
    if (item === undefined || out.has(item.key)) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 settings baseline keys are invalid"
      );
    }
    out.set(item.key, item.row);
  }
  return out;
}

function ownedMap(
  rows: readonly Task105L05SettingRowIdentity[]
): ReadonlyMap<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity> {
  if (rows.length === 0 || rows.length > TASK105_L05_LEASED_SETTING_KEYS.length) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-105 L05 settings ownership cardinality is invalid"
    );
  }
  const out = new Map<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity>();
  for (const row of rows) {
    if (
      !(TASK105_L05_LEASED_SETTING_KEYS as readonly string[]).includes(row.key) ||
      out.has(row.key as Task105L05LeasedSettingKey)
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 settings ownership keys are invalid"
      );
    }
    out.set(row.key as Task105L05LeasedSettingKey, row);
  }
  return out;
}

function parseJsonValue(valueJson: string, label: string): unknown {
  try {
    return JSON.parse(valueJson) as unknown;
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", `TASK-105 L05 ${label} JSON is invalid`, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}

function assertSameOwnedValue(
  current: Task105L05SettingRowIdentity | undefined,
  owned: Task105L05SettingRowIdentity,
  key: string
): void {
  if (
    current === undefined ||
    current.xmin !== owned.xmin ||
    current.updatedAt !== owned.updatedAt ||
    current.valueJson !== owned.valueJson
  ) {
    throw new SmokeError(
      "smoke_cleanup_failed",
      `TASK-105 L05 leased key ${key} drifted; refusing restore`
    );
  }
}

/**
 * Snapshot/CAS settings lease. Production apply/restore callbacks are backed
 * by one worker-owned transaction each. The legacy row callbacks remain only
 * as a deterministic unit-test seam.
 */
export class Task105L05SettingsLease {
  #state: LeaseState | null = null;
  #applying = false;
  #restoring = false;
  #transition: Promise<void> = Promise.resolve();
  readonly #deps: LeaseDeps;

  async #withTransition<T>(action: () => Promise<T>): Promise<T> {
    const previous = this.#transition;
    let release: () => void = () => undefined;
    this.#transition = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await action();
    } finally {
      release();
    }
  }

  constructor(deps?: Partial<LeaseDeps>) {
    this.#deps = {
      applyPrivate: deps?.applyPrivate,
      claimPrivate: deps?.claimPrivate,
      restorePrivate: deps?.restorePrivate,
      apply: deps?.apply,
      restore: deps?.restore,
      listRows:
        deps?.listRows ??
        (async (keys) => {
          const { listRuntimeSmokeSettingRows } = await import("./worker-operations");
          return listRuntimeSmokeSettingRows(keys);
        }),
      writeRow:
        deps?.writeRow ??
        (async (key, valueJson) => {
          const { writeRuntimeSmokeSettingRow } = await import("./worker-operations");
          return writeRuntimeSmokeSettingRow(key, valueJson);
        }),
      deleteRow:
        deps?.deleteRow ??
        (async (key, expected) => {
          const { deleteRuntimeSmokeSettingRow } = await import("./worker-operations");
          if (expected === undefined) {
            throw new SmokeError(
              "smoke_cleanup_failed",
              "TASK-105 L05 deletion requires owned identity"
            );
          }
          return deleteRuntimeSmokeSettingRow({ key, expected });
        }),
    };
  }

  async snapshotAndApply(input: {
    readonly session: string;
    readonly homepageId: string;
  }): Promise<void> {
    return this.#withTransition(() => this.#snapshotAndApply(input));
  }

  async #snapshotAndApply(input: {
    readonly session: string;
    readonly homepageId: string;
  }): Promise<void> {
    if (this.#state !== null || this.#applying || this.#restoring) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 lease is already active");
    }
    this.#applying = true;
    try {
      validateTask105L05AdminBase(input.session, `/${input.session}-admin`);
      const rows = Object.freeze([
        ...SETUP_ROWS,
        Object.freeze({
          key: "site.homepageId" as const,
          valueJson: JSON.stringify(input.homepageId),
        }),
        Object.freeze({
          key: "site.adminPath" as const,
          valueJson: JSON.stringify(`/${input.session}-admin`),
        }),
      ]);

      if (this.#deps.applyPrivate !== undefined) {
        await this.#deps.applyPrivate({ rows });
        this.#state = Object.freeze({
          baseline: new Map<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity | null>(),
          owned: new Map<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity>(),
          privateReceipt: true,
        });
        return;
      }

      if (this.#deps.apply !== undefined) {
        const result = await this.#deps.apply({ rows });
        const baseline = baselineMap(result.baseline);
        const owned = ownedMap(result.owned);
        for (const key of APPLY_KEYS) {
          if (!owned.has(key)) {
            throw new SmokeError(
              "smoke_output_invalid",
              `TASK-105 L05 applied key ${key} is not owned`
            );
          }
        }
        this.#state = Object.freeze({ baseline, owned, privateReceipt: false });
        return;
      }

      // Unit-only fallback. The real runtime never enters this branch.
      const existing = await this.#deps.listRows([...TASK105_L05_LEASED_SETTING_KEYS]);
      const baseline = new Map<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity | null>();
      for (const key of TASK105_L05_LEASED_SETTING_KEYS)
        baseline.set(key, existing.get(key) ?? null);
      const owned = new Map<Task105L05LeasedSettingKey, Task105L05SettingRowIdentity>();
      for (const row of rows) owned.set(row.key, await this.#deps.writeRow(row.key, row.valueJson));
      this.#state = Object.freeze({ baseline, owned, privateReceipt: false });
    } finally {
      this.#applying = false;
    }
  }

  /**
   * Claims ownership of both Site Shell rows after the real browser UI PATCH.
   * The footer must be unchanged from its baseline (or JSON null when it was
   * absent), so an unrelated UI write cannot become cleanup-owned accidentally.
   */
  async claimSiteShellRows(input: { readonly navigationMenuId: string }): Promise<void> {
    return this.#withTransition(() => this.#claimSiteShellRows(input));
  }

  async #claimSiteShellRows(input: { readonly navigationMenuId: string }): Promise<void> {
    const state = this.#requireApplied();
    if (state.privateReceipt) {
      if (this.#deps.claimPrivate === undefined) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 receipt Site Shell claim was not supplied"
        );
      }
      await this.#deps.claimPrivate(input);
      return;
    }
    const current = await this.#deps.listRows(SITE_SHELL_KEYS);
    const owned = new Map(state.owned);
    const navigation = current.get("site.navigationMenuId");
    if (
      navigation === undefined ||
      parseJsonValue(navigation.valueJson, "Site Shell navigation") !== input.navigationMenuId
    ) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 Site Shell navigation does not own the synthetic menu"
      );
    }
    // Bind the UI-created navigation row before validating the independent
    // footer row. If footer validation fails, cleanup must still restore the
    // navigation write rather than losing ownership of the created menu.
    owned.set("site.navigationMenuId", navigation);
    this.#state = Object.freeze({ baseline: state.baseline, owned, privateReceipt: false });

    const footer = current.get("site.footerTemplateId");
    if (footer === undefined) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 Site Shell row site.footerTemplateId is absent after the UI PATCH"
      );
    }
    const baseline = state.baseline.get("site.footerTemplateId");
    const expected = baseline === null || baseline === undefined ? "null" : baseline.valueJson;
    if (footer.valueJson !== expected) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-105 L05 Site Shell footer drifted during the UI PATCH"
      );
    }
    owned.set("site.footerTemplateId", footer);
    this.#state = Object.freeze({ baseline: state.baseline, owned, privateReceipt: false });
  }

  /** CAS restore of every owned key after host absence proof. */
  async restore(): Promise<void> {
    return this.#withTransition(() => this.#restore());
  }

  async #restore(): Promise<void> {
    if (this.#restoring) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 lease restore is already active");
    }
    const state = this.#requireApplied();
    this.#restoring = true;
    try {
      if (state.privateReceipt) {
        if (this.#deps.restorePrivate === undefined) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-105 L05 receipt restore was not supplied"
          );
        }
        await this.#deps.restorePrivate();
        this.#state = null;
        return;
      }
      if (this.#deps.restore !== undefined) {
        await this.#deps.restore({
          baseline: Object.freeze(
            TASK105_L05_LEASED_SETTING_KEYS.map((key) =>
              Object.freeze({ key, row: state.baseline.get(key) ?? null })
            )
          ),
          owned: Object.freeze([...state.owned.values()]),
        });
        this.#state = null;
        return;
      }

      const current = await this.#deps.listRows([
        ...state.owned.keys(),
        ...[...state.baseline.entries()].filter(([, row]) => row === null).map(([key]) => key),
      ]);
      for (const [key, owned] of [...state.owned.entries()].reverse()) {
        const now = current.get(key);
        assertSameOwnedValue(now, owned, key);
        const baseline = state.baseline.get(key);
        if (baseline === null || baseline === undefined) await this.#deps.deleteRow(key, now);
        else await this.#deps.writeRow(key, baseline.valueJson);
      }

      // The fallback cannot hold a transaction across its injected callbacks, but
      // it still proves the final presence/value postcondition before releasing state.
      const after = await this.#deps.listRows([...state.owned.keys()]);
      for (const key of state.owned.keys()) {
        const baseline = state.baseline.get(key);
        const row = after.get(key);
        if (baseline === null || baseline === undefined) {
          if (row !== undefined)
            throw new SmokeError("smoke_cleanup_failed", `TASK-105 L05 key ${key} was not removed`);
        } else if (row === undefined || row.valueJson !== baseline.valueJson) {
          throw new SmokeError("smoke_cleanup_failed", `TASK-105 L05 key ${key} was not restored`);
        }
      }
      this.#state = null;
    } finally {
      this.#restoring = false;
    }
  }

  #requireApplied(): LeaseState {
    if (this.#state === null) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 lease is not applied");
    }
    return this.#state;
  }
}
