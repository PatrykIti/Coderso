import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { SmokeError } from "../../contracts";
import type { PlainJsonObject, PlainJsonValue } from "../../workers/contracts";
import { TASK105_L05_LEASED_SETTING_KEYS, type Task105L05LeasedSettingKey } from "./settings-lease";

/**
 * Private, durable TASK-105 L05 recovery receipt contract.
 *
 * The recovery authority stays in the live adapter and private worker frames.
 * It is intentionally not a worker result, diagnostic, report, or evidence
 * value. A receipt is HMAC protected and can only be advanced through
 * `transitionReceipt`, which gives retries exact-patch idempotence while
 * rejecting stale phase/version writers.
 */

export const TASK105_L05_RECOVERY_SCHEMA_VERSION = 1 as const;
export const TASK105_L05_RECEIPT_PREFIX = "runtimeSmoke.task105l05.";
export const TASK105_L05_MAX_RECEIPT_BYTES = 64 * 1024;

const MARKER = /^[a-f0-9]{12,32}$/u;
const SESSION = /^[a-z0-9][a-z0-9_-]{2,47}$/u;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{43}$/u;
const HMAC = /^[a-f0-9]{64}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const RECEIPT_PHASES = [
  "fixture-intent",
  "fixture-installing",
  "fixture-installed",
  "settings-applied",
  "site-shell-intent",
  "site-shell-claimed",
  "recovering",
  "settings-restored",
  "fixtures-removed",
] as const;

const RECEIPT_TRANSITIONS: Readonly<
  Record<Task105L05ReceiptPhase, readonly Task105L05ReceiptPhase[]>
> = Object.freeze({
  "fixture-intent": Object.freeze(["fixture-installing", "recovering"] as const),
  "fixture-installing": Object.freeze([
    "fixture-installing",
    "fixture-installed",
    "recovering",
  ] as const),
  "fixture-installed": Object.freeze(["settings-applied", "recovering"] as const),
  "settings-applied": Object.freeze(["site-shell-intent", "recovering"] as const),
  "site-shell-intent": Object.freeze(["site-shell-claimed", "recovering"] as const),
  "site-shell-claimed": Object.freeze(["recovering"] as const),
  recovering: Object.freeze(["settings-restored", "fixtures-removed"] as const),
  "settings-restored": Object.freeze(["fixtures-removed"] as const),
  "fixtures-removed": Object.freeze([] as const),
});

const FIXTURE_FIELDS = [
  "roleId",
  "roleDescription",
  "roleXmin",
  "userId",
  "sessionId",
  "tokenHash",
  "fixturePageId",
] as const;

type FixtureField = (typeof FIXTURE_FIELDS)[number];

export type Task105L05RecoveryProfile = "fast" | "certification";
export type Task105L05ReceiptPhase = (typeof RECEIPT_PHASES)[number];

export interface Task105L05RecoveryAuthority extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly runMarker: string;
  readonly profile: Task105L05RecoveryProfile;
  readonly session: string;
  readonly recoveryKey: string;
}

export interface Task105L05ReceiptRecord extends PlainJsonObject {
  readonly key: Task105L05LeasedSettingKey;
  readonly valueJson: string;
  readonly updatedAt: string;
  readonly xmin: string;
}

export interface Task105L05ReceiptFixture extends PlainJsonObject {
  readonly roleId: string | null;
  readonly roleDescription: string | null;
  readonly roleXmin: string | null;
  readonly userId: string | null;
  readonly sessionId: string | null;
  readonly tokenHash: string | null;
  readonly fixturePageId: string | null;
}

export interface Task105L05ReceiptSettings extends PlainJsonObject {
  readonly baseline: readonly (Task105L05ReceiptRecord | null)[];
  readonly owned: readonly Task105L05ReceiptRecord[];
}

export interface Task105L05ReceiptSiteShell extends PlainJsonObject {
  readonly navigationMenuId: string;
}

