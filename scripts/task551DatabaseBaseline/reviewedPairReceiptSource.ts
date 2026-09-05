const INVALID_ERROR_MESSAGE = "database_baseline_invalid";
const RECEIPT_EXPORT_NAME = "TASK551_DATABASE_FREEZE_RECEIPT";

export type Task551FreezeReceiptObjectSpan = Readonly<{
  objectStart: number;
  objectEnd: number;
}>;

function invalid(): never {
  throw new Error(INVALID_ERROR_MESSAGE);
}

function isIdentifierStart(character: string): boolean {
  return /[A-Za-z_$]/u.test(character);
}

function isIdentifierPart(character: string): boolean {
  return /[A-Za-z0-9_$]/u.test(character);
}

type Task551OpeningDelimiter = "{" | "(" | "[";
type Task551ClosingDelimiter = "}" | ")" | "]";

function isTask551OpeningDelimiter(character: string): character is Task551OpeningDelimiter {
  return character === "{" || character === "(" || character === "[";
}

function isTask551ClosingDelimiter(character: string): character is Task551ClosingDelimiter {
  return character === "}" || character === ")" || character === "]";
}

function expectedTask551ClosingDelimiter(
  opening: Task551OpeningDelimiter
): Task551ClosingDelimiter {
  if (opening === "{") return "}";
  if (opening === "(") return ")";
  return "]";
}

function consumeTask551Delimiter(stack: Task551OpeningDelimiter[], character: string): boolean {
  if (isTask551OpeningDelimiter(character)) {
    stack.push(character);
    return true;
  }
  if (!isTask551ClosingDelimiter(character)) return false;
  const opening = stack.pop();
  if (opening === undefined || expectedTask551ClosingDelimiter(opening) !== character) invalid();
  return true;
}

function skipLineComment(source: string, index: number): number {
  let cursor = index + 2;
  while (cursor < source.length && source[cursor] !== "\n" && source[cursor] !== "\r") {
    cursor += 1;
  }
  return cursor;
}

function skipBlockComment(source: string, index: number): number {
  const end = source.indexOf("*/", index + 2);
  if (end < 0) invalid();
  return end + 2;
}

function skipQuotedString(source: string, index: number, quote: "'" | '"'): number {
  let cursor = index + 1;
  while (cursor < source.length) {
    const character = source[cursor]!;
    if (character === "\\") {
      if (cursor + 1 >= source.length) invalid();
      cursor += 2;
      continue;
    }
    if (character === quote) return cursor + 1;
    if (character === "\n" || character === "\r") invalid();
    cursor += 1;
  }
  invalid();
}

function skipTemplateLiteral(source: string, index: number): number {
  let cursor = index + 1;
  while (cursor < source.length) {
    const character = source[cursor]!;
    if (character === "\\") {
      if (cursor + 1 >= source.length) invalid();
      cursor += 2;
      continue;
    }
    if (character === "`") return cursor + 1;
    if (character === "$" && source[cursor + 1] === "{") {
      // Persisted receipt sources have no dynamic template preamble. Refuse
      // interpolation instead of treating its executable expression as text.
      invalid();
    }
    cursor += 1;
  }
  invalid();
}

function skipTrivia(source: string, index: number): number {
  let cursor = index;
  while (cursor < source.length) {
    if (/\s/u.test(source[cursor]!)) {
      cursor += 1;
      continue;
    }
    if (source[cursor] === "/" && source[cursor + 1] === "/") {
      cursor = skipLineComment(source, cursor);
      continue;
    }
    if (source[cursor] === "/" && source[cursor + 1] === "*") {
      cursor = skipBlockComment(source, cursor);
      continue;
    }
    return cursor;
  }
  return cursor;
}

function readIdentifier(
  source: string,
  index: number
): Readonly<{ text: string; end: number }> | undefined {
  if (!isIdentifierStart(source[index] ?? "")) return undefined;
  let end = index + 1;
  while (end < source.length && isIdentifierPart(source[end]!)) end += 1;
  return Object.freeze({ text: source.slice(index, end), end });
}

