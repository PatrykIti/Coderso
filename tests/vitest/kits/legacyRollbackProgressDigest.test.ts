/**
 * TASK-551-06-L01 vitest lane: legacy rollback combined-progress digest.
 * DB-free pure-lane coverage: shared constants, canonical code-point key
 * ordering, NFC/UUID/position/digest grammar, strict templates, state
 * preimages, item hashing, evidence/progress matrices, position-map vectors,
 * the `members:[]` combined digest, and production import isolation.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES,
  LEGACY_COMBINED_OPERATION_LIMIT,
  LEGACY_TEMPLATE_ACTION_MAX_BYTES,
  LEGACY_TEMPLATE_ACTIONS_MAX_BYTES,
  LEGACY_TEMPLATE_OPERATION_LIMIT,
  LEGACY_TEMPLATE_SEEDS_MAX_BYTES,
  LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES,
  STARTER_LIFECYCLE_ENVELOPE_MAX_BYTES,
  LegacyRollbackProgressDigestError,
  buildLegacyCombinedPositionMap,
  buildLegacyRollbackCombinedProgressDigest,
  buildLegacyRollbackInstallItemDigest,
  buildLegacyTemplateSourceEvidenceDigest,
  buildLegacyTemplateStateDigest,
  buildLegacyTemplateRollbackProgressDigest,
  type LegacyRollbackCombinedProgressDigestInputV1,
  type LegacyRollbackInstallItemDigestInputV1,
  type LegacyRollbackInstallItemRecordV1,
  type LegacyTemplateSourceEvidenceDigestInputV1,
  type LegacyTemplateStateDigestInputV1,
  type StrictTemplateDeleteRollbackAction,
  type StrictTemplateRestoreRollbackAction,
  type StrictTemplateSnapshot,
} from "../../../core/services/kits/legacyRollbackProgressDigest";

const RUN_ID = "1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const ROLLBACK_RUN_ID = "2b7c3d4e-5f60-4a71-9b8c-1d2e3f4a5b6c";
const ITEM_ID = "3c8d4e5f-6a70-4b82-8c9d-2e3f4a5b6c7d";
const TEMPLATE_ID = "4d9e5f60-7a81-4c93-9dae-3f4a5b6c7d8e";
const EVIDENCE_ID = "5eaf6071-8b92-4da4-8ebf-4a5b6c7d8e9f";
const PLAN_DIGEST = "a".repeat(64);
const EVIDENCE_DIGEST = "c".repeat(64);
const AFTER_DIGEST = "d".repeat(64);
const TARGET_DIGEST = "e".repeat(64);
const PROGRESS_DIGEST = "f".repeat(64);

const SCHEMA = "legacy_rollback_digest_schema_invalid";
const VALUE = "legacy_rollback_digest_value_invalid";
const LIMIT = "legacy_rollback_digest_limit_exceeded";
const COMBINED_LIMIT = LEGACY_COMBINED_OPERATION_LIMIT;
const TEMPLATE_LIMIT = LEGACY_TEMPLATE_OPERATION_LIMIT;

type Overrides = Record<string, unknown>;

/** Canonical synthetic UUID: valid lowercase syntax, unique per suffix. */
function syntheticUuid(suffix: number): string {
  return `00000000-0000-4000-8000-${suffix.toString(16).padStart(12, "0")}`;
}

/** Canonical synthetic digest: lowercase 64-hex, unique per suffix. */
function syntheticDigest(suffix: number): string {
  return suffix.toString(16).padStart(64, "0");
}

function templateSnapshot(overrides: Overrides = {}): StrictTemplateSnapshot {
  return {
    id: TEMPLATE_ID,
    name: "Landing template",
    description: "Hero plus three feature cards",
    category: "landing",
    status: "published",
    blocks: [
      { kind: "hero", settings: { heading: "Welcome" } },
      { kind: "cards", settings: { count: 3 } },
    ],
    settings: { layout: { columns: 12, width: "wide" } },
    ...overrides,
  } as unknown as StrictTemplateSnapshot;
}

function deleteAction(after: StrictTemplateSnapshot): StrictTemplateDeleteRollbackAction {
  return {
    key: "landing-template",
    operation: "create",
    templateId: TEMPLATE_ID,
    beforeSnapshot: null,
    afterSnapshot: after,
  };
}

function restoreAction(
  before: StrictTemplateSnapshot,
  after: StrictTemplateSnapshot
): StrictTemplateRestoreRollbackAction {
  return {
    key: "landing-template",
    operation: "update",
    templateId: TEMPLATE_ID,
    beforeSnapshot: before,
    afterSnapshot: after,
  };
}

function installItemInput(overrides: Overrides = {}) {
  return {
    contract: "coderso.legacy-rollback-install-item@v1",
    id: ITEM_ID,
    runId: RUN_ID,
    position: 7,
    resourceType: "page",
    resourceKey: "about-us",
    operation: "create",
    status: "success",
    beforeSnapshot: null,
    afterSnapshot: { slug: "about-us", title: "About us", locale: "en" },
    rollbackAction: { strategy: "delete", resourceKey: "about-us" },
    ...overrides,
  } as unknown as LegacyRollbackInstallItemDigestInputV1;
}