export interface Task105L05RecoveryReceipt extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly suiteId: "task-105-l05";
  readonly runMarker: string;
  readonly profile: Task105L05RecoveryProfile;
  readonly session: string;
  readonly version: number;
  readonly phase: Task105L05ReceiptPhase;
  /** Digest of the one canonical patch that committed this receipt version. */
  readonly patchDigest: string;
  readonly fixture: Task105L05ReceiptFixture;
  readonly settings: Task105L05ReceiptSettings | null;
  readonly siteShell: Task105L05ReceiptSiteShell | null;
  readonly receiptHmac: string;
}

export interface Task105L05ReceiptPatch {
  readonly fixture?: Readonly<Partial<Record<FixtureField, string>>>;
  readonly settings?: Task105L05ReceiptSettings;
  readonly siteShell?: Task105L05ReceiptSiteShell;
}

interface ReceiptPayload extends PlainJsonObject {
  readonly schemaVersion: 1;
  readonly suiteId: "task-105-l05";
  readonly runMarker: string;
  readonly profile: Task105L05RecoveryProfile;
  readonly session: string;
  readonly version: number;
  readonly phase: Task105L05ReceiptPhase;
  readonly patchDigest: string;
  readonly fixture: Task105L05ReceiptFixture;
  readonly settings: Task105L05ReceiptSettings | null;
  readonly siteShell: Task105L05ReceiptSiteShell | null;
}

function fail(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

function outputFail(message: string): never {
  throw new SmokeError("smoke_output_invalid", message);
}

function exactObject(
  value: unknown,
  keys: readonly string[],
  label: string
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    outputFail(`${label} is invalid`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    outputFail(`${label} fields are invalid`);
  }
  return value as Record<string, unknown>;
}

function boundedObject(
  value: unknown,
  allowed: readonly string[],
  label: string
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    outputFail(`${label} is invalid`);
  }
  const keys = Object.keys(value);
  if (keys.some((key) => !allowed.includes(key))) outputFail(`${label} fields are invalid`);
  return value as Record<string, unknown>;
}

function safeNullableText(value: unknown, label: string, maximum = 4096): string | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.includes("\0")
  ) {
    outputFail(`${label} is invalid`);
  }
  return value;
}

function safeText(value: unknown, label: string, maximum = 4096): string {
  const result = safeNullableText(value, label, maximum);
  if (result === null) outputFail(`${label} is invalid`);
  return result;
}

function record(value: unknown, label: string): Task105L05ReceiptRecord {
  const raw = exactObject(value, ["key", "valueJson", "updatedAt", "xmin"], label);
  if (
    typeof raw.key !== "string" ||
    !(TASK105_L05_LEASED_SETTING_KEYS as readonly string[]).includes(raw.key)
  ) {
    outputFail(`${label} key is invalid`);
  }
  return Object.freeze({
    key: raw.key as Task105L05LeasedSettingKey,
    valueJson: safeText(raw.valueJson, `${label} value`, 32 * 1024),
    updatedAt: safeText(raw.updatedAt, `${label} timestamp`, 256),
    xmin: safeText(raw.xmin, `${label} version`, 128),
  });
}

function fixture(value: unknown): Task105L05ReceiptFixture {
  const raw = exactObject(value, FIXTURE_FIELDS, "TASK-105 L05 recovery fixture");
  const tokenHash = safeNullableText(raw.tokenHash, "TASK-105 L05 recovery token identity", 128);
  if (tokenHash !== null && !/^[a-f0-9]{64}$/u.test(tokenHash)) {
    outputFail("TASK-105 L05 recovery token identity is invalid");
  }
  return Object.freeze({
    roleId: safeNullableText(raw.roleId, "TASK-105 L05 recovery role ID"),
    roleDescription: safeNullableText(
      raw.roleDescription,
      "TASK-105 L05 recovery role description"
    ),
    roleXmin: safeNullableText(raw.roleXmin, "TASK-105 L05 recovery role version", 128),
    userId: safeNullableText(raw.userId, "TASK-105 L05 recovery user ID"),
    sessionId: safeNullableText(raw.sessionId, "TASK-105 L05 recovery session ID"),
    tokenHash,
    fixturePageId: safeNullableText(raw.fixturePageId, "TASK-105 L05 recovery page ID"),
  });
}

