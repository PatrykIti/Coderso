import { createHash } from "node:crypto";
import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { desc, eq, sql } from "drizzle-orm";

import { expandDocsTokens, normalizeDocsText, tokenizeDocsText } from "./docsIndexService";

const DEFAULT_INTERNAL_DOCS_ROOT = "docs";
const DEFAULT_MAX_CHUNK_CHARS = 1200;
const DEFAULT_MAX_DOC_BODY_CHARS = 120_000;
const DEFAULT_MAX_CHUNKS_PER_DOC = 240;
const HEADING_REGEX = /^(#{1,6})\s+(.+?)\s*$/;
const SKIPPED_FILENAMES = new Set([
  "README.md",
  "INTERNAL_DOC_TEMPLATE.md",
  "_TEMPLATE.md",
  "_COVERAGE_MATRIX.md",
]);
const LEGACY_REQUIRED_SECTIONS = [
  "what is it",
  "when to use",
  "step by step",
  "examples",
  "common mistakes",
] as const;
const MULTI_LEVEL_REQUIRED_SECTIONS = [
  "basic",
  "medium",
  "instruction",
  "advanced",
] as const;

export type InternalDocsMeta = {
  title: string;
  audience: string;
  productArea: string;
  language: string;
  keywords: string[];
};

export type InternalDocValidationError = {
  path: string;
  code: string;
  message: string;
};

export type InternalDocChunkInput = {
  chunkIndex: number;
  headingPath: string[];
  heading: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  normalizedText: string;
  tokenCount: number;
};

export type ParsedInternalDoc = {
  meta: InternalDocsMeta;
  body: string;
  bodyStartLine: number;
};

export type AssistantDocsIngestRunStatus = "success" | "partial" | "failed";

export type AssistantDocsIngestResult = {
  runId: string;
  sourceRoot: string;
  status: AssistantDocsIngestRunStatus;
  filesScanned: number;
  docsUpserted: number;
  chunksUpserted: number;
  totalTokens: number;
  errorsCount: number;
  errors: InternalDocValidationError[];
  startedAt: string;
  finishedAt: string;
  buildDurationMs: number;
};

export type AssistantDocsDbStatus = {
  ready: boolean;
  docCount: number;
  chunkCount: number;
  lastIngestAt: string | null;
  lastIngestStatus: string | null;
  indexError: string | null;
};

const stripQuotes = (value: string) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const parseKeywordsValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return [] as string[];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((entry) => stripQuotes(entry))
      .filter((entry) => entry.length > 0);
  }
  return [stripQuotes(trimmed)].filter((entry) => entry.length > 0);
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

const exists = async (targetPath: string) => {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolveSourceRoot = async (sourceRoot: string, cwd: string) => {
  if (path.isAbsolute(sourceRoot)) {
    return (await exists(sourceRoot)) ? sourceRoot : null;
  }

  const candidates = [path.resolve(cwd, sourceRoot), path.resolve(cwd, "..", sourceRoot)];
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return null;
};

const collectMarkdownFiles = async (targetPath: string): Promise<string[]> => {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile()) {
    const name = path.basename(targetPath);
    if (!targetPath.toLowerCase().endsWith(".md")) return [];
    if (SKIPPED_FILENAMES.has(name)) return [];
    return [targetPath];
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
    if (SKIPPED_FILENAMES.has(entry.name)) continue;
    result.push(entryPath);
  }
  return result;
};

