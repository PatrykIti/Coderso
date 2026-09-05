/**
 * Bun-free opaque, tamper-evident keyset pagination cursor contract
 * (TASK-551-03-L01).
 *
 * Pure production module: no Bun APIs, no DB client import, no import-time
 * environment access. Only `node:crypto` primitives are used. The wire format
 * is exactly `<payload-base64url>.<mac-base64url>` with no padding; the MAC
 * covers the ASCII payload token. Raw database values never become mutable API
 * state: every payload field is validated against a code-owned `KeysetSpec`
 * before use.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const CURSOR_FORMAT_VERSION = 1;
/** Code-owned cursor lifetime: 24 hours. */
export const CURSOR_TTL_SECONDS = 86_400;
/** Maximum accepted future issue-time clock skew. */
export const CURSOR_MAX_CLOCK_SKEW_SECONDS = 60;
export const MAX_ENCODED_CURSOR_BYTES = 2_048;
export const MAX_CURSOR_PAYLOAD_BYTES = 1_024;
export const MAX_KEYSET_FIELDS = 5;
export const MAX_RETIRED_KEYS = 16;
export const MIN_SECRET_BYTES = 32;
export const MAX_SCOPE_BYTES = 512;
export const MAX_TEXT_FIELD_BYTES = 512;
export const MAX_KEY_VERSION = 2_147_483_647;

export const PAGINATION_CURSOR_ERROR_CODES = {
  invalid: "cursor_invalid",
  schema: "cursor_schema_invalid",
  value: "cursor_value_invalid",
  specMismatch: "cursor_spec_mismatch",
  scopeMismatch: "cursor_scope_mismatch",
  versionUnsupported: "cursor_version_unsupported",
  expired: "cursor_expired",
  keyRetired: "cursor_key_retired",
  configInvalid: "pagination_cursor_config_invalid",
  keyringUnavailable: "pagination_cursor_keyring_unavailable",
} as const;

/** Machine-readable cursor failure carrying only a bounded code. */
export class PaginationCursorError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PaginationCursorError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new PaginationCursorError(code);
}

export type CursorFieldType = "text" | "uuid" | "timestamp" | "integer" | "boolean";

/** A nullable payload field carries exactly `name,type`; others add `value`. */
export type CursorField =
  | Readonly<{ name: string; type: CursorFieldType; value: string | boolean }>
  | Readonly<{ name: string; type: "null" }>;

export type CursorPayload = Readonly<{
  formatVersion: typeof CURSOR_FORMAT_VERSION;
  keyVersion: number;
  issuedAtUnixSeconds: number;
  scope: string;
  direction: "next" | "previous";
  fields: readonly CursorField[];
}>;

/** Code-owned SQL identifier fragment; never cursor/request text. */
export type SqlIdentifier = string;

export type KeysetFieldSpec = Readonly<{
  name: string;
  type: CursorFieldType;
  column: SqlIdentifier;
  order: "asc" | "desc";
  nulls: "first" | "last";
  nullable: boolean;
}>;

export type KeysetSpec = Readonly<{
  scope: string;
  fields: readonly [KeysetFieldSpec, ...KeysetFieldSpec[]];
}>;

export type PaginationCursorKey = Readonly<{
  version: number;
  secret: Uint8Array;
}>;

export type PaginationCursorKeyring = Readonly<{
  current: PaginationCursorKey;
  previous?: PaginationCursorKey;
  retired: readonly PaginationCursorKey[];
}>;

const FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const COLUMN_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const INTEGER_PATTERN = /^-?(0|[1-9]\d*)$/;
const CANONICAL_UINT_PATTERN = /^(0|[1-9]\d*)$/;
const INT64_MIN = -9_223_372_036_854_775_808n;
const INT64_MAX = 9_223_372_036_854_775_807n;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const TOP_LEVEL_KEYS = Object.freeze([
  "formatVersion",
  "keyVersion",
  "issuedAtUnixSeconds",
  "scope",
  "direction",
  "fields",
]);

const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Spec normalization (code-owned closed allowlist)
// ---------------------------------------------------------------------------

/**
 * Validates and freezes a code-owned spec. Rejects unknown shapes, duplicate
 * names/columns, more than five fields, identifier-unsafe columns, and any
 * final field other than the stable unique tie-breaker
 * `{name:"id",type:"uuid",order:"asc",nulls:"last",nullable:false}`.
 */
