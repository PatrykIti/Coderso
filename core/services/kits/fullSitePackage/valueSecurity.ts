import { PACKAGE_LIMITS } from "./types";

export type PackageValueSecretReason =
  | "credential_url_forbidden"
  | "authorization_value_forbidden"
  | "private_key_forbidden"
  | "base64_value_forbidden"
  | "binary_value_forbidden";

const SENSITIVE_TERMINALS = Object.freeze([
  "authorization",
  "bearer",
  "cookie",
  "credential",
  "credentials",
  "csrf",
  "password",
  "secret",
  "session",
  "token",
] as const);

const SENSITIVE_PAIRS = Object.freeze([
  Object.freeze(["access", "key"] as const),
  Object.freeze(["api", "key"] as const),
  Object.freeze(["private", "key"] as const),
  Object.freeze(["provider", "key"] as const),
  Object.freeze(["client", "secret"] as const),
  Object.freeze(["connection", "string"] as const),
] as const);

const COMPACT_EXTRA_BASES = Object.freeze([
  Object.freeze(["access", "token"] as const),
  Object.freeze(["bearer", "token"] as const),
  Object.freeze(["csrf", "token"] as const),
  Object.freeze(["provider", "secret"] as const),
  Object.freeze(["refresh", "token"] as const),
  Object.freeze(["reset", "token"] as const),
  Object.freeze(["secret", "access", "key"] as const),
  Object.freeze(["session", "cookie"] as const),
  Object.freeze(["session", "token"] as const),
  Object.freeze(["smtp", "password"] as const),
  Object.freeze(["webhook", "secret"] as const),
  Object.freeze(["x", "api", "key"] as const),
] as const);

const MATERIAL_SUFFIXES = Object.freeze([
  "hash",
  "header",
  "id",
  "key",
  "value",
  "data",
  "payload",
] as const);

const BINARY_CARRIER_BASES = Object.freeze(["base64", "bytes", "binary", "blob"] as const);
const BINARY_CARRIER_ROLES = Object.freeze(["content", "data", "payload", "value"] as const);

type TokenSequence = readonly string[];

const SENSITIVE_BASES: readonly TokenSequence[] = Object.freeze([
  ...SENSITIVE_TERMINALS.map((terminal) => Object.freeze([terminal])),
  ...SENSITIVE_PAIRS,
  ...COMPACT_EXTRA_BASES,
]);

const compareLengthDescending = (left: TokenSequence, right: TokenSequence): number =>
  right.join("").length - left.join("").length;

const COMPACT_SENSITIVE_BASES = Object.freeze([...SENSITIVE_BASES].sort(compareLengthDescending));

const asciiLower = (value: string): string =>
  value.replace(/[A-Z]/g, (character) => String.fromCharCode(character.charCodeAt(0) + 0x20));

const expandCompactPiece = (
  piece: string,
  bases: readonly TokenSequence[],
  suffixes: readonly string[]
): readonly string[] | null => {
  const compact = asciiLower(piece);
  for (const base of bases) {
    const baseText = base.join("");
    if (!compact.startsWith(baseText)) continue;
    const expanded = [...base];
    let cursor = baseText.length;
    while (cursor < compact.length) {
      const suffix = suffixes.find((candidate) => compact.startsWith(candidate, cursor));
      if (!suffix) break;
      expanded.push(suffix);
      cursor += suffix.length;
    }
    if (cursor === compact.length) return Object.freeze(expanded);
  }
  return null;
};

const splitCamelChunk = (chunk: string): readonly string[] =>
  chunk
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean);

const tokenizeWithCompactExpansion = (
  key: string,
  bases: readonly TokenSequence[],
  suffixes: readonly string[]
): readonly string[] => {
  const output: string[] = [];
  for (const chunk of key.split(/[^A-Za-z0-9]+/).filter(Boolean)) {
    const wholeExpansion = expandCompactPiece(chunk, bases, suffixes);
    if (wholeExpansion) {
      output.push(...wholeExpansion);
      continue;
    }
    for (const piece of splitCamelChunk(chunk)) {
      const expansion = expandCompactPiece(piece, bases, suffixes);
      if (expansion) output.push(...expansion);
      else output.push(asciiLower(piece));
    }
  }
  return Object.freeze(output);
};

const endsWithTokens = (tokens: readonly string[], suffix: readonly string[]): boolean =>
  tokens.length >= suffix.length &&
  suffix.every((token, index) => token === tokens[tokens.length - suffix.length + index]);

