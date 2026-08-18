/**
 * TASK-571: bounded async export job — DB-backed Bun lane.
 *
 * Covers: job lifecycle (queued → running → done/failed), multi-batch row
 * budget, hard size-limit abort, keyset cursor no-gap/no-dup (including the id
 * tiebreaker on identical timestamps), PII omission + CSV formula guard at the
 * artifact level, legacy payload-key preservation (column-collection pass),
 * short-lived token (hash-only storage) + retention cleanup, and the scheduler
 * dispatch under the advisory session lock.
 *
 * Fixtures are uniquely scoped (owned form ids); cleanup deletes ONLY the rows
 * those fixture forms own. The export artifacts dir is a per-suite temp dir.
 */

import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { forms, formSubmissions, submissionExportJobs } from "../../../core/db/schema";
import { createForm } from "../../../core/services/forms/formsService";
import {
  createSubmissionExportJob,
  getSubmissionExportJob,
  getSubmissionExportJobRecord,
  listSubmissionExportJobs,
  pruneExpiredSubmissionExportJobs,
  readSubmissionExportArtifact,
  runSubmissionExportJob,
  submissionExportArtifactKey,
  verifySubmissionExportToken,
} from "../../../core/services/forms/submissionExportJob";
import { runDueSubmissionExports } from "../../../core/server/jobs/submissionExportScheduler";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = hasDb ? test : test.skip;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

// --- env sandbox (resolvers read env per call) ---

// Per-test env vars (restored by afterEach). The suite-level export dir and
// token secret are set once in beforeAll and restored in afterAll, so later
// tests keep writing artifacts to the same temp dir.
const savedTestEnv = new Map<string, string | undefined>();

