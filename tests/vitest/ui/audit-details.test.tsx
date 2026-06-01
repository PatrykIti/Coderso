import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { AuditDetailsDrawer } from "../../../core/admin/ui/audit/AuditDetailsDrawer";
import type { AuditLog } from "../../../core/admin/ui/audit/types";

const sampleLog: AuditLog = {
  id: "log_test_1",
  event: "Updated Article",
  category: "content",
  actor: {
    name: "Sarah Jenks",
    role: "Admin",
    type: "user",
  },
  resource: "/api/v1/posts/302",
  resourceLabel: 'Article #302 "Introduction to CMS"',
  ipAddress: "192.168.1.45",
  createdAt: "2026-03-15T14:22:10.000Z",
  timestamp: "2 mins ago",
  timestampLabel: "Oct 24, 14:22:10",
  status: "success",
  severity: "info",
  requestId: "req_abc123",
  description: "Article metadata updated and published.",
  payload: {
    action: "UPDATE",
    entity: "post",
    entity_id: 302,
    password: "secret-password",
    headers: {
      authorization: "Bearer sk-testsecret",
      accept: "application/json",
    },
  },
};

test("AuditDetailsDrawer renders drawer content", () => {
  const html = renderAdminUi(
    <AuditDetailsDrawer log={sampleLog} open onOpenChange={() => undefined} />
  );

  expect(html).toContain("Event Details");
  expect(html).toContain("JSON Payload");
  expect(html).toContain("Copy JSON");
  expect(html).toContain("Introduction to CMS");
  expect(html).toContain("application/json");
  expect(html).not.toContain("secret-password");
  expect(html).not.toContain("sk-testsecret");
});