function settings(value: unknown): Task105L05ReceiptSettings {
  const raw = exactObject(value, ["baseline", "owned"], "TASK-105 L05 recovery settings");
  if (
    !Array.isArray(raw.baseline) ||
    raw.baseline.length !== TASK105_L05_LEASED_SETTING_KEYS.length
  ) {
    outputFail("TASK-105 L05 recovery baseline is invalid");
  }
  if (
    !Array.isArray(raw.owned) ||
    raw.owned.length === 0 ||
    raw.owned.length > TASK105_L05_LEASED_SETTING_KEYS.length
  ) {
    outputFail("TASK-105 L05 recovery ownership is invalid");
  }
  const baseline = raw.baseline.map((item, index) => {
    if (item === null) return null;
    const parsed = record(item, "TASK-105 L05 recovery baseline record");
    if (parsed.key !== TASK105_L05_LEASED_SETTING_KEYS[index]) {
      outputFail("TASK-105 L05 recovery baseline order drifted");
    }
    return parsed;
  });
  const owned = raw.owned.map((item) => record(item, "TASK-105 L05 recovery owned record"));
  const keys = new Set(owned.map(({ key }) => key));
  // An absent baseline is represented by `null` at its canonical key index;
  // that key may still become an owned post-write row and must be restorable.
  if (
    keys.size !== owned.length ||
    owned.some(({ key }) => !(TASK105_L05_LEASED_SETTING_KEYS as readonly string[]).includes(key))
  ) {
    outputFail("TASK-105 L05 recovery ownership keys are invalid");
  }
  return Object.freeze({ baseline: Object.freeze(baseline), owned: Object.freeze(owned) });
}

function canonicalize(value: PlainJsonValue): PlainJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map(canonicalize));
  const output: Record<string, PlainJsonValue> = {};
  const objectValue = value as Readonly<Record<string, PlainJsonValue>>;
  for (const key of Object.keys(objectValue).sort()) output[key] = canonicalize(objectValue[key]!);
  return Object.freeze(output);
}

function canonicalJson(value: PlainJsonValue): string {
  return JSON.stringify(canonicalize(value));
}

function hmac(value: ReceiptPayload, recoveryKey: string): string {
  return createHmac("sha256", Buffer.from(recoveryKey, "base64url"))
    .update(canonicalJson(value))
    .digest("hex");
}

function assertReceiptByteBound(value: PlainJsonValue, label: string): void {
  if (Buffer.byteLength(canonicalJson(value), "utf8") > TASK105_L05_MAX_RECEIPT_BYTES) {
    outputFail(`${label} is too large`);
  }
}

function normalizeFixturePatch(value: unknown): Readonly<Partial<Record<FixtureField, string>>> {
  const raw = boundedObject(value, FIXTURE_FIELDS, "TASK-105 L05 recovery fixture patch");
  const keys = Object.keys(raw) as FixtureField[];
  if (keys.length === 0) outputFail("TASK-105 L05 recovery fixture patch is empty");
  const output: Partial<Record<FixtureField, string>> = {};
  for (const key of keys) {
    const next = safeText(raw[key], `TASK-105 L05 recovery fixture patch ${key}`);
    if (key === "tokenHash" && !/^[a-f0-9]{64}$/u.test(next)) {
      outputFail("TASK-105 L05 recovery fixture patch token identity is invalid");
    }
    output[key] = next;
  }
  return Object.freeze(output);
}