function setTestEnv(key: string, value: string | undefined) {
  if (!savedTestEnv.has(key)) savedTestEnv.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function restoreTestEnv() {
  for (const [key, value] of savedTestEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedTestEnv.clear();
}

// --- fixture helpers ---

let ownedFormIds: string[] = [];
let artifactsDir = "";
// Suite-level env originals, restored in afterAll.
const savedSuiteEnv = new Map<string, string | undefined>();

const setSuiteEnv = (key: string, value: string) => {
  if (!savedSuiteEnv.has(key)) savedSuiteEnv.set(key, process.env[key]);
  process.env[key] = value;
};

const registerForm = (id: string) => {
  ownedFormIds.push(id);
  return id;
};

const cleanupOwned = async () => {
  if (!hasDb || ownedFormIds.length === 0) return;
  const ids = [...ownedFormIds];
  ownedFormIds = [];
  await db.delete(formSubmissions).where(inArray(formSubmissions.formId, ids));
  await db.delete(forms).where(inArray(forms.id, ids)); // cascades export jobs + fields
};

const insertSubmissions = async (
  formId: string,
  count: number,
  makePayload: (index: number) => Record<string, unknown>,
  options: { sameCreatedAt?: Date; createdAt?: (index: number) => Date } = {}
) => {
  const BATCH = 500;
  for (let start = 0; start < count; start += BATCH) {
    const rows = [];
    for (let i = start; i < Math.min(start + BATCH, count); i += 1) {
      rows.push({
        formId,
        payload: makePayload(i),
        status: i % 3 === 0 ? "spam" : "new",
        ip: `203.0.113.${i % 250}`,
        userAgent: `agent-${i % 5}`,
        createdAt:
          options.sameCreatedAt ??
          options.createdAt?.(i) ??
          new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + i * 1000),
      });
    }
    await db.insert(formSubmissions).values(rows);
  }
};

const readArtifactText = async (jobId: string, format: "csv" | "json") => {
  const { path: filePath } = await readSubmissionExportArtifact({
    id: jobId,
    format,
    artifactKey: submissionExportArtifactKey(jobId, format),
  });
  return Bun.file(filePath).text();
};

const artifactExists = async (jobId: string, format: "csv" | "json") => {
  try {
    await readSubmissionExportArtifact({
      id: jobId,
      format,
      artifactKey: submissionExportArtifactKey(jobId, format),
    });
    return true;
  } catch {
    return false;
  }
};

beforeAll(async () => {
  if (!hasDb) return;
  setSuiteEnv("FORM_SUBMISSIONS_EXPORT_TOKEN_SECRET", "test-export-token-secret-571");
  setSuiteEnv("FORM_SUBMISSIONS_EXPORT_RETENTION_MS", String(30 * 24 * 60 * 60 * 1000));
  artifactsDir = await mkdtemp(path.join(os.tmpdir(), "coderso-export-"));
  setSuiteEnv("FORM_SUBMISSIONS_EXPORT_DIR", artifactsDir);
});

afterAll(async () => {
  await cleanupOwned();
  for (const [key, value] of savedSuiteEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedSuiteEnv.clear();
  if (artifactsDir) {
    await rm(artifactsDir, { recursive: true, force: true });
  }
});

beforeEach(async () => {
  await cleanupOwned();
});

afterEach(() => {
  restoreTestEnv();
});

testIfDb("createSubmissionExportJob validates the form and returns a hash-only token", async () => {
  const formId = registerForm((await createForm({ name: "Export Form" })).id);

  const created = await createSubmissionExportJob({ formId: formId, format: "csv" });
  expect(created.status).toBe("queued");
  expect(created.token).toHaveLength(43); // 32 random bytes, base64url

  const publicJob = await getSubmissionExportJob(created.jobId);
  expect(publicJob?.status).toBe("queued");
  expect(publicJob?.format).toBe("csv");
  // The public read model NEVER exposes the token hash (or the raw token).
  expect(publicJob).not.toHaveProperty("tokenHash");

  const record = await getSubmissionExportJobRecord(created.jobId);
  expect(record?.tokenHash).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 hex, never the token
  expect(record?.tokenHash).not.toBe(created.token);

  expect(verifySubmissionExportToken(record!, created.token)).toBe(true);
  expect(verifySubmissionExportToken(record!, "wrong-token")).toBe(false);
  expect(verifySubmissionExportToken(record!, null)).toBe(false);
});

testIfDb("createSubmissionExportJob rejects a missing form", async () => {
  await expect(createSubmissionExportJob({ formId: randomUUID(), format: "json" })).rejects.toThrow(
    "form_not_found"
  );
});

testIfDb(
  "CSV job streams every row across multiple batches with no gaps or duplicates",
  async () => {
    setTestEnv("FORM_SUBMISSIONS_EXPORT_BATCH_SIZE", "500"); // force multiple batches
    const formId = registerForm((await createForm({ name: "Batch Form" })).id);
    const TOTAL = 2_100;
    await insertSubmissions(formId, TOTAL, (i) => ({ answer: `value-${i}` }));

    const created = await createSubmissionExportJob({ formId: formId, format: "csv" });
    const result = await runSubmissionExportJob(created.jobId);

    expect(result.rowCount).toBe(TOTAL);
    expect(result.bytes).toBeGreaterThan(0);

    const publicJob = await getSubmissionExportJob(created.jobId);
    expect(publicJob?.status).toBe("done");
    expect(publicJob?.rowCount).toBe(TOTAL);
    expect(publicJob?.bytes).toBe(result.bytes);

    const record = await getSubmissionExportJobRecord(created.jobId);
    expect(record?.artifactKey).toBe(submissionExportArtifactKey(created.jobId, "csv"));

    const csv = await readArtifactText(created.jobId, "csv");
    const lines = csv.split("\n");
    console.log(
      "[debug-batch] lines",
      lines.length,
      "total",
      TOTAL,
      "header",
      JSON.stringify(lines[0])
    );
    expect(lines[0]).toBe("Submission ID,Received At,Status,answer");
    expect(lines).toHaveLength(TOTAL + 1); // header + every row, exactly once
    const seen = new Set(lines.slice(1).map((line) => line.split(",")[0]!));
    expect(seen.size).toBe(TOTAL); // no duplicate ids
  }
);

testIfDb("keyset cursor uses the id tiebreaker for identical timestamps", async () => {
  setTestEnv("FORM_SUBMISSIONS_EXPORT_BATCH_SIZE", "2"); // tiny batches stress the cursor
  const formId = registerForm((await createForm({ name: "Tiebreaker Form" })).id);
  const SAME_AT = new Date("2026-06-01T12:00:00.000Z");
  await insertSubmissions(formId, 7, (i) => ({ value: i }), { sameCreatedAt: SAME_AT });
  // Plus an older row to prove ordering across timestamp groups.
  await insertSubmissions(formId, 1, () => ({ value: -1 }), {
    createdAt: () => new Date("2026-05-01T00:00:00.000Z"),
  });

  const created = await createSubmissionExportJob({ formId: formId, format: "csv" });
  const result = await runSubmissionExportJob(created.jobId);
  expect(result.rowCount).toBe(8);

  const csv = await readArtifactText(created.jobId, "csv");
  const lines = csv.split("\n").slice(1);
  expect(lines).toHaveLength(8);
  const ids = lines.map((line) => line.split(",")[0]!);
  expect(new Set(ids).size).toBe(8); // no gaps, no duplicates

  // The row with the older created_at must be LAST despite being inserted first.
  const older = await db
    .select({ id: formSubmissions.id })
    .from(formSubmissions)
    .where(inArray(formSubmissions.formId, [formId]))
    .orderBy(sql`created_at asc`)
    .limit(1);
  expect(ids[ids.length - 1]).toBe(older[0]?.id);
});

testIfDb("byte cap aborts with submission_export_too_large and removes the artifact", async () => {
  setTestEnv("FORM_SUBMISSIONS_EXPORT_MAX_BYTES", "400");
  const formId = registerForm((await createForm({ name: "Cap Form" })).id);
  await insertSubmissions(formId, 20, (i) => ({ text: `x`.repeat(200 + i) }));

  const created = await createSubmissionExportJob({ formId: formId, format: "csv" });
  await expect(runSubmissionExportJob(created.jobId)).rejects.toThrow(
    "submission_export_too_large"
  );

  const record = await getSubmissionExportJobRecord(created.jobId);
  expect(record?.status).toBe("failed");
  expect(record?.errorCode).toBe("submission_export_too_large");
  expect(await artifactExists(created.jobId, "csv")).toBe(false); // partial artifact removed
});

testIfDb("export never leaks ip/userAgent and keeps the CSV formula guard", async () => {
  const formId = registerForm((await createForm({ name: "PII Form" })).id);
  await insertSubmissions(formId, 1, () => ({
    comment: '=HYPERLINK("https://evil.example")',
    plain: "hello",
  }));
  await db
    .update(formSubmissions)
    .set({ ip: "198.51.100.99", userAgent: "PII-Mozilla/5.0" })
    .where(inArray(formSubmissions.formId, [formId]));

  const csvCreated = await createSubmissionExportJob({ formId: formId, format: "csv" });
  await runSubmissionExportJob(csvCreated.jobId);
  const csv = await readArtifactText(csvCreated.jobId, "csv");
  expect(csv).not.toContain("198.51.100.99");
  expect(csv).not.toContain("PII-Mozilla");
  expect(csv).toContain("'=HYPERLINK(");

  const jsonCreated = await createSubmissionExportJob({ formId: formId, format: "json" });
  await runSubmissionExportJob(jsonCreated.jobId);
  const json = JSON.parse(await readArtifactText(jsonCreated.jobId, "json")) as Array<
    Record<string, unknown>
  >;
  expect(json).toHaveLength(1);
  expect(json[0]).toEqual({
    id: json[0]?.id,
    createdAt: expect.any(String),
    status: expect.any(String),
    data: { comment: '=HYPERLINK("https://evil.example")', plain: "hello" },
  });
  expect(JSON.stringify(json)).not.toContain("198.51.100.99");
  expect(JSON.stringify(json)).not.toContain("PII-Mozilla");
});

testIfDb("column-collection pass preserves every captured payload key", async () => {
  const formId = registerForm((await createForm({ name: "Columns Form" })).id);
  // Distinct created_at per row; scan order is newest first, so the extra keys
  // are discovered in that order (legacyKey then anotherLegacy) — the column
  // pass must produce the same set/order as buildColumns over the full list.
  await insertSubmissions(formId, 3, (i) => ({
    fullName: ["Ada", "Linus", "Grace"][i],
    email: ["ada@example.com", "linus@example.com", "grace@example.com"][i],
    ...(i === 2 ? { legacyKey: "kept" } : {}),
    ...(i === 1 ? { anotherLegacy: 42 } : {}),
  }));

  const created = await createSubmissionExportJob({ formId, format: "csv" });
  await runSubmissionExportJob(created.jobId);
  const csv = await readArtifactText(created.jobId, "csv");
  const header = csv.split("\n")[0]!;
  // Postgres jsonb normalizes payload key order (shorter keys first), so the
  // column pass sees `email` before `fullName`; the extra keys still land
  // after the payload keys in first-seen scan order. Nothing is dropped.
  expect(header).toBe("Submission ID,Received At,Status,email,fullName,legacyKey,anotherLegacy");
  expect(csv).toContain(",kept");
  expect(csv).toContain(",42");
});

testIfDb("JSON export streams entries in keyset order", async () => {
  const formId = registerForm((await createForm({ name: "JSON Form" })).id);
  await insertSubmissions(formId, 5, (i) => ({ n: i }));

  const created = await createSubmissionExportJob({ formId: formId, format: "json" });
  const result = await runSubmissionExportJob(created.jobId);
  expect(result.rowCount).toBe(5);

  const json = JSON.parse(await readArtifactText(created.jobId, "json")) as Array<{
    id: string;
    createdAt: string;
    status: string;
    data: { n: number };
  }>;
  expect(json).toHaveLength(5);
  expect(json.map((entry) => entry.data.n)).toEqual([4, 3, 2, 1, 0]); // created_at DESC
  for (const entry of json) {
    expect(entry).not.toHaveProperty("ip");
    expect(entry).not.toHaveProperty("userAgent");
  }
});

testIfDb("listSubmissionExportJobs is bounded and never exposes token hashes", async () => {
  const formId = registerForm((await createForm({ name: "List Form" })).id);
  for (let i = 0; i < 3; i += 1) {
    await createSubmissionExportJob({ formId: formId, format: i % 2 === 0 ? "csv" : "json" });
  }
  const jobs = await listSubmissionExportJobs(formId, 2);
  expect(jobs).toHaveLength(2);
  expect(jobs[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(jobs[1]!.createdAt.getTime());
  for (const job of jobs) {
    expect(job).not.toHaveProperty("tokenHash");
  }
});

testIfDb("runSubmissionExportJob rejects missing and non-runnable jobs", async () => {
  await expect(runSubmissionExportJob(randomUUID())).rejects.toThrow(
    "submission_export_job_not_found"
  );

  const formId = registerForm((await createForm({ name: "Runnable Form" })).id);
  const created = await createSubmissionExportJob({ formId: formId, format: "csv" });
  await db
    .update(submissionExportJobs)
    .set({ status: "running" })
    .where(inArray(submissionExportJobs.id, [created.jobId]));
  await expect(runSubmissionExportJob(created.jobId)).rejects.toThrow(
    "submission_export_job_not_runnable"
  );
});

testIfDb("prune removes stale jobs and their artifact files, keeps fresh links", async () => {
  setTestEnv("FORM_SUBMISSIONS_EXPORT_RETENTION_MS", String(24 * 60 * 60 * 1000));
  const now = new Date("2026-08-01T12:00:00.000Z");
  const formId = registerForm((await createForm({ name: "Prune Form" })).id);

  // Stale done job (link expired long ago) with an artifact file.
  const staleDone = await createSubmissionExportJob({ formId: formId, format: "csv" });
  await runSubmissionExportJob(staleDone.jobId);
  await db
    .update(submissionExportJobs)
    .set({
      tokenExpiresAt: new Date("2026-07-01T00:00:00.000Z"),
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    })
    .where(inArray(submissionExportJobs.id, [staleDone.jobId]));

  // Stale failed job.
  const staleFailed = await createSubmissionExportJob({ formId: formId, format: "json" });
  await db
    .update(submissionExportJobs)
    .set({
      status: "failed",
      errorCode: "submission_export_failed",
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    })
    .where(inArray(submissionExportJobs.id, [staleFailed.jobId]));

  // Fresh done job — must survive the prune.
  const fresh = await createSubmissionExportJob({ formId: formId, format: "csv" });
  await runSubmissionExportJob(fresh.jobId);
  await db
    .update(submissionExportJobs)
    .set({ tokenExpiresAt: new Date("2026-08-02T00:00:00.000Z"), updatedAt: now })
    .where(inArray(submissionExportJobs.id, [fresh.jobId]));

  const staleArtifact = await artifactExists(staleDone.jobId, "csv");
  expect(staleArtifact).toBe(true);

  const { pruned, deletedArtifacts } = await pruneExpiredSubmissionExportJobs(now);
  expect(pruned).toBeGreaterThanOrEqual(2);
  expect(deletedArtifacts).toBeGreaterThanOrEqual(1);

  expect(await getSubmissionExportJob(staleDone.jobId)).toBeNull();
  expect(await getSubmissionExportJob(staleFailed.jobId)).toBeNull();
  expect(await getSubmissionExportJob(fresh.jobId)).not.toBeNull();
  expect(await artifactExists(staleDone.jobId, "csv")).toBe(false);
  const leftovers = await readdir(artifactsDir);
  expect(leftovers.some((name) => name.startsWith(fresh.jobId))).toBe(true);
});

testIfDb("scheduler dispatches queued jobs and prunes under the advisory lock", async () => {
  setTestEnv("FORM_SUBMISSIONS_EXPORT_RETENTION_MS", String(24 * 60 * 60 * 1000));
  const formId = registerForm((await createForm({ name: "Scheduler Form" })).id);
  await insertSubmissions(formId, 3, (i) => ({ n: i }));

  const created = await createSubmissionExportJob({ formId: formId, format: "csv" });
  const now = new Date();

  const run = await runDueSubmissionExports(now);
  expect(run.jobsRun).toBe(1);

  const record = await getSubmissionExportJobRecord(created.jobId);
  expect(record?.status).toBe("done");
  expect(record?.rowCount).toBe(3);
  expect(await artifactExists(created.jobId, "csv")).toBe(true);

  // A second tick finds nothing queued and prunes nothing fresh.
  const second = await runDueSubmissionExports(new Date(now.getTime() + 1000));
  expect(second.jobsRun).toBe(0);
});
