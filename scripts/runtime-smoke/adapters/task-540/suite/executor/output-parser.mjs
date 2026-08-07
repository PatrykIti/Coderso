import { Buffer } from "node:buffer";
import { TextDecoder } from "node:util";

import {
  MAX_SESSION_LIST_BYTES,
  MAX_SESSION_LIST_ENTRIES,
  MAX_SESSION_LIST_LINE_BYTES,
  MAX_STREAM_BYTES,
  SAFE_IDENTIFIER_PATTERN,
} from "./config.mjs";
import { canonicalJson, deepFreezeExact, exactOwnKeys, invariant } from "./foundation.mjs";
import {
  assertFiniteJson,
  assertPlainJsonValue,
  assertSchemaDescriptor,
  parseTransportJson,
  strictParsedObjectValue,
  validateExactJsonSchema,
} from "./json-schema.mjs";
import {
  assertPredicateDescriptor,
  evaluateExactPredicate,
  expandRegisteredPath,
} from "./ref-dsl.mjs";

function decodeBoundedUtf8(bytes, label, maximum = MAX_STREAM_BYTES) {
  invariant(
    Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= maximum,
    label + " bytes are invalid"
  );
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    invariant(false, label + " is not valid UTF-8");
  }
  invariant(!text.includes("\0"), label + " contains NUL");
  return text;
}

function parseBoundedSessionList(bytes, label) {
  invariant(bytes.length <= MAX_SESSION_LIST_BYTES, label + " exceeds the session-list byte bound");
  const output = decodeExactNativeUtf8(bytes, label);
  if (output === "  (no browsers)\n") return [];
  invariant(!output.includes("\r"), label + " contains non-canonical line endings");
  const lines = output.split("\n");
  invariant(
    lines.pop() === "" && lines.shift() === "### Browsers" && lines.length > 0,
    label + " header is malformed"
  );
  invariant(
    lines.every((line) => Buffer.byteLength(line) <= MAX_SESSION_LIST_LINE_BYTES),
    label + " line is too long"
  );
  const sessions = [];
  while (lines.length > 0) {
    invariant(sessions.length < MAX_SESSION_LIST_ENTRIES, label + " has too many sessions");
    const nameMatch = /^- ([A-Za-z0-9._-]+):$/u.exec(lines.shift() ?? "");
    invariant(
      nameMatch !== null && !sessions.includes(nameMatch[1]),
      label + " session entry is malformed"
    );
    sessions.push(nameMatch[1]);
    invariant(lines.shift() === "  - status: open", label + " session status is malformed");
    if (/^ {2}- version: v[^\r\n]+ \[incompatible please re-open\]$/u.test(lines[0] ?? ""))
      lines.shift();
    const browserTypeMatch = /^ {2}- browser-type: [A-Za-z0-9._-]+( \(attached\))?$/u.exec(
      lines[0] ?? ""
    );
    const attached = browserTypeMatch?.[1] !== undefined;
    if (browserTypeMatch) lines.shift();
    if (attached) continue;
    invariant(
      /^ {2}- user-data-dir: (?:<in-memory>|[^\r\n]+)$/u.test(lines.shift() ?? ""),
      label + " user-data-dir is malformed"
    );
    if (/^ {2}- headed: (?:true|false)$/u.test(lines[0] ?? "")) lines.shift();
  }
  return sessions;
}

function isExactOutputContractDescriptor(value) {
  return Boolean(
    value && typeof value === "object" && !Array.isArray(value) && Object.hasOwn(value, "grammar")
  );
}

