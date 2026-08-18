/**
 * TASK-571: bounded async form-submissions export jobs.
 *
 * Replaces the unbounded in-memory export path (`buildFormSubmissionsExport`,
 * which awaited the WHOLE submission list and built the full CSV/JSON string in
 * memory) with a job + artifact model:
 *
 *   - `createSubmissionExportJob` validates the form, creates a `queued` job
 *     row, and hands the requesting admin a short-lived download token (only
 *     its HMAC is ever persisted).
 *   - `runSubmissionExportJob` streams the export in bounded keyset batches
 *     (`ORDER BY created_at DESC, id DESC`, `~5k rows/batch`, served by the
 *     `form_submissions_export_cursor_idx` composite index from migration
 *     0075). CSV runs a bounded column-collection FIRST PASS (payload keys
 *     only, no row materialization) so the header can be emitted before any
 *     row, preserving the "no captured answer is silently dropped" contract;
 *     JSON is streamed directly.
 *   - A byte cap aborts with the machine-readable `submission_export_too_large`
 *     instead of building an unbounded artifact. `ip`/`userAgent` are never
 *     selected, so PII omission holds at the query boundary too, and the CSV
 *     formula-injection guard is reused from `submissionExport.ts`.
 *   - The scheduler (`core/server/jobs/submissionExportScheduler.ts`) dispatches
 *     queued jobs under a session advisory lock and prunes expired rows +
 *     artifact files (bounded, resumable).
 *
 * Route wiring (export/job/status/download endpoints) is land-order-gated on
 * TASK-551-03-L02 and intentionally NOT part of this module.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq, inArray, isNull, lt, not, or } from "drizzle-orm";

import { db } from "../../db/client";
import { formSubmissions, submissionExportJobs } from "../../db/schema";
import { getForm, listFormFields, toFieldRecord } from "./formsService";
import {
  BASE_HEADERS,
  formatCell,
  mergePayloadColumnKeys,
  serializeCsvRow,
  submissionExportJsonEntry,
  type FieldColumn,
  type SubmissionExportRow,
} from "./submissionExport";

export type SubmissionExportFormat = "csv" | "json";
export type SubmissionExportJobStatus = "queued" | "running" | "done" | "failed";
export const SUBMISSION_EXPORT_FORMATS = ["csv", "json"] as const;
export const SUBMISSION_EXPORT_JOB_STATUSES = ["queued", "running", "done", "failed"] as const;

export type SubmissionExportJobInput = {
  formId: string;
  format: SubmissionExportFormat;
  /** Admin user id from the requesting session (nullable for system runs). */
  createdBy?: string | null;
};

export type SubmissionExportJobResult = {
  artifactKey: string;
  rowCount: number;
  bytes: number;
};

