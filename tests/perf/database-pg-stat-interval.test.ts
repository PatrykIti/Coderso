import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_OPERATOR_EVIDENCE_PATH,
  INTERVAL_NAME_PURPOSES,
  MAX_INTERVAL_ROWS,
  MAX_SNAPSHOT_BYTES,
  PG_STAT_INTERVAL_ERROR_CODES,
  STATEMENT_TIMEOUT_MS,
  TRAFFIC_SOURCE_CLASSES,
  buildIntervalReceipt,
  canonicalJson,
  decodeOperatorEvidence,
  decodeSnapshot,
  expectedReceiptPath,
  expectedStartPath,
  normalizeStatementForDigest,
  parseIntervalArgs,
  sha256Hex,
  validateCliSpec,
  writeBounded0600,
} from "../../scripts/task-551-pg-stat-interval";
import { TASK551_QUERY_FINGERPRINT_DEFINITIONS } from "../../core/db/queryFingerprintRegistry";

const identity = {
  serverIdentitySha256: sha256Hex("170000"),
  databaseIdentitySha256: sha256Hex("12345"),
  postgresMajor: 17,
  extensionVersion: "1.10",
  statsReset: "2026-08-20T00:00:00.000Z",
};

const evidence = {
  diagnosticsEndedAt: "2026-08-25T00:00:00.000Z",
  classifications: [
    {
      queryId: "-100",
      sourceClass: "external_diagnostic",
      classificationEvidenceId: "ev-diag-1",
      purpose: "pre-decision",
      recordedAt: "2026-08-25T01:00:00.000Z",
    },
  ],
};

function snapshot(
  boundary: "start" | "end",
  capturedAt: string,
  counters: readonly {
    queryId: string;
    calls: number;
    rows: number;
    totalPlanMs: number;
    totalExecMs: number;
    normalizedQuerySha256?: string;
  }[]
): string {
  return canonicalJson({
    version: 1,
    boundary,
    name: "task551-predecision-clean",
    purpose: "pre-decision",
    capturedAt,
    identity,
    counters,
  });
}

