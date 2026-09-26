import { TextEncoder } from "node:util";

export const TASK551_GRAPH_SCHEMA = "coderso.task551.workflow-dispatch-graph@v1";
export const TASK551_ENVELOPE_SCHEMA = "coderso.task551.workflow-dispatch@v1";

const TASK551_MAX_TASK_FILE_BYTES = 512 * 1024;
const TASK551_MAX_JSON_BYTES = 160 * 1024;
const TASK551_MAX_JSON_DEPTH = 64;
const TASK551_MAX_JSON_NODES = 20_000;

export function fail(code) {
  throw new Error(`task551_dispatch_${code}`);
}

function ownKeys(value, code) {
  try {
    return Reflect.ownKeys(value);
  } catch {
    fail(code);
  }
}

export function requireOwnDataRecord(value, expectedKeys, code, prototype = Object.prototype) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  if (Object.getPrototypeOf(value) !== prototype) fail(code);
  const keys = ownKeys(value, code);
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    fail(code);
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      fail(code);
    }
  }
  return value;
}

export function requireJsonRecord(value, expectedKeys, code) {
  return requireOwnDataRecord(value, expectedKeys, code, null);
}

export function requireOwnDataArray(value, code, { min = 0, max = 10_000 } = {}) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) fail(code);
  if (value.length < min || value.length > max) fail(code);
  const keys = ownKeys(value, code);
  if (keys.length !== value.length + 1 || !keys.includes("length")) fail(code);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      descriptor === undefined ||
      descriptor.enumerable !== true ||
      !Object.hasOwn(descriptor, "value") ||
      descriptor.get !== undefined ||
      descriptor.set !== undefined
    ) {
      fail(code);
    }
  }
  return value;
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
}

export function requireText(value, code, { min = 1, max = TASK551_MAX_TASK_FILE_BYTES } = {}) {
  if (typeof value !== "string" || value.length < min || value.includes("\u0000")) fail(code);
  if (value.includes("\uFEFF") || utf8Bytes(value) > max) fail(code);
  return value;
}

export function requireLiteralId(value, code, pattern) {
  const text = requireText(value, code, { max: 160 });
  if (!pattern.test(text)) fail(code);
  return text;
}

export function requireRepoPath(value, code) {
  const path = requireText(value, code, { max: 512 });
  if (
    !/^[A-Za-z0-9._/@+,-]+$/u.test(path) ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("//") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    fail(code);
  }
  return path;
}

export function requireUniqueStrings(values, code, mapper = (value) => value) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = mapper(value);
    if (seen.has(normalized)) fail(code);
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function requireExactSequence(actual, expected, code) {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    fail(code);
  }
}

export function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

export function parseDuplicateKeyAwareJson(source, code) {
  requireText(source, code, { min: 2, max: TASK551_MAX_JSON_BYTES });
  let index = 0;
  let nodeCount = 0;

  const error = (suffix) => fail(`${code}:${suffix}`);
  const whitespace = () => {
    while (/[ \n\r\t]/u.test(source[index] ?? "")) index += 1;
  };
  const requireNode = (depth) => {
    nodeCount += 1;
    if (depth > TASK551_MAX_JSON_DEPTH || nodeCount > TASK551_MAX_JSON_NODES) {
      error("bounds");
    }
  };
  const parseString = () => {
    const start = index;
    if (source[index] !== '"') error("string_open");
    index += 1;
    while (index < source.length) {
      const character = source[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(source.slice(start, index));
        } catch {
          error("string_invalid");
        }
      }
      if (character === "\\") {
        const escape = source[index + 1];
        if (escape === "u") {
          const hex = source.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/u.test(hex)) error("unicode_escape");
          index += 6;
          continue;
        }
        if (!'"\\/bfnrt'.includes(escape ?? "")) error("escape");
        index += 2;
        continue;
      }
      if (character === undefined || character.charCodeAt(0) < 0x20) error("string_control");
      index += 1;
    }
    error("string_unterminated");
  };
  const parseArray = (depth) => {
    const values = [];
    index += 1;
    whitespace();
    if (source[index] === "]") {
      index += 1;
      return values;
    }
    while (true) {
      values.push(parseValue(depth + 1));
      whitespace();
      if (source[index] === "]") {
        index += 1;
        return values;
      }
      if (source[index] !== ",") error("array_separator");
      index += 1;
      whitespace();
    }
  };
  const parseObject = (depth) => {
    const target = Object.create(null);
    const seen = new Set();
    index += 1;
    whitespace();
    if (source[index] === "}") {
      index += 1;
      return target;
    }
    while (true) {
      if (source[index] !== '"') error("object_key");
      const key = parseString();
      if (seen.has(key) || key === "__proto__" || key === "prototype" || key === "constructor") {
        error("duplicate_or_magic_key");
      }
      seen.add(key);
      whitespace();
      if (source[index] !== ":") error("object_colon");
      index += 1;
      whitespace();
      const value = parseValue(depth + 1);
      Object.defineProperty(target, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      whitespace();
      if (source[index] === "}") {
        index += 1;
        return target;
      }
      if (source[index] !== ",") error("object_separator");
      index += 1;
      whitespace();
    }
  };
  const parseValue = (depth) => {
    requireNode(depth);
    whitespace();
    const character = source[index];
    if (character === '"') return parseString();
    if (character === "{") return parseObject(depth);
    if (character === "[") return parseArray(depth);
    if (source.startsWith("true", index)) {
      index += 4;
      return true;
    }
    if (source.startsWith("false", index)) {
      index += 5;
      return false;
    }
    if (source.startsWith("null", index)) {
      index += 4;
      return null;
    }
    const number = source
      .slice(index)
      .match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u);
    if (number === null) error("value");
    const parsed = Number(number[0]);
    if (!Number.isFinite(parsed)) error("number_nonfinite");
    index += number[0].length;
    return parsed;
  };

  whitespace();
  const value = parseValue(0);
  whitespace();
  if (index !== source.length) error("trailing");
  return value;
}

export function requireNodeId(value, code) {
  return requireLiteralId(value, code, /^TASK-551-[0-9]{2}-L[0-9]{2}:(?:initial|single|final)$/u);
}