export const parseInternalDoc = (input: string): ParsedInternalDoc => {
  const lines = input.split(/\r?\n/);
  if ((lines[0] ?? "").trim() !== "---") {
    throw new Error("assistant_doc_frontmatter_missing");
  }

  let frontmatterEndIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if ((lines[index] ?? "").trim() === "---") {
      frontmatterEndIndex = index;
      break;
    }
  }
  if (frontmatterEndIndex === -1) {
    throw new Error("assistant_doc_frontmatter_invalid");
  }

  const metaRaw: Record<string, unknown> = {};
  const frontmatterLines = lines.slice(1, frontmatterEndIndex);
  for (let index = 0; index < frontmatterLines.length; index += 1) {
    const rawLine = frontmatterLines[index] ?? "";
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1]!;
    const rawValue = match[2] ?? "";

    if (key === "keywords") {
      const keywords = parseKeywordsValue(rawValue);
      let cursor = index + 1;
      while (cursor < frontmatterLines.length) {
        const candidate = (frontmatterLines[cursor] ?? "").trim();
        const listMatch = candidate.match(/^-+\s*(.+)$/);
        if (!listMatch) break;
        keywords.push(stripQuotes(listMatch[1] ?? ""));
        cursor += 1;
      }
      metaRaw[key] = keywords.filter((entry) => entry.length > 0);
      index = cursor - 1;
      continue;
    }

    metaRaw[key] = stripQuotes(rawValue);
  }

  const meta: InternalDocsMeta = {
    title: String(metaRaw.title ?? "").trim(),
    audience: String(metaRaw.audience ?? "").trim(),
    productArea: String(metaRaw.productArea ?? "").trim(),
    language: String(metaRaw.language ?? "").trim(),
    keywords: Array.isArray(metaRaw.keywords)
      ? (metaRaw.keywords as unknown[])
          .map((entry) => String(entry).trim())
          .filter((entry) => entry.length > 0)
      : [],
  };

  const bodyLines = lines.slice(frontmatterEndIndex + 1);
  return {
    meta,
    body: bodyLines.join("\n"),
    bodyStartLine: frontmatterEndIndex + 2,
  };
};

const normalizeHeading = (heading: string) =>
  normalizeDocsText(heading).replace(/\s+/g, " ").trim();

const toHeadingAliases = (heading: string) => {
  const normalized = normalizeHeading(heading);
  const aliases = new Set<string>([normalized]);

  if (normalized.includes("step by step")) aliases.add("instruction");
  if (normalized.includes("instruction")) aliases.add("step by step");

  if (normalized.includes("what is it")) aliases.add("basic");
  if (normalized === "basic") aliases.add("what is it");

  if (normalized.includes("when to use")) aliases.add("medium");
  if (normalized === "medium") aliases.add("when to use");

  if (normalized.includes("examples")) aliases.add("advanced");
  if (normalized === "advanced") aliases.add("examples");

  if (normalized.includes("common mistakes")) aliases.add("troubleshooting");
  if (normalized.includes("troubleshooting")) aliases.add("common mistakes");

  if (normalized.includes("decision guide")) aliases.add("advanced");
  if (normalized.includes("checklist")) aliases.add("instruction");
  if (normalized.includes("security")) aliases.add("advanced");

  return [...aliases];
};

export const validateInternalDocContract = (
  sourcePath: string,
  parsed: ParsedInternalDoc
): InternalDocValidationError[] => {
  const errors: InternalDocValidationError[] = [];

  if (!parsed.meta.title) {
    errors.push({
      path: sourcePath,
      code: "meta_title_missing",
      message: "Frontmatter field 'title' is required.",
    });
  }
  if (!parsed.meta.audience) {
    errors.push({
      path: sourcePath,
      code: "meta_audience_missing",
      message: "Frontmatter field 'audience' is required.",
    });
  }
  if (!parsed.meta.productArea) {
    errors.push({
      path: sourcePath,
      code: "meta_product_area_missing",
      message: "Frontmatter field 'productArea' is required.",
    });
  }
  if (!parsed.meta.language) {
    errors.push({
      path: sourcePath,
      code: "meta_language_missing",
      message: "Frontmatter field 'language' is required.",
    });
  }

  if (parsed.body.length > DEFAULT_MAX_DOC_BODY_CHARS) {
    errors.push({
      path: sourcePath,
      code: "doc_body_too_large",
      message: `Document body exceeds ${DEFAULT_MAX_DOC_BODY_CHARS} characters.`,
    });
  }

  const headings = new Set<string>();
  for (const line of parsed.body.split(/\r?\n/)) {
    const headingMatch = line.match(HEADING_REGEX);
    if (!headingMatch) continue;
    for (const alias of toHeadingAliases(headingMatch[2] ?? "")) {
      headings.add(alias);
    }
  }

  const hasLegacyPack = LEGACY_REQUIRED_SECTIONS.every((section) => headings.has(section));
  const hasMultiLevelPack = MULTI_LEVEL_REQUIRED_SECTIONS.every((section) =>
    headings.has(section)
  );

  if (!hasLegacyPack && !hasMultiLevelPack) {
    for (const section of MULTI_LEVEL_REQUIRED_SECTIONS) {
      if (headings.has(section)) continue;
      errors.push({
        path: sourcePath,
        code: "required_section_missing",
        message: `Required section '${section}' is missing.`,
      });
    }
  }

  return errors;
};

