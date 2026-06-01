import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { auditLogs } from "../../../core/db/schema";
import {
  normalizeAuditLogQuery,
  listAudit,
  sanitizeMetadata,
} from "../../../core/services/audit/auditService";
import {
  resolveAuditCategory,
  resolveAuditSeverity,
} from "../../../core/services/audit/auditClassification";
import { decodeAdminCursor } from "../../../core/services/admin/adminQueryConventions";

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

const auditIds = new Set<string>();

afterAll(async () => {
  if (auditIds.size > 0) {
    await db.delete(auditLogs).where(inArray(auditLogs.id, [...auditIds]));
  }
});

async function insertAuditRowWithTimestamp(input: {
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}) {
  const id = randomUUID();
  await db.execute(sql`
    insert into audit_logs (id, actor_id, action, target_type, target_id, metadata, created_at)
    values (
      ${id}::uuid,
      null,
      ${input.action},
      ${input.targetType},
      ${input.targetId},
      ${JSON.stringify(input.metadata)}::jsonb,
      ${input.createdAt}::timestamp
    )
  `);
  auditIds.add(id);
  return id;
}

test("sanitizeMetadata strips sensitive keys", () => {
  const meta = sanitizeMetadata({
    token: "secret",
    password: "hidden",
    cookie: "session=secret",
    keep: "ok",
    authorization: "bearer",
    headers: {
      authorization: "Bearer sk-testsecret",
      accept: "application/json",
    },
  });

  expect(meta).toEqual({
    keep: "ok",
    headers: {
      accept: "application/json",
    },
  });
});

test("sanitizeMetadata redacts token-like values in nested structures", () => {
  const meta = sanitizeMetadata({
    provider: "openrouter",
    nested: {
      details: "Bearer sk-or-v1-abcdef1234567890",
    },
    list: ["ok", "eyJabc.def.ghi"],
  });

  expect(meta).toEqual({
    provider: "openrouter",
    nested: {
      details: "Bearer [REDACTED]",
    },
    list: ["ok", "[REDACTED]"],
  });
});

test("normalizeAuditLogQuery clamps limits, trims search, normalizes dates, and validates cursors", () => {
  const normalized = normalizeAuditLogQuery({
    limit: "500",
    query: " auth ",
    category: "authentication",
    severity: "warning",
    from: "2026-06-01",
    to: "2026-06-02",
  });

  expect(normalized).toEqual({
    limit: 200,
    query: "auth",
    category: "authentication",
    severity: "warning",
    from: new Date("2026-06-01T00:00:00.000Z"),
    to: new Date("2026-06-02T23:59:59.999Z"),
  });
  expect(() => normalizeAuditLogQuery({ cursor: "not-a-valid-cursor" })).toThrow();
  expect(() => normalizeAuditLogQuery({ category: "unknown" })).toThrow(
    "Audit category is invalid."
  );
  expect(() => normalizeAuditLogQuery({ severity: "critical" })).toThrow(
    "Audit severity is invalid."
  );
});

test("audit classification derives category and severity from stored fields", () => {
  expect(resolveAuditCategory({ action: "auth.login", targetType: "session" })).toBe(
    "authentication"
  );
  expect(resolveAuditCategory({ action: "session.revoke", targetType: "session" })).toBe(
    "authentication"
  );
  expect(resolveAuditCategory({ action: "pages.publish", targetType: "page" })).toBe("content");
  expect(resolveAuditCategory({ action: "pages.publish", targetType: "PAGE" })).toBe("content");
  expect(resolveAuditCategory({ action: "auth.login", targetType: "PAGE" })).toBe("authentication");
  expect(resolveAuditCategory({ action: "settings.update", targetType: "settings" })).toBe(
    "system"
  );
  expect(resolveAuditSeverity({ action: "auth.denied" }, {})).toBe("warning");
  expect(resolveAuditSeverity({ action: "job.failed" }, {})).toBe("error");
  expect(resolveAuditSeverity({ action: "pages.publish" }, { severity: "info" })).toBe("info");
  expect(resolveAuditSeverity({ action: "auth.error.cleared" }, { severity: "info" })).toBe("info");
  expect(resolveAuditSeverity({ action: "auth.warn.ignored" }, { severity: "error" })).toBe(
    "error"
  );
});

