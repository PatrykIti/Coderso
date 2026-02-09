import { expandDocsTokens, normalizeDocsText, tokenizeDocsText } from "./docsIndexService";
import type { DocsIndex, DocsSearchHit, DocsSearchOptions } from "./docsTypes";

const BM25_K1 = 1.2;
const BM25_B = 0.75;

const resolveTopK = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.min(Math.max(Math.floor(value), 1), 10);
};

const resolveMinScore = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.01;
  return Math.max(value, 0);
};

export const normalizeDocsQuery = (query: string) =>
  query.trim().replace(/\s+/g, " ");

const bm25TermScore = (input: {
  termFrequency: number;
  documentFrequency: number;
  documentCount: number;
  chunkLength: number;
  averageChunkLength: number;
}) => {
  if (input.termFrequency <= 0) return 0;
  const docCount = Math.max(input.documentCount, 1);
  const docFrequency = Math.max(input.documentFrequency, 0);
  const idf = Math.log((docCount - docFrequency + 0.5) / (docFrequency + 0.5) + 1);
  const avgLength = Math.max(input.averageChunkLength, 1);
  const lengthNorm =
    BM25_K1 *
    (1 - BM25_B + BM25_B * (Math.max(input.chunkLength, 1) / avgLength));
  const tf = (input.termFrequency * (BM25_K1 + 1)) / (input.termFrequency + lengthNorm);
  return idf * tf;
};

const buildSnippet = (content: string, queryTerms: string[], maxLength = 220) => {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;

  const lower = compact.toLowerCase();
  let hitIndex = -1;
  for (const term of queryTerms) {
    const index = lower.indexOf(term.toLowerCase());
    if (index === -1) continue;
    if (hitIndex === -1 || index < hitIndex) {
      hitIndex = index;
    }
  }

  if (hitIndex === -1) {
    return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
  }

  const start = Math.max(0, hitIndex - Math.floor(maxLength / 4));
  const end = Math.min(compact.length, start + maxLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < compact.length ? "…" : "";
  return `${prefix}${compact.slice(start, end).trim()}${suffix}`;
};

const scoreChunk = (input: {
  index: DocsIndex;
  queryTokens: string[];
  queryPhrase: string;
  chunk: DocsIndex["chunks"][number];
}) => {
  const averageChunkLength = input.index.averageChunkTokens > 0
    ? input.index.averageChunkTokens
    : 1;
  let score = 0;
  const matchedTerms: string[] = [];

  for (const token of input.queryTokens) {
    const termFrequency = input.chunk.tokenCounts[token] ?? 0;
    if (termFrequency <= 0) continue;
    matchedTerms.push(token);
    const documentFrequency = input.index.tokenDocumentFrequency[token] ?? 0;
    score += bm25TermScore({
      termFrequency,
      documentFrequency,
      documentCount: input.index.chunkCount,
      chunkLength: input.chunk.tokenCount,
      averageChunkLength,
    });
  }

  if (matchedTerms.length === 0) {
    return { score: 0, matchedTerms };
  }

  const headingNormalized = normalizeDocsText(input.chunk.headingPath.join(" "));
  const pathNormalized = normalizeDocsText(input.chunk.docPath);
  const phrase = normalizeDocsText(input.queryPhrase);
  if (phrase && input.chunk.normalizedText.includes(phrase)) {
    score += 1.2;
  }

  for (const term of matchedTerms) {
    if (headingNormalized.includes(term)) score += 0.35;
    if (pathNormalized.includes(term)) score += 0.25;
  }

  return { score, matchedTerms };
};

export const searchDocsIndex = (
  index: DocsIndex,
  query: string,
  options: DocsSearchOptions = {}
): DocsSearchHit[] => {
  const normalizedQuery = normalizeDocsQuery(query);
  if (normalizedQuery.length < 2) return [];
  if (index.chunkCount === 0) return [];

  const queryTokens = tokenizeDocsText(normalizedQuery);
  if (queryTokens.length === 0) return [];
  const expandedQueryTokens = expandDocsTokens(queryTokens);
  const topK = resolveTopK(options.topK);
  const minScore = resolveMinScore(options.minScore);

  const hits: DocsSearchHit[] = [];
  for (const chunk of index.chunks) {
    const { score, matchedTerms } = scoreChunk({
      index,
      chunk,
      queryTokens: expandedQueryTokens,
      queryPhrase: normalizedQuery,
    });
    if (score < minScore) continue;
    hits.push({
      chunk,
      score,
      matchedTerms,
      snippet: buildSnippet(chunk.content, expandedQueryTokens),
    });
  }

  hits.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.chunk.docPath !== right.chunk.docPath) {
      return left.chunk.docPath.localeCompare(right.chunk.docPath);
    }
    return left.chunk.lineStart - right.chunk.lineStart;
  });

  return hits.slice(0, topK);
};