type ParsedSection = {
  headingPath: string[];
  heading: string;
  lineStart: number;
  lineEnd: number;
  lines: string[];
};

const parseSections = (
  body: string,
  bodyStartLine: number,
  fallbackHeading: string
): ParsedSection[] => {
  const lines = body.split(/\r?\n/);
  const headingStack: string[] = [fallbackHeading];
  const sections: ParsedSection[] = [];

  let current: ParsedSection = {
    headingPath: [...headingStack],
    heading: fallbackHeading,
    lineStart: bodyStartLine,
    lineEnd: bodyStartLine + lines.length - 1,
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

    flush(bodyStartLine + index);
    const headingLevel = headingMatch[1]?.length ?? 1;
    const headingTitle = headingMatch[2]?.trim() || fallbackHeading;

    headingStack.length = Math.max(headingLevel - 1, 0);
    headingStack.push(headingTitle);

    current = {
      headingPath: [...headingStack],
      heading: headingTitle,
      lineStart: bodyStartLine + index + 1,
      lineEnd: bodyStartLine + lines.length - 1,
      lines: [],
    };
  }

  flush(bodyStartLine + lines.length - 1);
  return sections;
};

const splitSectionIntoChunks = (
  section: ParsedSection,
  maxChunkChars: number
): InternalDocChunkInput[] => {
  const chunks: InternalDocChunkInput[] = [];
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

    chunks.push({
      chunkIndex: chunks.length,
      headingPath: section.headingPath,
      heading: section.heading,
      lineStart: bufferStartLine,
      lineEnd,
      content,
      normalizedText,
      tokenCount: tokens.length,
    });

    buffer = [];
    bufferChars = 0;
  };

  for (let index = 0; index < section.lines.length; index += 1) {
    const line = section.lines[index] ?? "";
    const absoluteLine = section.lineStart + index;
    const trimmed = line.trimEnd();

    if (trimmed.length > maxChunkChars) {
      throw new Error("assistant_doc_chunk_oversized");
    }

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
    pushBuffer(section.lineStart + section.lines.length - 1);
  }

  return chunks;
};

export const buildInternalDocChunks = (
  parsed: ParsedInternalDoc,
  maxChunkChars = DEFAULT_MAX_CHUNK_CHARS
): InternalDocChunkInput[] => {
  if (!Number.isFinite(maxChunkChars) || maxChunkChars <= 0) {
    throw new Error("assistant_doc_chunk_limit_invalid");
  }

  const fallbackHeading =
    parsed.meta.title || "Internal Documentation";
  const sections = parseSections(parsed.body, parsed.bodyStartLine, fallbackHeading);
  const chunks: InternalDocChunkInput[] = [];
  for (const section of sections) {
    const next = splitSectionIntoChunks(section, maxChunkChars);
    for (const chunk of next) {
      chunks.push({
        ...chunk,
        chunkIndex: chunks.length,
      });
    }
  }

  if (chunks.length > DEFAULT_MAX_CHUNKS_PER_DOC) {
    throw new Error("assistant_doc_chunks_excessive");
  }
  return chunks;
};