function assertExactOutputContractDescriptor(contract, label) {
  assertPlainJsonValue(contract, label + " descriptor");
  exactOwnKeys(contract, ["grammar", "schema", "predicate", "rememberAs"], label, { plain: true });
  exactOwnKeys(
    contract.grammar,
    ["encoding", "jsonLayers", "nativeMode", "exactText", "sessionName", "normalizedValue"],
    label + " grammar",
    { plain: true }
  );
  assertSchemaDescriptor(contract.schema, label + " schema");
  if (contract.predicate !== null)
    assertPredicateDescriptor(contract.predicate, label + " predicate");
  invariant(
    contract.rememberAs === null ||
      (typeof contract.rememberAs === "string" &&
        SAFE_IDENTIFIER_PATTERN.test(contract.rememberAs)),
    label + " rememberAs is invalid"
  );
  const grammar = contract.grammar;
  invariant(
    grammar.encoding === "json" || grammar.encoding === "native",
    label + " encoding is invalid"
  );
  if (grammar.encoding === "json") {
    invariant(
      Number.isSafeInteger(grammar.jsonLayers) &&
        grammar.jsonLayers >= 1 &&
        grammar.jsonLayers <= 3 &&
        grammar.nativeMode === null &&
        grammar.exactText === null &&
        grammar.sessionName === null &&
        grammar.normalizedValue === null,
      label + " JSON grammar fields are invalid"
    );
    return;
  }
  invariant(grammar.jsonLayers === 0, label + " native grammar cannot declare JSON layers");
  if (grammar.nativeMode === "exact-text") {
    invariant(
      typeof grammar.exactText === "string" &&
        grammar.exactText.length > 0 &&
        grammar.sessionName === null,
      label + " exact-text grammar is invalid"
    );
  } else if (grammar.nativeMode === "session-list-absence") {
    invariant(
      grammar.exactText === null &&
        typeof grammar.sessionName === "string" &&
        SAFE_IDENTIFIER_PATTERN.test(grammar.sessionName),
      label + " session-list grammar is invalid"
    );
  } else {
    invariant(false, label + " nativeMode is not registered");
  }
  assertPlainJsonValue(grammar.normalizedValue, label + " normalizedValue");
}

function parseExactOutputContract(contract, bytes, label, context) {
  assertExactOutputContractDescriptor(contract, label);
  invariant(
    context &&
      context.plan &&
      context.captures &&
      context.priorOutputs instanceof Map &&
      context.variables instanceof Map &&
      typeof context.actionId === "string",
    label + " evaluation context is invalid"
  );
  const grammar = contract.grammar;
  let value;
  if (grammar.encoding === "json") {
    invariant(grammar.jsonLayers === 1, label + " must use exactly one JSON layer");
    const frame = decodeExactNativeUtf8(bytes, label);
    invariant(frame.endsWith("\n") && frame.length > 1, label + " JSON frame must end in one LF");
    const body = frame.slice(0, -1);
    invariant(
      !body.includes("\n") && !body.includes("\r") && !body.includes("\0"),
      label + " JSON frame has extra bytes"
    );
    try {
      value = JSON.parse(body);
    } catch {
      invariant(false, label + " contains malformed JSON");
    }
    invariant(canonicalJson(value) === body, label + " JSON frame is not canonical");
  } else if (grammar.nativeMode === "exact-text") {
    invariant(
      decodeExactNativeUtf8(bytes, label) === grammar.exactText,
      label + " native text mismatch"
    );
    value = grammar.normalizedValue;
  } else {
    invariant(
      decodeExactNativeUtf8(bytes, label) === "  (no browsers)\n",
      label + " global browser list is not empty"
    );
    value = grammar.normalizedValue;
  }
  validateExactJsonSchema(contract.schema, value, label + " value");
  const evaluationContext = { ...context, currentOutput: value };
  if (contract.predicate !== null) {
    invariant(
      evaluateExactPredicate(contract.predicate, evaluationContext, label + " predicate"),
      label + " predicate failed"
    );
  }
  invariant(!context.priorOutputs.has(context.actionId), label + " prior output is already bound");
  if (contract.rememberAs !== null) {
    invariant(
      !context.variables.has(contract.rememberAs),
      label + " remembered variable is already bound"
    );
  }
  deepFreezeExact(value);
  context.priorOutputs.set(context.actionId, value);
  if (contract.rememberAs !== null) context.variables.set(contract.rememberAs, value);
  return value;
}

