import { beforeEach, expect, test, vi } from "vitest";

import type { AuditLog } from "../../../core/admin/ui/audit/types";

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  reset() {
    this.success.mockReset();
    this.error.mockReset();
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
    error: toastState.error,
  },
}));

import {
  buildPublicAuditEntryPayload,
  copyAuditEntryJson,
} from "../../../core/admin/ui/audit/auditEntryActions";
import {
  isSensitiveAuditPayloadKey,
  redactAuditPayload,
} from "../../../core/services/audit/auditRedaction";

const auditLog: AuditLog = {
  id: "audit-1",
  event: "Auth Denied",
  category: "authentication",
  actor: { name: "Ada Lovelace", role: "Admin", type: "user" },
  resource: "/session/sess-1",
  resourceLabel: "Session sess-1",
  ipAddress: "127.0.0.1",
  createdAt: "2026-06-01T12:00:00.000Z",
  timestamp: "Just now",
  timestampLabel: "Jun 1, 2026, 12:00:00 PM",
  status: "warning",
  severity: "warning",
  requestId: "req-1",
  description: "Authentication denied.",
  payload: {
    action: "auth.denied",
    password: "plain-text",
    resetToken: "reset-secret",
    csrfToken: "csrf-secret",
    sessionId: "session-secret",
    nested: {
      apiKey: "sk-secretapikey",
      headers: {
        authorization: "Bearer sk-testsecret",
        cookie: "session=abc",
        accept: "application/json",
        "x-csrf-token": "csrf-header",
      },
    },
    list: ["Bearer sk-or-v1-abcdef1234567890", { sessionToken: "session-token" }],
    publicValue: "ok",
  },
};

beforeEach(() => {
  toastState.reset();
});

test("redactAuditPayload strips sensitive keys and token-like values recursively", () => {
  const redacted = redactAuditPayload(auditLog.payload);
  const serialized = JSON.stringify(redacted);

  expect(redacted).toMatchObject({
    action: "auth.denied",
    nested: {
      headers: {
        accept: "application/json",
      },
    },
    publicValue: "ok",
  });
  expect(serialized).not.toContain("plain-text");
  expect(serialized).not.toContain("reset-secret");
  expect(serialized).not.toContain("csrf-secret");
  expect(serialized).not.toContain("session-secret");
  expect(serialized).not.toContain("sk-testsecret");
  expect(serialized).not.toContain("session-token");
  expect(serialized).toContain("[REDACTED]");

  expect(isSensitiveAuditPayloadKey("authorization")).toBe(true);
  expect(isSensitiveAuditPayloadKey("x-csrf-token")).toBe(true);
  expect(isSensitiveAuditPayloadKey("passwordResetToken")).toBe(true);
  expect(isSensitiveAuditPayloadKey("session_id")).toBe(true);
  expect(isSensitiveAuditPayloadKey("publicValue")).toBe(false);
});

test("buildPublicAuditEntryPayload includes stable metadata and only redacted payload", () => {
  const payload = buildPublicAuditEntryPayload(auditLog);
  const serialized = JSON.stringify(payload);

  expect(payload).toMatchObject({
    id: "audit-1",
    event: "Auth Denied",
    category: "authentication",
    resource: "/session/sess-1",
    createdAt: "2026-06-01T12:00:00.000Z",
    timestamp: "Jun 1, 2026, 12:00:00 PM",
    payload: {
      action: "auth.denied",
      publicValue: "ok",
    },
  });
  expect(serialized).not.toContain("plain-text");
  expect(serialized).not.toContain("csrf-header");
});

test("copyAuditEntryJson reports clipboard success, rejection, and unavailable states", async () => {
  const writeText = vi.fn(async (_value: string) => undefined);

  await expect(copyAuditEntryJson(auditLog, { clipboard: { writeText } })).resolves.toEqual({
    ok: true,
    message: "Audit entry JSON copied.",
  });
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0]?.[0]).toContain('"createdAt": "2026-06-01T12:00:00.000Z"');
  expect(writeText.mock.calls[0]?.[0]).not.toContain("plain-text");
  expect(toastState.success).toHaveBeenCalledWith("Audit entry JSON copied.");

  const denied = vi.fn(async (_value: string) => {
    throw new Error("denied");
  });
  await expect(copyAuditEntryJson(auditLog, { clipboard: { writeText: denied } })).resolves.toEqual(
    {
      ok: false,
      message: "Failed to copy audit entry JSON.",
    }
  );
  expect(toastState.error).toHaveBeenCalledWith("Failed to copy audit entry JSON.");

  await expect(copyAuditEntryJson(auditLog, { clipboard: null })).resolves.toEqual({
    ok: false,
    message: "Clipboard is unavailable in this browser.",
  });
  expect(toastState.error).toHaveBeenCalledWith("Clipboard is unavailable in this browser.");
});