function normalizePatch(value: unknown): Task105L05ReceiptPatch {
  const raw = boundedObject(
    value,
    ["fixture", "settings", "siteShell"],
    "TASK-105 L05 recovery patch"
  );
  const output: {
    fixture?: Readonly<Partial<Record<FixtureField, string>>>;
    settings?: Task105L05ReceiptSettings;
    siteShell?: Task105L05ReceiptSiteShell;
  } = {};
  if (raw.fixture !== undefined) output.fixture = normalizeFixturePatch(raw.fixture);
  if (raw.settings !== undefined) output.settings = settings(raw.settings);
  if (raw.siteShell !== undefined) {
    const siteShell = exactObject(
      raw.siteShell,
      ["navigationMenuId"],
      "TASK-105 L05 recovery Site Shell patch"
    );
    output.siteShell = Object.freeze({
      navigationMenuId: safeText(siteShell.navigationMenuId, "TASK-105 L05 recovery menu ID"),
    });
  }
  assertReceiptByteBound(output as PlainJsonObject, "TASK-105 L05 recovery patch");
  return Object.freeze(output) as Task105L05ReceiptPatch;
}

function assertSettingsAppendOnly(
  current: Task105L05ReceiptSettings | null,
  next: Task105L05ReceiptSettings
): void {
  if (current === null) return;
  if (canonicalJson(current.baseline) !== canonicalJson(next.baseline)) {
    fail("TASK-105 L05 recovery settings baseline changed");
  }
  for (const owned of current.owned) {
    const replacement = next.owned.find(({ key }) => key === owned.key);
    if (replacement === undefined || canonicalJson(replacement) !== canonicalJson(owned)) {
      fail("TASK-105 L05 recovery settings ownership changed");
    }
  }
}

function mergeFixture(
  current: Task105L05ReceiptFixture,
  patch: Readonly<Partial<Record<FixtureField, string>>> | undefined
): Task105L05ReceiptFixture {
  if (patch === undefined) return current;
  const output: Record<FixtureField, string | null> = { ...current };
  for (const key of FIXTURE_FIELDS) {
    const value = patch[key];
    if (value === undefined) continue;
    if (output[key] !== null && output[key] !== value) {
      fail("TASK-105 L05 recovery fixture ownership changed");
    }
    output[key] = value;
  }
  return fixture(output);
}

function assertReceiptPhaseInvariants(value: ReceiptPayload, label: string): void {
  const completeFixture = receiptFixtureIsComplete(value.fixture);
  const needsCompleteFixture = [
    "fixture-installed",
    "settings-applied",
    "site-shell-intent",
    "site-shell-claimed",
    "settings-restored",
    "fixtures-removed",
  ].includes(value.phase);
  if (needsCompleteFixture && !completeFixture) fail(`${label} fixture ownership is incomplete`);
  const needsSettings = [
    "settings-applied",
    "site-shell-intent",
    "site-shell-claimed",
    "settings-restored",
  ].includes(value.phase);
  if (needsSettings && value.settings === null) fail(`${label} settings ownership is absent`);
  if (value.phase === "site-shell-claimed") {
    if (
      value.siteShell === null ||
      !value.settings?.owned.some(({ key }) => key === "site.navigationMenuId") ||
      !value.settings.owned.some(({ key }) => key === "site.footerTemplateId")
    ) {
      fail(`${label} Site Shell ownership is incomplete`);
    }
  }
  if (
    value.phase === "fixture-intent" &&
    (completeFixture || value.settings !== null || value.siteShell !== null)
  ) {
    fail(`${label} fixture intent is not empty`);
  }
}

