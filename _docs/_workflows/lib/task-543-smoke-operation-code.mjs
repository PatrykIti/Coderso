// TASK-543 smoke-operation-code (single owner: TASK-545-02-L02). Environment-neutral ESM.

import {
  stableSerialize,
} from "./task-543-gate-contracts.mjs";
import {
  RUN_CODE_COMMAND_MAX_BYTES,
  RUN_CODE_PAYLOAD_MAX_BYTES,
  RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH,
} from "./task-543-smoke-schema.mjs";
import {
  smokeRunCode,
} from "./task-543-smoke-command-builders.mjs";

export function requireExactPlainObject(value, keys, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new Error(`${label} has an invalid shape`);
  }
}

export function requireBoundedRunCodeString(value, maximumLength, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.includes("\0")
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

export function evidenceOperationKind(operation) {
  switch (operation) {
    case "assert-transient-dirty-delayed-close":
    case "assert-dirty-delayed-close":
      return "dirty-delayed-close";
    case "assert-transient-pending-revert-restoration":
    case "assert-pending-revert-restoration":
      return "pending-revert-restoration";
    case "assert-transient-failure-retry":
    case "assert-failure-retry":
      return "failure-retry";
    case "assert-transient-double-close":
    case "assert-double-close":
      return "double-close";
    case "assert-clean-close":
      return "clean-close";
    case "assert-table-keyboard":
      return "table-keyboard";
    case "assert-mid-viewport-metadata":
      return "mid-viewport-metadata";
    case "reset-scenario":
      return null;
    default:
      throw new Error("TASK-543 run-code operation is unknown");
  }
}

export function validateEvidenceOperationPayload(operation, input) {
  const expectedKind = evidenceOperationKind(operation);
  let payload;
  if (operation === "reset-scenario") {
    const keys = ["editorUrl", "fixtureId", "scenarioId", "title"];
    requireExactPlainObject(input, keys, "TASK-543 reset payload");
    payload = {
      editorUrl: requireBoundedRunCodeString(input.editorUrl, 8_192, "reset editor URL"),
      fixtureId: requireBoundedRunCodeString(input.fixtureId, 512, "reset fixture id"),
      scenarioId: requireBoundedRunCodeString(input.scenarioId, 512, "reset scenario id"),
      title: requireBoundedRunCodeString(input.title, 32_768, "reset title"),
    };
  } else {
    requireExactPlainObject(input, ["kind"], "TASK-543 assertion payload");
    if (input.kind !== expectedKind) {
      throw new Error("TASK-543 assertion kind does not match its operation");
    }
    payload = { kind: requireBoundedRunCodeString(input.kind, 128, "assertion kind") };
  }
  const envelope = { operation, payload };
  const json = stableSerialize(envelope);
  if (Buffer.byteLength(json, "utf8") > RUN_CODE_PAYLOAD_MAX_BYTES) {
    throw new Error("TASK-543 run-code payload exceeds its byte budget");
  }
  return envelope;
}

export function canonicalEvidenceOperationEncoding(operation, input) {
  const envelope = validateEvidenceOperationPayload(operation, input);
  const bytes = Buffer.from(stableSerialize(envelope), "utf8");
  const encoded = bytes.toString("base64url");
  if (
    encoded.length === 0 ||
    encoded.length > RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH ||
    !/^[A-Za-z0-9_-]+$/u.test(encoded)
  ) {
    throw new Error("TASK-543 run-code payload encoding is invalid");
  }
  const decoded = Buffer.from(encoded, "base64url");
  if (!decoded.equals(bytes) || decoded.toString("base64url") !== encoded) {
    throw new Error("TASK-543 run-code payload encoding is noncanonical");
  }
  return encoded;
}

export function codeQlSafeJavaScriptStringLiteral(value) {
  if (typeof value !== "string") throw new Error("TASK-543 JavaScript literal is invalid");
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\//gu, "\\u002f")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

export function buildEvidenceOperationRunCodeSource(operation, input) {
  const encodedLiteral = codeQlSafeJavaScriptStringLiteral(
    canonicalEvidenceOperationEncoding(operation, input)
  );
  let source;
  switch (operation) {
    case "assert-transient-dirty-delayed-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-dirty-delayed-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-dirty-delayed-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "dirty-delayed-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 delayed save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); return { kind: "dirty-delayed-close", phase: "pending", pendingRoutes: state.pendingRoutes.length, closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), draftText: await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(), nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-transient-pending-revert-restoration":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-pending-revert-restoration"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-pending-revert-restoration") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "pending-revert-restoration" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1 && state.mutations.length === 1, "wf543 restoration first save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); return { kind: "pending-revert-restoration", phase: "pending", pendingRoutes: state.pendingRoutes.length, closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), draftText: await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(), nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-transient-failure-retry":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-failure-retry"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-failure-retry") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "failure-retry" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; const alert = page.getByRole("alert"); const retry = page.getByRole("button", { name: "Retry now", exact: true }); await alert.waitFor(); await waitFor(() => state.mutations.length === 1, "wf543 failed autosave missing"); return { kind: "failure-retry", phase: "failure", alertVisible: await alert.isVisible(), alertText: (await alert.textContent())?.trim() ?? "", draftText: await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(), retryFocused: await retry.evaluate((button) => document.activeElement === button), mutationCount: state.mutations.length, navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-transient-double-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-double-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-double-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "double-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 double-close save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); return { kind: "double-close", phase: "pending", pendingRoutes: state.pendingRoutes.length, domClickEvents: Number(await close.getAttribute("data-wf543-dom-click-events") ?? "0"), closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), closePendingData: (await close.getAttribute("data-post-editor-close-pending")) === "true", nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-clean-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-clean-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-clean-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "clean-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); const state = page.__wf543Scenario; return { kind: "clean-close", cleanBeforeClose: state.initialTitle === state.spec.title, saveRequestCount: state.mutations.length, navigationCount: state.navigationUrls.length, mutations: state.mutations, navigationUrls: state.navigationUrls, finalUrl: page.url() };
      }`;
      break;
    case "assert-dirty-delayed-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-dirty-delayed-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-dirty-delayed-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "dirty-delayed-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 delayed save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); const evidence = { kind: "dirty-delayed-close", saveRequestCount: state.mutations.length, requestOrder: state.mutations.map((item) => item.method + " " + item.path), requestPayload: state.mutations[0]?.payload ?? {}, closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationBeforeRelease: state.navigationUrls.length, navigationAfterRelease: 0, mutations: [], navigationUrls: [], finalUrl: "" }; state.pendingRoutes.shift()(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); evidence.navigationAfterRelease = state.navigationUrls.length; evidence.mutations = state.mutations; evidence.navigationUrls = state.navigationUrls; evidence.finalUrl = page.url(); return evidence;
      }`;
      break;
    case "assert-pending-revert-restoration":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-pending-revert-restoration"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-pending-revert-restoration") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "pending-revert-restoration" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; state.pendingRoutes.shift()(); await waitFor(() => state.pendingRoutes.length === 1 && state.mutations.length === 2, "wf543 restoration save missing"); const evidence = { kind: "pending-revert-restoration", saveRequestCount: state.mutations.length, requestOrder: state.mutations.map((item, index) => (index === 0 ? "A " : "B ") + item.method + " " + item.path), payloadA: state.mutations[0]?.payload ?? {}, payloadB: state.mutations[1]?.payload ?? {}, navigationBeforeB: state.navigationUrls.length, navigationAfterB: 0, mutations: [], navigationUrls: [], finalUrl: "" }; state.pendingRoutes.shift()(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); evidence.navigationAfterB = state.navigationUrls.length; evidence.mutations = state.mutations; evidence.navigationUrls = state.navigationUrls; evidence.finalUrl = page.url(); return evidence;
      }`;
      break;
    case "assert-failure-retry":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-failure-retry"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-failure-retry") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "failure-retry" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; const alert = page.getByRole("alert"); const retry = page.getByRole("button", { name: "Retry now", exact: true }); await alert.waitFor(); await waitFor(() => state.mutations.length === 1, "wf543 failed autosave missing"); const alertVisible = await alert.isVisible(); const alertText = (await alert.textContent())?.trim() ?? ""; const draftText = await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(); const retryFocused = await retry.evaluate((button) => document.activeElement === button); const navigationAfterFailure = state.navigationUrls.length; const responsePath = (response) => { const raw = response.url(); const marker = "/admin/api/posts/"; const index = raw.indexOf(marker); return index < 0 ? "" : raw.slice(index).split("?")[0]; }; const basePath = "/admin/api/posts/" + encodeURIComponent(state.spec.fixtureId); const baseResponsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && responsePath(response) === basePath); const metadataResponsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && responsePath(response) === basePath + "/metadata"); await retry.click(); const [retryResponse, metadataRetryResponse] = await Promise.all([baseResponsePromise, metadataResponsePromise]); if (!retryResponse.ok() || !metadataRetryResponse.ok()) throw new Error("wf543 manual retry chain failed"); await waitFor(() => state.mutations.length === 3, "wf543 manual retry base and metadata mutations missing"); const saveDraft = page.locator("[data-post-editor-save-draft=\\"true\\"]"); const saveDeadline = Date.now() + 8000; while (await saveDraft.isDisabled()) { if (Date.now() > saveDeadline) throw new Error("wf543 manual retry did not settle"); await page.waitForTimeout(25); } const mutationCountAfterRetry = state.mutations.length; await retry.waitFor({ state: "hidden" }); const alertClearedAfterRetry = (await retry.count()) === 0; const editorUrlAfterRetry = page.url(); const navigationAfterRetry = state.navigationUrls.length; await page.locator("[data-post-editor-header-close=\\"true\\"]").click(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); return { kind: "failure-retry", autosavePostCount: state.mutations.filter((item) => item.method === "POST" && item.path.endsWith("/autosave")).length, manualPatchCount: state.mutations.filter((item) => item.method === "PATCH" && item.path === basePath).length, metadataPatchCount: state.mutations.filter((item) => item.method === "PATCH" && item.path === basePath + "/metadata").length, mutationCountAfterRetry, alertVisible, alertText, draftText, retryFocused, navigationAfterFailure, navigationAfterRetry, navigationAfterClose: state.navigationUrls.length, retrySucceeded: retryResponse.ok(), metadataRetrySucceeded: metadataRetryResponse.ok(), alertClearedAfterRetry, editorUrlAfterRetry, mutations: state.mutations, navigationUrls: state.navigationUrls, finalUrl: page.url() };
      }`;
      break;
    case "assert-double-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-double-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-double-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "double-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 double-close save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); const domClickEvents = Number(await close.getAttribute("data-wf543-dom-click-events") ?? "0"); const closeBusy = (await close.getAttribute("aria-busy")) === "true"; const closeDisabled = await close.isDisabled(); const closePendingData = (await close.getAttribute("data-post-editor-close-pending")) === "true"; const nonCloseEditable = await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(); state.pendingRoutes.shift()(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); return { kind: "double-close", domClickEvents, saveRequestCount: state.mutations.length, navigationCount: state.navigationUrls.length, closeBusy, closeDisabled, closePendingData, nonCloseEditable, mutations: state.mutations, navigationUrls: state.navigationUrls, finalUrl: page.url() };
      }`;
      break;
    case "assert-table-keyboard":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-table-keyboard"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-table-keyboard") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "table-keyboard" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const state = page.__wf543Scenario; const title = page.getByRole("link", { name: "Edit post: " + state.spec.title, exact: true }); const checkbox = page.getByRole("checkbox", { name: "Select " + state.spec.title, exact: true }); const action = page.getByRole("button", { name: "Actions for " + state.spec.title, exact: true }); return { kind: "table-keyboard", titleKey: "Enter", titleNavigationCount: state.table.titleNavigationCount ?? 0, titleUrl: state.table.titleUrl ?? "", titleAccessibleName: await title.getAttribute("aria-label") ?? "", checkboxKey: "Space", checkboxToggled: state.table.checkboxToggled === true, checkboxNavigationCount: state.table.checkboxNavigationCount ?? 0, checkboxAccessibleName: await checkbox.getAttribute("aria-label") ?? "", actionKey: "Enter", actionMenuOpened: state.table.actionMenuOpened === true, actionNavigationCount: state.table.actionNavigationCount ?? 0, actionAccessibleName: await action.getAttribute("aria-label") ?? "", mutations: state.mutations, navigationUrls: state.navigationUrls };
      }`;
      break;
    case "assert-mid-viewport-metadata":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-mid-viewport-metadata"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-mid-viewport-metadata") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "mid-viewport-metadata" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const state = page.__wf543Scenario; const widths = state.responsiveOutputs ?? []; return { kind: "mid-viewport-metadata", orderedWidths: widths.map((item) => item.width), visibleSemanticCopies: widths.map((item) => ({ width: item.width, status: item.visibleStatusCopies, author: item.visibleAuthorCopies, date: item.visibleDateCopies })), mutations: state.mutations, navigationUrls: state.navigationUrls };
      }`;
      break;
    case "reset-scenario":
      source = `async (page) => {
        const operationMarker = "wf543-operation:reset-scenario"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "reset-scenario") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["editorUrl", "fixtureId", "scenarioId", "title"]) || !bounded(input.editorUrl, 8192) || !bounded(input.fixtureId, 512) || !bounded(input.scenarioId, 512) || !bounded(input.title, 32768)) fail("reset_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const state = page.__wf543Scenario; if (state?.listeners) { page.off("request", state.listeners.request); page.off("framenavigated", state.listeners.navigation); } if (state?.routeHandlers?.size) throw new Error("wf543 routes remain before reset"); const previousClose = page.locator("[data-post-editor-header-close=\\"true\\"]"); if (await previousClose.count()) await previousClose.evaluate((button) => { if (button.__wf543ClickListener) button.removeEventListener("click", button.__wf543ClickListener); delete button.__wf543ClickListener; delete button.dataset.wf543DomClickEvents; }); delete page.__wf543Scenario; await page.goto(input.editorUrl); const title = page.locator("[data-post-editor-title-input=\\"true\\"]"); await title.waitFor(); const beforeTitle = await title.inputValue(); let responsePromise = null; if (beforeTitle !== input.title) { await title.fill(input.title); responsePromise = page.waitForResponse((response) => { const method = response.request().method(); const raw = response.url(); const marker = "/admin/api/posts/" + encodeURIComponent(input.fixtureId); const index = raw.indexOf(marker); const path = index < 0 ? "" : raw.slice(index).split("?")[0]; return (method === "PATCH" && path === marker) || (method === "POST" && path === marker + "/autosave"); }); } await page.locator("[data-post-editor-header-close=\\"true\\"]").click(); const response = responsePromise ? await responsePromise : null; if (response && !response.ok()) throw new Error("wf543 real UI fixture reset failed"); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); const row = page.getByRole("link", { name: "Edit post: " + input.title, exact: true }); await row.waitFor(); return { url: page.url(), reset: true, scenarioId: input.scenarioId, fixtureId: input.fixtureId, titleRestored: (await row.getAttribute("aria-label")) === "Edit post: " + input.title, rowAccessibleName: await row.getAttribute("aria-label"), restorationWrite: response ? { status: response.status(), url: response.url() } : null };
      }`;
      break;
    default:
      throw new Error("TASK-543 run-code operation is unknown");
  }
  return source.replace(/\r?\n[\t ]*/gu, " ");
}

export function smokeRunOperation(operation, input) {
  const command = smokeRunCode(buildEvidenceOperationRunCodeSource(operation, input));
  if (Buffer.byteLength(command, "utf8") >= RUN_CODE_COMMAND_MAX_BYTES) {
    throw new Error("TASK-543 run-code command exceeds its byte budget");
  }
  return command;
}