const toChecksum = (raw: string) =>
  createHash("sha256").update(raw).digest("hex");

const toIso = (value: Date | string | null | undefined) => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

const loadDbModules = async () => {
  const [{ db }, schema] = await Promise.all([
    import("../../db/client"),
    import("../../db/schema"),
  ]);
  return { db, ...schema };
};

type IngestInput = {
  sourceRoot?: string;
  triggeredByUserId?: string | null;
  cwd?: string;
};

export const ingestInternalDocsToDb = async (
  input: IngestInput = {}
): Promise<AssistantDocsIngestResult> => {
  const startedAtDate = new Date();
  const startedAt = startedAtDate.toISOString();
  const cwd = input.cwd ?? process.cwd();
  const sourceRootConfigured = input.sourceRoot ?? DEFAULT_INTERNAL_DOCS_ROOT;

  const { db, assistantDocs, assistantDocChunks, assistantDocIngestRuns } =
    await loadDbModules();

  const [runRow] = await db
    .insert(assistantDocIngestRuns)
    .values({
      triggeredByUserId: input.triggeredByUserId ?? null,
      sourceRoot: sourceRootConfigured,
      status: "running",
      startedAt: startedAtDate,
      filesScanned: 0,
      docsUpserted: 0,
      chunksUpserted: 0,
      errorsCount: 0,
      errorsJson: [],
    })
    .returning({
      id: assistantDocIngestRuns.id,
    });

  if (!runRow?.id) {
    throw new Error("assistant_docs_ingest_failed");
  }

  const errors: InternalDocValidationError[] = [];
  let filesScanned = 0;
  let docsUpserted = 0;
  let chunksUpserted = 0;
  let totalTokens = 0;

  try {
    const resolvedRoot = await resolveSourceRoot(sourceRootConfigured, cwd);
    if (!resolvedRoot) {
      throw new Error("assistant_docs_source_root_missing");
    }

    const files = await collectMarkdownFiles(resolvedRoot);
    const uniqueFiles = [...new Set(files)].sort((a, b) => a.localeCompare(b));
    filesScanned = uniqueFiles.length;

    for (const filePath of uniqueFiles) {
      const raw = await readFile(filePath, "utf8");
      const sourcePath = resolveDisplayPath(filePath, cwd);
      const parsed = (() => {
        try {
          return parseInternalDoc(raw);
        } catch (error) {
          errors.push({
            path: sourcePath,
            code: "parse_failed",
            message:
              error instanceof Error
                ? error.message
                : "assistant_doc_parse_failed",
          });
          return null;
        }
      })();
      if (!parsed) continue;

      const validationErrors = validateInternalDocContract(sourcePath, parsed);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        continue;
      }

      const chunks = (() => {
        try {
          return buildInternalDocChunks(parsed);
        } catch (error) {
          errors.push({
            path: sourcePath,
            code: "chunk_build_failed",
            message:
              error instanceof Error
                ? error.message
                : "assistant_doc_chunk_build_failed",
          });
          return null;
        }
      })();
      if (!chunks) continue;
      const checksum = toChecksum(raw);
      const slug = path
        .relative(resolvedRoot, filePath)
        .replace(/\.md$/i, "")
        .replace(/\\/g, "/")
        .toLowerCase();

      const [docRow] = await db
        .insert(assistantDocs)
        .values({
          sourcePath,
          slug,
          title: parsed.meta.title,
          audience: parsed.meta.audience,
          productArea: parsed.meta.productArea,
          language: parsed.meta.language,
          keywordsJson: parsed.meta.keywords,
          checksum,
          sourceUpdatedAt: startedAtDate,
          updatedAt: startedAtDate,
        })
        .onConflictDoUpdate({
          target: assistantDocs.sourcePath,
          set: {
            slug,
            title: parsed.meta.title,
            audience: parsed.meta.audience,
            productArea: parsed.meta.productArea,
            language: parsed.meta.language,
            keywordsJson: parsed.meta.keywords,
            checksum,
            sourceUpdatedAt: startedAtDate,
            updatedAt: startedAtDate,
          },
        })
        .returning({ id: assistantDocs.id });

      if (!docRow?.id) continue;

      await db
        .delete(assistantDocChunks)
        .where(eq(assistantDocChunks.docId, docRow.id));

      if (chunks.length > 0) {
        await db.insert(assistantDocChunks).values(
          chunks.map((chunk) => ({
            docId: docRow.id,
            chunkIndex: chunk.chunkIndex,
            headingPath: chunk.headingPath,
            heading: chunk.heading,
            lineStart: chunk.lineStart,
            lineEnd: chunk.lineEnd,
            content: chunk.content,
            normalizedText: chunk.normalizedText,
            tokenCount: chunk.tokenCount,
            updatedAt: startedAtDate,
          }))
        );
      }

      docsUpserted += 1;
      chunksUpserted += chunks.length;
      totalTokens += chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    }
  } catch (error) {
    const finishedAtDate = new Date();
    errors.push({
      path: sourceRootConfigured,
      code: "ingest_failed",
      message: error instanceof Error ? error.message : "assistant_docs_ingest_failed",
    });

    await db
      .update(assistantDocIngestRuns)
      .set({
        finishedAt: finishedAtDate,
        status: "failed",
        filesScanned,
        docsUpserted,
        chunksUpserted,
        errorsCount: errors.length,
        errorsJson: errors,
      })
      .where(eq(assistantDocIngestRuns.id, runRow.id));

    throw new Error("assistant_docs_ingest_failed");
  }

  const finishedAtDate = new Date();
  const finishedAt = finishedAtDate.toISOString();
  const status: AssistantDocsIngestRunStatus =
    errors.length === 0 ? "success" : docsUpserted > 0 ? "partial" : "failed";

  await db
    .update(assistantDocIngestRuns)
    .set({
      finishedAt: finishedAtDate,
      status,
      filesScanned,
      docsUpserted,
      chunksUpserted,
      errorsCount: errors.length,
      errorsJson: errors,
    })
    .where(eq(assistantDocIngestRuns.id, runRow.id));

  return {
    runId: runRow.id,
    sourceRoot: sourceRootConfigured,
    status,
    filesScanned,
    docsUpserted,
    chunksUpserted,
    totalTokens,
    errorsCount: errors.length,
    errors,
    startedAt,
    finishedAt,
    buildDurationMs: finishedAtDate.getTime() - startedAtDate.getTime(),
  };
};