testIfDb(
  "listAudit applies server-side filters before limit and returns keyset cursor",
  async () => {
    const token = `audit-query-${randomUUID()}`;
    const inserted = await db
      .insert(auditLogs)
      .values([
        {
          action: "auth.denied",
          targetType: "session",
          targetId: `${token}-newer`,
          actorId: null,
          metadata: { requestId: token },
          createdAt: new Date("2026-06-02T10:00:00.000Z"),
        },
        {
          action: "auth.denied",
          targetType: "session",
          targetId: `${token}-older`,
          actorId: null,
          metadata: { requestId: token },
          createdAt: new Date("2026-06-01T10:00:00.000Z"),
        },
        {
          action: "content.publish",
          targetType: "page",
          targetId: `${token}-content`,
          actorId: null,
          metadata: { requestId: token },
          createdAt: new Date("2026-06-03T10:00:00.000Z"),
        },
      ])
      .returning({ id: auditLogs.id });

    for (const row of inserted) auditIds.add(row.id);

    const firstPage = await listAudit({
      limit: 1,
      query: token,
      category: "authentication",
      severity: "warning",
      from: "2026-06-01T00:00:00.000Z",
      to: "2026-06-03T23:59:59.999Z",
    });

    expect(firstPage.items.map((item) => item.targetId)).toEqual([`${token}-newer`]);
    expect(firstPage.nextCursor).toBeTruthy();
    expect(decodeAdminCursor(firstPage.nextCursor ?? "")).toMatchObject({
      createdAt: "2026-06-02T10:00:00.000000Z",
    });

    const secondPage = await listAudit({
      limit: 1,
      query: token,
      category: "authentication",
      severity: "warning",
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.items.map((item) => item.targetId)).toEqual([`${token}-older`]);
    expect(secondPage.nextCursor).toBeNull();
  }
);

testIfDb("listAudit filters match the displayed category and severity classifier", async () => {
  const token = `audit-classification-${randomUUID()}`;
  const inserted = await db
    .insert(auditLogs)
    .values([
      {
        action: "session.revoke",
        targetType: "session",
        targetId: `${token}-auth-session`,
        actorId: null,
        metadata: { requestId: token },
        createdAt: new Date("2026-06-04T10:00:00.000Z"),
      },
      {
        action: "pages.publish",
        targetType: "PAGE",
        targetId: `${token}-content-page`,
        actorId: null,
        metadata: { requestId: token },
        createdAt: new Date("2026-06-04T09:00:00.000Z"),
      },
      {
        action: "auth.login",
        targetType: "PAGE",
        targetId: `${token}-auth-over-content`,
        actorId: null,
        metadata: { requestId: token },
        createdAt: new Date("2026-06-04T08:30:00.000Z"),
      },
      {
        action: "auth.error.cleared",
        targetType: "session",
        targetId: `${token}-explicit-info`,
        actorId: null,
        metadata: { requestId: token, severity: "info" },
        createdAt: new Date("2026-06-04T08:00:00.000Z"),
      },
      {
        action: "auth.warn.ignored",
        targetType: "session",
        targetId: `${token}-explicit-error`,
        actorId: null,
        metadata: { requestId: token, severity: "error" },
        createdAt: new Date("2026-06-04T07:00:00.000Z"),
      },
    ])
    .returning({ id: auditLogs.id });

  for (const row of inserted) auditIds.add(row.id);

  const authentication = await listAudit({ query: token, category: "authentication" });
  expect(authentication.items.map((item) => item.targetId)).toContain(`${token}-auth-session`);
  expect(authentication.items.map((item) => item.targetId)).toContain(`${token}-auth-over-content`);

  const content = await listAudit({ query: token, category: "content" });
  expect(content.items.map((item) => item.targetId)).toEqual([`${token}-content-page`]);

  const info = await listAudit({ query: token, severity: "info" });
  expect(info.items.map((item) => item.targetId)).toContain(`${token}-explicit-info`);
  expect(info.items.map((item) => item.targetId)).not.toContain(`${token}-explicit-error`);

  const error = await listAudit({ query: token, severity: "error" });
  expect(error.items.map((item) => item.targetId)).toContain(`${token}-explicit-error`);
  expect(error.items.map((item) => item.targetId)).not.toContain(`${token}-explicit-info`);
});

testIfDb("listAudit cursor preserves microsecond precision across page boundaries", async () => {
  const token = `audit-micro-cursor-${randomUUID()}`;
  await insertAuditRowWithTimestamp({
    action: "settings.update",
    targetType: "settings",
    targetId: `${token}-newer`,
    metadata: { requestId: token },
    createdAt: "2026-06-05T10:00:00.123456Z",
  });
  await insertAuditRowWithTimestamp({
    action: "settings.update",
    targetType: "settings",
    targetId: `${token}-older-same-ms`,
    metadata: { requestId: token },
    createdAt: "2026-06-05T10:00:00.123123Z",
  });
  await insertAuditRowWithTimestamp({
    action: "settings.update",
    targetType: "settings",
    targetId: `${token}-older`,
    metadata: { requestId: token },
    createdAt: "2026-06-05T10:00:00.122999Z",
  });

  const firstPage = await listAudit({ limit: 1, query: token });

  expect(firstPage.items.map((item) => item.targetId)).toEqual([`${token}-newer`]);
  expect(decodeAdminCursor(firstPage.nextCursor ?? "")).toMatchObject({
    createdAt: "2026-06-05T10:00:00.123456Z",
  });

  const secondPage = await listAudit({ limit: 2, query: token, cursor: firstPage.nextCursor });

  expect(secondPage.items.map((item) => item.targetId)).toEqual([
    `${token}-older-same-ms`,
    `${token}-older`,
  ]);
  expect(secondPage.nextCursor).toBeNull();
});
