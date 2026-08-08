import { describe, expect, it } from "vitest";

import {
  parseManagedEvidenceExplainMetrics,
  type FullSiteExplainMetrics,
} from "../../utils/fullSiteExplainMetrics";

type ExplainRecord = Record<string, unknown>;

const OPTIONAL_METRICS = [
  "Rows Removed by Filter",
  "Rows Removed by Join Filter",
  "Rows Removed by Index Recheck",
  "Shared Hit Blocks",
  "Shared Read Blocks",
  "Shared Dirtied Blocks",
  "Shared Written Blocks",
] as const;

const createNestedFixture = () => {
  const child: ExplainRecord = {
    "Actual Rows": 29,
    "Actual Loops": 2,
    "Rows Removed by Filter": 31,
    "Rows Removed by Join Filter": 37,
    "Rows Removed by Index Recheck": 41,
  };
  const root: ExplainRecord = {
    "Actual Rows": 2,
    "Actual Loops": 3,
    "Rows Removed by Filter": 5,
    "Rows Removed by Join Filter": 7,
    "Rows Removed by Index Recheck": 11,
    "Shared Hit Blocks": 13,
    "Shared Read Blocks": 17,
    "Shared Dirtied Blocks": 19,
    "Shared Written Blocks": 23,
    Plans: [child],
  };
  const result: ExplainRecord = { "Execution Time": 7, Plan: root };
  return { document: [result], result, root, child };
};

const expectInvalid = (value: unknown): void => {
  let thrown: unknown;
  try {
    parseManagedEvidenceExplainMetrics(value);
  } catch (error) {
    thrown = error;
  }
  if (thrown === undefined) throw new Error("explain_parser_rejection_expected");
  if (!(thrown instanceof Error)) throw new Error("explain_error_missing");
  expect(Object.getPrototypeOf(thrown)).toBe(Error.prototype);
  expect(thrown.message).toBe("managed_evidence_explain_invalid");
  expect(thrown.message).not.toContain("hostile_explain_sentinel");
  expect(Object.prototype.hasOwnProperty.call(thrown, "cause")).toBe(false);
};

describe("full-site EXPLAIN metrics", () => {
  it("accepts the exact nested fixture in object and JSON driver forms", () => {
    const { document } = createNestedFixture();
    const expected: FullSiteExplainMetrics = {
      executionMs: 7,
      emittedRows: 6,
      scannedRows: 351,
      sharedBuffers: 72,
    };
    expect(parseManagedEvidenceExplainMetrics(document)).toEqual(expected);
    expect(parseManagedEvidenceExplainMetrics(JSON.stringify(document))).toEqual(expected);
  });

  it("accepts zero-valued required fields and absent optional fields", () => {
    expect(
      parseManagedEvidenceExplainMetrics([
        { "Execution Time": 0, Plan: { "Actual Rows": 0, "Actual Loops": 0 } },
      ])
    ).toEqual({ executionMs: 0, emittedRows: 0, scannedRows: 0, sharedBuffers: 0 });
  });

  it("rejects malformed top-level and hostile trapped representations", () => {
    const fixture = createNestedFixture();
    const sparseTop = new Array(1);
    const hostileResult = new Proxy(createNestedFixture().result, {
      getOwnPropertyDescriptor: () => {
        throw new Error("hostile_explain_sentinel");
      },
    });
    const hostilePlan = new Proxy(createNestedFixture().root, {
      getPrototypeOf: () => {
        throw new Error("hostile_explain_sentinel");
      },
    });
    for (const value of [
      null,
      {},
      [],
      sparseTop,
      [fixture.result, fixture.result],
      [{ "Execution Time": 1 }],
      "{hostile_explain_sentinel",
      [hostileResult],
      [{ "Execution Time": 1, Plan: hostilePlan }],
    ]) {
      expectInvalid(value);
    }
  });

  it("rejects every required and optional numeric metric class", () => {
    const required = [
      ["Execution Time", "result"],
      ["Actual Rows", "root"],
      ["Actual Loops", "root"],
    ] as const;
    const missing = Symbol("missing");
    for (const [key, ownerName] of required) {
      for (const value of [missing, undefined, "1", Number.NaN, Infinity, -1]) {
        const fixture = createNestedFixture();
        const owner = ownerName === "result" ? fixture.result : fixture.root;
        if (value === missing) delete owner[key];
        else owner[key] = value;
        expectInvalid(fixture.document);
      }
    }
    for (const key of OPTIONAL_METRICS) {
      for (const value of [undefined, "1", Number.NaN, Infinity, -1]) {
        const fixture = createNestedFixture();
        fixture.root[key] = value;
        expectInvalid(fixture.document);
      }
    }
  });

  it("rejects malformed child shapes, sparse plans and non-finite derivations", () => {
    for (const plans of [null, {}, "plans", new Array(1), [null], [{}]]) {
      const fixture = createNestedFixture();
      fixture.root.Plans = plans;
      expectInvalid(fixture.document);
    }
    const rowOverflow = createNestedFixture();
    rowOverflow.root["Actual Rows"] = Number.MAX_VALUE;
    rowOverflow.root["Actual Loops"] = 2;
    expectInvalid(rowOverflow.document);
    const bufferOverflow = createNestedFixture();
    bufferOverflow.root["Shared Hit Blocks"] = Number.MAX_VALUE;
    bufferOverflow.root["Shared Read Blocks"] = Number.MAX_VALUE;
    expectInvalid(bufferOverflow.document);
  });
});