describe("task551 pg-stat interval collector", () => {
  test("pins the closed name/purpose matrix and exact output paths", () => {
    expect(Object.keys(INTERVAL_NAME_PURPOSES).sort()).toEqual([
      "task551-index-after",
      "task551-index-before",
      "task551-predecision-clean",
    ]);
    expect(expectedStartPath("task551-index-before")).toBe(
      ".tmp/task551-pg-stat-task551-index-before-start.json"
    );
    expect(expectedReceiptPath("task551-index-after")).toBe(
      ".tmp/task551-pg-stat-task551-index-after.json"
    );
    expect(EXPECTED_OPERATOR_EVIDENCE_PATH).toBe(".tmp/task551-pg-stat-operator-evidence.json");
    expect(MAX_INTERVAL_ROWS).toBe(10_000);
    expect(MAX_SNAPSHOT_BYTES).toBe(4 * 1024 * 1024);
    expect(STATEMENT_TIMEOUT_MS).toBe(5_000);
  });

  test("parses only the exact contract flag surface", () => {
    const spec = parseIntervalArgs([
      "start",
      "--name",
      "task551-predecision-clean",
      "--purpose",
      "pre-decision",
      "--snapshot",
      expectedStartPath("task551-predecision-clean"),
      "--operator-evidence",
      EXPECTED_OPERATOR_EVIDENCE_PATH,
    ]);
    expect(spec.command).toBe("start");
    validateCliSpec(spec);

    // Arbitrary output roots and unknown flags fail closed.
    expect(() =>
      validateCliSpec({
        command: "start",
        flags: {
          "--name": "task551-predecision-clean",
          "--purpose": "pre-decision",
          "--snapshot": "/etc/evil.json",
        },
      })
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.outputPathInvalid);
    expect(() => parseIntervalArgs(["start", "--wat", "x"])).toThrowError(
      PG_STAT_INTERVAL_ERROR_CODES.unknownFlag
    );
    expect(() =>
      validateCliSpec({
        command: "end",
        flags: {
          "--name": "task551-predecision-clean",
          "--purpose": "before",
        },
      })
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.namePurposeMismatch);
  });

  test("computes non-negative deltas, totals, eligibility, and exclusions", () => {
    const start = JSON.parse(
      snapshot("start", "2026-08-26T08:00:00.000Z", [
        { queryId: "100", calls: 5, rows: 10, totalPlanMs: 3, totalExecMs: 7 },
        { queryId: "-100", calls: 2, rows: 0, totalPlanMs: 1, totalExecMs: 2 },
      ])
    );
    const end = JSON.parse(
      snapshot("end", "2026-08-26T09:00:00.000Z", [
        { queryId: "100", calls: 8, rows: 12, totalPlanMs: 4.5, totalExecMs: 9 },
        {
          queryId: "-100",
          calls: 4,
          rows: 0,
          totalPlanMs: 1.5,
          totalExecMs: 3,
        },
      ])
    );
    // The collector's declared receipt type is the truth, so the assertions
    // below read it without a hand-written local shape.
    const receipt = buildIntervalReceipt({
      start,
      end,
      evidence: decodeOperatorEvidence(JSON.stringify(evidence)),
    });
    expect(receipt.deltas).toHaveLength(2);
    expect(receipt.deltas[0]).toMatchObject({ callsDelta: 3, rowsDelta: 2 });
    // Only the explicit operator evidence may mark external_diagnostic.
    expect(receipt.eligibleApplicationQueryIds).toEqual([]);
    expect([...receipt.excludedQueryIds].sort()).toEqual(["-100", "100"]);
    expect(receipt.cleanAfterDiagnostics).toBe(true);
    expect(receipt.sourceClassTotals.external_diagnostic.calls).toBe(2);
  });

  test("fails closed on identity change, counter regression, and stale intervals", () => {
    const start = JSON.parse(
      snapshot("start", "2026-08-26T08:00:00.000Z", [
        { queryId: "7", calls: 5, rows: 1, totalPlanMs: 1, totalExecMs: 1 },
      ])
    );
    const goodEnd = JSON.parse(snapshot("end", "2026-08-26T09:00:00.000Z", []));
    const decodedEvidence = decodeOperatorEvidence(JSON.stringify(evidence));

    // Counter decrease fails `pg_stat_interval_counter_regression`: the
    // implemented bounded code set of the 2026-09-03 contract correction, not
    // the original single `pg_stat_interval_invalid` wording.
    const regressed = JSON.parse(
      snapshot("end", "2026-08-26T09:00:00.000Z", [
        { queryId: "7", calls: 4, rows: 1, totalPlanMs: 1, totalExecMs: 1 },
      ])
    );
    expect(() =>
      buildIntervalReceipt({ start, end: regressed, evidence: decodedEvidence })
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.counterRegression);

    // A reset/restart (changed identity) fails closed.
    const changedIdentity = JSON.parse(
      canonicalJson({
        ...goodEnd,
        identity: { ...identity, statsReset: "2026-08-27T00:00:00.000Z" },
      })
    );
    expect(() =>
      buildIntervalReceipt({
        start,
        end: changedIdentity,
        evidence: decodedEvidence,
      })
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.identityChanged);

    // Start must be strictly after diagnosticsEndedAt (fresh clean interval).
    const staleStart = JSON.parse(snapshot("start", "2026-08-24T00:00:00.000Z", []));
    expect(() =>
      buildIntervalReceipt({
        start: staleStart,
        end: goodEnd,
        evidence: decodedEvidence,
      })
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
  });

  test("fails closed when a reused query ID carries incompatible statement metadata", () => {
    const digestA = sha256Hex(normalizeStatementForDigest("select * from alpha where id = $1"));
    const digestB = sha256Hex(normalizeStatementForDigest("select * from beta where id = $1"));
    const counter = (digest: string) => ({
      queryId: "31",
      calls: 8,
      rows: 2,
      totalPlanMs: 2,
      totalExecMs: 4,
      normalizedQuerySha256: digest,
    });
    const start = JSON.parse(
      snapshot("start", "2026-08-26T08:00:00.000Z", [
        {
          queryId: "31",
          calls: 5,
          rows: 1,
          totalPlanMs: 1,
          totalExecMs: 2,
          normalizedQuerySha256: digestA,
        },
      ])
    );

    // The same bigint query ID with a different normalized-statement digest is
    // query-ID reuse, not a delta of one statement: it fails
    // `pg_stat_interval_invalid`, exactly as the contract line demands.
    const reusedEnd = JSON.parse(snapshot("end", "2026-08-26T09:00:00.000Z", [counter(digestB)]));
    expect(() =>
      buildIntervalReceipt({
        start,
        end: reusedEnd,
        evidence: decodeOperatorEvidence(JSON.stringify(evidence)),
      })
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);

    // The identical digest at both boundaries still produces the plain delta.
    const sameEnd = JSON.parse(snapshot("end", "2026-08-26T09:00:00.000Z", [counter(digestA)]));
    const receipt = buildIntervalReceipt({
      start,
      end: sameEnd,
      evidence: decodeOperatorEvidence(JSON.stringify(evidence)),
    });
    expect(receipt.deltas).toHaveLength(1);
    expect(receipt.deltas[0]).toMatchObject({ queryId: "31", callsDelta: 3, rowsDelta: 1 });
  });

  test("decodes snapshots strictly: canonical bytes, bounded rows, closed enums", () => {
    const raw = snapshot("start", "2026-08-26T08:00:00.000Z", []);
    expect(decodeSnapshot(raw).boundary).toBe("start");

    // Non-canonical byte form is rejected even when JSON-equivalent.
    const parsed = JSON.parse(raw);
    expect(() => decodeSnapshot(JSON.stringify(parsed, null, 2))).toThrowError(
      PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid
    );

    // Malformed operator evidence fails closed.
    expect(() => decodeOperatorEvidence('{"classifications":"nope"}')).toThrowError(
      PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid
    );
    expect(() =>
      decodeOperatorEvidence(
        JSON.stringify({
          diagnosticsEndedAt: "x",
          classifications: [
            {
              queryId: "1",
              sourceClass: "made_up_class",
              classificationEvidenceId: "e",
              purpose: "p",
              recordedAt: "t",
            },
          ],
        })
      )
    ).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
    expect([...TRAFFIC_SOURCE_CLASSES]).toHaveLength(5);
  });

  test("fails closed on byte-malformed operator evidence without echoing the payload", () => {
    const rawPayload = "{not json";
    expect(() => decodeOperatorEvidence(rawPayload)).toThrowError(
      PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid
    );
    // Redaction discipline: the bounded code is the whole message — the raw
    // bytes (and JSON.parse's positional detail) never surface to the caller.
    let message = "";
    try {
      decodeOperatorEvidence(rawPayload);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe(PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid);
    expect(message).not.toContain(rawPayload);
    expect(message).not.toContain("not json");
  });

  test("keeps valid-JSON-but-shape-malformed operator evidence failing closed", () => {
    // No-regression guard for the 2026-09-03 parse wrap: bytes that parse but
    // violate the shape keep failing with the same bounded code as before.
    expect(() => decodeOperatorEvidence('{"classifications":"nope"}')).toThrowError(
      PG_STAT_INTERVAL_ERROR_CODES.evidenceInvalid
    );
  });

  test("normalizes statement shapes deterministically without persisting SQL", () => {
    const normalized = normalizeStatementForDigest("SELECT   *\nFROM users\tWHERE id = $1;");
    expect(normalized).toBe("select * from users where id = $1");
    expect(normalized).toBe(normalizeStatementForDigest(normalized));
    // Registry digests stay lowercase hex and never contain SQL text.
    for (const definition of Object.values(TASK551_QUERY_FINGERPRINT_DEFINITIONS)) {
      for (const digest of definition.normalizedQuerySha256) {
        expect(digest).toMatch(/^[0-9a-f]{64}$/);
        expect(digest).not.toContain("select");
      }
    }
  });

  test("resolves receipt fingerprint keys only by exact registry digest equality", () => {
    const [knownKey, knownDefinition] = Object.entries(TASK551_QUERY_FINGERPRINT_DEFINITIONS)[0]!;
    const knownDigest = knownDefinition.normalizedQuerySha256[0]!;
    const counterWith = (digest?: string) => ({
      queryId: "555",
      calls: 3,
      rows: 4,
      totalPlanMs: 1,
      totalExecMs: 2,
      ...(digest === undefined ? {} : { normalizedQuerySha256: digest }),
    });
    const start = JSON.parse(snapshot("start", "2026-08-26T08:00:00.000Z", []));
    const end = JSON.parse(
      snapshot("end", "2026-08-26T09:00:00.000Z", [
        counterWith(knownDigest),
        counterWith(sha256Hex("select * from unrelated_table where id = $1")),
        counterWith(undefined),
      ])
    );
    const receipt = buildIntervalReceipt({
      start,
      end,
      evidence: decodeOperatorEvidence(JSON.stringify(evidence)),
    });
    expect(receipt.deltas).toHaveLength(3);
    expect(receipt.deltas[0]).toMatchObject({ queryId: "555", fingerprintKey: knownKey });
    // Unmatched digests and absent digests stay null and never become labels.
    expect(receipt.deltas[1]!.fingerprintKey).toBeNull();
    expect(receipt.deltas[2]!.fingerprintKey).toBeNull();
  });

  test("rejects snapshot digests that are not lowercase 64-hex SHA-256", () => {
    const base = [{ queryId: "9", calls: 1, rows: 1, totalPlanMs: 0, totalExecMs: 0 }];
    const valid = canonicalJson({
      version: 1,
      boundary: "start",
      name: "task551-predecision-clean",
      purpose: "pre-decision",
      capturedAt: "2026-08-26T08:00:00.000Z",
      identity,
      counters: [{ ...base[0], normalizedQuerySha256: sha256Hex("select 1") }],
    });
    expect(decodeSnapshot(valid).counters[0]).toMatchObject({
      normalizedQuerySha256: sha256Hex("select 1"),
    });
    for (const bad of [
      "SELECT * FROM users",
      sha256Hex("select 1").toUpperCase(),
      sha256Hex("select 1").slice(0, 63),
      `${sha256Hex("select 1")}0`,
    ]) {
      const raw = canonicalJson({
        version: 1,
        boundary: "start",
        name: "task551-predecision-clean",
        purpose: "pre-decision",
        capturedAt: "2026-08-26T08:00:00.000Z",
        identity,
        counters: [{ ...base[0], normalizedQuerySha256: bad }],
      });
      expect(() => decodeSnapshot(raw)).toThrowError(PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid);
    }
  });

  test("keeps statement text, binds, and URLs out of snapshots and receipts", () => {
    const statement = "select secret_column from users where email = 'a@b.invalid'";
    const startRaw = canonicalJson({
      version: 1,
      boundary: "start",
      name: "task551-predecision-clean",
      purpose: "pre-decision",
      capturedAt: "2026-08-26T08:00:00.000Z",
      identity,
      counters: [
        {
          queryId: "42",
          calls: 1,
          rows: 0,
          totalPlanMs: 0,
          totalExecMs: 0,
          normalizedQuerySha256: sha256Hex(normalizeStatementForDigest(statement)),
        },
      ],
    });
    const start = JSON.parse(startRaw);
    const end = JSON.parse(
      canonicalJson({
        ...start,
        boundary: "end",
        capturedAt: "2026-08-26T09:00:00.000Z",
        counters: [
          {
            ...start.counters[0],
            calls: 2,
          },
        ],
      })
    );
    const receipt = buildIntervalReceipt({
      start,
      end,
      evidence: decodeOperatorEvidence(JSON.stringify(evidence)),
    });
    const serialized = `${canonicalJson(start)}${canonicalJson(end)}${canonicalJson(receipt)}`;
    expect(serialized).not.toContain("secret_column");
    expect(serialized).not.toContain("a@b.invalid");
    expect(serialized).not.toContain("select");
    // Only the digest of the normalized shape is carried, and it resolves.
    expect(start.counters[0]!.normalizedQuerySha256).toBe(
      sha256Hex(normalizeStatementForDigest(statement))
    );
  });

  test("writes canonical 0600 snapshots, bounds them, and never resets shared state", () => {
    const dir = mkdtempSync(join(tmpdir(), "task551-pg-stat-"));
    try {
      // The real write path emits exactly the canonical bytes with mode 0600.
      const writtenPath = join(dir, "receipt.json");
      const payload = {
        version: 1,
        name: "task551-predecision-clean",
        purpose: "pre-decision",
        cleanAfterDiagnostics: true,
        counters: [{ queryId: "17", calls: 1, rows: 0, totalPlanMs: 0, totalExecMs: 0 }],
      };
      writeBounded0600(writtenPath, payload);
      expect(readFileSync(writtenPath, "utf8")).toBe(canonicalJson(payload));
      expect(statSync(writtenPath).mode & 0o777).toBe(0o600);

      // Write-time byte bound: a payload whose canonical form exceeds 4 MiB
      // fails closed before any file is created.
      const oversized = {
        counters: Array.from({ length: 100_000 }, (_, index) => ({
          queryId: String(index),
          calls: 0,
          rows: 0,
          totalPlanMs: 0,
          totalExecMs: 0,
        })),
      };
      expect(Buffer.byteLength(canonicalJson(oversized), "utf8")).toBeGreaterThan(
        MAX_SNAPSHOT_BYTES
      );
      const oversizedPath = join(dir, "oversized.json");
      expect(() => writeBounded0600(oversizedPath, oversized)).toThrowError(
        PG_STAT_INTERVAL_ERROR_CODES.boundsExceeded
      );
      expect(existsSync(oversizedPath)).toBe(false);

      // Row bound: more than MAX_INTERVAL_ROWS counters fail the real snapshot
      // decode while still inside the byte bound, isolating the 10,000-row cap.
      const tooManyRows = canonicalJson({
        version: 1,
        boundary: "start",
        name: "task551-predecision-clean",
        purpose: "pre-decision",
        capturedAt: "2026-08-26T08:00:00.000Z",
        identity,
        counters: Array.from({ length: MAX_INTERVAL_ROWS + 1 }, (_, index) => ({
          queryId: String(index),
          calls: 0,
          rows: 0,
          totalPlanMs: 0,
          totalExecMs: 0,
        })),
      });
      expect(tooManyRows.length).toBeLessThanOrEqual(MAX_SNAPSHOT_BYTES);
      expect(() => decodeSnapshot(tooManyRows)).toThrowError(
        PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("never calls pg_stat_statements_reset anywhere in the collector source", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../../scripts/task-551-pg-stat-interval.ts", import.meta.url)),
      "utf8"
    );
    // Comments and the module docstring are allowed to *state* the no-reset
    // guarantee; no executable line may reference the reset function.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/u, ""))
      .join("\n");
    expect(code).not.toContain("pg_stat_statements_reset");
    // The only statistics surface is the bounded read-only pg_stat_statements
    // select plus its info/identity reads: no reset call exists to undo.
    expect(code).toContain("from pg_stat_statements");
    // The docstring still pins the guarantee in prose.
    expect(source).toContain("never calls `pg_stat_statements_reset()`");
  });

  test("seeds the five polluted diagnostic families: no callsite, no index, clean interval required", () => {
    // The owner-supplied polluted production sample: one cross-table whole-row
    // text-regex family plus four `access_logs` column text-regex families
    // (ID, user-agent, user-ID, path). The shapes below exist only here in the
    // test source to derive digests; a repository-wide scan found no matching
    // application callsite, and operations guidance forbids re-running them.
    const pollutedFamilies = [
      "select * from access_logs al join users u on u.id = al.user_id where (al.*)::text ~ $1 or (u.*)::text ~ $2",
      "select * from access_logs where id::text ~ $1",
      "select * from access_logs where user_agent ~ $1",
      "select * from access_logs where user_id::text ~ $1",
      "select * from access_logs where path ~ $1",
    ];
    const familyDigests = pollutedFamilies.map((statement) =>
      sha256Hex(normalizeStatementForDigest(statement))
    );

    // Zero registry callsites: none of the five digests resolves to a reviewed
    // application fingerprint, so no family is an application query.
    const registryDigests = new Set(
      Object.values(TASK551_QUERY_FINGERPRINT_DEFINITIONS).flatMap(
        (definition) => definition.normalizedQuerySha256
      )
    );
    for (const digest of familyDigests) {
      expect(registryDigests.has(digest)).toBe(false);
    }

    // The five families are seeded into a clean pre-decision interval as
    // external-diagnostic query IDs (negative bigint decimals), growing over
    // the interval exactly like the polluted cumulative counters did.
    const familyCounters = (calls: number) =>
      familyDigests.map((digest, index) => ({
        queryId: String(-1001 - index),
        calls,
        rows: 0,
        totalPlanMs: 1,
        totalExecMs: 2,
        normalizedQuerySha256: digest,
      }));
    const evidence = decodeOperatorEvidence(
      JSON.stringify({
        diagnosticsEndedAt: "2026-08-25T00:00:00.000Z",
        classifications: familyDigests.map((digest, index) => ({
          queryId: String(-1001 - index),
          sourceClass: "external_diagnostic",
          classificationEvidenceId: `ev-551-${index + 1}`,
          purpose: "pre-decision",
          recordedAt: "2026-08-25T01:00:00.000Z",
        })),
      })
    );
    const start = JSON.parse(snapshot("start", "2026-08-26T08:00:00.000Z", familyCounters(3)));
    const end = JSON.parse(snapshot("end", "2026-08-26T09:00:00.000Z", familyCounters(9)));
    const receipt = buildIntervalReceipt({ start, end, evidence });

    // Every seeded family stays outside the registry and outside eligibility.
    expect(receipt.deltas).toHaveLength(5);
    for (const [index, delta] of receipt.deltas.entries()) {
      expect(delta.queryId).toBe(String(-1001 - index));
      expect(delta.fingerprintKey).toBeNull();
      expect(delta.sourceClass).toBe("external_diagnostic");
      expect(delta.classificationEvidenceId).toBe(`ev-551-${index + 1}`);
      expect(delta.callsDelta).toBe(6);
      expect(delta.rowsDelta).toBe(0);
    }
    // Zero proposed indexes: only application deltas are prioritizable, and no
    // seeded family is application traffic under either classification path.
    expect(receipt.eligibleApplicationQueryIds).toEqual([]);
    expect([...receipt.excludedQueryIds].sort()).toEqual([
      "-1001",
      "-1002",
      "-1003",
      "-1004",
      "-1005",
    ]);
    expect(receipt.sourceClassTotals.application).toMatchObject({ statements: 0, calls: 0 });
    expect(receipt.sourceClassTotals.external_diagnostic).toMatchObject({
      statements: 5,
      calls: 30,
    });
    expect(receipt.cleanAfterDiagnostics).toBe(true);

    // Without explicit operator evidence the same families stay `unknown`, and
    // unknown traffic is equally excluded from application prioritization.
    const unclassified = buildIntervalReceipt({
      start,
      end,
      evidence: decodeOperatorEvidence(
        JSON.stringify({
          diagnosticsEndedAt: "2026-08-25T00:00:00.000Z",
          classifications: [],
        })
      ),
    });
    expect(unclassified.deltas.map((delta) => delta.sourceClass)).toEqual([
      "unknown",
      "unknown",
      "unknown",
      "unknown",
      "unknown",
    ]);

    // A later clean interval is required: an interval that starts inside the
    // polluted diagnostic period (at diagnosticsEndedAt, or earlier) can never
    // seed a prioritization receipt.
    const pollutedPeriodStart = JSON.parse(
      snapshot("start", "2026-08-25T00:00:00.000Z", familyCounters(3))
    );
    expect(() => buildIntervalReceipt({ start: pollutedPeriodStart, end, evidence })).toThrowError(
      PG_STAT_INTERVAL_ERROR_CODES.intervalInvalid
    );

    // Sentinels: the persisted bytes carry the closed field surface only, so
    // no SQL, bind, regex pattern, role/application/host/database name, URL,
    // PII, or row body can be present.
    expect(Object.keys(receipt).sort()).toEqual([
      "cleanAfterDiagnostics",
      "databaseIdentitySha256",
      "deltas",
      "eligibleApplicationQueryIds",
      "end",
      "excludedQueryIds",
      "extensionVersion",
      "name",
      "purpose",
      "serverIdentitySha256",
      "sourceClassTotals",
      "start",
      "statsReset",
      "version",
    ]);
    expect(Object.keys(receipt.deltas[0]!).sort()).toEqual([
      "callsDelta",
      "classificationEvidenceId",
      "fingerprintKey",
      "queryId",
      "rowsDelta",
      "sourceClass",
      "totalExecMsDelta",
      "totalPlanMsDelta",
    ]);
    const persisted = `${canonicalJson(start)}${canonicalJson(end)}${canonicalJson(receipt)}`;
    for (const sentinel of [
      "access_logs",
      "users",
      "user_agent",
      "user_id",
      "select",
      "::text",
      "ilike",
      "~",
      "$1",
      "$2",
      "postgres://",
      "db-host.invalid",
      "coderso:",
      "diag-role",
      "agent-sentinel",
      "path-sentinel",
      "row-body",
    ]) {
      expect(persisted).not.toContain(sentinel);
    }
  });
});
