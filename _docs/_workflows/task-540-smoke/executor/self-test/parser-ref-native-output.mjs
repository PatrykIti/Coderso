import { TASK_FAILURE } from "../config.mjs";
import { canonicalJson, invariant } from "../foundation.mjs";
import { validateExactJsonSchema } from "../json-schema.mjs";
import { parseRegisteredOutput } from "../output-parser.mjs";
import { evaluateExactPredicate, resolveExactRef } from "../ref-dsl.mjs";
import { deepEqualJson } from "../resource-contracts.mjs";

export async function runParserRefNativeOutputSelfTest({
  assertExecutionInput,
  assertNegative,
  buildFakeCapabilities,
  executeSmokePlanCore,
  expectAsyncFailure,
  plan,
  privateNativeSnapshotSizeIsValid,
  readExactEntryAuthorId,
  selfTestContext,
  selfTestJsonTransport,
  selfTestNativeTransport,
  selfTestNumberSchema,
  selfTestStringSchema,
}) {
  const failureCapabilities = buildFakeCapabilities({ failOrdinal: 25 });
  let failure = null;
  try {
    await executeSmokePlanCore(plan, failureCapabilities);
  } catch (error) {
    failure = error;
  }
  invariant(failure === TASK_FAILURE && Object.isFrozen(failure), "failure shape drift");
  invariant(failureCapabilities.cleaned, "failure cleanup did not run");
  invariant(failureCapabilities.calls.at(-1) === "failure-cleanup", "failure cleanup order drift");

  await expectAsyncFailure(async () => assertExecutionInput({}), "missing public input");
  await expectAsyncFailure(
    async () =>
      assertExecutionInput({
        root: "/home/coder/project/Coderso",
        nonce: "0123456789ab",
        assertSafeEvidence() {},
        snapshotRepository() {},
        dispatchAgent() {},
      }),
    "agent injection"
  );
  await expectAsyncFailure(
    async () =>
      assertExecutionInput({
        root: "/home/coder/project/Coderso",
        nonce: "0123456789ab",
        assertSafeEvidence() {},
        snapshotRepository() {},
        command: "rm -rf /",
      }),
    "command injection"
  );
  const parsed = parseRegisteredOutput(
    { encoding: "json-string", kind: "object", keys: ["assertion", "target", "observations"] },
    Buffer.from(JSON.stringify(JSON.stringify({ assertion: "x", target: "y", observations: {} }))),
    "transport parser self-test"
  );
  invariant(parsed.assertion === "x", "transport JSON unwrap drift");
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        { encoding: "json", kind: "object", keys: ["assertion", "target", "observations"] },
        Buffer.from(JSON.stringify({ assertion: "x", target: "y", observations: {}, pass: true })),
        "pass injection"
      ),
    "trusted pass injection"
  );

  const strictObservationSchema = {
    type: "object",
    properties: {
      assertion: selfTestStringSchema({ minLength: 1, maxLength: 64 }),
      geometry: {
        type: "object",
        properties: {
          x: selfTestNumberSchema(),
          width: selfTestNumberSchema({ minimum: 0 }),
        },
      },
      tags: {
        type: "array",
        items: selfTestStringSchema({ minLength: 1, maxLength: 32 }),
        minItems: 1,
        maxItems: 8,
        unique: true,
      },
    },
  };
  const strictObservationPredicate = {
    op: "and",
    items: [
      {
        op: "nonEmptyString",
        value: { op: "output", path: ["assertion"] },
      },
      {
        op: "within",
        actual: { op: "output", path: ["geometry", "x"] },
        expected: { op: "literal", value: 10 },
        tolerance: { op: "literal", value: 0.25 },
      },
      {
        op: "compare",
        mode: "gt",
        left: { op: "output", path: ["geometry", "width"] },
        right: { op: "literal", value: 0 },
      },
      {
        op: "sameSet",
        left: { op: "output", path: ["tags"] },
        right: { op: "literal", value: ["visible", "settled"] },
        duplicates: "reject",
      },
      {
        op: "every",
        source: { op: "output", path: ["tags"] },
        as: "tag",
        predicate: {
          op: "nonEmptyString",
          value: { op: "var", name: "tag", path: [] },
        },
      },
    ],
  };
  const strictObservationContract = {
    grammar: selfTestJsonTransport(1),
    schema: strictObservationSchema,
    predicate: strictObservationPredicate,
    rememberAs: "strictObservation",
  };
  const strictObservation = {
    assertion: "visible-geometry",
    geometry: { x: 10.2, width: 320 },
    tags: ["visible", "settled"],
  };
  const selfTestJsonFrame = (value) => Buffer.from(canonicalJson(value) + "\n");
  const strictContext = selfTestContext(plan, "dsl-success");
  const strictParsed = parseRegisteredOutput(
    strictObservationContract,
    selfTestJsonFrame(strictObservation),
    "dsl-success",
    strictContext
  );
  invariant(
    deepEqualJson(strictParsed, strictObservation),
    "exact output parser changed observations"
  );
  invariant(
    strictContext.priorOutputs.get("dsl-success") === strictParsed &&
      strictContext.variables.get("strictObservation") === strictParsed,
    "validated observations were not remembered atomically"
  );

  const extraNested = JSON.parse(JSON.stringify(strictObservation));
  extraNested.geometry.unexpected = true;
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        strictObservationContract,
        selfTestJsonFrame(extraNested),
        "dsl-extra-nested",
        selfTestContext(plan, "dsl-extra-nested")
      ),
    "extra nested output key"
  );
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        strictObservationContract,
        selfTestJsonFrame(JSON.stringify(strictObservation)),
        "dsl-wrong-layer",
        selfTestContext(plan, "dsl-wrong-layer")
      ),
    "wrong JSON layer"
  );

  const failedPredicateContext = selfTestContext(plan, "dsl-failed-predicate");
  const failedPredicateContract = {
    grammar: selfTestJsonTransport(1),
    schema: strictObservationSchema,
    predicate: {
      op: "within",
      actual: { op: "output", path: ["geometry", "x"] },
      expected: { op: "literal", value: 50 },
      tolerance: { op: "literal", value: 0 },
    },
    rememberAs: "mustNotPersist",
  };
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        failedPredicateContract,
        selfTestJsonFrame(strictObservation),
        "dsl-failed-predicate",
        failedPredicateContext
      ),
    "failed output predicate"
  );
  invariant(
    failedPredicateContext.priorOutputs.size === 0 && failedPredicateContext.variables.size === 0,
    "failed predicate retained an observation"
  );

  const duplicateSetContract = {
    grammar: selfTestJsonTransport(1),
    schema: {
      type: "object",
      properties: {
        values: {
          type: "array",
          items: selfTestStringSchema({ minLength: 1, maxLength: 8 }),
          minItems: 1,
          maxItems: 8,
          unique: false,
        },
      },
    },
    predicate: {
      op: "sameSet",
      left: { op: "output", path: ["values"] },
      right: { op: "literal", value: ["a"] },
      duplicates: "reject",
    },
    rememberAs: null,
  };
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        duplicateSetContract,
        selfTestJsonFrame({ values: ["a", "a"] }),
        "dsl-duplicate-set",
        selfTestContext(plan, "dsl-duplicate-set")
      ),
    "sameSet duplicate"
  );

  const arraySchema = {
    type: "array",
    items: { type: "integer", minimum: 0, maximum: 10 },
    minItems: 0,
    maxItems: 4,
    unique: false,
  };
  const arrayWithHole = new Array(1);
  await expectAsyncFailure(
    async () => validateExactJsonSchema(arraySchema, arrayWithHole, "array-hole"),
    "array hole"
  );
  const arrayWithCustomKey = [1];
  arrayWithCustomKey.extra = true;
  await expectAsyncFailure(
    async () => validateExactJsonSchema(arraySchema, arrayWithCustomKey, "array-custom-key"),
    "array custom key"
  );
  await expectAsyncFailure(
    async () =>
      validateExactJsonSchema(
        { type: "object", properties: { value: { type: "boolean" } } },
        Object.assign(Object.create(null), { value: true }),
        "nonplain-output"
      ),
    "nonplain JSON output"
  );
  await expectAsyncFailure(
    async () =>
      validateExactJsonSchema(selfTestNumberSchema(), Number.POSITIVE_INFINITY, "nonfinite-output"),
    "nonfinite JSON output"
  );
  validateExactJsonSchema(
    selfTestStringSchema({ minLength: 12, maxLength: 32, format: "page-id" }),
    "wf540-page-1",
    "valid-page-id"
  );
  await expectAsyncFailure(
    async () =>
      validateExactJsonSchema(
        selfTestStringSchema({ minLength: 1, maxLength: 32, format: "page-id" }),
        "p1",
        "invalid-page-id"
      ),
    "legacy page ID format"
  );

  const refContext = selfTestContext(plan, "ref-self-test");
  refContext.captures.bind("screen.id", "id/with-slash");
  refContext.priorOutputs.set("prior-action", { nested: { value: 7 } });
  refContext.variables.set("sample", { value: "retained" });
  refContext.currentOutput = { value: 3 };
  invariant(
    resolveExactRef({ op: "secret", name: "ADMIN_EMAIL" }, refContext) === "ADMIN_EMAIL",
    "secret Ref expanded a value"
  );
  invariant(
    resolveExactRef({ op: "capture", name: "screen.id" }, refContext) === "id/with-slash",
    "capture Ref drift"
  );
  invariant(
    resolveExactRef({ op: "fixture", path: ["fixturePrefix"] }, refContext) ===
      plan.fixtureBlueprint.fixturePrefix,
    "fixture Ref drift"
  );
  invariant(
    resolveExactRef(
      { op: "prior", actionId: "prior-action", path: ["nested", "value"] },
      refContext
    ) === 7,
    "prior Ref drift"
  );
  invariant(
    resolveExactRef({ op: "output", path: ["value"] }, refContext) === 3,
    "output Ref drift"
  );
  invariant(
    resolveExactRef({ op: "var", name: "sample", path: ["value"] }, refContext) === "retained",
    "var Ref drift"
  );
  invariant(
    resolveExactRef(
      {
        op: "rootPath",
        parts: [
          { op: "literal", value: "_docs" },
          { op: "literal", value: "evidence.json" },
        ],
      },
      refContext
    ) === "/task540-self-test-root/_docs/evidence.json",
    "rootPath Ref drift"
  );
  invariant(
    resolveExactRef({ op: "selector", templateId: "loginEmail", args: [] }, refContext) ===
      'input#email[name="email"][type="email"]',
    "selector Ref drift"
  );
  invariant(
    resolveExactRef({ op: "path", key: "builder" }, refContext) ===
      plan.fixtureBlueprint.origins.admin + "/admin/advanced/custom-screens/id%2Fwith-slash",
    "path Ref capture expansion drift"
  );
  invariant(
    deepEqualJson(
      resolveExactRef(
        {
          op: "array",
          items: [
            { op: "literal", value: 1 },
            { op: "literal", value: 2 },
          ],
        },
        refContext
      ),
      [1, 2]
    ),
    "array Ref drift"
  );
  invariant(
    deepEqualJson(
      resolveExactRef(
        { op: "object", properties: { safe: { op: "literal", value: true } } },
        refContext
      ),
      { safe: true }
    ),
    "object Ref drift"
  );
  invariant(
    resolveExactRef(
      {
        op: "sub",
        left: { op: "prior", actionId: "prior-action", path: ["nested", "value"] },
        right: { op: "output", path: ["value"] },
      },
      refContext
    ) === 4,
    "sub Ref drift"
  );
  invariant(
    resolveExactRef({ op: "length", value: { op: "literal", value: [1, 2, 3] } }, refContext) === 3,
    "length Ref drift"
  );
  const changedPointers = resolveExactRef(
    {
      op: "changedKeys",
      before: {
        op: "literal",
        value: { same: 1, nested: { value: 1 }, array: [1, 2], removed: true, "~slash/": 1 },
      },
      after: {
        op: "literal",
        value: { same: 1, nested: { value: 2, added: true }, array: [1, 3, 4], "~slash/": 2 },
      },
    },
    refContext
  );
  invariant(
    deepEqualJson(changedPointers, [
      "/array/1",
      "/array/2",
      "/nested/added",
      "/nested/value",
      "/removed",
      "/~0slash~1",
    ]),
    "changedKeys JSON Pointer drift"
  );
  await expectAsyncFailure(
    async () => resolveExactRef({ op: "unknown" }, refContext),
    "unknown Ref opcode"
  );
  await expectAsyncFailure(
    async () => resolveExactRef({ op: "literal", value: "$NOT_A_SECRET_REF" }, refContext),
    "literal dollar secret reference"
  );
  await expectAsyncFailure(
    async () => evaluateExactPredicate({ op: "unknown" }, refContext),
    "unknown Predicate opcode"
  );
  const shadowContext = selfTestContext(plan, "shadow-test");
  shadowContext.currentOutput = ["value"];
  shadowContext.variables.set("item", "existing");
  await expectAsyncFailure(
    async () =>
      evaluateExactPredicate(
        {
          op: "every",
          source: { op: "output", path: [] },
          as: "item",
          predicate: { op: "nonEmptyString", value: { op: "var", name: "item", path: [] } },
        },
        shadowContext
      ),
    "Predicate variable shadowing"
  );

  invariant(
    privateNativeSnapshotSizeIsValid(0, true) && privateNativeSnapshotSizeIsValid(1, false),
    "native snapshot size acceptance drift"
  );
  assertNegative(
    !privateNativeSnapshotSizeIsValid(0, false),
    "empty non-initial native snapshot rejection"
  );
  const entryAuthorId = "54000000-0000-4000-8000-000000000001";
  invariant(
    readExactEntryAuthorId(
      { author: { id: entryAuthorId, name: "Smoke Owner", email: "smoke@example.invalid" } },
      entryAuthorId,
      "self-test entry"
    ) === entryAuthorId,
    "entry author projection drift"
  );
  await expectAsyncFailure(
    async () =>
      readExactEntryAuthorId({ authorId: entryAuthorId }, entryAuthorId, "legacy self-test entry"),
    "legacy entry authorId projection"
  );

  const sessionAbsenceContract = {
    grammar: selfTestNativeTransport({
      nativeMode: "session-list-absence",
      sessionName: "wf540smoke",
      normalizedValue: true,
    }),
    schema: { type: "literal", value: true },
    predicate: null,
    rememberAs: null,
  };
  const emptySessionList = Buffer.from("  (no browsers)\n");
  invariant(
    parseRegisteredOutput(
      sessionAbsenceContract,
      emptySessionList,
      "session-absence",
      selfTestContext(plan, "session-absence")
    ) === true,
    "session absence parser drift"
  );
  const presentSessionList = Buffer.from(
    "### Browsers\n- owner-session:\n  - status: open\n  - browser-type: chromium\n  - user-data-dir: <in-memory>\n- wf540smoke:\n  - status: open\n  - browser-type: chromium\n  - user-data-dir: <in-memory>\n"
  );
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        sessionAbsenceContract,
        presentSessionList,
        "session-present",
        selfTestContext(plan, "session-present")
      ),
    "named session present"
  );
  await expectAsyncFailure(
    async () =>
      parseRegisteredOutput(
        sessionAbsenceContract,
        Buffer.from("### Browsers\n- malformed\n"),
        "session-malformed",
        selfTestContext(plan, "session-malformed")
      ),
    "malformed session list"
  );
  const nativeCloseContract = {
    grammar: selfTestNativeTransport({
      nativeMode: "exact-text",
      exactText: "Browser 'wf540smoke' closed\n\n",
      normalizedValue: "closed",
    }),
    schema: { type: "literal", value: "closed" },
    predicate: null,
    rememberAs: null,
  };
  invariant(
    parseRegisteredOutput(
      nativeCloseContract,
      Buffer.from("Browser 'wf540smoke' closed\n\n"),
      "native-close",
      selfTestContext(plan, "native-close")
    ) === "closed",
    "native exact-text parser drift"
  );

  const privateMarker = "TASK540_PRIVATE_DO_NOT_EGRESS";
  let privateFailure = null;
  try {
    parseRegisteredOutput(
      strictObservationContract,
      selfTestJsonFrame({
        assertion: "visible-geometry",
        geometry: { x: 10.2, width: 320, privateMarker },
        tags: ["visible", "settled"],
      }),
      "private-egress-test",
      selfTestContext(plan, "private-egress-test")
    );
  } catch (error) {
    privateFailure = error;
  }
  invariant(privateFailure !== null, "private egress fixture did not fail");
  invariant(
    !String(privateFailure).includes(privateMarker),
    "private output leaked through parser failure"
  );
  invariant(
    !canonicalJson(TASK_FAILURE).includes(privateMarker),
    "private output leaked through public failure"
  );

  return Object.freeze({ explicitNegativeCases: 2 });
}