function payload(value: unknown): ReceiptPayload {
  const raw = exactObject(
    value,
    [
      "schemaVersion",
      "suiteId",
      "runMarker",
      "profile",
      "session",
      "version",
      "phase",
      "patchDigest",
      "fixture",
      "settings",
      "siteShell",
    ],
    "TASK-105 L05 recovery receipt payload"
  );
  if (
    raw.schemaVersion !== 1 ||
    raw.suiteId !== "task-105-l05" ||
    typeof raw.runMarker !== "string" ||
    !MARKER.test(raw.runMarker) ||
    (raw.profile !== "fast" && raw.profile !== "certification") ||
    typeof raw.session !== "string" ||
    !SESSION.test(raw.session) ||
    !Number.isSafeInteger(raw.version) ||
    (raw.version as number) < 0 ||
    typeof raw.phase !== "string" ||
    !(RECEIPT_PHASES as readonly string[]).includes(raw.phase) ||
    typeof raw.patchDigest !== "string" ||
    !DIGEST.test(raw.patchDigest)
  ) {
    outputFail("TASK-105 L05 recovery receipt authority is invalid");
  }
  const siteShell =
    raw.siteShell === null
      ? null
      : (() => {
          const shell = exactObject(
            raw.siteShell,
            ["navigationMenuId"],
            "TASK-105 L05 recovery Site Shell"
          );
          return Object.freeze({
            navigationMenuId: safeText(shell.navigationMenuId, "TASK-105 L05 recovery menu ID"),
          });
        })();
  const result = Object.freeze({
    schemaVersion: 1 as const,
    suiteId: "task-105-l05" as const,
    runMarker: raw.runMarker,
    profile: raw.profile,
    session: raw.session,
    version: raw.version as number,
    phase: raw.phase as Task105L05ReceiptPhase,
    patchDigest: raw.patchDigest,
    fixture: fixture(raw.fixture),
    settings: raw.settings === null ? null : settings(raw.settings),
    siteShell,
  });
  assertReceiptPhaseInvariants(result, "TASK-105 L05 recovery receipt");
  return result;
}

function signReceipt(
  body: ReceiptPayload,
  authority: Task105L05RecoveryAuthority
): Task105L05RecoveryReceipt {
  const receipt = Object.freeze({ ...body, receiptHmac: hmac(body, authority.recoveryKey) });
  assertReceiptByteBound(receipt, "TASK-105 L05 recovery receipt");
  return receipt as Task105L05RecoveryReceipt;
}

export function task105L05RecoveryReceiptKey(runMarker: string): string {
  if (!MARKER.test(runMarker)) outputFail("TASK-105 L05 recovery marker is invalid");
  return `${TASK105_L05_RECEIPT_PREFIX}${runMarker}`;
}

export function createTask105L05RecoveryAuthority(input: {
  readonly profile: Task105L05RecoveryProfile;
  readonly session: string;
  readonly runMarker?: string;
  readonly recoveryKey?: string;
}): Task105L05RecoveryAuthority {
  const runMarker = input.runMarker ?? randomBytes(12).toString("hex");
  const recoveryKey = input.recoveryKey ?? randomBytes(32).toString("base64url");
  if (
    !MARKER.test(runMarker) ||
    !SESSION.test(input.session) ||
    !RECOVERY_KEY.test(recoveryKey) ||
    Buffer.from(recoveryKey, "base64url").length !== 32 ||
    (input.profile !== "fast" && input.profile !== "certification")
  ) {
    outputFail("TASK-105 L05 recovery authority is invalid");
  }
  return Object.freeze({
    schemaVersion: 1,
    runMarker,
    profile: input.profile,
    session: input.session,
    recoveryKey,
  });
}

export function validateTask105L05RecoveryAuthority(value: unknown): Task105L05RecoveryAuthority {
  const raw = exactObject(
    value,
    ["schemaVersion", "runMarker", "profile", "session", "recoveryKey"],
    "TASK-105 L05 recovery authority"
  );
  if (
    raw.schemaVersion !== 1 ||
    typeof raw.runMarker !== "string" ||
    !MARKER.test(raw.runMarker) ||
    (raw.profile !== "fast" && raw.profile !== "certification") ||
    typeof raw.session !== "string" ||
    !SESSION.test(raw.session) ||
    typeof raw.recoveryKey !== "string" ||
    !RECOVERY_KEY.test(raw.recoveryKey) ||
    Buffer.from(raw.recoveryKey, "base64url").length !== 32
  ) {
    outputFail("TASK-105 L05 recovery authority is invalid");
  }
  return Object.freeze({
    schemaVersion: 1,
    runMarker: raw.runMarker,
    profile: raw.profile,
    session: raw.session,
    recoveryKey: raw.recoveryKey,
  }) as Task105L05RecoveryAuthority;
}