const matchesSensitiveTokenTail = (tokens: readonly string[]): boolean => {
  if (SENSITIVE_BASES.some((candidate) => endsWithTokens(tokens, candidate))) return true;
  let end = tokens.length;
  while (end > 0 && MATERIAL_SUFFIXES.includes(tokens[end - 1] as never)) {
    end -= 1;
    const base = tokens.slice(0, end);
    if (SENSITIVE_BASES.some((candidate) => endsWithTokens(base, candidate))) return true;
  }
  return false;
};

export const isSensitiveFieldKey = (key: string): boolean =>
  matchesSensitiveTokenTail(
    tokenizeWithCompactExpansion(key, COMPACT_SENSITIVE_BASES, MATERIAL_SUFFIXES)
  );

const BINARY_BASE_SEQUENCES = Object.freeze(
  BINARY_CARRIER_BASES.map((base) => Object.freeze([base]))
);

export const isExplicitBinaryCarrier = (key: string): boolean => {
  const tokens = tokenizeWithCompactExpansion(key, BINARY_BASE_SEQUENCES, BINARY_CARRIER_ROLES);
  for (let index = 0; index < tokens.length; index += 1) {
    if (!BINARY_CARRIER_BASES.includes(tokens[index] as never)) continue;
    const tail = tokens.slice(index + 1);
    if (tail.every((token) => BINARY_CARRIER_ROLES.includes(token as never))) return true;
  }
  return false;
};

export const isActualBinaryValue = (value: unknown): boolean => {
  if (typeof ArrayBuffer !== "undefined") {
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
  }
  return typeof Blob !== "undefined" && value instanceof Blob;
};

export type Base64FamilyInspection = "not_encoded" | "encoded" | "encoded_like_invalid";

const isBase64MimeWhitespace = (character: string): boolean => {
  const codeUnit = character.charCodeAt(0);
  return (codeUnit >= 0x09 && codeUnit <= 0x0d) || codeUnit === 0x20;
};

export const inspectBase64FamilyLexeme = (value: string): Base64FamilyInspection => {
  let compact = "";
  for (const character of value.trim()) {
    if (isBase64MimeWhitespace(character)) continue;
    if (!/[A-Za-z0-9+/_=-]/.test(character)) return "not_encoded";
    compact += character;
  }
  if (compact.length === 0) return "not_encoded";
  const firstPadding = compact.indexOf("=");
  const body = firstPadding < 0 ? compact : compact.slice(0, firstPadding);
  const padding = firstPadding < 0 ? "" : compact.slice(firstPadding);
  if (padding.length > 0 && !/^=+$/.test(padding)) return "encoded_like_invalid";
  if (body.length === 0) return "encoded_like_invalid";
  const standard = body.includes("+") || body.includes("/");
  const urlSafe = body.includes("-") || body.includes("_");
  if (standard && urlSafe) return "encoded_like_invalid";
  const remainder = body.length % 4;
  if (remainder === 1) {
    return body.length === 1 && padding.length === 0 ? "not_encoded" : "encoded_like_invalid";
  }
  const requiredPadding = remainder === 0 ? 0 : 4 - remainder;
  if (padding.length !== 0 && padding.length !== requiredPadding) {
    return "encoded_like_invalid";
  }
  return "encoded";
};

const decodeBase64Sextet = (character: string): number | null => {
  const code = character.charCodeAt(0);
  if (code >= 0x41 && code <= 0x5a) return code - 0x41;
  if (code >= 0x61 && code <= 0x7a) return code - 0x61 + 26;
  if (code >= 0x30 && code <= 0x39) return code - 0x30 + 52;
  if (character === "+") return 62;
  if (character === "/") return 63;
  return null;
};

const decodedBasicBodyContainsColon = (body: string): boolean => {
  if (body.length === 0 || body.length % 4 === 1) return false;
  const synthesized = `${body}${"=".repeat((4 - (body.length % 4)) % 4)}`;
  for (let index = 0; index < synthesized.length; index += 4) {
    const a = decodeBase64Sextet(synthesized[index]);
    const b = decodeBase64Sextet(synthesized[index + 1]);
    const c = synthesized[index + 2] === "=" ? 0 : decodeBase64Sextet(synthesized[index + 2]);
    const d = synthesized[index + 3] === "=" ? 0 : decodeBase64Sextet(synthesized[index + 3]);
    if (a === null || b === null || c === null || d === null) return false;
    const word = (a << 18) | (b << 12) | (c << 6) | d;
    const available = Math.min(3, Math.floor(((body.length - index) * 6) / 8));
    if (available >= 1 && word >>> 16 === 0x3a) return true;
    if (available >= 2 && ((word >>> 8) & 0xff) === 0x3a) return true;
    if (available >= 3 && (word & 0xff) === 0x3a) return true;
  }
  return false;
};