/** Public read model: never exposes `tokenHash` (or the raw token). */
export type SubmissionExportJobPublic = {
  id: string;
  formId: string;
  format: SubmissionExportFormat;
  status: SubmissionExportJobStatus;
  rowCount: number | null;
  bytes: number | null;
  errorCode: string | null;
  tokenExpiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Full row (including `artifactKey` + `tokenHash`) for the scheduler/download route. */
export type SubmissionExportJobRecord = SubmissionExportJobPublic & {
  artifactKey: string | null;
  tokenHash: string | null;
};

type Cursor = { createdAt: Date; id: string };

// Batch row shapes: `payload` is the raw jsonb value (inferred `unknown`),
// normalized to a plain object at the writer boundary — no captured row can
// break column derivation or serialization.
type ExportBatchRow = { id: string; createdAt: Date; status: string; payload: unknown };

// --- Configuration (env-driven, resolved per call so tests can vary it) ---

const DEFAULT_BATCH_SIZE = 5_000;
const DEFAULT_MAX_BYTES = 256 * 1024 * 1024; // 256 MiB
const DEFAULT_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

const parsePositiveInt = (raw: string | undefined, fallback: number, max: number): number => {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

export const resolveExportBatchSize = (): number =>
  parsePositiveInt(process.env.FORM_SUBMISSIONS_EXPORT_BATCH_SIZE, DEFAULT_BATCH_SIZE, 50_000);

export const resolveExportMaxBytes = (): number =>
  parsePositiveInt(
    process.env.FORM_SUBMISSIONS_EXPORT_MAX_BYTES,
    DEFAULT_MAX_BYTES,
    4 * 1024 * 1024 * 1024
  );

export const resolveExportTokenTtlMs = (): number =>
  parsePositiveInt(
    process.env.FORM_SUBMISSIONS_EXPORT_TOKEN_TTL_MS,
    DEFAULT_TOKEN_TTL_MS,
    24 * 60 * 60 * 1000
  );

export const resolveExportRetentionMs = (): number =>
  parsePositiveInt(
    process.env.FORM_SUBMISSIONS_EXPORT_RETENTION_MS,
    DEFAULT_RETENTION_MS,
    30 * 24 * 60 * 60 * 1000
  );

// Local artifact root. Files live under this dir keyed by `<jobId>.<ext>`; the
// download route (L02-gated) reads them through `readSubmissionExportArtifact`.
export const resolveSubmissionExportArtifactsDir = (): string =>
  path.resolve(process.cwd(), process.env.FORM_SUBMISSIONS_EXPORT_DIR ?? "storage/exports");

// --- Token hashing (HMAC only; the raw token is never persisted) ---

// Fail-closed fallback: without an explicit secret the token hash uses a
// per-process random key, so links stop verifying after a restart (they are
// short-lived anyway). An explicit env secret makes hashes stable across
// restarts. No secret is ever logged or returned.
const processLocalTokenSecret = randomBytes(32).toString("hex");

const resolveTokenSecret = (): string =>
  process.env.FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET?.trim() || processLocalTokenSecret;

export const hashSubmissionExportToken = (token: string): string =>
  createHmac("sha256", resolveTokenSecret()).update(token).digest("hex");

/**
 * Sanitized, bounded log representation for scheduler ticks: only the
 * machine-readable error message (or a bounded fallback), never submission
 * payloads, tokens, artifact paths or driver messages.
 */
export const submissionExportErrorForLog = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  return (message || "submission_export_failed").slice(0, 300);
};

/**
 * Constant-time token check for the (L02-gated) download route. Returns false
 * for any non-hash-shaped stored value, any expired link, or any mismatch —
 * never throws.
 */
export function verifySubmissionExportToken(
  job: Pick<SubmissionExportJobRecord, "tokenHash" | "tokenExpiresAt">,
  token: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!job.tokenHash || !job.tokenExpiresAt || !token) return false;
  if (job.tokenExpiresAt.getTime() <= now.getTime()) return false;
  const expected = hashSubmissionExportToken(token);
  if (expected.length !== job.tokenHash.length) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(job.tokenHash, "hex"));
}

// --- Artifact helpers ---

export const submissionExportArtifactKey = (
  jobId: string,
  format: SubmissionExportFormat
): string => `${jobId}.${format}`;

export const resolveSubmissionExportArtifactPath = (
  jobId: string,
  format: SubmissionExportFormat
): string =>
  path.join(resolveSubmissionExportArtifactsDir(), submissionExportArtifactKey(jobId, format));

export async function readSubmissionExportArtifact(
  job: Pick<SubmissionExportJobRecord, "id" | "format" | "artifactKey">
): Promise<{ path: string; size: number }> {
  const filePath = job.artifactKey
    ? path.join(resolveSubmissionExportArtifactsDir(), job.artifactKey)
    : resolveSubmissionExportArtifactPath(job.id, job.format);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error("submission_export_artifact_missing");
  }
  return { path: filePath, size: file.size };
}

// --- Row read helpers (bounded at the database boundary) ---

const cursorPredicate = (cursor: Cursor | null) =>
  cursor === null
    ? undefined
    : or(
        lt(formSubmissions.createdAt, cursor.createdAt),
        and(eq(formSubmissions.createdAt, cursor.createdAt), lt(formSubmissions.id, cursor.id))
      );

const keysetWhere = (formId: string, cursor: Cursor | null) =>
  and(eq(formSubmissions.formId, formId), cursorPredicate(cursor));

const keysetOrder = () => [desc(formSubmissions.createdAt), desc(formSubmissions.id)] as const;

// PASS A: payload keys + cursor columns only (no row materialization).
const fetchColumnBatch = async (
  formId: string,
  cursor: Cursor | null,
  batchSize: number
): Promise<{ id: string; createdAt: Date; payload: unknown }[]> =>
  db
    .select({
      id: formSubmissions.id,
      createdAt: formSubmissions.createdAt,
      payload: formSubmissions.payload,
    })
    .from(formSubmissions)
    .where(keysetWhere(formId, cursor))
    .orderBy(...keysetOrder())
    .limit(batchSize);

