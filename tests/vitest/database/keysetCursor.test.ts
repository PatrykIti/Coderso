/**
 * TASK-551-03-L01 vitest lane: opaque keyset cursor wire contract.
 *
 * Pure-lane coverage: scalar round trips, tamper/truncation fail-closed,
 * alternate encodings, duplicate JSON keys/field names, unknown properties,
 * spec mismatch, scope mismatch, version unsupported, retired keys, expiry
 * window, verification-order evidence, and keyring loader rejection matrix.
 */

import { createHmac } from "node:crypto";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  CURSOR_TTL_SECONDS,
  MAX_KEY_VERSION,
  PAGINATION_CURSOR_ERROR_CODES,
  PaginationCursorError,
  decodeKeysetCursor,
  encodeKeysetCursor,
  classifyPaginationCursorFailure,
  loadPaginationCursorKeyring,
  normalizeKeysetSpec,
  type PaginationCursorKeyring,
  type CursorPayload,
} from "../../../core/services/database/keysetCursor";

const SECRET_A = "a".repeat(48);
const SECRET_B = "b".repeat(48);
const SECRET_C = "c".repeat(48);

function keyringFromEnv(env: Record<string, string>): PaginationCursorKeyring {
  return loadPaginationCursorKeyring(env as unknown as NodeJS.ProcessEnv);
}

function baseKeyring(): PaginationCursorKeyring {
  return keyringFromEnv({ PAGINATION_CURSOR_SECRET: SECRET_A });
}

function rotatedKeyring(): PaginationCursorKeyring {
  return keyringFromEnv({
    PAGINATION_CURSOR_SECRET: SECRET_B,
    PAGINATION_CURSOR_KEY_VERSION: "2",
    PAGINATION_CURSOR_PREVIOUS_SECRET: SECRET_A,
    PAGINATION_CURSOR_PREVIOUS_KEY_VERSION: "1",
  });
}

const SCOPE = "admin_pages";

/** Two-field spec: nullable text sort plus the mandatory id tie-breaker. */
const SPEC = normalizeKeysetSpec({
  scope: SCOPE,
  fields: [
    { name: "title", type: "text", column: "title", order: "asc", nulls: "last", nullable: true },
    { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
  ],
});

const UUID = "0f1ae2b3-4c5d-6e7f-8a9b-0c1d2e3f4a5b";
const NOW = 1_700_000_000;

function encode(values: (string | boolean | null)[], keys = baseKeyring()): string {
  return encodeKeysetCursor(
    { scope: SCOPE, direction: "next", values, nowUnixSeconds: NOW },
    SPEC,
    keys
  );
}

function decodeOk(cursor: string, nowUnixSeconds = NOW): CursorPayload {
  return decodeKeysetCursor(cursor, SPEC, baseKeyring(), { nowUnixSeconds });
}

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
  return "<no-error>";
}

/** Signs an arbitrary raw payload with a chosen secret for adversarial cases. */
function signRaw(payloadJson: string, secret: string): string {
  const token = Buffer.from(payloadJson, "utf8").toString("base64url");
  const mac = createHmac("sha256", Buffer.from(secret)).update(token, "ascii").digest();
  return `${token}.${mac.toString("base64url")}`;
}