function evidenceInput(overrides: Overrides = {}) {
  return {
    contract: "coderso.legacy-template-evidence@v1",
    sourceRunId: RUN_ID,
    sourcePosition: 0,
    templateKey: "landing-template",
    planDigest: PLAN_DIGEST,
    templateId: TEMPLATE_ID,
    operation: "create",
    beforeSnapshot: null,
    status: "success",
    afterSnapshot: templateSnapshot(),
    rollbackAction: deleteAction(templateSnapshot()),
    safeErrorCode: null,
    ...overrides,
  } as unknown as LegacyTemplateSourceEvidenceDigestInputV1;
}

function progressInput(overrides: Overrides = {}) {
  return {
    contract: "coderso.legacy-template-rollback-progress@v1",
    rollbackRunId: ROLLBACK_RUN_ID,
    sourceRunId: RUN_ID,
    sourceEvidenceId: EVIDENCE_ID,
    sourcePosition: 0,
    rollbackPosition: 0,
    sourceStatus: "success",
    state: "rollback_committed",
    sourceEvidenceDigest: EVIDENCE_DIGEST,
    sourceAfterDigest: AFTER_DIGEST,
    rollbackTargetDigest: TARGET_DIGEST,
    mutationInvalidationEventKey: "page:about-us:updated",
    compensationInvalidationEventKey: null,
    ...overrides,
  } as unknown as Parameters<typeof buildLegacyTemplateRollbackProgressDigest>[0];
}

function combinedInput(members: unknown[] = []) {
  return {
    contract: "coderso.legacy-rollback-combined-progress@v1",
    sourceRunId: RUN_ID,
    rollbackRunId: ROLLBACK_RUN_ID,
    members,
  } as unknown as LegacyRollbackCombinedProgressDigestInputV1;
}

function coreMember(sourcePosition: number, rollbackPosition: number, suffix: number) {
  return {
    kind: "core",
    sourcePosition,
    rollbackPosition,
    sourceItemId: syntheticUuid(suffix),
    sourceItemDigest: syntheticDigest(suffix),
    rollbackItemId: syntheticUuid(suffix + 1_000),
    rollbackItemDigest: syntheticDigest(suffix + 1_000),
  };
}

function templateMember(sourcePosition: number, rollbackPosition: number) {
  return {
    kind: "template",
    sourcePosition,
    rollbackPosition,
    // Evidence ids stay unique per source position (offset disjoint from the
    // core suffix spaces) because two template members naming one evidence
    // identity are refused by the combined builder.
    sourceEvidenceId: syntheticUuid(sourcePosition + 2_000),
    sourceEvidenceDigest: EVIDENCE_DIGEST,
    progressDigest: PROGRESS_DIGEST,
  };
}

function presentState(snapshot: StrictTemplateSnapshot): LegacyTemplateStateDigestInputV1 {
  return { contract: "coderso.legacy-template-state@v1", state: { present: true, snapshot } };
}

function buildInstall(overrides: Overrides = {}): string {
  return buildLegacyRollbackInstallItemDigest(installItemInput(overrides));
}

function buildEvidence(overrides: Overrides = {}): string {
  return buildLegacyTemplateSourceEvidenceDigest(evidenceInput(overrides));
}

function buildProgress(overrides: Overrides = {}): string {
  return buildLegacyTemplateRollbackProgressDigest(progressInput(overrides));
}

function buildState(input: unknown): string {
  return buildLegacyTemplateStateDigest(input as LegacyTemplateStateDigestInputV1);
}

function combinedDigest(members: unknown[]): string {
  return buildLegacyRollbackCombinedProgressDigest(combinedInput(members));
}

function fullPlanMap() {
  return buildLegacyCombinedPositionMap({
    coreCount: COMBINED_LIMIT - TEMPLATE_LIMIT,
    templateCount: TEMPLATE_LIMIT,
  });
}

function codeOf(execute: () => unknown): string {
  try {
    execute();
  } catch (error) {
    expect(error).toBeInstanceOf(LegacyRollbackProgressDigestError);
    return (error as LegacyRollbackProgressDigestError).code;
  }
  throw new Error("expected the digest builder to reject the input");
}

function expectCode(label: string, execute: () => unknown, code: string): void {
  expect(codeOf(execute), label).toBe(code);
}

function expectCodes(rows: [string, () => unknown, string][]): void {
  for (const [label, execute, code] of rows) expectCode(label, execute, code);
}

function expectOverrideCodes(
  rows: [string, Overrides, string][],
  build: (overrides: Overrides) => unknown
): void {
  for (const [label, overrides, code] of rows) {
    expectCode(label, () => build(overrides), code);
  }
}

function expectMemberCodes(rows: [string, unknown[]][], code: string): void {
  for (const [label, members] of rows) {
    expectCode(label, () => combinedDigest(members), code);
  }
}

