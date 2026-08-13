// TASK-543 codeql-self-test (single owner: TASK-545-02-L02). Environment-neutral ESM.

import { Script } from "node:vm";
import {
  ADMIN_ORIGIN,
  EMPTY_SHA256,
  POSTS_LIST_URL,
  POST_CLOSE_SELECTOR,
  POST_TITLE_SELECTOR,
  RESPONSIVE_WIDTHS,
  RUN_CODE_COMMAND_MAX_BYTES,
  SMOKE_PASSWORD_FILL_COMMAND,
  SMOKE_SESSION_PREFIX,
} from "./task-543-smoke-schema.mjs";
import {
  expectedEvidenceAssertionCommand,
  expectedTransientAssertionCommands,
  isFullSmokeCliCommand,
  resetEvidenceValid,
  transientEvidenceValid,
  validateScenarioByKind,
} from "./task-543-smoke-scenario-validation.mjs";
import {
  expectedAutosavePayload,
  expectedManualPayload,
  expectedMetadataPayload,
} from "./task-543-smoke-command-builders.mjs";
import {
  buildEvidenceOperationRunCodeSource,
  canonicalEvidenceOperationEncoding,
  codeQlSafeJavaScriptStringLiteral,
  smokeRunOperation,
} from "./task-543-smoke-operation-code.mjs";
import {
  receiptIntegrityValid,
  sameRawValue,
  sameSequence,
  sha256Text,
  stableSerialize,
  strictSummaryExitCode,
} from "./task-543-gate-contracts.mjs";
import {
  bootstrapPasswordReceiptValid,
  credentialReceiptValidWithoutDigest,
  successTimelineReceiptIntegrityValid,
} from "./task-543-smoke-timeline.mjs";
import {
  failurePrefixReceiptsValid,
} from "./task-543-smoke-failure-prefix.mjs";

export function extractSmokeRunCodeSource(command) {
  const prefix = `${SMOKE_SESSION_PREFIX}run-code '`;
  if (!command.startsWith(prefix) || !command.endsWith("'")) {
    throw new Error("TASK-543 self-test run-code command is invalid");
  }
  return command.slice(prefix.length, -1);
}