describe("keyset cursor round trips", () => {
  it("round trips every scalar wire type byte-deterministically", () => {
    const spec = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        { name: "t", type: "text", column: "t", order: "desc", nulls: "first", nullable: false },
        { name: "u", type: "uuid", column: "u", order: "asc", nulls: "last", nullable: false },
        {
          name: "ts",
          type: "timestamp",
          column: "ts",
          order: "desc",
          nulls: "last",
          nullable: false,
        },
        { name: "n", type: "integer", column: "n", order: "asc", nulls: "last", nullable: false },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const values = ["héllo wörld", UUID, "2024-03-04T05:06:07.089Z", "-9007199254740993", UUID];
    const cursor = encodeKeysetCursor(
      { scope: SCOPE, direction: "next", values, nowUnixSeconds: NOW },
      spec,
      baseKeyring()
    );
    expect(
      encodeKeysetCursor(
        { scope: SCOPE, direction: "next", values, nowUnixSeconds: NOW },
        spec,
        baseKeyring()
      )
    ).toBe(cursor);
    const payload = decodeKeysetCursor(cursor, spec, baseKeyring(), { nowUnixSeconds: NOW });
    expect(payload.direction).toBe("next");
    expect(payload.fields.map((f) => ("value" in f ? f.value : null))).toEqual(values);
  });

  it("round trips booleans and nulls against a nullable field", () => {
    for (const value of ["x", null]) {
      const cursor = encode([value, UUID]);
      const payload = decodeOk(cursor);
      expect(payload.fields[0]).toMatchObject(
        value === null ? { name: "title", type: "null" } : { name: "title", type: "text", value }
      );
    }
    const boolSpec = normalizeKeysetSpec({
      scope: "flags",
      fields: [
        {
          name: "flag",
          type: "boolean",
          column: "flag",
          order: "desc",
          nulls: "last",
          nullable: false,
        },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const cursor = encodeKeysetCursor(
      { scope: "flags", direction: "previous", values: [true, UUID], nowUnixSeconds: NOW },
      boolSpec,
      baseKeyring()
    );
    const payload = decodeKeysetCursor(cursor, boolSpec, baseKeyring(), { nowUnixSeconds: NOW });
    expect(payload.direction).toBe("previous");
    expect(payload.fields[0]).toMatchObject({ type: "boolean", value: true });
  });

  it("supports one-field and five-field boundaries", () => {
    const single = normalizeKeysetSpec({
      scope: "one",
      fields: [
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const cursor = encodeKeysetCursor(
      { scope: "one", direction: "next", values: [UUID], nowUnixSeconds: NOW },
      single,
      baseKeyring()
    );
    expect(
      decodeKeysetCursor(cursor, single, baseKeyring(), { nowUnixSeconds: NOW }).fields
    ).toHaveLength(1);
    const five = normalizeKeysetSpec({
      scope: "five",
      fields: [
        { name: "a", type: "integer", column: "a", order: "asc", nulls: "last", nullable: false },
        { name: "b", type: "integer", column: "b", order: "asc", nulls: "last", nullable: false },
        { name: "c", type: "integer", column: "c", order: "asc", nulls: "last", nullable: false },
        { name: "d", type: "integer", column: "d", order: "asc", nulls: "last", nullable: false },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const values = ["1", "-2", "0", "9223372036854775807", UUID];
    const cursorFive = encodeKeysetCursor(
      { scope: "five", direction: "next", values, nowUnixSeconds: NOW },
      five,
      baseKeyring()
    );
    expect(
      decodeKeysetCursor(cursorFive, five, baseKeyring(), { nowUnixSeconds: NOW }).fields
    ).toHaveLength(5);
  });

  it("pins exact exported names and types", () => {
    expect(typeof loadPaginationCursorKeyring).toBe("function");
    expect(typeof classifyPaginationCursorFailure).toBe("function");
    expect(classifyPaginationCursorFailure(new Error("cursor_expired"))).toBe("invalid");
    const payload: CursorPayload = {
      formatVersion: 1,
      keyVersion: 1,
      issuedAtUnixSeconds: 0,
      scope: SCOPE,
      direction: "next",
      fields: [],
    };
    expectTypeOf(payload.formatVersion).toEqualTypeOf<1>();
    expect(MAX_KEY_VERSION).toBe(2_147_483_647);
  });
});

describe("tamper, truncation, and alternate encodings fail closed", () => {
  const valid = encode(["ok", UUID]);

  it("rejects mutation, truncation, junk suffixes, extra segments, padding", () => {
    const mutations = [
      valid.slice(0, -2),
      `${valid}x`,
      `x${valid.slice(1)}`,
      `${valid.slice(0, valid.length - 1)}A`,
      `${valid}.${valid}`,
      `${valid}=`,
      valid.replace(".", "/"),
      valid.replace(".", "+"),
      "",
      ".",
      "..",
    ];
    for (const candidate of mutations) {
      expect(codeOf(() => decodeOk(candidate))).toBe(PAGINATION_CURSOR_ERROR_CODES.invalid);
    }
  });

  it("rejects oversized input without parsing", () => {
    expect(codeOf(() => decodeOk("a".repeat(4_096)))).toBe(PAGINATION_CURSOR_ERROR_CODES.invalid);
  });

  it("rejects wrong secrets and multi-match configurations generically", () => {
    const otherKeys = keyringFromEnv({ PAGINATION_CURSOR_SECRET: SECRET_C });
    expect(codeOf(() => decodeKeysetCursor(valid, SPEC, otherKeys, { nowUnixSeconds: NOW }))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.invalid
    );
    // Same secret configured twice must never select an attacker-provided key.
    const duplicated: PaginationCursorKeyring = {
      current: { version: 3, secret: Buffer.from(SECRET_A) },
      retired: [{ version: 2, secret: Buffer.from(SECRET_A) }],
    };
    expect(codeOf(() => decodeKeysetCursor(valid, SPEC, duplicated, { nowUnixSeconds: NOW }))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.invalid
    );
  });

  it("rejects alternate date, uuid, integer, and text wire forms", () => {
    const tsSpec = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        {
          name: "ts",
          type: "timestamp",
          column: "ts",
          order: "asc",
          nulls: "last",
          nullable: false,
        },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const badTimestamps = [
      "2024-03-04T05:06:07Z",
      "2024-03-04T05:06:07.089+01:00",
      "2024-13-04T05:06:07.089Z",
      "not-a-date",
      "2024-03-04T05:06:07.0899Z",
    ];
    for (const bad of badTimestamps) {
      expect(
        codeOf(() =>
          encodeKeysetCursor(
            { scope: SCOPE, direction: "next", values: [bad, UUID], nowUnixSeconds: NOW },
            tsSpec,
            baseKeyring()
          )
        )
      ).toBe(PAGINATION_CURSOR_ERROR_CODES.value);
    }
    const integerSpec = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        {
          name: "score",
          type: "integer",
          column: "score",
          order: "asc",
          nulls: "last",
          nullable: false,
        },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const badIntegers = ["01", "+1", "1e3", " 1", "1 ", "9223372036854775808"];
    for (const bad of badIntegers) {
      expect(
        codeOf(() =>
          encodeKeysetCursor(
            { scope: SCOPE, direction: "next", values: [bad, UUID], nowUnixSeconds: NOW },
            integerSpec,
            baseKeyring()
          )
        )
      ).toBe(PAGINATION_CURSOR_ERROR_CODES.value);
    }
    const badUuids = [UUID.toUpperCase(), UUID.slice(1), "00000000-0000-0000-0000-00000000000g"];
    for (const bad of badUuids) {
      expect(codeOf(() => encode([bad, bad]))).toBe(PAGINATION_CURSOR_ERROR_CODES.value);
    }
    const badTexts = ["e\u0301clair", "a\u0000b", "tab\tchar"];
    for (const bad of badTexts) {
      expect(codeOf(() => encode([bad, UUID]))).toBe(PAGINATION_CURSOR_ERROR_CODES.value);
    }
  });

  it("fails closed on duplicate JSON keys, unknown keys, duplicate field names", () => {
    const goodPayload =
      '{"formatVersion":1,"keyVersion":1,"issuedAtUnixSeconds":1700000000,"scope":"admin_pages","direction":"next","fields":[{"name":"title","type":"text","value":"ok"},{"name":"id","type":"uuid","value":"' +
      UUID +
      '"}]}';
    expect(decodeOk(signRaw(goodPayload, SECRET_A)).fields).toHaveLength(2);

    const dupTop = goodPayload.replace(
      '"direction":"next",',
      '"direction":"next","direction":"next",'
    );
    expect(codeOf(() => decodeOk(signRaw(dupTop, SECRET_A)))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.schema
    );

    const dupFieldKey = goodPayload.replace('"type":"text",', '"type":"text","type":"text",');
    expect(codeOf(() => decodeOk(signRaw(dupFieldKey, SECRET_A)))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.schema
    );

    const unknownTop = goodPayload.replace(',"fields":', ',"extra":1,"fields":');
    expect(codeOf(() => decodeOk(signRaw(unknownTop, SECRET_A)))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.schema
    );

    const dupNames = goodPayload.replace('"name":"id"', '"name":"title"');
    expect(codeOf(() => decodeOk(signRaw(dupNames, SECRET_A)))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.schema
    );

    const malformedBody = '{"formatVersion":1,';
    expect(codeOf(() => decodeOk(signRaw(malformedBody, SECRET_A)))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.schema
    );
  });
});

describe("spec, scope, version, retirement, and expiry semantics", () => {
  it("rejects spec mismatches without disclosure", () => {
    const cursor = encode(["ok", UUID]);
    const otherCount = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    const otherName = normalizeKeysetSpec({
      scope: SCOPE,
      fields: [
        { name: "heading", type: "text", column: "h", order: "asc", nulls: "last", nullable: true },
        { name: "id", type: "uuid", column: "id", order: "asc", nulls: "last", nullable: false },
      ],
    });
    expect(
      codeOf(() => decodeKeysetCursor(cursor, otherCount, baseKeyring(), { nowUnixSeconds: NOW }))
    ).toBe(PAGINATION_CURSOR_ERROR_CODES.specMismatch);
    expect(
      codeOf(() => decodeKeysetCursor(cursor, otherName, baseKeyring(), { nowUnixSeconds: NOW }))
    ).toBe(PAGINATION_CURSOR_ERROR_CODES.specMismatch);
  });

  it("rejects scope mismatch after a successful MAC", () => {
    const cursor = encode(["ok", UUID]);
    const otherScope = normalizeKeysetSpec({
      scope: "admin_posts",
      fields: SPEC.fields as unknown as readonly [
        {
          name: string;
          type: "text";
          column: string;
          order: "asc";
          nulls: "last";
          nullable: boolean;
        },
        {
          name: string;
          type: "uuid";
          column: string;
          order: "asc";
          nulls: "last";
          nullable: boolean;
        },
      ],
    });
    expect(
      codeOf(() => decodeKeysetCursor(cursor, otherScope, baseKeyring(), { nowUnixSeconds: NOW }))
    ).toBe(PAGINATION_CURSOR_ERROR_CODES.scopeMismatch);
  });

  it("classifies previous-key cursors valid during overlap but rejects embedded-version lies", () => {
    const keys = rotatedKeyring();
    const cursor = encodeKeysetCursor(
      { scope: SCOPE, direction: "next", values: ["legacy", UUID], nowUnixSeconds: NOW },
      SPEC,
      keys
    );
    // Signed by current v2 -> valid.
    expect(decodeKeysetCursor(cursor, SPEC, keys, { nowUnixSeconds: NOW }).keyVersion).toBe(2);
    // A cursor signed by the previous v1 key remains valid during rotation overlap.
    const legacyPayload = JSON.stringify({
      formatVersion: 1,
      keyVersion: 1,
      issuedAtUnixSeconds: NOW,
      scope: SCOPE,
      direction: "next",
      fields: [
        { name: "title", type: "text", value: "legacy" },
        { name: "id", type: "uuid", value: UUID },
      ],
    });
    const legacyCursor = signRaw(legacyPayload, SECRET_A);
    expect(decodeKeysetCursor(legacyCursor, SPEC, keys, { nowUnixSeconds: NOW }).keyVersion).toBe(
      1
    );

    // Signed by a retired secret but claiming the CURRENT version:
    // embedded-version equality fails before any retirement classification.
    const keysWithRetired = keyringFromEnv({
      PAGINATION_CURSOR_SECRET: SECRET_C,
      PAGINATION_CURSOR_KEY_VERSION: "3",
      PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([{ version: 2, secret: SECRET_A }]),
    });
    const retiredPayloadBase = legacyPayload.replace('"keyVersion":1', '"keyVersion":2');
    const lie = signRaw(retiredPayloadBase.replace('"keyVersion":2', '"keyVersion":3'), SECRET_A);
    expect(
      codeOf(() => decodeKeysetCursor(lie, SPEC, keysWithRetired, { nowUnixSeconds: NOW }))
    ).toBe(PAGINATION_CURSOR_ERROR_CODES.versionUnsupported);

    // A correctly self-described retired cursor is terminal retired.
    const honestRetired = signRaw(retiredPayloadBase, SECRET_A);
    expect(
      codeOf(() =>
        decodeKeysetCursor(honestRetired, SPEC, keysWithRetired, { nowUnixSeconds: NOW })
      )
    ).toBe(PAGINATION_CURSOR_ERROR_CODES.keyRetired);
    expect(
      classifyPaginationCursorFailure(
        new PaginationCursorError(PAGINATION_CURSOR_ERROR_CODES.keyRetired)
      )
    ).toBe("expired_or_retired");
  });

  it("MACs every configured candidate before any payload JSON or keyVersion access", () => {
    const fullKeyring = keyringFromEnv({
      PAGINATION_CURSOR_SECRET: SECRET_C,
      PAGINATION_CURSOR_KEY_VERSION: "3",
      PAGINATION_CURSOR_PREVIOUS_SECRET: SECRET_B,
      PAGINATION_CURSOR_PREVIOUS_KEY_VERSION: "2",
      PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([{ version: 1, secret: SECRET_A }]),
    });
    const secretLabels = new Map<string, string>([
      [Buffer.from(SECRET_A).toString("hex"), "secret-A"],
      [Buffer.from(SECRET_B).toString("hex"), "secret-B"],
      [Buffer.from(SECRET_C).toString("hex"), "secret-C"],
    ]);
    const forged = signRaw(
      JSON.stringify({
        formatVersion: 1,
        keyVersion: 3,
        issuedAtUnixSeconds: NOW,
        scope: SCOPE,
        direction: "next",
        fields: [
          { name: "title", type: "text", value: "forged" },
          { name: "id", type: "uuid", value: UUID },
        ],
      }),
      SECRET_A
    );

    /**
     * Records the real call order of candidate key materialization (Buffer.from
     * over a keyring secret), payload JSON.parse, and keyVersion reads, then
     * restores both globals.
     */
    const probe = (cursor: string, keys: PaginationCursorKeyring) => {
      const events: string[] = [];
      const originalFrom = Buffer.from;
      const originalParse = JSON.parse;
      Buffer.from = ((value: string | Uint8Array | ArrayBuffer, ...rest: unknown[]) => {
        if (value instanceof Uint8Array) {
          const label = secretLabels.get(originalFrom(value).toString("hex"));
          if (label !== undefined) events.push(`mac:${label}`);
        }
        return (
          originalFrom as unknown as (
            v: string | Uint8Array | ArrayBuffer,
            ...r: unknown[]
          ) => Buffer
        )(value, ...rest);
      }) as unknown as typeof Buffer.from;
      JSON.parse = ((text: string, reviver?: unknown) => {
        events.push("json-parse");
        const parsed = (originalParse as unknown as (t: string, r?: unknown) => unknown)(
          text,
          reviver
        );
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return parsed;
        return new Proxy(parsed as Record<string, unknown>, {
          get(target, property: string) {
            if (property === "keyVersion") events.push("keyVersion-read");
            return target[property];
          },
        });
      }) as unknown as typeof JSON.parse;
      try {
        return {
          code: codeOf(() => decodeKeysetCursor(cursor, SPEC, keys, { nowUnixSeconds: NOW })),
          events,
        };
      } finally {
        Buffer.from = originalFrom;
        JSON.parse = originalParse;
      }
    };

    // Fixed current -> previous -> retired candidate order, no payload access
    // before the third comparison finishes.
    const honest = probe(
      encodeKeysetCursor(
        { scope: SCOPE, direction: "next", values: ["ok", UUID], nowUnixSeconds: NOW },
        SPEC,
        fullKeyring
      ),
      fullKeyring
    );
    expect(honest.code).toBe("<no-error>");
    expect(honest.events).toEqual([
      "mac:secret-C",
      "mac:secret-B",
      "mac:secret-A",
      "json-parse",
      "keyVersion-read",
    ]);

    // Signed with the retired secret while claiming the current version: the
    // match stays bound to secret-A and the embedded lie never selects a key.
    const forgedRun = probe(forged, fullKeyring);
    expect(forgedRun.code).toBe(PAGINATION_CURSOR_ERROR_CODES.versionUnsupported);
    expect(forgedRun.events).toEqual([
      "mac:secret-C",
      "mac:secret-B",
      "mac:secret-A",
      "json-parse",
      "keyVersion-read",
    ]);
    // Without secret-A in the keyring the same cursor is generic invalid, so
    // the version_unsupported above came from the keyring, not the payload.
    const withoutAttackerKey = keyringFromEnv({
      PAGINATION_CURSOR_SECRET: SECRET_C,
      PAGINATION_CURSOR_KEY_VERSION: "3",
      PAGINATION_CURSOR_PREVIOUS_SECRET: SECRET_B,
      PAGINATION_CURSOR_PREVIOUS_KEY_VERSION: "2",
    });
    const unmatched = probe(forged, withoutAttackerKey);
    expect(unmatched.code).toBe(PAGINATION_CURSOR_ERROR_CODES.invalid);
    expect(unmatched.events).toEqual(["mac:secret-C", "mac:secret-B"]);

    // Duplicate secret across candidates: both bounded MACs run and the
    // multi-match ring fails closed before any payload interpretation.
    const duplicated: PaginationCursorKeyring = {
      current: { version: 3, secret: Buffer.from(SECRET_A) },
      retired: [{ version: 2, secret: Buffer.from(SECRET_A) }],
    };
    const duplicateRun = probe(encode(["ok", UUID]), duplicated);
    expect(duplicateRun.code).toBe(PAGINATION_CURSOR_ERROR_CODES.invalid);
    expect(duplicateRun.events).toEqual(["mac:secret-A", "mac:secret-A"]);
  });

  it("enforces the fixed 24-hour expiry with bounded future skew", () => {
    const cursor = encode(["ok", UUID]);
    expect(() => decodeOk(cursor, NOW + CURSOR_TTL_SECONDS)).not.toThrow();
    expect(codeOf(() => decodeOk(cursor, NOW + CURSOR_TTL_SECONDS + 1))).toBe(
      PAGINATION_CURSOR_ERROR_CODES.expired
    );
    expect(
      classifyPaginationCursorFailure(
        new PaginationCursorError(PAGINATION_CURSOR_ERROR_CODES.expired)
      )
    ).toBe("expired_or_retired");
    const future = encodeKeysetCursor(
      { scope: SCOPE, direction: "next", values: ["ok", UUID], nowUnixSeconds: NOW + 61 },
      SPEC,
      baseKeyring()
    );
    expect(codeOf(() => decodeOk(future, NOW))).toBe(PAGINATION_CURSOR_ERROR_CODES.invalid);
    expect(() => decodeOk(future, NOW + 61)).not.toThrow(); // within skew
  });
});

describe("loadPaginationCursorKeyring fails closed", () => {
  const ok = { PAGINATION_CURSOR_SECRET: SECRET_A };

  it("accepts defaults and full rotation configuration", () => {
    const ring = keyringFromEnv(ok);
    expect(ring.current.version).toBe(1);
    expect(ring.previous).toBeUndefined();
    expect(ring.retired).toEqual([]);
    const full = rotatedKeyring();
    expect(full.current.version).toBe(2);
    expect(full.previous?.version).toBe(1);
    expect(Object.isFrozen(full)).toBe(true);
  });

  const rejections: [string, Record<string, string>][] = [
    ["missing secret", {}],
    ["short secret", { PAGINATION_CURSOR_SECRET: "short" }],
    ["partial previous pair", { ...ok, PAGINATION_CURSOR_PREVIOUS_SECRET: SECRET_B }],
    ["partial previous version", { ...ok, PAGINATION_CURSOR_PREVIOUS_KEY_VERSION: "1" }],
    [
      "non-monotonic previous",
      {
        PAGINATION_CURSOR_SECRET: SECRET_A,
        PAGINATION_CURSOR_PREVIOUS_SECRET: SECRET_B,
        PAGINATION_CURSOR_PREVIOUS_KEY_VERSION: "5",
      },
    ],
    ["zero key version", { ...ok, PAGINATION_CURSOR_KEY_VERSION: "0" }],
    ["leading-zero version", { ...ok, PAGINATION_CURSOR_KEY_VERSION: "01" }],
    ["overflow version", { ...ok, PAGINATION_CURSOR_KEY_VERSION: "2147483648" }],
    ["malformed retired json", { ...ok, PAGINATION_CURSOR_RETIRED_KEYS: "{" }],
    [
      "17 retired members",
      {
        ...ok,
        PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify(
          Array.from({ length: 17 }, (_, i) => ({ version: i + 10, secret: SECRET_B }))
        ),
      },
    ],
    [
      "duplicate retired versions",
      {
        ...ok,
        PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([
          { version: 1, secret: SECRET_B },
          { version: 1, secret: SECRET_C },
        ]),
      },
    ],
    [
      "retired equals current",
      { ...ok, PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([{ version: 1, secret: SECRET_B }]) },
    ],
    [
      "retired equals previous",
      {
        ...rotatedKeyringInput(),
        PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([{ version: 1, secret: SECRET_C }]),
      },
    ],
    [
      "future retired version",
      {
        ...ok,
        PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([{ version: 99, secret: SECRET_B }]),
      },
    ],
    [
      "weak retired secret",
      { ...ok, PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([{ version: 1, secret: "weak" }]) },
    ],
    [
      "unknown entry keys",
      {
        ...ok,
        PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([
          { version: 1, secret: SECRET_B, note: "x" },
        ]),
      },
    ],
  ];
  function rotatedKeyringInput(): Record<string, string> {
    return {
      PAGINATION_CURSOR_SECRET: SECRET_B,
      PAGINATION_CURSOR_KEY_VERSION: "2",
      PAGINATION_CURSOR_PREVIOUS_SECRET: SECRET_A,
      PAGINATION_CURSOR_PREVIOUS_KEY_VERSION: "1",
    };
  }
  for (const [label, env] of rejections) {
    it(`rejects ${label}`, () => {
      expect(() => keyringFromEnv(env)).toThrowError(PAGINATION_CURSOR_ERROR_CODES.configInvalid);
    });
  }

  it("sorts retired keys ascending and dedupes nothing silently", () => {
    const ring = keyringFromEnv({
      ...ok,
      PAGINATION_CURSOR_KEY_VERSION: "10",
      PAGINATION_CURSOR_RETIRED_KEYS: JSON.stringify([
        { version: 7, secret: SECRET_C },
        { version: 3, secret: SECRET_B },
      ]),
    });
    expect(ring.retired.map((k) => k.version)).toEqual([3, 7]);
  });

  it("rejects invalid spec shapes", () => {
    const fields = [
      {
        name: "id",
        type: "uuid" as const,
        column: "id",
        order: "asc" as const,
        nulls: "last" as const,
        nullable: false,
      },
    ];
    expect(() => normalizeKeysetSpec({ scope: "", fields })).toThrowError();
    expect(() => normalizeKeysetSpec({ scope: "s", fields: [] })).toThrowError();
    expect(() =>
      normalizeKeysetSpec({
        scope: "s",
        fields: [
          { name: "a", type: "integer", column: "a", order: "asc", nulls: "last", nullable: false },
          { name: "a", type: "integer", column: "b", order: "asc", nulls: "last", nullable: false },
          ...Array.from({ length: 3 }, (_, i) => ({
            name: `f${i}`,
            type: "integer" as const,
            column: `c${i}`,
            order: "asc" as const,
            nulls: "last" as const,
            nullable: false,
          })),
          { name: "z", type: "integer", column: "z", order: "asc", nulls: "last", nullable: false },
        ],
      })
    ).toThrowError();
    expect(() =>
      normalizeKeysetSpec({ scope: "s", fields: [{ ...fields[0]!, nullable: true }] })
    ).toThrowError();
  });
});