function withoutMember(input: object, member: string): unknown {
  delete (input as Overrides)[member];
  return input;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

/** Reference canonicalizer: keys sorted by code point, array order kept, JSON escaping. */
function referenceCanonical(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(referenceCanonical).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Overrides;
    const keys = Object.keys(record).sort((left, right) => {
      const leftChars = Array.from(left);
      const rightChars = Array.from(right);
      const shared = Math.min(leftChars.length, rightChars.length);
      for (let index = 0; index < shared; index += 1) {
        const leftCode = leftChars[index]?.codePointAt(0) ?? 0;
        const rightCode = rightChars[index]?.codePointAt(0) ?? 0;
        if (leftCode !== rightCode) return leftCode - rightCode;
      }
      return leftChars.length - rightChars.length;
    });
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${referenceCanonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

describe("shared legacy rollback digest constants", () => {
  it("pins every exact value TASK-489 imports read-only", () => {
    expect(LEGACY_COMBINED_OPERATION_LIMIT).toBe(512);
    expect(LEGACY_TEMPLATE_OPERATION_LIMIT).toBe(100);
    expect(LEGACY_TEMPLATE_SEEDS_MAX_BYTES).toBe(4_194_304);
    expect(LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES).toBe(524_288);
    expect(LEGACY_TEMPLATE_ACTION_MAX_BYTES).toBe(1_049_600);
    expect(LEGACY_TEMPLATE_ACTIONS_MAX_BYTES).toBe(12_582_912);
    expect(STARTER_LIFECYCLE_ENVELOPE_MAX_BYTES).toBe(16_777_216);
    expect(LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES).toBe(8_388_608);
  });
});

describe("canonical JSON byte contract", () => {
  it("hashes the exact canonical bytes of a fixed install item", () => {
    const input = installItemInput();
    const canonical =
      '{"afterSnapshot":{"locale":"en","slug":"about-us","title":"About us"},' +
      '"beforeSnapshot":null,"contract":"coderso.legacy-rollback-install-item@v1",' +
      '"id":"3c8d4e5f-6a70-4b82-8c9d-2e3f4a5b6c7d","operation":"create","position":7,' +
      '"resourceKey":"about-us","resourceType":"page",' +
      '"rollbackAction":{"resourceKey":"about-us","strategy":"delete"},' +
      '"runId":"1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b","status":"success"}';
    expect(referenceCanonical(input)).toBe(canonical);
    const vector = "4c148b771cc736234451a371c44ece7602c49c2c6a57e289e792b67d03a585a3";
    expect(sha256Hex(canonical)).toBe(vector);
    expect(buildLegacyRollbackInstallItemDigest(input)).toBe(vector);
  });

  it("is independent of key insertion order at every object depth", () => {
    const first = installItemInput();
    const second = installItemInput({
      afterSnapshot: { locale: "en", title: "About us", slug: "about-us" },
      rollbackAction: { resourceKey: "about-us", strategy: "delete" },
    });
    expect(buildLegacyRollbackInstallItemDigest(first)).toBe(
      buildLegacyRollbackInstallItemDigest(second)
    );
  });

  it("sorts object keys by Unicode code point, not UTF-16 code unit", () => {
    // U+FFFC sorts before U+1F600 by code point but after it by UTF-16 unit,
    // so a naive unit-wise sort would hash different bytes.
    const bmpKey = "￼a";
    const astralKey = "😀x";
    const codePointOrder = `${JSON.stringify(bmpKey)}:1,${JSON.stringify(astralKey)}:2`;
    const utf16Order = `${JSON.stringify(astralKey)}:2,${JSON.stringify(bmpKey)}:1`;
    expect(codePointOrder).not.toBe(utf16Order);
    const digests = [
      { [bmpKey]: 1, [astralKey]: 2 },
      { [astralKey]: 2, [bmpKey]: 1 },
    ].map((afterSnapshot) => buildInstall({ afterSnapshot }));
    expect(digests[0]).toBe(digests[1]);
    expect(digests[0]).toBe(
      sha256Hex(
        referenceCanonical(installItemInput({ afterSnapshot: { [bmpKey]: 1, [astralKey]: 2 } }))
      )
    );
    expect(referenceCanonical({ [astralKey]: 2, [bmpKey]: 1 })).toBe(`{${codePointOrder}}`);
  });

  it("preserves array order while sorting object keys", () => {
    const forward = presentState(templateSnapshot());
    const reversed = presentState(
      templateSnapshot({ blocks: [...templateSnapshot().blocks].reverse() })
    );
    expect(buildState(forward)).toMatch(/^[0-9a-f]{64}$/);
    expect(buildState(forward)).not.toBe(buildState(reversed));
  });

  it("requires NFC-stable strings and rejects lone surrogates", () => {
    expectCodes([
      [
        "decomposed name",
        () => buildState(presentState(templateSnapshot({ name: "école" }))),
        SCHEMA,
      ],
      [
        "lone surrogate",
        () => buildState(presentState(templateSnapshot({ name: "a\uD83Db" }))),
        SCHEMA,
      ],
    ]);
    const composed = presentState(templateSnapshot({ name: "école" }));
    expect(buildState(composed)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects non-finite numbers, accessors, hidden fields, and non-plain objects", () => {
    expectOverrideCodes(
      [
        ["NaN member", { afterSnapshot: { count: Number.NaN } }, SCHEMA],
        ["infinite member", { afterSnapshot: { count: Number.POSITIVE_INFINITY } }, SCHEMA],
        ["array snapshot", { afterSnapshot: ["not", "an", "object"] }, SCHEMA],
        ["undefined member", { afterSnapshot: { gap: undefined } }, SCHEMA],
        ["class instance", { afterSnapshot: new Date(0) }, SCHEMA],
      ],
      buildInstall
    );
    const accessor = installItemInput();
    Object.defineProperty(accessor.afterSnapshot, "computed", { enumerable: true, get: () => "v" });
    expectCode("accessor member", () => buildLegacyRollbackInstallItemDigest(accessor), SCHEMA);
    const hidden = installItemInput();
    Object.defineProperty(hidden.afterSnapshot, "concealed", { enumerable: false, value: 1 });
    expectCode("hidden member", () => buildLegacyRollbackInstallItemDigest(hidden), SCHEMA);
    const sym = installItemInput();
    Object.defineProperty(sym.afterSnapshot, Symbol.for("sym"), { enumerable: true, value: 1 });
    expectCode("symbol key", () => buildLegacyRollbackInstallItemDigest(sym), SCHEMA);
  });

  it("pins the exported input and record type projections", () => {
    expectTypeOf(buildLegacyRollbackInstallItemDigest)
      .parameter(0)
      .toEqualTypeOf<LegacyRollbackInstallItemDigestInputV1>();
    expectTypeOf(buildLegacyRollbackInstallItemDigest).returns.toBeString();
    type RecordKeys = keyof LegacyRollbackInstallItemRecordV1;
    const recordDropsContract: RecordKeys extends "contract" ? true : false = false;
    expect(recordDropsContract).toBe(false);
  });
});

describe("buildLegacyTemplateStateDigest", () => {
  it("pins the exact absent-state and present-state SHA-256 vectors", () => {
    const absent: LegacyTemplateStateDigestInputV1 = {
      contract: "coderso.legacy-template-state@v1",
      state: { present: false },
    };
    const present = presentState(templateSnapshot());
    expect(buildState(absent)).toBe(
      "b0533c35eee85872c60c39c113a09ab744a3a1d6e02cb521ba4ac9bd29066a87"
    );
    expect(buildState(present)).toBe(
      "a081a3b07c78d078e8d1516e12f8ba50946182ed19dca74cc0d334a36c7b9d44"
    );
    expect(buildState(absent)).not.toBe(buildState(present));
  });

  it("rejects untagged and malformed state frames", () => {
    const base = { contract: "coderso.legacy-template-state@v1" };
    expectOverrideCodes(
      [
        ["untagged", { state: { present: false } }, SCHEMA],
        [
          "wrong contract version",
          { contract: "coderso.legacy-template-state@v2", state: { present: false } },
          SCHEMA,
        ],
        ["present without snapshot", { ...base, state: { present: true } }, SCHEMA],
        ["extra absent member", { ...base, state: { present: false, extra: 1 } }, SCHEMA],
        ["unknown state member", { ...base, state: { absent: false } }, SCHEMA],
        [
          "snapshot without identity",
          { ...base, state: { present: true, snapshot: { id: "nope" } } },
          SCHEMA,
        ],
      ],
      buildState
    );
  });
});

describe("buildLegacyRollbackInstallItemDigest", () => {
  it("accepts every closed enum member and null snapshots", () => {
    const accepts: Overrides[] = [
      ...["content_type", "form", "page", "menu"].map((resourceType) => ({ resourceType })),
      ...["create", "update", "noop", "delete", "restore"].map((operation) => ({ operation })),
      ...["planned", "success", "failed", "skipped"].map((status) => ({
        status,
        afterSnapshot: null,
        rollbackAction: null,
      })),
      { position: 511 },
      { resourceKey: "x".repeat(128) },
    ];
    for (const overrides of accepts) {
      expect(buildInstall(overrides)).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("changes the digest when any hashed member changes", () => {
    const base = buildInstall();
    const mutations: Overrides[] = [
      { position: 8 },
      { resourceKey: "about-us-2" },
      { afterSnapshot: { slug: "about-us", title: "About us" } },
    ];
    for (const overrides of mutations) {
      expect(buildInstall(overrides)).not.toBe(base);
    }
  });

  it("rejects a missing or wrong contract before hashing", () => {
    expectCodes([
      [
        "missing contract",
        () =>
          buildLegacyRollbackInstallItemDigest(
            withoutMember(installItemInput(), "contract") as never
          ),
        SCHEMA,
      ],
      [
        "wrong contract",
        () => buildInstall({ contract: "coderso.legacy-rollback-install-item@v2" }),
        SCHEMA,
      ],
    ]);
  });

  it("rejects unknown keys, grammar violations, and oversized members", () => {
    expectOverrideCodes(
      [
        ["raw error column", { error: "raw failure text" }, SCHEMA],
        ["timestamp column", { createdAt: "2036-01-01T00:00:00.000Z" }, SCHEMA],
        ["unknown member", { extra: 1 }, SCHEMA],
        ["uppercase uuid", { id: ITEM_ID.toUpperCase() }, SCHEMA],
        ["malformed uuid", { id: "NOT-A-UUID" }, SCHEMA],
        ["negative position", { position: -1 }, SCHEMA],
        ["overflow position", { position: 512 }, SCHEMA],
        ["fractional position", { position: 1.5 }, SCHEMA],
        ["position NaN", { position: Number.NaN }, SCHEMA],
        ["position 7", { position: "7" }, SCHEMA],
        ["position null", { position: null }, SCHEMA],
        ["empty resource key", { resourceKey: "" }, VALUE],
        ["long resource key", { resourceKey: "x".repeat(129) }, VALUE],
        ["tab in resource key", { resourceKey: "bad\tkey" }, VALUE],
        ["newline in resource key", { resourceKey: "bad\nkey" }, VALUE],
        ["delete in resource key", { resourceKey: "bad\u007Fkey" }, VALUE],
        ["non-NFC resource key", { resourceKey: "école" }, SCHEMA],
        [
          "oversized snapshot",
          { afterSnapshot: { blob: "x".repeat(LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES) } },
          LIMIT,
        ],
        [
          "oversized action",
          { rollbackAction: { blob: "x".repeat(LEGACY_TEMPLATE_ACTION_MAX_BYTES) } },
          LIMIT,
        ],
      ],
      buildInstall
    );
    expectCode(
      "missing member",
      () =>
        buildLegacyRollbackInstallItemDigest(
          withoutMember(installItemInput(), "rollbackAction") as never
        ),
      SCHEMA
    );
    expect(
      buildInstall({ afterSnapshot: { blob: "x".repeat(LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES - 32) } })
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildLegacyTemplateSourceEvidenceDigest", () => {
  it("pins the exact create-success SHA-256 vector", () => {
    expect(buildEvidence()).toBe(
      "af1e09333eb02ba11b54bd589801ae306473038cb8ff8595a8b83fb0de31d021"
    );
  });

  it("accepts the whole SQL-enforceable matrix", () => {
    const draft = templateSnapshot({ status: "draft" });
    const noop = templateSnapshot();
    const snap = templateSnapshot;
    const accepts: Overrides[] = [
      { operation: "update", beforeSnapshot: draft, rollbackAction: restoreAction(draft, snap()) },
      { operation: "noop", beforeSnapshot: noop, afterSnapshot: noop, rollbackAction: null },
      {
        status: "failed",
        templateId: null,
        beforeSnapshot: null,
        afterSnapshot: null,
        rollbackAction: null,
        safeErrorCode: "template_snapshot_invalid",
      },
      {
        status: "skipped",
        templateId: TEMPLATE_ID,
        beforeSnapshot: null,
        afterSnapshot: null,
        rollbackAction: null,
      },
    ];
    for (const overrides of accepts) {
      expect(buildEvidence(overrides)).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("requires key, template identity, and snapshot parity in actions", () => {
    const action = deleteAction(templateSnapshot());
    const other = templateSnapshot({ name: "Other" });
    const renamed = templateSnapshot({ name: "Renamed" });
    const current = templateSnapshot();
    const changedBefore = templateSnapshot({ status: "draft", category: "o" });
    expectOverrideCodes(
      [
        ["mismatched action key", { rollbackAction: { ...action, key: "other" } }, VALUE],
        [
          "mismatched action template",
          { rollbackAction: { ...action, templateId: syntheticUuid(1) } },
          VALUE,
        ],
        ["mismatched action snapshot", { rollbackAction: deleteAction(other) }, VALUE],
        [
          "restore with changed before",
          {
            operation: "update",
            beforeSnapshot: templateSnapshot({ status: "draft" }),
            rollbackAction: restoreAction(changedBefore, templateSnapshot()),
          },
          VALUE,
        ],
        [
          "noop before and after differ",
          {
            operation: "noop",
            beforeSnapshot: current,
            afterSnapshot: renamed,
            rollbackAction: null,
          },
          VALUE,
        ],
      ],
      buildEvidence
    );
  });

  it("rejects every closed-matrix violation", () => {
    const failed = {
      status: "failed",
      templateId: null,
      afterSnapshot: null,
      rollbackAction: null,
    };
    const noopFrame = {
      operation: "noop",
      beforeSnapshot: templateSnapshot(),
      afterSnapshot: templateSnapshot(),
      rollbackAction: deleteAction(templateSnapshot()),
    };
    expectOverrideCodes(
      [
        ["delete operation", { operation: "delete" }, SCHEMA],
        ["planned status", { status: "planned" }, SCHEMA],
        ["success without template identity", { templateId: null }, VALUE],
        ["success with error code", { safeErrorCode: "code on success" }, SCHEMA],
        ["create with before snapshot", { beforeSnapshot: templateSnapshot() }, SCHEMA],
        ["source position overflow", { sourcePosition: 512 }, SCHEMA],
        ["malformed plan digest", { planDigest: "not-hex" }, SCHEMA],
        ["empty template key", { templateKey: "" }, VALUE],
        ["failed without error code", failed, VALUE],
        ["skipped with error code", { status: "skipped", safeErrorCode: "unexpected" }, SCHEMA],
        [
          "skipped with after snapshot",
          { status: "skipped", afterSnapshot: templateSnapshot() },
          SCHEMA,
        ],
        ["noop with rollback action", noopFrame, SCHEMA],
        ["persisted evidence digest column", { evidenceDigest: EVIDENCE_DIGEST }, SCHEMA],
      ],
      buildEvidence
    );
  });
});

describe("buildLegacyTemplateRollbackProgressDigest", () => {
  it("pins the exact rollback_committed SHA-256 vector", () => {
    expect(buildProgress()).toBe(
      "ba57b82fb1215ad8952abd6538d577014dc6d52c4df7fe04d229b72c9d2e6502"
    );
  });

  it("accepts all three locked states with their exact event matrix", () => {
    const restored = progressInput({
      state: "source_restored",
      compensationInvalidationEventKey: "page:about-us:compensated",
    });
    const failedNoMutation = {
      state: "failed_no_mutation",
      rollbackTargetDigest: null,
      mutationInvalidationEventKey: null,
      compensationInvalidationEventKey: null,
    };
    expect(buildProgress(failedNoMutation)).toMatch(/^[0-9a-f]{64}$/);
    expect(buildLegacyTemplateRollbackProgressDigest(restored)).toMatch(/^[0-9a-f]{64}$/);
    expect(buildProgress()).not.toBe(buildLegacyTemplateRollbackProgressDigest(restored));
  });

  it("rejects every state/event matrix violation", () => {
    const restored = "source_restored";
    const comp = "page:about-us:comp";
    expectOverrideCodes(
      [
        [
          "failed with target digest",
          { state: "failed_no_mutation", rollbackTargetDigest: TARGET_DIGEST },
          SCHEMA,
        ],
        [
          "failed with mutation key",
          { state: "failed_no_mutation", mutationInvalidationEventKey: "page:about-us:updated" },
          SCHEMA,
        ],
        [
          "failed with compensation key",
          { state: "failed_no_mutation", compensationInvalidationEventKey: comp },
          SCHEMA,
        ],
        ["committed with compensation key", { compensationInvalidationEventKey: comp }, SCHEMA],
        ["restored without compensation key", { state: restored }, SCHEMA],
        ["restored without target digest", { state: restored, rollbackTargetDigest: null }, SCHEMA],
        ["non-success source status", { sourceStatus: "failed" }, SCHEMA],
        ["empty mutation key", { mutationInvalidationEventKey: "" }, VALUE],
        ["rollback position overflow", { rollbackPosition: 512 }, SCHEMA],
        ["malformed evidence digest", { sourceEvidenceDigest: "NOT-HEX" }, SCHEMA],
        ["malformed after digest", { sourceAfterDigest: "" }, SCHEMA],
        ["malformed target digest", { state: restored, rollbackTargetDigest: "zz" }, SCHEMA],
        ["persisted progress digest column", { progressDigest: PROGRESS_DIGEST }, SCHEMA],
      ],
      buildProgress
    );
  });
});

describe("buildLegacyCombinedPositionMap", () => {
  it("returns a deeply frozen empty map for an empty plan", () => {
    const map = buildLegacyCombinedPositionMap({ coreCount: 0, templateCount: 0 });
    expect(map).toEqual({ coreCount: 0, templateCount: 0, total: 0, core: [], template: [] });
    expect(Object.isFrozen(map)).toBe(true);
    expect(Object.isFrozen(map.core)).toBe(true);
    expect(Object.isFrozen(map.template)).toBe(true);
  });

  it("pins core-only and template-only vectors", () => {
    expect(buildLegacyCombinedPositionMap({ coreCount: 3, templateCount: 0 }).core).toEqual([
      { kind: "core", localPosition: 0, sourcePosition: 0, rollbackPosition: 2 },
      { kind: "core", localPosition: 1, sourcePosition: 1, rollbackPosition: 1 },
      { kind: "core", localPosition: 2, sourcePosition: 2, rollbackPosition: 0 },
    ]);
    expect(buildLegacyCombinedPositionMap({ coreCount: 0, templateCount: 2 }).template).toEqual([
      { kind: "template", localPosition: 0, sourcePosition: 0, rollbackPosition: 1 },
      { kind: "template", localPosition: 1, sourcePosition: 1, rollbackPosition: 0 },
    ]);
  });

  it("pins the mixed vector: core-first source, template-first rollback", () => {
    const map = buildLegacyCombinedPositionMap({ coreCount: 2, templateCount: 1 });
    expect(map.total).toBe(3);
    expect(map.core).toEqual([
      { kind: "core", localPosition: 0, sourcePosition: 0, rollbackPosition: 2 },
      { kind: "core", localPosition: 1, sourcePosition: 1, rollbackPosition: 1 },
    ]);
    expect(map.template).toEqual([
      { kind: "template", localPosition: 0, sourcePosition: 2, rollbackPosition: 0 },
    ]);
    const bySource = [...map.core, ...map.template].sort(
      (left, right) => left.sourcePosition - right.sourcePosition
    );
    expect(bySource.map((entry) => entry.sourcePosition)).toEqual([0, 1, 2]);
    expect(bySource.map((entry) => entry.rollbackPosition)).toEqual([2, 1, 0]);
    expect(Object.isFrozen(bySource[0])).toBe(true);
  });

  it("accepts the exact 512-member plan with contiguous global sets", () => {
    const map = fullPlanMap();
    expect(map.total).toBe(COMBINED_LIMIT);
    const entries = [...map.core, ...map.template];
    const expected = Array.from({ length: 512 }, (_unused, index) => index);
    const sorted = (positions: number[]) => positions.sort((a, b) => a - b);
    expect(sorted(entries.map((entry) => entry.sourcePosition))).toEqual(expected);
    expect(sorted(entries.map((entry) => entry.rollbackPosition))).toEqual(expected);
    expect(map.core.every((entry) => entry.kind === "core")).toBe(true);
    expect(map.template.every((entry) => entry.kind === "template")).toBe(true);
  });

  it("rejects a 513-member plan and every malformed count", () => {
    expectOverrideCodes(
      [
        [
          "total 513",
          { coreCount: COMBINED_LIMIT - TEMPLATE_LIMIT + 1, templateCount: TEMPLATE_LIMIT },
          LIMIT,
        ],
        ["core ceiling plus template", { coreCount: COMBINED_LIMIT, templateCount: 1 }, LIMIT],
        ["template ceiling overflow", { coreCount: 1, templateCount: TEMPLATE_LIMIT + 1 }, LIMIT],
        ["negative core count", { coreCount: -1, templateCount: 0 }, SCHEMA],
        ["fractional core count", { coreCount: 1.5, templateCount: 0 }, SCHEMA],
        ["missing template count", { coreCount: 1 }, SCHEMA],
        ["unknown member", { coreCount: 1, templateCount: 0, extra: true }, SCHEMA],
      ],
      (input) =>
        buildLegacyCombinedPositionMap(
          input as Parameters<typeof buildLegacyCombinedPositionMap>[0]
        )
    );
  });
});

describe("buildLegacyRollbackCombinedProgressDigest", () => {
  it("pins the exact members:[] SHA-256 vector", () => {
    expect(referenceCanonical(combinedInput())).toBe(
      '{"contract":"coderso.legacy-rollback-combined-progress@v1","members":[],' +
        '"rollbackRunId":"2b7c3d4e-5f60-4a71-9b8c-1d2e3f4a5b6c",' +
        '"sourceRunId":"1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b"}'
    );
    expect(buildLegacyRollbackCombinedProgressDigest(combinedInput())).toBe(
      "34e065341670fa42ce19911a9ffb831602ae9c6a6ea932a9317d48a498264ebb"
    );
  });

  it("hashes a mixed core/template plan and reacts to every member byte", () => {
    const mixed = [coreMember(0, 2, 1), coreMember(1, 1, 3), templateMember(2, 0)];
    const digest = combinedDigest(mixed);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(combinedDigest(mixed.slice())).toBe(digest);
    expect(
      combinedDigest([
        coreMember(0, 2, 1),
        { ...coreMember(1, 1, 3), rollbackItemDigest: syntheticDigest(2_001) },
        templateMember(2, 0),
      ])
    ).not.toBe(digest);
    expect(
      combinedDigest([
        coreMember(0, 2, 1),
        coreMember(1, 1, 3),
        { ...templateMember(2, 0), progressDigest: AFTER_DIGEST },
      ])
    ).not.toBe(digest);
  });

  it("accepts the 512-member mixed plan built from the position map", () => {
    const map = fullPlanMap();
    const members = [
      ...map.core.map((entry) =>
        coreMember(entry.sourcePosition, entry.rollbackPosition, entry.localPosition + 1)
      ),
      ...map.template.map((entry) => templateMember(entry.sourcePosition, entry.rollbackPosition)),
    ];
    expect(combinedDigest(members)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a 513-member plan", () => {
    const members = Array.from({ length: COMBINED_LIMIT + 1 }, (_unused, index) =>
      coreMember(index, COMBINED_LIMIT - index, index + 1)
    );
    expect(buildLegacyRollbackCombinedProgressDigest.length).toBe(1);
    expectCode("513 members", () => combinedDigest(members), LIMIT);
  });

  it("rejects a nonempty core member with a null or missing rollback receipt", () => {
    const nullReceipt = combinedInput([
      { ...coreMember(0, 0, 1), rollbackItemId: null, rollbackItemDigest: null },
    ]);
    const missingReceipt = combinedInput([
      withoutMember(
        { ...coreMember(0, 0, 1), rollbackItemId: syntheticUuid(2) },
        "rollbackItemDigest"
      ),
    ]);
    expectCodes([
      ["null receipt", () => buildLegacyRollbackCombinedProgressDigest(nullReceipt), SCHEMA],
      ["missing receipt", () => buildLegacyRollbackCombinedProgressDigest(missingReceipt), SCHEMA],
    ]);
  });

  it("requires source ASC order, unique source identities, and contiguous sets", () => {
    // One source item (or evidence row) named twice contradicts the graph while
    // positions stay unique and contiguous, so only the identity refusal can
    // reject those frames.
    expectMemberCodes(
      [
        ["source order descending", [coreMember(1, 1, 1), coreMember(0, 0, 3)]],
        ["source position gap", [coreMember(0, 0, 1), coreMember(2, 1, 3)]],
        [
          "duplicate rollback position",
          [coreMember(0, 0, 1), coreMember(1, 0, 3), coreMember(2, 2, 5)],
        ],
        ["rollback position gap", [coreMember(0, 0, 1), coreMember(1, 1, 3), coreMember(2, 3, 5)]],
        [
          "duplicate core source item id",
          [coreMember(0, 1, 1), { ...coreMember(1, 0, 3), sourceItemId: syntheticUuid(1) }],
        ],
        [
          "duplicate template source evidence id",
          [
            templateMember(0, 1),
            { ...templateMember(1, 0), sourceEvidenceId: templateMember(0, 1).sourceEvidenceId },
          ],
        ],
      ],
      VALUE
    );
    expect(combinedDigest([coreMember(0, 0, 1), coreMember(1, 1, 3), coreMember(2, 2, 5)])).toMatch(
      /^[0-9a-f]{64}$/
    );
    expect(combinedDigest([templateMember(0, 0), templateMember(1, 1)])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects unknown frames, kinds, positions, and digests", () => {
    expectMemberCodes(
      [
        ["unknown kind", [{ ...coreMember(0, 0, 1), kind: "unknown" }]],
        ["unknown member", [{ ...coreMember(0, 0, 1), extra: 1 }]],
        ["missing member", [{ ...coreMember(0, 0, 1), rollbackItemDigest: undefined }]],
        ["malformed evidence id", [{ ...templateMember(0, 0), sourceEvidenceId: "not-a-uuid" }]],
        ["overflow position", [{ ...coreMember(0, 512, 1) }]],
        ["malformed rollback digest", [{ ...coreMember(0, 0, 1), rollbackItemDigest: "not-hex" }]],
        ["empty progress digest", [{ ...templateMember(0, 0), progressDigest: "" }]],
        ["template member with item keys", [{ ...coreMember(0, 0, 1), kind: "template" }]],
      ],
      SCHEMA
    );
    expectCodes([
      [
        "wrong contract version",
        () =>
          buildLegacyRollbackCombinedProgressDigest({
            contract: "coderso.legacy-rollback-combined-progress@v2",
            sourceRunId: RUN_ID,
            rollbackRunId: ROLLBACK_RUN_ID,
            members: [],
          } as unknown as LegacyRollbackCombinedProgressDigestInputV1),
        SCHEMA,
      ],
      [
        "missing rollback run",
        () =>
          buildLegacyRollbackCombinedProgressDigest({
            contract: "coderso.legacy-rollback-combined-progress@v1",
            sourceRunId: RUN_ID,
            members: [],
          } as unknown as LegacyRollbackCombinedProgressDigestInputV1),
        SCHEMA,
      ],
    ]);
  });
});

describe("import isolation from DB and runtime", () => {
  const source = readFileSync(
    fileURLToPath(
      new URL("../../../core/services/kits/legacyRollbackProgressDigest.ts", import.meta.url)
    ),
    "utf8"
  );

  it("imports nothing from the DB, schema, runtime, or Bun APIs", () => {
    for (const forbidden of [
      "db/client",
      "db/schema",
      "drizzle-orm",
      "process.env",
      "Bun.",
      "node:child_process",
      "await import(",
      "require(",
    ]) {
      expect(source.includes(forbidden), `unexpected token: ${forbidden}`).toBe(false);
    }
    for (const sql of ["insert into", "delete from", "select ", "update "]) {
      expect(source.toLowerCase().includes(sql), `unexpected SQL: ${sql}`).toBe(false);
    }
  });

  it("declares only node:crypto as a module import", () => {
    const specifiers = [...source.matchAll(/^import\s+[^;]*?from\s+"([^"]+)";?$/gm)].map(
      (match) => match[1]
    );
    expect(specifiers).toEqual(["node:crypto"]);
  });
});
