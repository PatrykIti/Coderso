export type DocsChunk = {
  id: string;
  docPath: string;
  headingPath: string[];
  heading: string;
  lineStart: number;
  lineEnd: number;
  content: string;
  normalizedText: string;
  tokenCounts: Record<string, number>;
  tokenCount: number;
};

export type DocsIndex = {
  configuredPaths: string[];
  builtAt: string;
  buildDurationMs: number;
  docCount: number;
  chunkCount: number;
  totalTokens: number;
  averageChunkTokens: number;
  chunks: DocsChunk[];
  tokenDocumentFrequency: Record<string, number>;
};

export type DocsIndexStatus = {
  ready: boolean;
  building: boolean;
  error: string | null;
  builtAt: string | null;
  configuredPaths: string[];
  docCount: number;
  chunkCount: number;
};

export type DocsSearchHit = {
  chunk: DocsChunk;
  score: number;
  matchedTerms: string[];
  snippet: string;
  rankingSignals?: {
    textScore: number;
    domainScore: number;
    intentScore: number;
    phraseScore: number;
    domainPenalty: number;
    matchedQueryCoverage: number;
  };
};

export type DocsSearchOptions = {
  topK?: number;
  minScore?: number;
};

export type DocsAnswerTemplate =
  | "location_answer"
  | "how_to_answer"
  | "clarifying_question"
  | "missing_answer";

export type DocsAnswerSource = {
  path: string;
  heading: string;
  lineStart: number;
  lineEnd: number;
  snippet: string;
  score: number;
};

export type DocsComposedAnswer = {
  mode: "docs-only";
  template: DocsAnswerTemplate;
  answer: string;
  confidence: number;
  sources: DocsAnswerSource[];
  fallbackUsed: boolean;
};