// PASS B: full export row shape, NEVER selecting ip/userAgent.
const fetchRowBatch = async (
  formId: string,
  cursor: Cursor | null,
  batchSize: number
): Promise<ExportBatchRow[]> =>
  db
    .select({
      id: formSubmissions.id,
      createdAt: formSubmissions.createdAt,
      status: formSubmissions.status,
      payload: formSubmissions.payload,
    })
    .from(formSubmissions)
    .where(keysetWhere(formId, cursor))
    .orderBy(...keysetOrder())
    .limit(batchSize);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeExportRow = (row: ExportBatchRow): SubmissionExportRow => ({
  id: row.id,
  createdAt: row.createdAt,
  status: row.status,
  payload: isRecord(row.payload) ? row.payload : {},
});

// --- CSV/JSON streaming writers (per-batch, bounded memory, byte cap) ---

const csvRowLine = (row: SubmissionExportRow, columns: FieldColumn[]): string =>
  serializeCsvRow([
    row.id,
    new Date(row.createdAt).toISOString(),
    row.status,
    ...columns.map((column) => formatCell(row.payload[column.key])),
  ]);

type ArtifactWriter = {
  write: (chunk: Uint8Array) => void;
  end: () => unknown;
};

const encodeChunk = (chunk: string): Uint8Array => new TextEncoder().encode(chunk);

const openArtifactWriter = (filePath: string): ArtifactWriter => {
  const writer = Bun.file(filePath).writer();
  return {
    write: (chunk) => writer.write(chunk),
    end: () => writer.end(),
  };
};

/**
 * PASS A: bounded keyset scan over payload keys ONLY that unions the schema
 * field columns with every extra payload key seen, in scan order — identical
 * result to `buildColumns` over the full list, so the "no captured answer is
 * silently dropped" contract holds for the streaming CSV.
 */
const collectExportColumns = async (
  formId: string,
  fieldRecords: { name: string; label: string; orderIndex: number }[],
  batchSize: number
): Promise<FieldColumn[]> => {
  const ordered = [...fieldRecords].sort((a, b) => a.orderIndex - b.orderIndex);
  const seen = new Set(ordered.map((field) => field.name));
  const columns: FieldColumn[] = ordered.map((field) => ({
    key: field.name,
    label: field.label,
  }));
  let cursor: Cursor | null = null;
  for (;;) {
    const batch = await fetchColumnBatch(formId, cursor, batchSize);
    if (batch.length === 0) break;
    mergePayloadColumnKeys(
      columns,
      seen,
      batch.map((row) => ({ payload: isRecord(row.payload) ? row.payload : {} }))
    );
    const last = batch[batch.length - 1]!;
    cursor = { createdAt: last.createdAt, id: last.id };
  }
  return columns;
};

/**
 * PASS B: keyset scan over `ORDER BY created_at DESC, id DESC` (composite
 * index), writing each batch to the artifact file with backpressure, enforcing
 * the byte cap (`submission_export_too_large` on overflow).
 */
const streamRowsToArtifact = async (
  formId: string,
  format: SubmissionExportFormat,
  columns: FieldColumn[],
  batchSize: number,
  maxBytes: number,
  filePath: string
): Promise<{ rowCount: number; bytes: number }> => {
  let cursor: Cursor | null = null;
  let rowCount = 0;
  let bytes = 0;
  const writer = openArtifactWriter(filePath);
  try {
    if (format === "csv") {
      const header = encodeChunk(
        serializeCsvRow([...BASE_HEADERS, ...columns.map((column) => column.label)])
      );
      bytes += header.byteLength;
      if (bytes > maxBytes) throw new Error("submission_export_too_large");
      writer.write(header);
      for (;;) {
        const batch = await fetchRowBatch(formId, cursor, batchSize);
        if (batch.length === 0) break;
        const chunk = encodeChunk(
          `\n${batch.map((row) => csvRowLine(normalizeExportRow(row), columns)).join("\n")}`
        );
        if (bytes + chunk.byteLength > maxBytes) throw new Error("submission_export_too_large");
        writer.write(chunk);
        bytes += chunk.byteLength;
        rowCount += batch.length;
        const last = batch[batch.length - 1]!;
        cursor = { createdAt: last.createdAt, id: last.id };
      }
    } else {
      const opener = encodeChunk("[");
      bytes += opener.byteLength;
      if (bytes > maxBytes) throw new Error("submission_export_too_large");
      writer.write(opener);
      for (;;) {
        const batch = await fetchRowBatch(formId, cursor, batchSize);
        if (batch.length === 0) break;
        // Pretty-printed entries without the outer brackets; batches are joined
        // with a comma so the concatenation is valid JSON.
        const entries = batch.map((row) => submissionExportJsonEntry(normalizeExportRow(row)));
        const separator = rowCount === 0 ? "" : ",";
        const chunk = encodeChunk(`${separator}\n${JSON.stringify(entries, null, 2).slice(1, -1)}`);
        if (bytes + chunk.byteLength > maxBytes) throw new Error("submission_export_too_large");
        writer.write(chunk);
        bytes += chunk.byteLength;
        rowCount += batch.length;
        const last = batch[batch.length - 1]!;
        cursor = { createdAt: last.createdAt, id: last.id };
      }
      const closer = encodeChunk(rowCount === 0 ? "]" : "\n]");
      if (bytes + closer.byteLength > maxBytes) throw new Error("submission_export_too_large");
      writer.write(closer);
      bytes += closer.byteLength;
    }
    await writer.end();
  } catch (error) {
    try {
      await writer.end();
    } catch {
      // Best-effort flush on failure; the caller's cleanup removes the partial
      // artifact and the ORIGINAL error propagates.
    }
    throw error;
  }
  return { rowCount, bytes };
};