export async function runTask543CodeQlSelfTest() {
  const assert = (condition, label) => {
    if (!condition) throw new Error(`TASK-543 CodeQL self-test failed: ${label}`);
  };
  const expectFailure = async (operation, label) => {
    let failed = false;
    try {
      await operation();
    } catch {
      failed = true;
    }
    assert(failed, label);
  };
  const finalOperations = {
    "clean-close": "assert-clean-close",
    "dirty-delayed-close": "assert-dirty-delayed-close",
    "pending-revert-restoration": "assert-pending-revert-restoration",
    "failure-retry": "assert-failure-retry",
    "double-close": "assert-double-close",
    "table-keyboard": "assert-table-keyboard",
    "mid-viewport-metadata": "assert-mid-viewport-metadata",
  };
  const transientOperations = {
    "dirty-delayed-close": "assert-transient-dirty-delayed-close",
    "pending-revert-restoration": "assert-transient-pending-revert-restoration",
    "failure-retry": "assert-transient-failure-retry",
    "double-close": "assert-transient-double-close",
  };
  const zeroTransientKinds = ["clean-close", "table-keyboard", "mid-viewport-metadata"];
  const operationIds = [
    ...Object.values(finalOperations),
    ...Object.values(transientOperations),
    "reset-scenario",
  ];
  let maximumCommandBytes = 0;
  const selfTestFixture = {
    id: "fixture-1",
    title: "Original title",
    editorUrl: `${POSTS_LIST_URL}/fixture-1`,
    draftTitleA: "Draft A",
    draftTitleB: "Original title",
    cleanPayload: {
      slug: "original-title",
      data: { version: 1 },
      tags: ["self-test"],
      taxonomy: { category: "security" },
      seo: { title: "Original title" },
    },
  };
  const compileCommand = (command, label) => {
    const source = extractSmokeRunCodeSource(command);
    const commandBytes = Buffer.byteLength(command, "utf8");
    maximumCommandBytes = Math.max(maximumCommandBytes, commandBytes);
    assert(isFullSmokeCliCommand(command), `${label} is not a complete smoke command`);
    assert(commandBytes < RUN_CODE_COMMAND_MAX_BYTES, `${label} command exceeds its byte budget`);
    assert(source.includes(`wf543-operation:${label}`), `${label} operation marker is absent`);
    for (const otherOperation of operationIds) {
      if (otherOperation !== label) {
        assert(
          !source.includes(`wf543-operation:${otherOperation}`),
          `${label} contains the ${otherOperation} operation marker`
        );
      }
    }
    const execute = new Script(`(${source})`, {
      filename: `task-543-${label}.codeql-self-test.js`,
    }).runInThisContext();
    assert(typeof execute === "function", `${label} did not compile to a function`);
    return { execute, source };
  };
  const createAssertionPage = (kind, transient) => {
    const basePath = `/admin/api/posts/${encodeURIComponent(selfTestFixture.id)}`;
    const draftText =
      kind === "pending-revert-restoration"
        ? selfTestFixture.draftTitleB
        : selfTestFixture.draftTitleA;
    const initialMutations =
      kind === "clean-close" || kind === "table-keyboard" || kind === "mid-viewport-metadata"
        ? []
        : kind === "pending-revert-restoration" && !transient
          ? [
              {
                method: "POST",
                path: `${basePath}/autosave`,
                payload: expectedAutosavePayload(selfTestFixture, selfTestFixture.draftTitleA),
              },
              {
                method: "POST",
                path: `${basePath}/autosave`,
                payload: expectedAutosavePayload(selfTestFixture, selfTestFixture.draftTitleB),
              },
            ]
          : [
              {
                method: "POST",
                path: `${basePath}/autosave`,
                payload: expectedAutosavePayload(selfTestFixture, draftText),
              },
            ];
    const pendingCount =
      kind === "pending-revert-restoration" && !transient
        ? 2
        : ["dirty-delayed-close", "pending-revert-restoration", "double-close"].includes(kind)
          ? 1
          : 0;
    const state = {
      spec: { fixtureId: selfTestFixture.id, title: selfTestFixture.title },
      initialTitle: selfTestFixture.title,
      mutations: initialMutations,
      navigationUrls: kind === "table-keyboard" ? [selfTestFixture.editorUrl, POSTS_LIST_URL] : [],
      pendingRoutes: Array.from({ length: pendingCount }, () => () => {}),
      table: {
        titleNavigationCount: 1,
        titleUrl: selfTestFixture.editorUrl,
        checkboxToggled: true,
        checkboxNavigationCount: 0,
        actionMenuOpened: true,
        actionNavigationCount: 0,
      },
      responsiveOutputs: RESPONSIVE_WIDTHS.map((width) => ({
        width,
        visibleStatusCopies: 1,
        visibleAuthorCopies: 1,
        visibleDateCopies: 1,
      })),
    };
    let currentUrl = selfTestFixture.editorUrl;
    const closeLocator = {
      async getAttribute(name) {
        if (name === "aria-busy") return "true";
        if (name === "data-wf543-dom-click-events") return "2";
        if (name === "data-post-editor-close-pending") return "true";
        return null;
      },
      async isDisabled() {
        return true;
      },
      async click() {},
    };
    const titleLocator = {
      async inputValue() {
        return draftText;
      },
      async isEditable() {
        return true;
      },
    };
    const retry = {
      async waitFor() {},
      async evaluate() {
        return true;
      },
      async click() {
        state.mutations.push(
          {
            method: "PATCH",
            path: basePath,
            payload: expectedManualPayload(selfTestFixture, draftText),
          },
          {
            method: "PATCH",
            path: `${basePath}/metadata`,
            payload: expectedMetadataPayload(selfTestFixture),
          }
        );
      },
      async count() {
        return 0;
      },
    };
    return {
      __wf543Scenario: state,
      async waitForTimeout() {},
      async waitForURL(url) {
        currentUrl = url;
        state.navigationUrls.push(url);
      },
      url() {
        return currentUrl;
      },
      locator(selector) {
        if (selector === POST_CLOSE_SELECTOR) return closeLocator;
        if (selector === POST_TITLE_SELECTOR) return titleLocator;
        if (selector === '[data-post-editor-save-draft="true"]') {
          return {
            async isDisabled() {
              return false;
            },
          };
        }
        throw new Error(`unexpected self-test locator: ${selector}`);
      },
      getByRole(role, options = {}) {
        if (role === "alert") {
          return {
            async waitFor() {},
            async isVisible() {
              return true;
            },
            async textContent() {
              return "Save failed";
            },
          };
        }
        if (role === "button" && options.name === "Retry now") return retry;
        return {
          async getAttribute(name) {
            return name === "aria-label" ? (options.name ?? "") : null;
          },
        };
      },
      async waitForResponse() {
        return {
          ok() {
            return true;
          },
          status() {
            return 200;
          },
          url() {
            return `${ADMIN_ORIGIN}${basePath}`;
          },
        };
      },
    };
  };

  let compiledOperations = 0;
  for (const [kind, operation] of Object.entries(finalOperations)) {
    const command = expectedEvidenceAssertionCommand({ kind });
    assert(isFullSmokeCliCommand(command), `${kind} final command contract`);
    const encoding = canonicalEvidenceOperationEncoding(operation, { kind });
    assert(command.includes(codeQlSafeJavaScriptStringLiteral(encoding)), `${kind} encoding`);
    const { execute } = compileCommand(command, operation);
    const output = await execute(createAssertionPage(kind, false));
    const finalSemanticsValid =
      kind === "mid-viewport-metadata"
        ? sameRawValue(output, {
            kind,
            orderedWidths: RESPONSIVE_WIDTHS,
            visibleSemanticCopies: RESPONSIVE_WIDTHS.map((width) => ({
              width,
              status: 1,
              author: 1,
              date: 1,
            })),
            mutations: [],
            navigationUrls: [],
          })
        : validateScenarioByKind({ kind, evidence: output }, selfTestFixture);
    assert(finalSemanticsValid, `${kind} final semantics`);
    compiledOperations += 1;
  }
  for (const [kind, operation] of Object.entries(transientOperations)) {
    const commands = expectedTransientAssertionCommands({ kind });
    assert(commands.length === 1, `${kind} transient command count`);
    assert(isFullSmokeCliCommand(commands[0]), `${kind} transient command contract`);
    const encoding = canonicalEvidenceOperationEncoding(operation, { kind });
    assert(commands[0].includes(codeQlSafeJavaScriptStringLiteral(encoding)), `${kind} encoding`);
    const { execute } = compileCommand(commands[0], operation);
    const output = await execute(createAssertionPage(kind, true));
    const transientSemanticsValid =
      kind === "double-close"
        ? sameRawValue(output, {
            kind,
            phase: "pending",
            pendingRoutes: 1,
            domClickEvents: 2,
            closeBusy: true,
            closeDisabled: true,
            closePendingData: true,
            nonCloseEditable: true,
            navigationCount: 0,
          })
        : transientEvidenceValid(
            { kind, commandResults: { transientAssertion: [{ parsedOutput: output }] } },
            selfTestFixture
          );
    assert(transientSemanticsValid, `${kind} transient semantics`);
    compiledOperations += 1;
  }
  for (const kind of zeroTransientKinds) {
    assert(expectedTransientAssertionCommands({ kind }).length === 0, `${kind} transient absence`);
  }

  const hostile =
    `""''\`\`\\\\\r\n\u2028\u2029</script>;&|$() ` + `);globalThis.__wf543Injected=true;//`;
  const resetInput = {
    scenarioId: `scenario-${hostile}`,
    fixtureId: `fixture-${hostile}`,
    title: `title-${hostile}`,
    editorUrl: `https://example.test/${hostile}`,
  };
  const resetCommand = smokeRunOperation("reset-scenario", resetInput);
  assert(isFullSmokeCliCommand(resetCommand), "reset command contract");
  const { execute: executeReset, source: resetSource } = compileCommand(
    resetCommand,
    "reset-scenario"
  );
  assert(!resetSource.includes(hostile), "hostile reset value entered executable source");
  const resetCalls = [];
  let resetUrl = resetInput.editorUrl;
  const resetPage = {
    __wf543Scenario: { routeHandlers: new Map() },
    off() {},
    locator(selector) {
      if (selector === POST_CLOSE_SELECTOR) {
        return {
          async count() {
            return 0;
          },
          async click() {
            resetCalls.push(["click", selector]);
          },
        };
      }
      if (selector === POST_TITLE_SELECTOR) {
        return {
          async waitFor() {},
          async inputValue() {
            return "pre-reset-title";
          },
          async fill(value) {
            resetCalls.push(["fill", value]);
          },
        };
      }
      throw new Error(`unexpected reset locator: ${selector}`);
    },
    async goto(url) {
      resetUrl = url;
      resetCalls.push(["goto", url]);
    },
    async waitForURL(url) {
      resetUrl = url;
    },
    async waitForResponse(predicate) {
      const response = {
        request() {
          return { method: () => "PATCH" };
        },
        url() {
          return `${ADMIN_ORIGIN}/admin/api/posts/${encodeURIComponent(resetInput.fixtureId)}`;
        },
        ok() {
          return true;
        },
        status() {
          return 200;
        },
      };
      assert(predicate(response), "reset response predicate");
      resetCalls.push(["response", response.url()]);
      return response;
    },
    url() {
      return resetUrl;
    },
    getByRole(role, options) {
      assert(role === "link", "reset row role");
      return {
        async waitFor() {},
        async getAttribute(name) {
          return name === "aria-label" ? options.name : null;
        },
      };
    },
  };
  globalThis.__wf543Injected = false;
  const resetOutput = await executeReset(resetPage);
  assert(globalThis.__wf543Injected === false, "reset injection sentinel changed");
  delete globalThis.__wf543Injected;
  assert(
    resetCalls.some(([name, value]) => name === "goto" && value === resetInput.editorUrl) &&
      resetCalls.some(([name, value]) => name === "fill" && value === resetInput.title) &&
      resetCalls.some(
        ([name, value]) =>
          name === "response" &&
          value === `${ADMIN_ORIGIN}/admin/api/posts/${encodeURIComponent(resetInput.fixtureId)}`
      ) &&
      resetEvidenceValid(
        resetOutput,
        { id: resetInput.scenarioId, kind: "dirty-delayed-close" },
        { id: resetInput.fixtureId, title: resetInput.title }
      ),
    "reset payload did not round-trip byte-identically"
  );
  compiledOperations += 1;

  let negativeCases = 0;
  assert(strictSummaryExitCode("- semgrep: ok (0 findings)", "semgrep") === 0, "strict ok");
  assert(
    strictSummaryExitCode("- semgrep: non-zero:7 (blocked)", "semgrep") === 7,
    "strict non-zero"
  );
  for (const [label, output] of [
    ["missing code", "- semgrep: non-zero: (blocked)"],
    ["nondigit code", "- semgrep: non-zero:7x (blocked)"],
    ["unsafe integer", `- semgrep: non-zero:${"9".repeat(400)} (blocked)`],
  ]) {
    assert(strictSummaryExitCode(output, "semgrep") === null, `strict ${label}`);
    negativeCases += 1;
  }
  for (const [label, operation] of [
    ["unknown kind", () => expectedEvidenceAssertionCommand({ kind: "unknown" })],
    [
      "unknown key",
      () => smokeRunOperation("assert-clean-close", { kind: "clean-close", unknown: true }),
    ],
    ["NUL", () => smokeRunOperation("reset-scenario", { ...resetInput, title: "bad\0title" })],
    [
      "over budget",
      () => smokeRunOperation("reset-scenario", { ...resetInput, title: "x".repeat(32_769) }),
    ],
  ]) {
    await expectFailure(async () => operation(), `host ${label}`);
    negativeCases += 1;
  }

  const safeOperation = "assert-clean-close";
  const safeInput = { kind: "clean-close" };
  const safeEncoding = canonicalEvidenceOperationEncoding(safeOperation, safeInput);
  const safeSource = buildEvidenceOperationRunCodeSource(safeOperation, safeInput);
  const executeMutatedEncoding = async (encoded, label) => {
    let pageCalls = 0;
    const page = new Proxy(
      {},
      {
        get() {
          pageCalls += 1;
          return () => {};
        },
      }
    );
    const mutantSource = safeSource.replace(
      codeQlSafeJavaScriptStringLiteral(safeEncoding),
      codeQlSafeJavaScriptStringLiteral(encoded)
    );
    const execute = new Script(`(${mutantSource})`, {
      filename: `task-543-${label}.negative-self-test.js`,
    }).runInThisContext();
    await expectFailure(async () => execute(page), label);
    assert(pageCalls === 0, `${label} reached page interaction`);
    negativeCases += 1;
  };
  await executeMutatedEncoding("A", "noncanonical base64url");
  await executeMutatedEncoding("not+base64", "malformed base64url");
  await executeMutatedEncoding(Buffer.from([0xc3, 0x28]).toString("base64url"), "invalid UTF-8");
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({ operation: "unknown-operation", payload: { kind: "clean-close" } }),
      "utf8"
    ).toString("base64url"),
    "unknown decoded operation"
  );
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({ operation: safeOperation, payload: { kind: "clean-close", extra: true } }),
      "utf8"
    ).toString("base64url"),
    "unknown decoded key"
  );
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({
        operation: "reset-scenario",
        payload: { ...resetInput, title: "bad\0title" },
      }),
      "utf8"
    ).toString("base64url"),
    "decoded NUL"
  );
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({
        operation: "reset-scenario",
        payload: { ...resetInput, title: "x".repeat(65_536) },
      }),
      "utf8"
    ).toString("base64url"),
    "decoded over-budget payload"
  );

  const nestedCredentialReceipt = {
    command: SMOKE_PASSWORD_FILL_COMMAND,
    status: 0,
    stdout: "",
    stderr: "",
    stdoutSha256: EMPTY_SHA256,
    stderrSha256: EMPTY_SHA256,
    parsedOutput: null,
  };
  const timelineCredentialReceipt = {
    ...nestedCredentialReceipt,
    sequence: 1,
    scope: "browser:password",
  };
  const credentialSmoke = {
    commands: { passwordFill: SMOKE_PASSWORD_FILL_COMMAND },
    bootstrap: { passwordFill: nestedCredentialReceipt },
  };
  const failureCredentialSmoke = {
    commandTimeline: [timelineCredentialReceipt],
    failedAtSequence: 2,
  };
  let credentialDigestCalls = 0;
  const digestSpy = () => {
    credentialDigestCalls += 1;
    return "0".repeat(64);
  };
  assert(bootstrapPasswordReceiptValid(credentialSmoke), "nested credential receipt");
  assert(
    successTimelineReceiptIntegrityValid(timelineCredentialReceipt, credentialSmoke, digestSpy),
    "success timeline credential receipt"
  );
  assert(
    failurePrefixReceiptsValid(failureCredentialSmoke, digestSpy),
    "failure-prefix timeline credential receipt"
  );
  const missingScopeReceipt = { ...timelineCredentialReceipt };
  delete missingScopeReceipt.scope;
  for (const [label, receipt] of [
    ["missing timeline scope", missingScopeReceipt],
    ["wrong timeline scope", { ...timelineCredentialReceipt, scope: "browser:email" }],
    [
      "timeline command drift",
      { ...timelineCredentialReceipt, command: `${SMOKE_PASSWORD_FILL_COMMAND} drift` },
    ],
  ]) {
    assert(
      !successTimelineReceiptIntegrityValid(receipt, credentialSmoke, digestSpy),
      `success timeline accepted ${label}`
    );
    assert(
      !failurePrefixReceiptsValid({ commandTimeline: [receipt], failedAtSequence: 2 }, digestSpy),
      `failure timeline accepted ${label}`
    );
    negativeCases += 2;
  }
  assert(credentialDigestCalls === 0, "credential receipt reached a fast digest");
  for (const [label, receipt, context, command] of [
    [
      "nested as timeline",
      nestedCredentialReceipt,
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "timeline as nested",
      timelineCredentialReceipt,
      "bootstrap.passwordFill",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "wrong scope",
      { ...timelineCredentialReceipt, scope: "browser:email" },
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "wrong command",
      timelineCredentialReceipt,
      "timeline.browserPassword",
      `${SMOKE_PASSWORD_FILL_COMMAND} drift`,
    ],
    [
      "nonempty stdout",
      { ...timelineCredentialReceipt, stdout: "drift" },
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "wrong digest",
      { ...timelineCredentialReceipt, stderrSha256: "0".repeat(64) },
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
  ]) {
    assert(
      !credentialReceiptValidWithoutDigest(receipt, context, command),
      `credential mutation accepted: ${label}`
    );
    negativeCases += 1;
  }

  const normalReceipt = {
    command: "printf evidence",
    status: 0,
    stdout: "evidence stdout",
    stderr: "evidence stderr",
    stdoutSha256: sha256Text("evidence stdout"),
    stderrSha256: sha256Text("evidence stderr"),
    parsedOutput: { ok: true },
  };
  const ordinaryDigestInputs = [];
  assert(
    receiptIntegrityValid(normalReceipt, (value) => {
      ordinaryDigestInputs.push(value);
      return sha256Text(value);
    }),
    "normal secret-free receipt"
  );
  assert(
    sameSequence(ordinaryDigestInputs, [normalReceipt.stdout, normalReceipt.stderr]),
    "normal receipt digest order"
  );
  assert(
    !receiptIntegrityValid({ ...normalReceipt, stdoutSha256: "0".repeat(64) }) &&
      !receiptIntegrityValid({ ...normalReceipt, stderrSha256: "0".repeat(64) }),
    "normal receipt digest mismatch"
  );

  return {
    pass: true,
    evidenceOperations: Object.keys(finalOperations).length,
    transientOperations: Object.keys(transientOperations).length,
    zeroTransientKinds: zeroTransientKinds.length,
    resetOperations: 1,
    compiledOperations,
    credentialDigestCalls,
    ordinaryDigestCalls: ordinaryDigestInputs.length,
    negativeCases,
    maximumCommandBytes,
  };
}