export const getAssistantDocsDbStatus = async (): Promise<AssistantDocsDbStatus> => {
  try {
    const { db, assistantDocs, assistantDocChunks, assistantDocIngestRuns } =
      await loadDbModules();
    const [docCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistantDocs);
    const [chunkCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assistantDocChunks);
    const [latestRun] = await db
      .select({
        status: assistantDocIngestRuns.status,
        finishedAt: assistantDocIngestRuns.finishedAt,
      })
      .from(assistantDocIngestRuns)
      .orderBy(desc(assistantDocIngestRuns.startedAt))
      .limit(1);

    const docCount = Number(docCountRow?.count ?? 0);
    const chunkCount = Number(chunkCountRow?.count ?? 0);
    const lastIngestStatus = latestRun?.status ?? null;
    const indexError = lastIngestStatus === "failed" ? "assistant_docs_ingest_failed" : null;

    return {
      ready: chunkCount > 0,
      docCount,
      chunkCount,
      lastIngestAt: toIso(latestRun?.finishedAt),
      lastIngestStatus,
      indexError,
    };
  } catch {
    return {
      ready: false,
      docCount: 0,
      chunkCount: 0,
      lastIngestAt: null,
      lastIngestStatus: null,
      indexError: "assistant_docs_db_unavailable",
    };
  }
};
