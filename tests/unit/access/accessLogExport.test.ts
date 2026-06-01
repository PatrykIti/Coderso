import { expect, test } from "bun:test";

import {
  buildAccessLogExportRow,
  escapeAccessLogCsvValue,
  exportAccessLogs,
  redactAccessLogExportText,
  serializeAccessLogExportCsv,
} from "../../../core/services/access/accessLogExport";
import { AccessLogExportError } from "../../../core/services/access/accessLogExportContract";
import type { AccessLogRecord } from "../../../core/services/access/accessLogService";
import type { AuditRecord } from "../../../core/services/audit/auditService";

const accessRecord = (overrides: Partial<AccessLogRecord> = {}): AccessLogRecord => ({
  id: "access-1",
  method: "GET",
  path: "/admin/api/pages?token=secret-token&safe=1",
  status: 200,
  ip: "127.0.0.1",
  userAgent: "curl/8 Cookie: session=secret-session; Authorization: Bearer secret-bearer",
  userId: "user-1",
  userName: "Ada Lovelace",
  userEmail: "ada@example.com",
  durationMs: 42,
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
  matchContext: { field: "email", label: "Matched user email" },
  session: {
    state: "active",
    label: "Active session",
    sessionId: "session-id-secret",
    view: { enabled: false, reason: "Full session details require settings:read permission." },
    revoke: { enabled: false, reason: "Revoke requires settings:write permission." },
  },
  ...overrides,
});

const auditRecord = (overrides: Partial<AuditRecord> = {}): AuditRecord => ({
  id: "audit-1",
  actorId: "user-1",
  action: "access_logs.export",
  targetType: "access_log",
  targetId: "export",
  metadata: {},
  createdAt: new Date("2026-06-01T12:00:00.000Z"),
  ...overrides,
});

test("buildAccessLogExportRow redacts sensitive text and omits raw session ids", () => {
  const row = buildAccessLogExportRow(accessRecord());
  const serialized = JSON.stringify(row);

  expect(row.user).toBe("Ada Lovelace");
  expect(row.path).toContain("token=[REDACTED]");
  expect(row.userAgent).toContain("Cookie: [REDACTED]");
  expect(row.userAgent).toContain("Authorization: [REDACTED]");
  expect(row.sessionState).toBe("Active session");
  expect(serialized).not.toContain("secret-token");
  expect(serialized).not.toContain("secret-session");
  expect(serialized).not.toContain("secret-bearer");
  expect(serialized).not.toContain("session-id-secret");
});

test("serializeAccessLogExportCsv escapes commas, quotes, newlines, and formula prefixes", () => {
  const csv = serializeAccessLogExportCsv(
    [
      {
        id: "access-1",
        user: '=HYPERLINK("https://example.com")',
        userId: "user-1",
        method: "GET",
        path: 'comma, quote " and\nnewline',
        status: 200,
        ip: "127.0.0.1",
        device: "API client",
        userAgent: "curl",
        timestamp: "2026-06-01T10:00:00.000Z",
        durationMs: 42,
        sessionState: "Active session",
        match: "Matched path",
      },
    ],
    ["user", "path"]
  );

  expect(escapeAccessLogCsvValue("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
  expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
  expect(csv).toContain('"comma, quote "" and\nnewline"');
});

test("exportAccessLogs applies filters, returns JSON content, and audits summary metadata", async () => {
  const listCalls: unknown[] = [];
  const auditCalls: unknown[] = [];

  const result = await exportAccessLogs(
    {
      format: "json",
      columns: ["user", "path", "sessionState"],
      filters: {
        limit: 50,
        status: "success",
        query: "auth",
        userId: "user-1",
        method: "get",
        ip: "127.0.0.1",
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-02T00:00:00.000Z",
      },
    },
    {
      actorId: "admin-1",
      requestId: "req-export",
      ip: "127.0.0.1",
      userAgent: "Playwright",
    },
    {
      now: () => new Date("2026-06-01T12:00:00.000Z"),
      listAccessLogs: async (query, options) => {
        listCalls.push({ query, options });
        return { items: [accessRecord()], nextCursor: null };
      },
      logAudit: async (event) => {
        auditCalls.push(event);
        return auditRecord({ metadata: event.metadata ?? {} });
      },
    }
  );

  const payload = JSON.parse(result.content) as {
    rows: Array<{ user: string; path: string; sessionState: string }>;
    filters: Record<string, unknown>;
  };

  expect(result.filename).toBe("access-logs-2026-06-01-success-GET-search-user-ip.json");
  expect(result.mimeType).toBe("application/json");
  expect(payload.rows[0]).toMatchObject({
    user: "Ada Lovelace",
    path: "/admin/api/pages?token=[REDACTED]&safe=1",
    sessionState: "Active session",
  });
  expect(payload.filters).toMatchObject({
    limit: 50,
    status: "success",
    query: "[search]",
    userId: "[user]",
    method: "GET",
    ip: "[ip]",
  });
  expect(listCalls[0]).toMatchObject({
    query: {
      limit: 50,
      status: "success",
      query: "auth",
      userId: "user-1",
      method: "GET",
      ip: "127.0.0.1",
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-02T00:00:00.000Z"),
    },
    options: {
      canViewSession: false,
      canRevokeSession: false,
      currentSessionId: null,
    },
  });
  expect(auditCalls[0]).toMatchObject({
    actorId: "admin-1",
    action: "access_logs.export",
    targetType: "access_log",
    targetId: "export",
    metadata: {
      format: "json",
      columns: ["user", "path", "sessionState"],
      filters: expect.objectContaining({ query: "[search]", userId: "[user]", ip: "[ip]" }),
      rowCount: 1,
      requestId: "req-export",
    },
  });
  expect(JSON.stringify(auditCalls[0])).not.toContain("secret-token");
});

test("redactAccessLogExportText redacts common secret carriers", () => {
  const value =
    "authorization=Bearer abc csrf_token=csrf resetToken=reset sessionId=session api_key=key password=pw secret=s";
  const redacted = redactAccessLogExportText(value);

  expect(redacted).not.toContain("abc");
  expect(redacted).not.toContain("=csrf");
  expect(redacted).not.toContain("=reset");
  expect(redacted).not.toContain("=session");
  expect(redacted).not.toContain("=key");
  expect(redacted).not.toContain("=pw");
  expect(redacted).not.toContain("=s");
  expect(redacted).toContain("[REDACTED]");
});

test("exportAccessLogs rejects invalid columns and oversized sync exports", async () => {
  await expect(
    exportAccessLogs(
      {
        format: "csv",
        columns: ["sessionId"] as never,
        filters: {},
      },
      {},
      {
        listAccessLogs: async () => ({ items: [], nextCursor: null }),
        logAudit: async () => auditRecord(),
      }
    )
  ).rejects.toBeInstanceOf(AccessLogExportError);

  await expect(
    exportAccessLogs(
      {
        format: "csv",
        columns: [],
        filters: {},
      },
      {},
      {
        listAccessLogs: async () => ({ items: [], nextCursor: null }),
        logAudit: async () => auditRecord(),
      }
    )
  ).rejects.toMatchObject({ code: "access_log_export_invalid_columns", status: 400 });

  await expect(
    exportAccessLogs(
      {
        format: "csv",
        columns: ["user"],
        filters: { limit: 201 },
      },
      {},
      {
        listAccessLogs: async () => ({ items: [], nextCursor: null }),
        logAudit: async () => auditRecord(),
      }
    )
  ).rejects.toMatchObject({ code: "access_log_export_too_large", status: 413 });
});