export function normalizeKeysetSpec(
  input: Readonly<{
    scope: string;
    fields: readonly KeysetFieldSpec[];
  }>
): KeysetSpec {
  if (typeof input.scope !== "string") fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  const scopeBytes = encoder.encode(input.scope.normalize("NFC"));
  if (scopeBytes.length < 1 || scopeBytes.length > MAX_SCOPE_BYTES) {
    fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  }
  if (
    !Array.isArray(input.fields) ||
    input.fields.length < 1 ||
    input.fields.length > MAX_KEYSET_FIELDS
  ) {
    fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  }
  const validTypes: readonly CursorFieldType[] = [
    "text",
    "uuid",
    "timestamp",
    "integer",
    "boolean",
  ];
  const seenNames = new Set<string>();
  const seenColumns = new Set<string>();
  const fields: KeysetFieldSpec[] = input.fields.map((field) => {
    if (
      typeof field.name !== "string" ||
      !FIELD_NAME_PATTERN.test(field.name) ||
      typeof field.column !== "string" ||
      !COLUMN_PATTERN.test(field.column)
    ) {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    if (seenNames.has(field.name) || seenColumns.has(field.column)) {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    seenNames.add(field.name);
    seenColumns.add(field.column);
    if (
      (field.order !== "asc" && field.order !== "desc") ||
      (field.nulls !== "first" && field.nulls !== "last") ||
      typeof field.nullable !== "boolean" ||
      !validTypes.includes(field.type)
    ) {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    return Object.freeze({
      name: field.name,
      type: field.type,
      column: field.column,
      order: field.order,
      nulls: field.nulls,
      nullable: field.nullable,
    });
  });
  const last = fields[fields.length - 1]!;
  if (
    last.name !== "id" ||
    last.type !== "uuid" ||
    last.order !== "asc" ||
    last.nulls !== "last" ||
    last.nullable
  ) {
    fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  }
  return Object.freeze({
    scope: input.scope.normalize("NFC"),
    fields: Object.freeze(fields) as KeysetSpec["fields"],
  });
}

// ---------------------------------------------------------------------------
// Scalar wire validation
// ---------------------------------------------------------------------------

function isValidTextField(value: string): boolean {
  if (value.length === 0 || value.length > MAX_TEXT_FIELD_BYTES) return false;
  let normalized: string;
  try {
    normalized = value.normalize("NFC");
  } catch {
    return false;
  }
  if (normalized !== value) return false; // normalization must not change the wire value
  let byteLength = 0;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 0 || code < 0x20 || (code >= 0x7f && code <= 0x9f)) return false;
    byteLength +=
      code < 0x80
        ? 1
        : code < 0x800
          ? code >= 0xd800 && code <= 0xdfff
            ? 4
            : 2
          : code < 0x10000
            ? 3
            : 4;
  }
  return byteLength <= MAX_TEXT_FIELD_BYTES;
}

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isValidTimestamp(value: string): boolean {
  if (!TIMESTAMP_PATTERN.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  return new Date(parsed).toISOString() === value;
}

export function isValidIntegerWire(value: string): boolean {
  if (!INTEGER_PATTERN.test(value)) return false;
  const asBigInt = BigInt(value);
  return asBigInt >= INT64_MIN && asBigInt <= INT64_MAX;
}

/** Validates one scalar against its declared spec type's exact wire form. */
export function validateScalarValue(
  type: CursorFieldType,
  value: unknown
): value is string | boolean {
  if (type === "boolean") return typeof value === "boolean";
  if (typeof value !== "string") return false;
  switch (type) {
    case "text":
      return isValidTextField(value);
    case "uuid":
      return isValidUuid(value);
    case "timestamp":
      return isValidTimestamp(value);
    case "integer":
      return isValidIntegerWire(value);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Keyring loading (pure; env injected explicitly)
// ---------------------------------------------------------------------------

function decodeSecret(raw: unknown): Uint8Array {
  if (typeof raw !== "string") fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  const bytes = encoder.encode(raw);
  if (bytes.length < MIN_SECRET_BYTES) fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  return bytes;
}

function parseKeyVersion(raw: unknown): number {
  if (typeof raw === "number") {
    if (!Number.isSafeInteger(raw) || raw < 1 || raw > MAX_KEY_VERSION) {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    return raw;
  }
  if (typeof raw !== "string" || !CANONICAL_UINT_PATTERN.test(raw)) {
    fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_KEY_VERSION) {
    fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
  }
  return value;
}

/**
 * Loads the immutable pagination-cursor keyring from an explicit env record.
 * Fails closed on missing/weak/partial/duplicate/non-monotonic configuration.
 * Never reads `process.env` itself; secrets are exposed only as typed bytes
 * inside the frozen keyring.
 */
export function loadPaginationCursorKeyring(env: NodeJS.ProcessEnv): PaginationCursorKeyring {
  const currentSecret = decodeSecret(env.PAGINATION_CURSOR_SECRET);
  const currentVersion =
    env.PAGINATION_CURSOR_KEY_VERSION === undefined
      ? 1
      : parseKeyVersion(env.PAGINATION_CURSOR_KEY_VERSION);

  let previous: PaginationCursorKey | undefined;
  if (
    env.PAGINATION_CURSOR_PREVIOUS_SECRET !== undefined ||
    env.PAGINATION_CURSOR_PREVIOUS_KEY_VERSION !== undefined
  ) {
    // Optional strictly as a pair.
    if (
      env.PAGINATION_CURSOR_PREVIOUS_SECRET === undefined ||
      env.PAGINATION_CURSOR_PREVIOUS_KEY_VERSION === undefined
    ) {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    const previousVersion = parseKeyVersion(env.PAGINATION_CURSOR_PREVIOUS_KEY_VERSION);
    if (previousVersion >= currentVersion) fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    previous = Object.freeze({
      version: previousVersion,
      secret: decodeSecret(env.PAGINATION_CURSOR_PREVIOUS_SECRET),
    });
  }

  let retired: PaginationCursorKey[] = [];
  if (env.PAGINATION_CURSOR_RETIRED_KEYS !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(env.PAGINATION_CURSOR_RETIRED_KEYS as string);
    } catch {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    if (!Array.isArray(parsed) || parsed.length > MAX_RETIRED_KEYS) {
      fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    }
    const seenVersions = new Set<number>([currentVersion]);
    if (previous) seenVersions.add(previous.version);
    retired = parsed.map((entry) => {
      if (
        typeof entry !== "object" ||
        entry === null ||
        Object.keys(entry).sort().join(",") !== "secret,version"
      ) {
        fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
      }
      const bounded = entry as Record<string, unknown>;
      const version = parseKeyVersion(bounded.version);
      if (version >= currentVersion || seenVersions.has(version)) {
        fail(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
      }
      seenVersions.add(version);
      return Object.freeze({ version, secret: decodeSecret(bounded.secret) });
    });
    retired.sort((a, b) => a.version - b.version);
  }

  return Object.freeze({
    current: Object.freeze({ version: currentVersion, secret: currentSecret }),
    ...(previous ? { previous } : {}),
    retired: Object.freeze(retired),
  });
}

/** All bounded verification candidates in fixed current -> previous -> retired order. */
export function keyringCandidates(
  keyring: PaginationCursorKeyring
): readonly { key: PaginationCursorKey; kind: "current" | "previous" | "retired" }[] {
  return [
    { key: keyring.current, kind: "current" },
    ...(keyring.previous ? [{ key: keyring.previous, kind: "previous" as const }] : []),
    ...keyring.retired.map((key) => ({ key, kind: "retired" as const })),
  ];
}

// ---------------------------------------------------------------------------
// Encoding / decoding
// ---------------------------------------------------------------------------

function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function base64UrlDecode(token: string): Buffer {
  if (!BASE64URL_PATTERN.test(token)) fail(PAGINATION_CURSOR_ERROR_CODES.invalid);
  return Buffer.from(token, "base64url");
}

function sha256(bytes: Buffer | Uint8Array): Buffer {
  return createHash("sha256").update(bytes).digest();
}

/** Length-safe constant-time byte equality. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

type EncodeInput = Readonly<{
  scope: string;
  direction: "next" | "previous";
  values: readonly (string | boolean | null)[];
  nowUnixSeconds?: number;
}>;

/**
 * Encodes one opaque cursor from values aligned with the spec fields. The
 * payload is canonical JSON in the fixed serialization order; the MAC is
 * HMAC-SHA-256 over the ASCII payload token using the current key.
 */
export function encodeKeysetCursor(
  input: EncodeInput,
  spec: KeysetSpec,
  keys: PaginationCursorKeyring
): string {
  const nowUnixSeconds = input.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(nowUnixSeconds) ||
    nowUnixSeconds < 0 ||
    (input.direction !== "next" && input.direction !== "previous") ||
    input.values.length !== spec.fields.length
  ) {
    fail(PAGINATION_CURSOR_ERROR_CODES.value);
  }
  const fields: CursorField[] = spec.fields.map((field, index) => {
    const value = input.values[index];
    if (value === null) {
      if (!field.nullable) fail(PAGINATION_CURSOR_ERROR_CODES.value);
      return Object.freeze({ name: field.name, type: "null" as const });
    }
    if (!validateScalarValue(field.type, value)) fail(PAGINATION_CURSOR_ERROR_CODES.value);
    return Object.freeze({
      name: field.name,
      type: field.type,
      value: value as string | boolean,
    });
  });
  const payload = {
    formatVersion: CURSOR_FORMAT_VERSION,
    keyVersion: keys.current.version,
    issuedAtUnixSeconds: nowUnixSeconds,
    scope: spec.scope,
    direction: input.direction,
    fields,
  };
  const token = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const mac = createHmac("sha256", Buffer.from(keys.current.secret))
    .update(token, "ascii")
    .digest();
  return `${token}.${base64UrlEncode(new Uint8Array(mac))}`;
}

interface MatchedCandidate {
  key: PaginationCursorKey;
  kind: "current" | "previous" | "retired";
}

/**
 * Constant-time MAC verification across every bounded candidate secret.
 * Returns all matching candidates without interpreting any payload JSON.
 */
function verifyMac(
  token: string,
  macBytes: Buffer,
  keys: PaginationCursorKeyring
): MatchedCandidate[] {
  const matches: MatchedCandidate[] = [];
  for (const candidate of keyringCandidates(keys)) {
    const computed = createHmac("sha256", Buffer.from(candidate.key.secret))
      .update(token, "ascii")
      .digest();
    if (constantTimeEqual(computed, macBytes)) {
      matches.push({ key: candidate.key, kind: candidate.kind });
    }
  }
  return matches;
}

/**
 * Strict JSON validation that rejects duplicate object keys anywhere, then a
 * plain `JSON.parse`. A hand-written scanner is required because some engines
 * collapse duplicate keys before invoking a reviver.
 */
function strictJsonParse(text: string): unknown {
  assertNoDuplicateJsonKeys(text);
  return JSON.parse(text);
}

function assertNoDuplicateJsonKeys(text: string): void {
  let pos = 0;

  const skipWs = (): void => {
    while (pos < text.length) {
      const char = text[pos];
      if (char === " " || char === "\t" || char === "\n" || char === "\r") pos += 1;
      else break;
    }
  };

  const failSchema = (): never => fail(PAGINATION_CURSOR_ERROR_CODES.schema);

  const parseString = (): string => {
    pos += 1; // opening quote
    let out = "";
    while (pos < text.length) {
      const char = text[pos]!;
      if (char === '"') {
        pos += 1;
        return out;
      }
      if (char === "\\") {
        const next = text[pos + 1];
        pos += 2;
        switch (next) {
          case '"':
            out += '"';
            break;
          case "\\":
            out += "\\";
            break;
          case "/":
            out += "/";
            break;
          case "b":
            out += "\b";
            break;
          case "f":
            out += "\f";
            break;
          case "n":
            out += "\n";
            break;
          case "r":
            out += "\r";
            break;
          case "t":
            out += "\t";
            break;
          case "u": {
            const hex = text.slice(pos, pos + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) failSchema();
            out += String.fromCharCode(Number.parseInt(hex!, 16));
            pos += 4;
            break;
          }
          default:
            failSchema();
        }
        continue;
      }
      if (char.charCodeAt(0) < 0x20) failSchema();
      out += char;
      pos += 1;
    }
    return failSchema();
  };

  const parseValue = (): void => {
    skipWs();
    const char = text[pos];
    if (char === "{") {
      pos += 1;
      const seenKeys = new Set<string>();
      skipWs();
      if (text[pos] === "}") {
        pos += 1;
        return;
      }
      for (;;) {
        skipWs();
        if (text[pos] !== '"') failSchema();
        const key = parseString();
        if (seenKeys.has(key)) failSchema(); // duplicate object key
        seenKeys.add(key);
        skipWs();
        if (text[pos] !== ":") failSchema();
        pos += 1;
        parseValue();
        skipWs();
        const separator = text[pos];
        if (separator === ",") {
          pos += 1;
          continue;
        }
        if (separator === "}") {
          pos += 1;
          return;
        }
        failSchema();
      }
    }
    if (char === "[") {
      pos += 1;
      skipWs();
      if (text[pos] === "]") {
        pos += 1;
        return;
      }
      for (;;) {
        parseValue();
        skipWs();
        const separator = text[pos];
        if (separator === ",") {
          pos += 1;
          continue;
        }
        if (separator === "]") {
          pos += 1;
          return;
        }
        failSchema();
      }
    }
    if (char === '"') {
      parseString();
      return;
    }
    if (char === "-" || (char !== undefined && char >= "0" && char <= "9")) {
      const start = pos;
      pos += char === "-" ? 1 : 0;
      while (pos < text.length) {
        const digit = text[pos]!;
        if (
          (digit >= "0" && digit <= "9") ||
          digit === "." ||
          digit === "e" ||
          digit === "E" ||
          digit === "+" ||
          digit === "-"
        ) {
          pos += 1;
        } else break;
      }
      if (pos === start) failSchema();
      return;
    }
    if (text.startsWith("true", pos)) {
      pos += 4;
      return;
    }
    if (text.startsWith("false", pos)) {
      pos += 5;
      return;
    }
    if (text.startsWith("null", pos)) {
      pos += 4;
      return;
    }
    failSchema();
  };

  parseValue();
  skipWs();
  if (pos !== text.length) failSchema();
}

type DecodeOptions = Readonly<{ nowUnixSeconds?: number }>;

/**
 * Decodes and verifies one cursor token against the spec and keyring.
 * Verification order is fixed: bounded token/base64 decoding, HMAC over every
 * configured candidate without interpreting payload JSON, exactly-one match,
 * strict exact-wire-schema parse, embedded-version equality, retirement check,
 * constant-time scope equality, spec field-name/type/order/count equality,
 * then the code-owned 24-hour expiry window with 60-second future skew.
 */
export function decodeKeysetCursor(
  input: string,
  spec: KeysetSpec,
  keys: PaginationCursorKeyring,
  options: DecodeOptions = {}
): CursorPayload {
  if (typeof input !== "string" || Buffer.byteLength(input, "utf8") > MAX_ENCODED_CURSOR_BYTES) {
    fail(PAGINATION_CURSOR_ERROR_CODES.invalid);
  }
  const parts = input.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) fail(PAGINATION_CURSOR_ERROR_CODES.invalid);
  const token = parts[0]!;
  const macToken = parts[1]!;
  const payloadBytes = base64UrlDecode(token);
  const macBytes = base64UrlDecode(macToken);
  if (payloadBytes.length > MAX_CURSOR_PAYLOAD_BYTES) fail(PAGINATION_CURSOR_ERROR_CODES.invalid);
  const matches = verifyMac(token, macBytes, keys);
  if (matches.length !== 1) fail(PAGINATION_CURSOR_ERROR_CODES.invalid);
  const matched = matches[0]!;

  let parsed: unknown;
  try {
    parsed = strictJsonParse(payloadBytes.toString("utf8"));
  } catch {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  const record = parsed as Record<string, unknown>;
  // Exact serialization order and zero unknown keys.
  if (Object.keys(record).join(",") !== TOP_LEVEL_KEYS.join(",")) {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  if (record.formatVersion !== CURSOR_FORMAT_VERSION) fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  const keyVersion = record.keyVersion;
  if (
    typeof keyVersion !== "number" ||
    !Number.isSafeInteger(keyVersion) ||
    keyVersion < 1 ||
    keyVersion > MAX_KEY_VERSION
  ) {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  const issuedAtUnixSeconds = record.issuedAtUnixSeconds;
  if (
    typeof issuedAtUnixSeconds !== "number" ||
    !Number.isSafeInteger(issuedAtUnixSeconds) ||
    issuedAtUnixSeconds < 0
  ) {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  if (typeof record.scope !== "string") fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  if (record.direction !== "next" && record.direction !== "previous") {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  const fields = record.fields;
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > MAX_KEYSET_FIELDS) {
    fail(PAGINATION_CURSOR_ERROR_CODES.schema);
  }
  const validFieldTypes: readonly string[] = ["text", "uuid", "timestamp", "integer", "boolean"];
  const seenNames = new Set<string>();
  for (const field of fields) {
    if (typeof field !== "object" || field === null) fail(PAGINATION_CURSOR_ERROR_CODES.schema);
    const bounded = field as Record<string, unknown>;
    const fieldKeys = Object.keys(bounded).join(",");
    const name = bounded.name;
    const type = bounded.type;
    if (typeof name !== "string" || !FIELD_NAME_PATTERN.test(name)) {
      fail(PAGINATION_CURSOR_ERROR_CODES.schema);
    }
    if (seenNames.has(name)) fail(PAGINATION_CURSOR_ERROR_CODES.schema);
    seenNames.add(name);
    if (type === "null") {
      if (fieldKeys !== "name,type") fail(PAGINATION_CURSOR_ERROR_CODES.schema);
      continue;
    }
    if (fieldKeys !== "name,type,value") fail(PAGINATION_CURSOR_ERROR_CODES.schema);
    if (typeof type !== "string" || !validFieldTypes.includes(type)) {
      fail(PAGINATION_CURSOR_ERROR_CODES.schema);
    }
    if (!validateScalarValue(type as CursorFieldType, bounded.value)) {
      fail(PAGINATION_CURSOR_ERROR_CODES.value);
    }
  }

  // Embedded version must equal the matched key's declared version.
  if (matched.key.version !== keyVersion) fail(PAGINATION_CURSOR_ERROR_CODES.versionUnsupported);
  if (matched.kind === "retired") fail(PAGINATION_CURSOR_ERROR_CODES.keyRetired);

  // Constant-time scope equality over canonical UTF-8 bytes after the MAC.
  if (!constantTimeEqual(encoder.encode(spec.scope), encoder.encode(record.scope))) {
    fail(PAGINATION_CURSOR_ERROR_CODES.scopeMismatch);
  }

  // Exact field count/name/non-null-type equality with the spec.
  if (fields.length !== spec.fields.length) fail(PAGINATION_CURSOR_ERROR_CODES.specMismatch);
  for (let i = 0; i < spec.fields.length; i += 1) {
    const specField = spec.fields[i]!;
    const payloadField = fields[i] as Record<string, unknown>;
    if (payloadField.name !== specField.name) fail(PAGINATION_CURSOR_ERROR_CODES.specMismatch);
    if (payloadField.type === "null") {
      if (!specField.nullable) fail(PAGINATION_CURSOR_ERROR_CODES.specMismatch);
      continue;
    }
    if (payloadField.type !== specField.type) fail(PAGINATION_CURSOR_ERROR_CODES.specMismatch);
  }

  // Code-owned expiry window with bounded future skew.
  const nowUnixSeconds = options.nowUnixSeconds ?? Math.floor(Date.now() / 1000);
  if (nowUnixSeconds + CURSOR_MAX_CLOCK_SKEW_SECONDS < issuedAtUnixSeconds) {
    fail(PAGINATION_CURSOR_ERROR_CODES.invalid); // future issue time beyond skew
  }
  if (nowUnixSeconds - issuedAtUnixSeconds > CURSOR_TTL_SECONDS) {
    fail(PAGINATION_CURSOR_ERROR_CODES.expired);
  }

  return Object.freeze({
    formatVersion: CURSOR_FORMAT_VERSION,
    keyVersion,
    issuedAtUnixSeconds,
    scope: record.scope,
    direction: record.direction,
    fields: Object.freeze(
      fields.map((field) => Object.freeze({ ...(field as object) }))
    ) as readonly CursorField[],
  });
}

/** Coarse terminal classification; never exposes a version or parse detail. */
export function classifyPaginationCursorFailure(error: unknown): "expired_or_retired" | "invalid" {
  if (error instanceof PaginationCursorError) {
    if (
      error.code === PAGINATION_CURSOR_ERROR_CODES.expired ||
      error.code === PAGINATION_CURSOR_ERROR_CODES.keyRetired
    ) {
      return "expired_or_retired";
    }
  }
  return "invalid";
}