function findObjectEnd(source: string, objectStart: number): number {
  if (source[objectStart] !== "{") invalid();
  const delimiterStack: Task551OpeningDelimiter[] = ["{"];
  let cursor = objectStart + 1;
  while (cursor < source.length) {
    const character = source[cursor]!;
    if (character === "/" && source[cursor + 1] === "/") {
      cursor = skipLineComment(source, cursor);
      continue;
    }
    if (character === "/" && source[cursor + 1] === "*") {
      cursor = skipBlockComment(source, cursor);
      continue;
    }
    if (character === "/") invalid();
    if (character === "\\") invalid();
    if (character === "'" || character === '"') {
      cursor = skipQuotedString(source, cursor, character);
      continue;
    }
    if (character === "`") {
      cursor = skipTemplateLiteral(source, cursor);
      continue;
    }
    if (consumeTask551Delimiter(delimiterStack, character)) {
      cursor += 1;
      if (delimiterStack.length === 0) return cursor;
      continue;
    }
    cursor += 1;
  }
  invalid();
}

function requireIdentifier(source: string, index: number, expected: string): number {
  const token = readIdentifier(source, skipTrivia(source, index));
  if (token?.text !== expected) invalid();
  return token.end;
}

function requireCharacter(source: string, index: number, expected: string): number {
  const cursor = skipTrivia(source, index);
  if (source[cursor] !== expected) invalid();
  return cursor + 1;
}

function extractDeclarationAfterExport(
  source: string,
  exportEnd: number
): Task551FreezeReceiptObjectSpan | undefined {
  const constStart = skipTrivia(source, exportEnd);
  const constToken = readIdentifier(source, constStart);
  if (constToken?.text !== "const") return undefined;
  const nameStart = skipTrivia(source, constToken.end);
  const nameToken = readIdentifier(source, nameStart);
  if (nameToken?.text !== RECEIPT_EXPORT_NAME) return undefined;
  let cursor = requireCharacter(source, nameToken.end, ":");
  cursor = requireIdentifier(source, cursor, "Readonly");
  cursor = requireCharacter(source, cursor, "<");
  cursor = requireIdentifier(source, cursor, "Record");
  cursor = requireCharacter(source, cursor, "<");
  cursor = requireIdentifier(source, cursor, "ScaleProfile");
  cursor = requireCharacter(source, cursor, ",");
  cursor = requireIdentifier(source, cursor, "Task551DatabaseFreezeReceipt");
  cursor = requireCharacter(source, cursor, ">");
  cursor = requireCharacter(source, cursor, ">");
  cursor = requireCharacter(source, cursor, "=");
  const objectStart = skipTrivia(source, cursor);
  if (source[objectStart] !== "{") invalid();
  const objectEnd = findObjectEnd(source, objectStart);
  cursor = requireIdentifier(source, objectEnd, "as");
  cursor = requireIdentifier(source, cursor, "const");
  cursor = requireCharacter(source, cursor, ";");
  if (skipTrivia(source, cursor) !== source.length) invalid();
  return Object.freeze({ objectStart, objectEnd });
}

// This is lexical only: it identifies the one storage declaration without
// evaluating TypeScript. Strict receipt validation happens after extraction.
export function extractTask551DatabaseFreezeReceiptObjectSpan(
  source: string
): Task551FreezeReceiptObjectSpan {
  if (typeof source !== "string") invalid();
  let found: Task551FreezeReceiptObjectSpan | undefined;
  const delimiterStack: Task551OpeningDelimiter[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor]!;
    if (/\s/u.test(character)) {
      cursor += 1;
      continue;
    }
    if (character === "/" && source[cursor + 1] === "/") {
      cursor = skipLineComment(source, cursor);
      continue;
    }
    if (character === "/" && source[cursor + 1] === "*") {
      cursor = skipBlockComment(source, cursor);
      continue;
    }
    if (character === "/") invalid();
    if (character === "\\") invalid();
    if (character === "'" || character === '"') {
      cursor = skipQuotedString(source, cursor, character);
      continue;
    }
    if (character === "`") {
      cursor = skipTemplateLiteral(source, cursor);
      continue;
    }
    if (consumeTask551Delimiter(delimiterStack, character)) {
      cursor += 1;
      continue;
    }
    const token = readIdentifier(source, cursor);
    if (token === undefined) {
      cursor += 1;
      continue;
    }
    // The one allowed real target token is consumed by the strict canonical
    // declaration parser below. Any other lexical use could bind, shadow, or
    // alias the receipt export, so reject it before a source rewrite.
    if (token.text === RECEIPT_EXPORT_NAME) invalid();
    if (delimiterStack.length === 0 && token.text === "export") {
      const declaration = extractDeclarationAfterExport(source, token.end);
      if (declaration !== undefined) {
        if (found !== undefined) invalid();
        found = declaration;
        cursor = declaration.objectEnd;
        continue;
      }
    }
    cursor = token.end;
  }
  if (delimiterStack.length !== 0 || found === undefined) invalid();
  return found;
}
