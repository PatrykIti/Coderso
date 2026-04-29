export type HtmlToken =
  | { kind: "text"; value: string }
  | { kind: "comment"; value: string }
  | {
      kind: "tag";
      name: string;
      rawAttrs: string;
      closing: boolean;
      selfClosing: boolean;
    };

export type HtmlSanitizerPolicy = {
  allowedTags: ReadonlySet<string>;
  selfClosingTags: ReadonlySet<string>;
  dropContentTags: ReadonlySet<string>;
  sanitizeAttributes: (tagName: string, rawAttrs: string) => string | null;
};

export const dangerousHtmlContentTagSet = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "button",
  "textarea",
  "select",
  "svg",
  "math",
]);

const htmlEntityMap: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  "#39": "'",
};

const isTagNameChar = (value: string) =>
  /[a-zA-Z0-9-]/.test(value);

const readSafeCodePoint = (raw: string, radix: number, fallback: string) => {
  const value = Number.parseInt(raw, radix);
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return fallback;
  try {
    return String.fromCodePoint(value);
  } catch {
    return fallback;
  }
};

export const stripNullBytes = (value: string) => value.split("\0").join("");

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "\"") return "&quot;";
    if (char === "'") return "&#39;";
    return char;
  });

export const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x[0-9a-f]+|#[0-9]+|nbsp|amp|lt|gt|quot|#39);/gi, (match, rawEntity: string) => {
    const entity = rawEntity.toLowerCase();
    if (entity.startsWith("#x")) {
      return readSafeCodePoint(entity.slice(2), 16, match);
    }
    if (entity.startsWith("#")) {
      return readSafeCodePoint(entity.slice(1), 10, match);
    }
    return htmlEntityMap[entity] ?? match;
  });

export const tokenizeHtml = (value: string): HtmlToken[] => {
  const tokens: HtmlToken[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const tagStart = value.indexOf("<", cursor);
    if (tagStart === -1) {
      tokens.push({ kind: "text", value: value.slice(cursor) });
      break;
    }

    if (tagStart > cursor) {
      tokens.push({ kind: "text", value: value.slice(cursor, tagStart) });
    }

    if (value.startsWith("<!--", tagStart)) {
      const commentEnd = value.indexOf("-->", tagStart + 4);
      if (commentEnd === -1) {
        tokens.push({ kind: "comment", value: value.slice(tagStart) });
        break;
      }
      tokens.push({ kind: "comment", value: value.slice(tagStart, commentEnd + 3) });
      cursor = commentEnd + 3;
      continue;
    }

    const tagEnd = value.indexOf(">", tagStart + 1);
    if (tagEnd === -1) {
      tokens.push({ kind: "text", value: escapeHtml(value.slice(tagStart)) });
      break;
    }

    const rawTag = value.slice(tagStart + 1, tagEnd).trim();
    let offset = 0;
    const closing = rawTag.startsWith("/");
    if (closing) offset = 1;

    while (rawTag[offset] === " ") offset += 1;

    const nameStart = offset;
    while (offset < rawTag.length && isTagNameChar(rawTag[offset] ?? "")) {
      offset += 1;
    }

    const name = rawTag.slice(nameStart, offset).toLowerCase();
    if (!name) {
      cursor = tagEnd + 1;
      continue;
    }

    const rawAttrsWithClosing = rawTag.slice(offset).trim();
    const selfClosing = !closing && rawAttrsWithClosing.endsWith("/");
    const rawAttrs = selfClosing
      ? rawAttrsWithClosing.slice(0, -1).trim()
      : rawAttrsWithClosing;

    tokens.push({
      kind: "tag",
      name,
      rawAttrs,
      closing,
      selfClosing,
    });
    cursor = tagEnd + 1;
  }

  return tokens;
};

export const parseHtmlAttributes = (rawAttrs: string) => {
  const attributes = new Map<string, string>();
  const regex = /([a-zA-Z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of rawAttrs.matchAll(regex)) {
    const key = match[1]?.toLowerCase();
    if (!key || key.startsWith("on")) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attributes.set(key, decodeHtmlEntities(value));
  }

  return attributes;
};

export const sanitizeHtmlWithPolicy = (rawHtml: string, policy: HtmlSanitizerPolicy) => {
  const output: string[] = [];
  const dropStack: string[] = [];

  for (const token of tokenizeHtml(stripNullBytes(rawHtml))) {
    if (token.kind === "comment") continue;

    if (token.kind === "text") {
      if (dropStack.length === 0) output.push(token.value);
      continue;
    }

    if (policy.dropContentTags.has(token.name)) {
      if (token.closing) {
        const dropIndex = dropStack.lastIndexOf(token.name);
        if (dropIndex !== -1) dropStack.splice(dropIndex);
      } else if (!token.selfClosing) {
        dropStack.push(token.name);
      }
      continue;
    }

    if (dropStack.length > 0) continue;
    if (!policy.allowedTags.has(token.name)) continue;

    if (token.closing) {
      output.push(`</${token.name}>`);
      continue;
    }

    const attrs = policy.sanitizeAttributes(token.name, token.rawAttrs);
    if (attrs === null) continue;
    output.push(`<${token.name}${attrs}>`);
  }

  return output.join("").trim();
};

export const htmlToTextLines = (
  html: string,
  blockTags: ReadonlySet<string>
) => {
  const lines: string[] = [];
  let current = "";

  const flush = () => {
    const trimmed = current.replace(/\s+/g, " ").trim();
    if (trimmed) lines.push(trimmed);
    current = "";
  };

  for (const token of tokenizeHtml(html)) {
    if (token.kind === "text") {
      current += decodeHtmlEntities(token.value);
      continue;
    }

    if (token.kind !== "tag") continue;
    if (!token.closing && token.name === "br") {
      flush();
      continue;
    }
    if (token.closing && blockTags.has(token.name)) {
      flush();
    }
  }

  flush();
  return lines;
};

export const htmlToPlainText = (
  html: string,
  blockTags: ReadonlySet<string>
) => htmlToTextLines(html, blockTags).join(" ").replace(/\s+/g, " ").trim();