// --- Public job API ---

export async function createSubmissionExportJob(
  input: SubmissionExportJobInput
): Promise<{ jobId: string; status: "queued"; token: string; tokenExpiresAt: Date }> {
  const form = await getForm(input.formId);
  if (!form) throw new Error("form_not_found");

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSubmissionExportToken(token);
  const now = new Date();
  const tokenExpiresAt = new Date(now.getTime() + resolveExportTokenTtlMs());

  const [row] = await db
    .insert(submissionExportJobs)
    .values({
      formId: input.formId,
      format: input.format,
      status: "queued",
      tokenHash,
      tokenExpiresAt,
      createdBy: input.createdBy ?? null,
    })
    .returning({ id: submissionExportJobs.id });
  if (!row) throw new Error("submission_export_create_failed");

  return { jobId: row.id, status: "queued", token, tokenExpiresAt };
}

type ExportJobRow = typeof submissionExportJobs.$inferSelect;

const toPublicJob = (row: ExportJobRow): SubmissionExportJobPublic => ({
  id: row.id,
  formId: row.formId,
  format: row.format as SubmissionExportFormat,
  status: row.status as SubmissionExportJobStatus,
  rowCount: row.rowCount,
  bytes: row.bytes,
  errorCode: row.errorCode,
  tokenExpiresAt: row.tokenExpiresAt,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export async function getSubmissionExportJob(
  jobId: string
): Promise<SubmissionExportJobPublic | null> {
  const [row] = await db
    .select()
    .from(submissionExportJobs)
    .where(eq(submissionExportJobs.id, jobId))
    .limit(1);
  return row ? toPublicJob(row) : null;
}

/** Full-row reader for the scheduler and the (L02-gated) download route. */
export async function getSubmissionExportJobRecord(
  jobId: string
): Promise<SubmissionExportJobRecord | null> {
  const [row] = await db
    .select()
    .from(submissionExportJobs)
    .where(eq(submissionExportJobs.id, jobId))
    .limit(1);
  if (!row) return null;
  return { ...toPublicJob(row), artifactKey: row.artifactKey, tokenHash: row.tokenHash };
}

/** Bounded list of a form's jobs, newest first. Never exposes token hashes. */
export async function listSubmissionExportJobs(
  formId: string,
  limit = 10
): Promise<SubmissionExportJobPublic[]> {
  const bounded = Math.min(Math.max(Math.floor(limit), 1), 50);
  const rows = await db
    .select()
    .from(submissionExportJobs)
    .where(eq(submissionExportJobs.formId, formId))
    .orderBy(desc(submissionExportJobs.createdAt), desc(submissionExportJobs.id))
    .limit(bounded);
  return rows.map(toPublicJob);
}

/**
 * Runs one export job to completion. Bounded: every DB read is a keyset batch
 * at the database boundary; the artifact is capped; ip/userAgent are never
 * selected. Marks the job `done` with the artifact key + counts, or `failed`
 * with a machine-readable `errorCode` (never driver messages).
 */
export async function runSubmissionExportJob(jobId: string): Promise<SubmissionExportJobResult> {
  const record = await getSubmissionExportJobRecord(jobId);
  if (!record) throw new Error("submission_export_job_not_found");
  if (record.status === "done") {
    return {
      artifactKey: record.artifactKey ?? submissionExportArtifactKey(record.id, record.format),
      rowCount: record.rowCount ?? 0,
      bytes: record.bytes ?? 0,
    };
  }
  if (record.status !== "queued") throw new Error("submission_export_job_not_runnable");

  await db
    .update(submissionExportJobs)
    .set({ status: "running", errorCode: null, updatedAt: new Date() })
    .where(eq(submissionExportJobs.id, jobId));

  const batchSize = resolveExportBatchSize();
  const maxBytes = resolveExportMaxBytes();
  const format = record.format;
  const filePath = resolveSubmissionExportArtifactPath(record.id, format);
  const artifactKey = submissionExportArtifactKey(record.id, format);

  try {
    await mkdir(resolveSubmissionExportArtifactsDir(), { recursive: true });
    const fieldRecords = (await listFormFields(record.formId)).map(toFieldRecord);
    const columns =
      format === "csv" ? await collectExportColumns(record.formId, fieldRecords, batchSize) : [];
    const { rowCount, bytes } = await streamRowsToArtifact(
      record.formId,
      format,
      columns,
      batchSize,
      maxBytes,
      filePath
    );
    const now = new Date();
    await db
      .update(submissionExportJobs)
      .set({
        status: "done",
        rowCount,
        bytes,
        artifactKey,
        tokenExpiresAt: new Date(now.getTime() + resolveExportTokenTtlMs()),
        updatedAt: now,
      })
      .where(eq(submissionExportJobs.id, jobId));
    return { artifactKey, rowCount, bytes };
  } catch (error) {
    const errorCode =
      error instanceof Error &&
      typeof error.message === "string" &&
      error.message.startsWith("submission_export_")
        ? error.message
        : "submission_export_failed";
    await db
      .update(submissionExportJobs)
      .set({ status: "failed", errorCode, updatedAt: new Date() })
      .where(eq(submissionExportJobs.id, jobId));
    try {
      await rm(filePath, { force: true });
    } catch {
      // Best-effort artifact cleanup; the failed row is retained for retention.
    }
    throw error instanceof Error && error.message.startsWith("submission_export_")
      ? error
      : new Error("submission_export_failed");
  }
}

/**
 * Bounded, resumable retention prune (mirrors the opportunistic prune pattern):
 * deletes stale done/failed/zombie rows plus their artifact files, at most
 * `batch` rows per call so a large backlog drains over successive scheduler
 * ticks instead of one unbounded sweep.
 */
export async function pruneExpiredSubmissionExportJobs(
  now: Date = new Date()
): Promise<{ pruned: number; deletedArtifacts: number }> {
  const cutoff = new Date(now.getTime() - resolveExportRetentionMs());
  const batch = parsePositiveInt(process.env.FORM_SUBMISSIONS_EXPORT_PRUNE_BATCH, 50, 500);

  const stale = or(
    // done: the link must have expired AND the retention window passed.
    and(
      eq(submissionExportJobs.status, "done"),
      or(
        lt(submissionExportJobs.tokenExpiresAt, cutoff),
        and(isNull(submissionExportJobs.tokenExpiresAt), lt(submissionExportJobs.updatedAt, cutoff))
      )
    ),
    // everything else (failed / queued / running zombies): stale by updated_at.
    and(not(eq(submissionExportJobs.status, "done")), lt(submissionExportJobs.updatedAt, cutoff))
  );

  const rows = await db
    .select({
      id: submissionExportJobs.id,
      artifactKey: submissionExportJobs.artifactKey,
    })
    .from(submissionExportJobs)
    .where(stale)
    .orderBy(asc(submissionExportJobs.createdAt))
    .limit(batch);

  let deletedArtifacts = 0;
  for (const row of rows) {
    if (row.artifactKey) {
      try {
        await rm(path.join(resolveSubmissionExportArtifactsDir(), row.artifactKey), {
          force: true,
        });
        deletedArtifacts += 1;
      } catch {
        // Best-effort: the row is still pruned; a re-run sweep will retry the file.
      }
    }
  }

  if (rows.length > 0) {
    await db.delete(submissionExportJobs).where(
      inArray(
        submissionExportJobs.id,
        rows.map((row) => row.id)
      )
    );
  }

  return { pruned: rows.length, deletedArtifacts };
}