const isCandidateBoundaryCharacter = (character: string): boolean => {
  const code = character.charCodeAt(0);
  return code <= 0x20 || code === 0x7f || "'\"([{<,;=:".includes(character);
};

const isCandidateStart = (value: string, index: number): boolean =>
  index === 0 || isCandidateBoundaryCharacter(value[index - 1]);

const isCandidateEnd = (value: string, index: number): boolean =>
  index >= value.length || isCandidateBoundaryCharacter(value[index]);

const AUTHORIZATION_WRAPPER_PATTERN = new RegExp(
  String.raw`(?:^|[\u0000-\u0020\u007f'"([{<,;=:])(?:(['"])authorization\1|authorization)[\t ]*:`,
  "gi"
);

const hasAuthorizationWrapper = (value: string): boolean => {
  for (const match of value.matchAll(AUTHORIZATION_WRAPPER_PATTERN)) {
    const colonOffset = match[0].lastIndexOf(":");
    let cursor = (match.index ?? 0) + colonOffset + 1;
    while (value[cursor] === "\t" || value[cursor] === " ") cursor += 1;
    const quote = value[cursor] === "'" || value[cursor] === '"' ? value[cursor++] : null;
    if (quote) {
      const end = value.indexOf(quote, cursor);
      const field = value.slice(cursor, end < 0 ? value.length : end);
      if (field.length > 0) return true;
      continue;
    }
    let end = cursor;
    while (
      end < value.length &&
      value[end] !== "\r" &&
      value[end] !== "\n" &&
      value[end] !== "," &&
      value[end] !== ";"
    ) {
      end += 1;
    }
    if (value.slice(cursor, end).trim().length > 0) return true;
  }
  return false;
};

const hasBareAuthorization = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    if (!isCandidateStart(value, index)) continue;
    let colonIndex = index - 1;
    while (colonIndex >= 0 && (value[colonIndex] === "\t" || value[colonIndex] === " ")) {
      colonIndex -= 1;
    }
    if (colonIndex >= 0 && value[colonIndex] === ":") {
      let fieldStart = colonIndex - 1;
      while (fieldStart >= 0 && /[A-Za-z0-9-]/.test(value[fieldStart])) fieldStart -= 1;
      const possibleHeader = value.slice(fieldStart + 1, colonIndex);
      if (/[A-Z-]/.test(possibleHeader) && asciiLower(possibleHeader) !== "authorization") {
        continue;
      }
    }
    const remaining = value.slice(index);
    const basic = /^basic[\t ]+([A-Za-z0-9+/]+)(=*)/i.exec(remaining);
    if (basic && isCandidateEnd(remaining, basic[0].length)) {
      if (decodedBasicBodyContainsColon(basic[1])) return true;
    }
    const bearer = /^bearer[\t ]+([A-Za-z0-9\-._~+/]+={0,})/i.exec(remaining);
    if (bearer && isCandidateEnd(remaining, bearer[0].length)) {
      const token = bearer[1];
      if (token.length >= 16 && /[0-9\-._~+/=]/.test(token)) return true;
    }
  }
  return false;
};

const hasForbiddenAuthorization = (value: string): boolean =>
  hasAuthorizationWrapper(value) || hasBareAuthorization(value);

const PRIVATE_KEY_PEM_PATTERN = /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/;
const BASE64_DATA_URL_PATTERN = /^data:[^,\r\n]*;base64,/i;
const URL_BASE = "https://task547.invalid/";

const isCredentialUrlParameterName = (name: string): boolean => {
  if (asciiLower(name) === "code") return true;
  const tokens = tokenizeWithCompactExpansion(name, COMPACT_SENSITIVE_BASES, MATERIAL_SUFFIXES);
  if (matchesSensitiveTokenTail(tokens)) return true;
  if (endsWithTokens(tokens, ["sig"]) || endsWithTokens(tokens, ["signature"])) return true;
  return (
    endsWithTokens(tokens, ["aws", "access", "key", "id"]) ||
    endsWithTokens(tokens, ["google", "access", "id"]) ||
    endsWithTokens(tokens, ["key", "pair", "id"])
  );
};

const parsedUrlHasCredential = (url: URL): boolean => {
  if (url.username.length > 0 || url.password.length > 0) return true;
  for (const [name, value] of url.searchParams) {
    if (value.length > 0 && isCredentialUrlParameterName(name)) return true;
  }
  const fragment = url.hash.slice(1).replace(/^\?/, "");
  for (const [name, value] of new URLSearchParams(fragment)) {
    if (value.length > 0 && isCredentialUrlParameterName(name)) return true;
  }
  return false;
};