export function task105L05ReceiptPatchDigest(value: Task105L05ReceiptPatch): string {
  const patch = normalizePatch(value);
  return createHash("sha256")
    .update(canonicalJson(patch as PlainJsonObject))
    .digest("hex");
}

/** Creates only the pre-mutation `fixture-intent` receipt. */
export function createTask105L05RecoveryReceipt(input: {
  readonly authority: Task105L05RecoveryAuthority;
}): Task105L05RecoveryReceipt {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  const emptyPatch = Object.freeze({}) as Task105L05ReceiptPatch;
  const body = payload({
    schemaVersion: 1,
    suiteId: "task-105-l05",
    runMarker: authority.runMarker,
    profile: authority.profile,
    session: authority.session,
    version: 0,
    phase: "fixture-intent",
    patchDigest: task105L05ReceiptPatchDigest(emptyPatch),
    fixture: emptyTask105L05FixtureReceipt(),
    settings: null,
    siteShell: null,
  });
  return signReceipt(body, authority);
}

export function validateTask105L05RecoveryReceipt(
  value: unknown,
  authority: Task105L05RecoveryAuthority
): Task105L05RecoveryReceipt {
  const raw = exactObject(
    value,
    [
      "schemaVersion",
      "suiteId",
      "runMarker",
      "profile",
      "session",
      "version",
      "phase",
      "patchDigest",
      "fixture",
      "settings",
      "siteShell",
      "receiptHmac",
    ],
    "TASK-105 L05 recovery receipt"
  );
  assertReceiptByteBound(raw as PlainJsonObject, "TASK-105 L05 recovery receipt");
  const parsedAuthority = validateTask105L05RecoveryAuthority(authority);
  const body = payload({
    schemaVersion: raw.schemaVersion,
    suiteId: raw.suiteId,
    runMarker: raw.runMarker,
    profile: raw.profile,
    session: raw.session,
    version: raw.version,
    phase: raw.phase,
    patchDigest: raw.patchDigest,
    fixture: raw.fixture,
    settings: raw.settings,
    siteShell: raw.siteShell,
  });
  if (
    body.runMarker !== parsedAuthority.runMarker ||
    body.profile !== parsedAuthority.profile ||
    body.session !== parsedAuthority.session
  ) {
    fail("TASK-105 L05 recovery receipt authority drifted");
  }
  if (typeof raw.receiptHmac !== "string" || !HMAC.test(raw.receiptHmac)) {
    fail("TASK-105 L05 recovery receipt HMAC is invalid");
  }
  const expected = Buffer.from(hmac(body, parsedAuthority.recoveryKey), "hex");
  const actual = Buffer.from(raw.receiptHmac, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    fail("TASK-105 L05 recovery receipt HMAC is invalid");
  }
  return Object.freeze({ ...body, receiptHmac: raw.receiptHmac }) as Task105L05RecoveryReceipt;
}

export function task105L05ReceiptPayload(receipt: Task105L05RecoveryReceipt): ReceiptPayload {
  return payload({
    schemaVersion: receipt.schemaVersion,
    suiteId: receipt.suiteId,
    runMarker: receipt.runMarker,
    profile: receipt.profile,
    session: receipt.session,
    version: receipt.version,
    phase: receipt.phase,
    patchDigest: receipt.patchDigest,
    fixture: receipt.fixture,
    settings: receipt.settings,
    siteShell: receipt.siteShell,
  });
}

export interface Task105L05ReceiptTransitionInput {
  readonly authority: Task105L05RecoveryAuthority;
  readonly current: Task105L05RecoveryReceipt;
  readonly expectedPhase: Task105L05ReceiptPhase;
  readonly expectedVersion: number;
  readonly nextPhase: Task105L05ReceiptPhase;
  readonly patch: Task105L05ReceiptPatch;
}

