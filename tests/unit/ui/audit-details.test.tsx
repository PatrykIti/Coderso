import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

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
  resourceLabel: "Article #302 \"Introduction to CMS\"",
  ipAddress: "192.168.1.45",
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
  },
};

test("AuditDetailsDrawer renders drawer content", () => {
  const html = renderToString(
    <AuditDetailsDrawer
      log={sampleLog}
      open
      onOpenChange={() => undefined}
    />
  );

  expect(html).toContain("Event Details");
  expect(html).toContain("JSON Payload");
  expect(html).toContain("Introduction to CMS");
});
