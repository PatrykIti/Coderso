import { expect, test } from "bun:test";

import {
  buildAuditExportRow,
  escapeAuditCsvValue,
  exportAuditLogs,
  serializeAuditExportCsv,
} from "../../../core/services/audit/auditExport";
import { AuditExportError } from "../../../core/services/audit/auditExportContract";
import type { AuditRecord } from "../../../core/services/audit/auditService";

const record = (overrides: Partial<AuditRecord> = {}): AuditRecord => ({
  id: "audit-1",
  actorId: "user-1",
  action: "content.publish",
  targetType: "page",
  targetId: "home",
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
  metadata: {
    actorName: "Ada Lovelace",
    description: "Published, with comma",
    ip: "127.0.0.1",
    requestId: "req-1",
    password: "secret-password",
    resetToken: "reset-secret",
    nested: {
      authorization: "Bearer token-secret",
      resend: "Bearer re_resendSecretValue123456",
    },
    delivery: "Resend key re_anotherSecretValue123456",
    safe: "public",
  },
  ...overrides,
});

test("buildAuditExportRow redacts sensitive payload values", () => {
  const row = buildAuditExportRow(record());
  const payload = JSON.stringify(row.payload);

  expect(row.event).toBe("content.publish");
  expect(row.resource).toBe("page/home");
  expect(row.ip).toBe("127.0.0.1");
  expect(payload).toContain("public");
  expect(payload).not.toContain("secret-password");
  expect(payload).not.toContain("reset-secret");
  expect(payload).not.toContain("token-secret");
  expect(payload).not.toContain("re_resendSecretValue123456");
  expect(payload).not.toContain("re_anotherSecretValue123456");
});

test("serializeAuditExportCsv escapes commas, quotes, newlines, and formula prefixes", () => {
  const csv = serializeAuditExportCsv(
    [
      {
        id: "audit-1",
        event: '=HYPERLINK("https://example.com")',
        category: "content",
        actor: "Ada",
        resource: "page/home",
        ip: "127.0.0.1",
        timestamp: "2026-06-01T10:00:00.000Z",
        status: "success",
        severity: "info",
        requestId: "req-1",
        description: 'comma, quote " and\nnewline',
        payload: { safe: "value" },
      },
    ],
    ["event", "description", "payload"]
  );

  expect(escapeAuditCsvValue("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
  expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
  expect(csv).toContain('"comma, quote "" and\nnewline"');
  expect(csv).toContain('"{""safe"":""value""}"');
});

test("exportAuditLogs applies filters, returns JSON content, and audits only summary metadata", async () => {
  const listCalls: unknown[] = [];
  const auditCalls: unknown[] = [];

  const result = await exportAuditLogs(
    {
      format: "json",
      columns: ["event", "timestamp", "payload"],
      filters: {
        limit: 50,
        query: "auth",
        category: "authentication",
        severity: "warning",
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-06-02T00:00:00.000Z",
      },
    },
    {
      actorId: "user-1",
      requestId: "req-export",
      ip: "127.0.0.1",
      userAgent: "Playwright",
    },
    {
      now: () => new Date("2026-06-01T12:00:00.000Z"),
      listAudit: async (query) => {
        listCalls.push(query);
        return { items: [record()], nextCursor: null };
      },
      logAudit: async (event) => {
        auditCalls.push(event);
        return record({ id: "audit-export" });
      },
    }
  );

  const payload = JSON.parse(result.content) as {
    rows: Array<{ event: string; payload: Record<string, unknown> }>;
    filters: Record<string, unknown>;
  };

  expect(result.filename).toBe("audit-logs-2026-06-01-authentication-warning-search.json");
  expect(result.mimeType).toBe("application/json");
  expect(listCalls).toEqual([
    {
      limit: 50,
      query: "auth",
      category: "authentication",
      severity: "warning",
      from: new Date("2026-06-01T00:00:00.000Z"),
      to: new Date("2026-06-02T00:00:00.000Z"),
    },
  ]);
  expect(payload.rows[0]?.event).toBe("content.publish");
  expect(JSON.stringify(payload.rows[0]?.payload)).not.toContain("secret-password");
  expect(auditCalls).toEqual([
    {
      actorId: "user-1",
      action: "audit.export",
      targetType: "audit",
      targetId: "logs",
      metadata: {
        format: "json",
        columns: ["event", "timestamp", "payload"],
        filters: {
          limit: 50,
          query: "[search]",
          category: "authentication",
          severity: "warning",
          from: "2026-06-01T00:00:00.000Z",
          to: "2026-06-02T00:00:00.000Z",
        },
        rowCount: 1,
        requestId: "req-export",
      },
      ip: "127.0.0.1",
      userAgent: "Playwright",
    },
  ]);
});

test("exportAuditLogs rejects invalid columns and oversized sync exports", async () => {
  await expect(
    exportAuditLogs(
      {
        format: "csv",
        columns: ["metadata.secret"] as never,
        filters: {},
      },
      {},
      {
        listAudit: async () => ({ items: [], nextCursor: null }),
        logAudit: async () => record(),
      }
    )
  ).rejects.toBeInstanceOf(AuditExportError);

  await expect(
    exportAuditLogs(
      {
        format: "csv",
        columns: ["event"],
        filters: { limit: 201 },
      },
      {},
      {
        listAudit: async () => ({ items: [], nextCursor: null }),
        logAudit: async () => record(),
      }
    )
  ).rejects.toMatchObject({ code: "audit_export_too_large", status: 413 });
});
