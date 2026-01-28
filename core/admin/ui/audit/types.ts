export type AuditSeverity = "info" | "warning" | "error";

export type AuditStatus = "success" | "warning" | "error";

export type AuditCategory = "authentication" | "content" | "system";

export type AuditActor = {
  name: string;
  role: string;
  type: "user" | "system";
};

export type AuditLog = {
  id: string;
  event: string;
  category: AuditCategory;
  actor: AuditActor;
  resource: string;
  resourceLabel: string;
  ipAddress: string;
  timestamp: string;
  timestampLabel: string;
  status: AuditStatus;
  severity: AuditSeverity;
  requestId: string;
  description: string;
  payload: Record<string, unknown>;
};
