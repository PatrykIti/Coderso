import {
  DATABASE_OPERATION_TIMEOUT_MS,
  RUN_CODE_OPERATIONS,
  RUN_CODE_PAYLOAD_MAX_BYTES,
  RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH,
  SESSION_NAME,
} from "../executor/config.mjs";
import {
  canonicalJson,
  deepFreezeExact,
  exactOwnKeys,
  invariant,
} from "../executor/foundation.mjs";

function playwrightArgs(...args) {
  return ["-s=" + SESSION_NAME, "--raw", ...args.map(String)];
}

const LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR = "[data-screen-runtime-root]";

function runCode(source) {
  invariant(
    typeof source === "string" &&
      source.length > 0 &&
      !source.includes("\0") &&
      !source.includes(LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR),
    "run-code invalid"
  );
  const wrapped = `(async (page) => {
    const canonicalize = (value, seen = new WeakSet()) => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("wf540_nonfinite_output");
        return value;
      }
      if (typeof value !== "object" || seen.has(value)) throw new Error("wf540_nonjson_output");
      seen.add(value);
      if (Array.isArray(value)) return value.map((item) => canonicalize(item, seen));
      const output = {};
      for (const key of Object.keys(value).sort()) output[key] = canonicalize(value[key], seen);
      return output;
    };
    return canonicalize(await (${source})(page));
  })`;
  return playwrightArgs("run-code", wrapped);
}