function parseRegisteredOutput(schema, bytes, label, context = null) {
  if (isExactOutputContractDescriptor(schema)) {
    return parseExactOutputContract(schema, bytes, label, context);
  }
  exactOwnKeys(schema, Reflect.ownKeys(schema), label + " schema");
  if (schema.encoding === "native") {
    if (schema.kind === "session-absence") {
      const sessions = parseBoundedSessionList(bytes, label);
      invariant(
        typeof schema.sessionName === "string" &&
          schema.sessionName.length > 0 &&
          !sessions.includes(schema.sessionName),
        label + " named browser session is still present"
      );
      return schema.exactValue;
    }
    if (schema.kind === "unit" || schema.kind === "literal") {
      if (schema.exactText !== undefined) {
        invariant(
          decodeExactNativeUtf8(bytes, label) === schema.exactText,
          label + " native text mismatch"
        );
      }
      return schema.exactValue;
    }
    if (schema.kind === "array") {
      invariant(
        decodeExactNativeUtf8(bytes, label) === schema.exactText,
        label + " native text mismatch"
      );
      return [];
    }
    invariant(false, label + " has an unsupported native output schema");
  }
  invariant(
    schema.encoding === "json" || schema.encoding === "json-string",
    label + " output encoding is invalid"
  );
  let value = parseTransportJson(bytes);
  if (schema.encoding === "json-string") {
    invariant(
      typeof value === "string",
      label + " must use exactly one JSON-string transport layer"
    );
    value = JSON.parse(value);
  } else {
    invariant(
      typeof value !== "string" || schema.kind !== "object",
      label + " has an unexpected JSON-string layer"
    );
  }
  assertFiniteJson(value, label);
  if (schema.kind === "literal") {
    invariant(Object.is(value, schema.exactValue), label + " literal output mismatch");
    return value;
  }
  if (schema.kind === "integer") {
    invariant(
      Number.isInteger(value) && value === schema.exactValue,
      label + " integer output mismatch"
    );
    return value;
  }
  invariant(schema.kind === "object", label + " output kind is not implemented");
  if (schema.mode === "ordinary") {
    strictParsedObjectValue(value, schema.topLevelKeys, label);
    invariant(value.assertion === label.split(":").at(-1), label + " assertion identity mismatch");
    strictParsedObjectValue(value.observations, schema.observationKeys, label + " observations");
    invariant(
      typeof value.target === "string" && value.target.length > 0,
      label + " target is invalid"
    );
    return value;
  }
  strictParsedObjectValue(value, schema.keys ?? schema.topLevelKeys, label);
  return value;
}

function decodeExactNativeUtf8(bytes, label) {
  invariant(
    Buffer.isBuffer(bytes) &&
      !(bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) &&
      !bytes.includes(0x0d) &&
      !bytes.includes(0x00),
    label + " has forbidden raw bytes"
  );
  const text = decodeBoundedUtf8(bytes, label);
  invariant(
    !text.startsWith("\uFEFF") && !text.includes("\r") && !text.includes("\0"),
    label + " has forbidden bytes"
  );
  return text;
}

function parseExactTabRow(line, expected, label) {
  const match = /^- ([0-9]+): (\(current\) )?\[(.{1,512})\]\(([^\r\n]+)\)\n$/u.exec(line);
  invariant(match !== null, label + " tab row grammar drift");
  invariant(
    Number(match[1]) === expected.index &&
      Boolean(match[2]) === expected.current &&
      ["\\", "[", "]", "(", ")", "\r", "\n"].every((token) => !match[3].includes(token)) &&
      match[4] === expected.url &&
      !match[4].includes("%0") &&
      !match[4].includes("\\"),
    label + " tab row identity drift"
  );
  return deepFreezeExact({
    index: expected.index,
    current: expected.current,
    title: match[3],
    url: match[4],
  });
}

function consumeExactTabRow(text, offset, expected, label) {
  const newline = text.indexOf("\n", offset);
  invariant(newline !== -1, label + " tab row has no LF");
  const line = text.slice(offset, newline + 1);
  return { row: parseExactTabRow(line, expected, label), nextOffset: newline + 1 };
}

function expectedNativeTabRows(action, state) {
  const entryUrl = expandRegisteredPath(state.plan, "entry", state.currentCaptures);
  const relatedUrl = expandRegisteredPath(
    state.plan,
    "relatedEntryA1Editor",
    state.currentCaptures
  );
  const recordsUrl = expandRegisteredPath(state.plan, "records", state.currentCaptures);
  const byAction = {
    "rc-019-related-tab-new": [
      { index: 0, current: false, url: entryUrl },
      { index: 1, current: true, url: relatedUrl },
    ],
    "rc-022-related-tab-origin": [
      { index: 0, current: true, url: entryUrl },
      { index: 1, current: false, url: relatedUrl },
    ],
    "rc-044-close-second-tab": [{ index: 0, current: true, url: recordsUrl }],
    "rc-045-origin-proof": [{ index: 0, current: true, url: recordsUrl }],
  };
  const rows = byAction[action.id];
  invariant(rows !== undefined, action.id + " native tab state is not registered");
  return rows;
}

export {
  assertExactOutputContractDescriptor,
  consumeExactTabRow,
  decodeBoundedUtf8,
  decodeExactNativeUtf8,
  expectedNativeTabRows,
  isExactOutputContractDescriptor,
  parseBoundedSessionList,
  parseExactOutputContract,
  parseExactTabRow,
  parseRegisteredOutput,
};