/**
 * The sole receipt mutation function. The database layer invokes it while
 * holding the receipt row lock; `expectedVersion` makes stale concurrent
 * callers fail closed and recognizes only the exact committed retry.
 */
export function transitionReceipt(
  input: Task105L05ReceiptTransitionInput
): Task105L05RecoveryReceipt {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  const current = validateTask105L05RecoveryReceipt(input.current, authority);
  const patch = normalizePatch(input.patch);
  const patchDigest = task105L05ReceiptPatchDigest(patch);
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) {
    outputFail("TASK-105 L05 recovery expected version is invalid");
  }
  if (
    !(RECEIPT_PHASES as readonly string[]).includes(input.expectedPhase) ||
    !(RECEIPT_PHASES as readonly string[]).includes(input.nextPhase)
  ) {
    outputFail("TASK-105 L05 recovery transition phase is invalid");
  }
  if (
    current.phase === input.nextPhase &&
    current.patchDigest === patchDigest &&
    current.version === input.expectedVersion + 1
  ) {
    return current;
  }
  if (current.phase !== input.expectedPhase || current.version !== input.expectedVersion) {
    fail("TASK-105 L05 recovery receipt transition conflicted");
  }
  if (!RECEIPT_TRANSITIONS[current.phase].includes(input.nextPhase)) {
    fail("TASK-105 L05 recovery receipt phase transition is invalid");
  }

  const nextFixture = mergeFixture(current.fixture, patch.fixture);
  const nextSettings = patch.settings === undefined ? current.settings : patch.settings;
  if (patch.settings !== undefined) assertSettingsAppendOnly(current.settings, patch.settings);
  const nextSiteShell = patch.siteShell === undefined ? current.siteShell : patch.siteShell;
  if (
    current.siteShell !== null &&
    patch.siteShell !== undefined &&
    canonicalJson(current.siteShell) !== canonicalJson(patch.siteShell)
  ) {
    fail("TASK-105 L05 recovery Site Shell ownership changed");
  }

  if (input.nextPhase === "fixture-installing" && patch.fixture === undefined) {
    fail("TASK-105 L05 recovery fixture checkpoint is absent");
  }
  if (input.nextPhase === "fixture-installed" && !receiptFixtureIsComplete(nextFixture)) {
    fail("TASK-105 L05 recovery fixture installation is incomplete");
  }
  if (input.nextPhase === "settings-applied" && patch.settings === undefined) {
    fail("TASK-105 L05 recovery settings checkpoint is absent");
  }
  if (
    input.nextPhase === "site-shell-claimed" &&
    (patch.settings === undefined || patch.siteShell === undefined)
  ) {
    fail("TASK-105 L05 recovery Site Shell checkpoint is absent");
  }

  const body = payload({
    schemaVersion: 1,
    suiteId: "task-105-l05",
    runMarker: authority.runMarker,
    profile: authority.profile,
    session: authority.session,
    version: current.version + 1,
    phase: input.nextPhase,
    patchDigest,
    fixture: nextFixture,
    settings: nextSettings,
    siteShell: nextSiteShell,
  });
  return signReceipt(body, authority);
}

/** Named alias for call sites that prefer the suite-qualified public symbol. */
export const transitionTask105L05RecoveryReceipt = transitionReceipt;

export function emptyTask105L05FixtureReceipt(): Task105L05ReceiptFixture {
  return Object.freeze({
    roleId: null,
    roleDescription: null,
    roleXmin: null,
    userId: null,
    sessionId: null,
    tokenHash: null,
    fixturePageId: null,
  });
}

export function receiptFixtureIsComplete(fixtureValue: Task105L05ReceiptFixture): boolean {
  return FIXTURE_FIELDS.every(
    (key) => typeof fixtureValue[key] === "string" && fixtureValue[key]!.length > 0
  );
}