function codeQlSafeJavaScriptStringLiteral(value) {
  invariant(typeof value === "string", "JavaScript literal input is invalid");
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\//gu, "\\u002f")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

function validateRunCodePayloadString(value, maximumLength, label, { allowEmpty = false } = {}) {
  invariant(
    typeof value === "string" &&
      (allowEmpty || value.length > 0) &&
      value.length <= maximumLength &&
      !value.includes("\0"),
    label + " is invalid"
  );
  return value;
}

function validateRunCodeOperationPayload(operation, input) {
  invariant(
    typeof operation === "string" && RUN_CODE_OPERATIONS.has(operation),
    "run-code operation is invalid"
  );
  const keys =
    operation === "goto-ready"
      ? ["url"]
      : operation === "fill" || operation === "type"
        ? ["selector", "value"]
        : operation === "press"
          ? ["selector", "key"]
          : ["selector"];
  exactOwnKeys(input, keys, operation + " run-code payload", { plain: true });
  const descriptors = Object.getOwnPropertyDescriptors(input);
  invariant(
    keys.every(
      (key) =>
        Object.hasOwn(descriptors[key], "value") &&
        descriptors[key].enumerable === true &&
        descriptors[key].configurable !== undefined
    ),
    operation + " run-code payload descriptors are invalid"
  );
  const payload = { operation };
  if (operation === "goto-ready") {
    payload.url = validateRunCodePayloadString(input.url, 8192, "run-code URL");
  } else {
    payload.selector = validateRunCodePayloadString(input.selector, 4096, "run-code selector");
    invariant(
      payload.selector !== LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR,
      "run-code legacy selector is forbidden"
    );
    if (operation === "fill" || operation === "type") {
      payload.value = validateRunCodePayloadString(input.value, 32_768, "run-code value", {
        allowEmpty: true,
      });
    } else if (operation === "press") {
      payload.key = validateRunCodePayloadString(input.key, 256, "run-code key");
    }
  }
  const json = canonicalJson(payload);
  invariant(
    Buffer.byteLength(json, "utf8") <= RUN_CODE_PAYLOAD_MAX_BYTES,
    "run-code payload exceeds its byte budget"
  );
  return deepFreezeExact(payload);
}

function canonicalRunCodePayloadEncoding(operation, input) {
  const payload = validateRunCodeOperationPayload(operation, input);
  const bytes = Buffer.from(canonicalJson(payload), "utf8");
  const encoded = bytes.toString("base64url");
  invariant(
    encoded.length > 0 &&
      encoded.length <= RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH &&
      /^[A-Za-z0-9_-]+$/u.test(encoded),
    "run-code payload encoding is invalid"
  );
  const decoded = Buffer.from(encoded, "base64url");
  invariant(
    decoded.equals(bytes) && decoded.toString("base64url") === encoded,
    "run-code payload encoding is non-canonical"
  );
  return encoded;
}

function encodeRunCodePayload(operation, input) {
  return codeQlSafeJavaScriptStringLiteral(canonicalRunCodePayloadEncoding(operation, input));
}

function buildDataBearingRunCodeSource(operation, input) {
  const encodedLiteral = encodeRunCodePayload(operation, input);
  return `async (page) => {
    const encoded = ${encodedLiteral};
    const fail = (code) => { throw new Error("wf540_run_code_" + code); };
    if (
      typeof encoded !== "string" ||
      encoded.length === 0 ||
      encoded.length > 87384 ||
      !/^[A-Za-z0-9_-]+$/u.test(encoded)
    ) fail("encoding");
    let decoded;
    try {
      decoded = await page.evaluate((token) => {
        const standard = token.replaceAll("-", "+").replaceAll("_", "/");
        let binary;
        try {
          binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4));
        } catch {
          return { ok: false, code: "base64url" };
        }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const canonicalEncoding = btoa(binary)
          .replaceAll("+", "-")
          .replaceAll("/", "_")
          .replace(/=+$/u, "");
        try {
          return {
            ok: true,
            bytes: bytes.length,
            canonicalEncoding,
            json: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
          };
        } catch {
          return { ok: false, code: "utf8" };
        }
      }, encoded);
    } catch {
      fail("base64url");
    }
    if (!decoded || decoded.ok !== true) fail(decoded?.code === "utf8" ? "utf8" : "base64url");
    if (!Number.isSafeInteger(decoded.bytes) || decoded.bytes === 0 || decoded.bytes > 65536)
      fail("bytes");
    if (decoded.canonicalEncoding !== encoded) fail("canonical_encoding");
    const json = decoded.json;
    if (typeof json !== "string") fail("utf8");
    let payload;
    try {
      payload = JSON.parse(json);
    } catch {
      fail("json");
    }
    const exact = (value, keys) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype &&
      Object.keys(value).length === keys.length &&
      keys.every((key) => Object.hasOwn(value, key));
    const bounded = (value, maximumLength, allowEmpty = false) =>
      typeof value === "string" &&
      (allowEmpty || value.length > 0) &&
      value.length <= maximumLength &&
      !value.includes("\\0");
    const canonical = (value) => {
      if (value === null || typeof value !== "object") return JSON.stringify(value);
      if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
      return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
    };
    const legacySelector = "[data-" + "screen-runtime-root]";
    if (payload?.operation === "goto-ready") {
      if (!exact(payload, ["operation", "url"]) || !bounded(payload.url, 8192)) fail("goto_payload");
    } else if (payload?.operation === "fill" || payload?.operation === "type") {
      if (
        !exact(payload, ["operation", "selector", "value"]) ||
        !bounded(payload.selector, 4096) ||
        payload.selector === legacySelector ||
        !bounded(payload.value, 32768, true)
      ) fail("text_payload");
    } else if (payload?.operation === "press") {
      if (
        !exact(payload, ["key", "operation", "selector"]) ||
        !bounded(payload.selector, 4096) ||
        payload.selector === legacySelector ||
        !bounded(payload.key, 256)
      ) fail("press_payload");
    } else if (payload?.operation === "focus") {
      if (
        !exact(payload, ["operation", "selector"]) ||
        !bounded(payload.selector, 4096) ||
        payload.selector === legacySelector
      ) fail("focus_payload");
    } else {
      fail("operation");
    }
    if (canonical(payload) !== json) fail("canonical_json");
    if (payload.operation === "goto-ready") {
      await page.goto(payload.url, { timeout: ${DATABASE_OPERATION_TIMEOUT_MS} });
      await page.waitForFunction(() => {
        const text = document.body?.innerText.trim() ?? "";
        return text.length > 0 && text !== "Loading...";
      }, null, { timeout: 90000 });
    } else {
      const locator = page.locator(payload.selector);
      await locator.waitFor({ state: "visible", timeout: 30000 });
      if (await locator.count() !== 1) throw new Error("wf540_target_count");
      if (payload.operation === "fill") await locator.fill(payload.value);
      else if (payload.operation === "type") await locator.pressSequentially(payload.value);
      else if (payload.operation === "press") await locator.press(payload.key);
      else await locator.focus();
    }
    return { ok: true };
  }`;
}

function buildDataBearingRunCodeInvocation(operation, input) {
  return {
    args: runCode(buildDataBearingRunCodeSource(operation, input)),
    displayArgs: null,
    unitResultAlreadyNormalized: true,
  };
}

export {
  LEGACY_SCREEN_RUNTIME_ROOT_SELECTOR,
  buildDataBearingRunCodeInvocation,
  buildDataBearingRunCodeSource,
  canonicalRunCodePayloadEncoding,
  codeQlSafeJavaScriptStringLiteral,
  playwrightArgs,
  runCode,
};