const parseCandidateUrl = (candidate: string): URL | null => {
  try {
    if (candidate.startsWith("//")) return new URL(`https:${candidate}`);
    if (/^(?:\/|\.\/|\.\.\/|\?|#)/.test(candidate)) return new URL(candidate, URL_BASE);
    return new URL(candidate);
  } catch {
    return null;
  }
};

const hasForbiddenUrlCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || "'\"<>".includes(character)) return true;
  }
  return false;
};

const isWholeValuePathNoSchemeCandidate = (value: string): boolean => {
  if (value.length === 0 || /^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/|\.\/|\.\.\/|\?|#)/.test(value)) {
    return false;
  }
  if (hasForbiddenUrlCharacter(value)) return false;
  const delimiter = Math.min(
    ...[value.indexOf("?"), value.indexOf("#")].filter((index) => index >= 0)
  );
  if (!Number.isFinite(delimiter) || delimiter <= 0) return false;
  if (value.slice(0, delimiter).split("/")[0].includes(":")) return false;
  return value.indexOf("=", delimiter + 1) >= 0;
};

type CandidatePrefix = Readonly<{ matched: boolean; dataUrl: boolean; suppressResume: number }>;

const readUrlPrefix = (value: string, index: number): CandidatePrefix => {
  const remaining = value.slice(index);
  const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(remaining);
  if (scheme) {
    return {
      matched: true,
      dataUrl: asciiLower(scheme[0]) === "data:",
      suppressResume: index + scheme[0].length,
    };
  }
  if (remaining.startsWith("//")) {
    const outerScheme = index > 0 && value[index - 1] === ":";
    return { matched: !outerScheme, dataUrl: false, suppressResume: index + 2 };
  }
  for (const prefix of ["../", "./", "/", "?", "#"] as const) {
    if (remaining.startsWith(prefix)) {
      return { matched: true, dataUrl: false, suppressResume: index + prefix.length };
    }
  }
  return { matched: false, dataUrl: false, suppressResume: index + 1 };
};

const findCandidateEnd = (value: string, start: number): number => {
  let end = start;
  while (end < value.length) {
    const code = value.charCodeAt(end);
    if (
      code <= 0x20 ||
      code === 0x7f ||
      value[end] === "'" ||
      value[end] === '"' ||
      value[end] === "<" ||
      value[end] === ">"
    )
      break;
    end += 1;
  }
  if (end > start && ")]}`".includes(value[end - 1])) {
    const candidate = value.slice(start, end);
    if (!candidate.includes("=")) end -= 1;
  }
  return end;
};

type UrlScanResult = Readonly<{ credential: boolean; base64Data: boolean }>;

const scanUrls = (value: string): UrlScanResult => {
  let credential = false;
  let base64Data = false;
  let remainingBudget = value.length * 4;
  if (isWholeValuePathNoSchemeCandidate(value)) {
    remainingBudget -= value.length;
    const parsed = new URL(value, URL_BASE);
    credential ||= parsedUrlHasCredential(parsed);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!isCandidateStart(value, index)) continue;
    const prefix = readUrlPrefix(value, index);
    if (!prefix.matched) continue;
    const end = findCandidateEnd(value, index);
    const span = end - index;
    remainingBudget -= span;
    if (remainingBudget < 0) {
      credential = true;
      break;
    }
    const candidate = value.slice(index, end);
    base64Data ||= prefix.dataUrl && BASE64_DATA_URL_PATTERN.test(candidate);
    const parsed = parseCandidateUrl(candidate);
    if (parsed) credential ||= parsedUrlHasCredential(parsed);
    index = Math.max(index, prefix.suppressResume - 1);
  }
  return Object.freeze({ credential, base64Data });
};

export const classifyForbiddenValue = (
  value: unknown,
  options: Readonly<{ explicitBinaryCarrier: boolean }>
): PackageValueSecretReason | null => {
  if (isActualBinaryValue(value)) return "binary_value_forbidden";
  if (typeof value !== "string") return null;
  if (value.length > PACKAGE_LIMITS.stringLength) return null;
  const detection = value.trim();
  if (hasForbiddenAuthorization(detection)) return "authorization_value_forbidden";
  if (PRIVATE_KEY_PEM_PATTERN.test(detection)) return "private_key_forbidden";
  const urls = scanUrls(detection);
  if (urls.credential) return "credential_url_forbidden";
  if (urls.base64Data) return "base64_value_forbidden";
  if (options.explicitBinaryCarrier && inspectBase64FamilyLexeme(detection) !== "not_encoded") {
    return "base64_value_forbidden";
  }
  return null;
};
