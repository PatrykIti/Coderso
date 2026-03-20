import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";

import type { DocsChunk, DocsIndex, DocsIndexStatus } from "./docsTypes";

const DEFAULT_DOC_PATHS = ["docs"];
const DEFAULT_MAX_CHUNK_CHARS = 1200;
const HEADING_REGEX = /^(#{1,6})\s+(.+?)\s*$/;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "do",
  "for",
  "from",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "was",
  "what",
  "when",
  "where",
  "with",
  "w",
  "z",
  "za",
  "do",
  "na",
  "nie",
  "oraz",
  "jest",
  "czy",
  "jak",
  "gdzie",
  "ktory",
  "ktora",
  "ktore",
  "sie",
  "dla",
  "po",
  "od",
  "o",
  "i",
]);

const SYNONYM_GROUPS = [
  ["widget", "widgets", "widgety", "blok", "bloki"],
  ["settings", "setting", "ustawienia", "konfiguracja", "config"],
  ["page", "pages", "strona", "strony"],
  ["template", "templates", "szablon", "szablony"],
  ["preview", "podglad"],
  ["menu", "navigation", "nawigacja"],
  ["theme", "themes", "motyw", "motywy"],
  ["auth", "login", "session", "sesja", "logowanie"],
];

const synonymMap = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    for (const token of group) {
      const normalized = token.toLowerCase();
      const bucket = map.get(normalized) ?? new Set<string>();
      for (const candidate of group) {
        bucket.add(candidate.toLowerCase());
      }
      map.set(normalized, bucket);
    }
  }
  return map;
})();

type BuildDocsIndexOptions = {
  docPaths?: string[];
  maxChunkChars?: number;
  cwd?: string;
  now?: () => Date;
};

type ParsedSection = {
  headingPath: string[];
  heading: string;
  lineStart: number;
  lineEnd: number;
  lines: string[];
};

const toUnixPath = (value: string) => value.replace(/\\/g, "/");

const resolveDisplayPath = (absolutePath: string, cwd: string) => {
  const fromCwd = path.relative(cwd, absolutePath);
  if (fromCwd && !fromCwd.startsWith("..")) return toUnixPath(fromCwd);
  const parentCwd = path.resolve(cwd, "..");
  const fromParent = path.relative(parentCwd, absolutePath);
  if (fromParent && !fromParent.startsWith("..")) return toUnixPath(fromParent);
  return toUnixPath(fromCwd || absolutePath);
};

const normalizeConfiguredPaths = (value: unknown) => {
  if (!Array.isArray(value)) return [...DEFAULT_DOC_PATHS];
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
  }
  return normalized.length > 0 ? normalized : [...DEFAULT_DOC_PATHS];
};

const exists = async (targetPath: string) => {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolveConfiguredPath = async (rawPath: string, cwd: string) => {
  if (path.isAbsolute(rawPath)) {
    return (await exists(rawPath)) ? rawPath : null;
  }

  const candidates = [path.resolve(cwd, rawPath), path.resolve(cwd, "..", rawPath)];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
};

const collectMarkdownFiles = async (targetPath: string): Promise<string[]> => {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile()) {
    return targetPath.toLowerCase().endsWith(".md") ? [targetPath] : [];
  }

  if (!targetStat.isDirectory()) return [];

  const result: string[] = [];
  const entries = await readdir(targetPath, { withFileTypes: true });
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of sortedEntries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectMarkdownFiles(entryPath);
      result.push(...nested);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;
    result.push(entryPath);
  }

  return result;
};

export const normalizeDocsText = (input: string) =>
  input
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const tokenizeDocsText = (input: string) =>
  normalizeDocsText(input)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));

export const expandDocsTokens = (tokens: string[]) => {
  const expanded = new Set<string>();
  for (const token of tokens) {
    if (!token) continue;
    expanded.add(token);
    const synonyms = synonymMap.get(token);
    if (!synonyms) continue;
    for (const synonym of synonyms) {
      expanded.add(synonym);
    }
  }
  return [...expanded];
};

const toTokenCounts = (tokens: string[]) => {
  const counts: Record<string, number> = {};
  for (const token of tokens) {
    counts[token] = (counts[token] ?? 0) + 1;
  }
  return counts;
};

const headingFromFilename = (filePath: string) =>
  path
    .basename(filePath)
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

const parseSections = (filePath: string, content: string): ParsedSection[] => {
  const lines = content.split(/\r?\n/);
  const fallbackHeading = headingFromFilename(filePath) || "Document";
  const headingStack: string[] = [fallbackHeading];
  const sections: ParsedSection[] = [];

  let current: ParsedSection = {
    headingPath: [...headingStack],
    heading: headingStack[headingStack.length - 1] ?? fallbackHeading,
    lineStart: 1,
    lineEnd: lines.length,
    lines: [],
  };

  const flush = (lineEnd: number) => {
    current.lineEnd = lineEnd;
    const hasContent = current.lines.some((line) => line.trim().length > 0);
    if (hasContent) {
      sections.push({
        ...current,
        lines: [...current.lines],
      });
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const headingMatch = line.match(HEADING_REGEX);
    if (!headingMatch) {
      current.lines.push(line);
      continue;
    }

    flush(index + 1);
    const headingLevel = headingMatch[1]?.length ?? 1;
    const headingTitle = headingMatch[2]?.trim() || fallbackHeading;

    headingStack.length = Math.max(headingLevel - 1, 0);
    headingStack.push(headingTitle);

    current = {
      headingPath: [...headingStack],
      heading: headingTitle,
      lineStart: index + 2,
      lineEnd: lines.length,
      lines: [],
    };
  }

  flush(lines.length);
  return sections;
};

const splitSectionIntoChunks = (
  docPath: string,
  section: ParsedSection,
  maxChunkChars: number
): DocsChunk[] => {
  const chunks: DocsChunk[] = [];
  let buffer: string[] = [];
  let bufferStartLine = section.lineStart;
  let bufferChars = 0;

  const pushBuffer = (lineEnd: number) => {
    const content = buffer.join("\n").trim();
    if (!content) {
      buffer = [];
      bufferChars = 0;
      return;
    }
    const headingTrail = section.headingPath.join(" ");
    const combinedText = `${headingTrail} ${content}`;
    const normalizedText = normalizeDocsText(combinedText);
    const tokens = expandDocsTokens(tokenizeDocsText(combinedText));
    const tokenCounts = toTokenCounts(tokens);
    const tokenCount = tokens.length;

    chunks.push({
      id: `${docPath}:${bufferStartLine}-${lineEnd}`,
      docPath,
      headingPath: section.headingPath,
      heading: section.heading,
      lineStart: bufferStartLine,
      lineEnd,
      content,
      normalizedText,
      tokenCounts,
      tokenCount,
    });
    buffer = [];
    bufferChars = 0;
  };

  for (let index = 0; index < section.lines.length; index += 1) {
    const line = section.lines[index] ?? "";
    const absoluteLine = section.lineStart + index;
    const trimmed = line.trimEnd();

    if (buffer.length === 0 && trimmed.trim().length === 0) {
      bufferStartLine = absoluteLine + 1;
      continue;
    }

    const nextChars = bufferChars + trimmed.length + 1;
    if (buffer.length > 0 && nextChars > maxChunkChars) {
      pushBuffer(absoluteLine - 1);
      if (trimmed.trim().length === 0) {
        bufferStartLine = absoluteLine + 1;
        continue;
      }
      bufferStartLine = absoluteLine;
    }

    if (buffer.length === 0) {
      bufferStartLine = absoluteLine;
    }
    buffer.push(trimmed);
    bufferChars += trimmed.length + 1;
  }

  if (buffer.length > 0) {
    const lineEnd = section.lineStart + section.lines.length - 1;
    pushBuffer(lineEnd);
  }

  return chunks;
};

const resolveAssistantDocPaths = async (override?: string[]) => {
  if (override && override.length > 0) {
    return normalizeConfiguredPaths(override);
  }
  return [...DEFAULT_DOC_PATHS];
};

let cachedDocsIndex: DocsIndex | null = null;
let docsIndexBuildPromise: Promise<DocsIndex> | null = null;
let docsIndexBuildError: string | null = null;
let lastConfiguredPaths: string[] = [...DEFAULT_DOC_PATHS];

export const clearDocsIndexCache = () => {
  cachedDocsIndex = null;
  docsIndexBuildPromise = null;
  docsIndexBuildError = null;
  lastConfiguredPaths = [...DEFAULT_DOC_PATHS];
};

export const getDocsIndexSnapshot = () => cachedDocsIndex;

export const getDocsIndexStatus = (): DocsIndexStatus => ({
  ready: Boolean(cachedDocsIndex),
  building: Boolean(docsIndexBuildPromise),
  error: docsIndexBuildError,
  builtAt: cachedDocsIndex?.builtAt ?? null,
  configuredPaths: [...lastConfiguredPaths],
  docCount: cachedDocsIndex?.docCount ?? 0,
  chunkCount: cachedDocsIndex?.chunkCount ?? 0,
});

export const buildDocsIndex = async (
  options: BuildDocsIndexOptions = {}
): Promise<DocsIndex> => {
  const startedAt = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? (() => new Date());
  const maxChunkChars = Math.max(
    300,
    Math.floor(options.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS)
  );

  const configuredPaths = await resolveAssistantDocPaths(options.docPaths);
  lastConfiguredPaths = configuredPaths;

  const resolvedPaths: string[] = [];
  for (const configuredPath of configuredPaths) {
    const resolved = await resolveConfiguredPath(configuredPath, cwd);
    if (!resolved) continue;
    resolvedPaths.push(resolved);
  }

  const markdownFiles: string[] = [];
  for (const resolvedPath of resolvedPaths) {
    const files = await collectMarkdownFiles(resolvedPath);
    markdownFiles.push(...files);
  }

  const uniqueFiles = [...new Set(markdownFiles)].sort((a, b) => a.localeCompare(b));
  const chunks: DocsChunk[] = [];

  for (const filePath of uniqueFiles) {
    const raw = await readFile(filePath, "utf8");
    const sections = parseSections(filePath, raw);
    const docPath = resolveDisplayPath(filePath, cwd);
    for (const section of sections) {
      const sectionChunks = splitSectionIntoChunks(docPath, section, maxChunkChars);
      chunks.push(...sectionChunks);
    }
  }

  const tokenDocumentFrequency: Record<string, number> = {};
  let totalTokens = 0;
  for (const chunk of chunks) {
    totalTokens += chunk.tokenCount;
    const uniqueChunkTokens = new Set(Object.keys(chunk.tokenCounts));
    for (const token of uniqueChunkTokens) {
      tokenDocumentFrequency[token] = (tokenDocumentFrequency[token] ?? 0) + 1;
    }
  }

  const chunkCount = chunks.length;
  const index: DocsIndex = {
    configuredPaths,
    builtAt: now().toISOString(),
    buildDurationMs: Date.now() - startedAt,
    docCount: uniqueFiles.length,
    chunkCount,
    totalTokens,
    averageChunkTokens: chunkCount > 0 ? totalTokens / chunkCount : 0,
    chunks,
    tokenDocumentFrequency,
  };

  return index;
};

export const reindexDocsIndex = async (
  options: BuildDocsIndexOptions = {}
): Promise<DocsIndex> => {
  if (docsIndexBuildPromise) {
    return docsIndexBuildPromise;
  }
  docsIndexBuildError = null;
  docsIndexBuildPromise = buildDocsIndex(options)
    .then((index) => {
      cachedDocsIndex = index;
      return index;
    })
    .catch((error) => {
      docsIndexBuildError =
        error instanceof Error ? error.message : "assistant_docs_index_build_failed";
      throw error;
    })
    .finally(() => {
      docsIndexBuildPromise = null;
    });
  return docsIndexBuildPromise;
};

export const ensureDocsIndex = async (
  options: BuildDocsIndexOptions = {}
): Promise<DocsIndex> => {
  if (cachedDocsIndex) return cachedDocsIndex;
  return reindexDocsIndex(options);
};

export const initializeDocsIndexOnBootIfEnabled = async (
  _options: BuildDocsIndexOptions = {}
) => {
  try {
    const { getSetting } = await import("../settings/settingsService");
    const reindexOnBoot = await getSetting("assistant.docs.reindexOnBoot");
    if (reindexOnBoot === true) {
      const { ingestInternalDocsToDb } = await import("./docsIngestService");
      await ingestInternalDocsToDb({ sourceRoot: "docs" });
      return;
    }
  } catch {
    // Keep startup resilient; assistant can be indexed later via explicit trigger.
  }
};

export type { BuildDocsIndexOptions };
