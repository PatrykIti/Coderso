export type AuditLogCategory = "authentication" | "content" | "system";
export type AuditLogSeverity = "info" | "warning" | "error";

export type AuditClassificationRecord = {
  action: string;
  targetType: string;
};

export const contentAuditTargetTypes = [
  "page",
  "content",
  "entry",
  "menu",
  "media",
  "seo",
  "redirect",
  "theme",
  "admin-theme",
] as const;

export function resolveAuditCategory(record: AuditClassificationRecord): AuditLogCategory {
  const action = record.action.toLowerCase();
  const targetType = record.targetType.toLowerCase();
  if (
    targetType === "session" ||
    action.startsWith("auth.") ||
    action.startsWith("session.") ||
    action.startsWith("sessions.")
  ) {
    return "authentication";
  }
  if ((contentAuditTargetTypes as readonly string[]).includes(targetType)) {
    return "content";
  }
  return "system";
}

export function resolveAuditSeverity(
  record: Pick<AuditClassificationRecord, "action">,
  metadata: Record<string, unknown>
): AuditLogSeverity {
  const metaSeverity = typeof metadata.severity === "string" ? metadata.severity : null;
  if (metaSeverity === "info" || metaSeverity === "warning" || metaSeverity === "error") {
    return metaSeverity;
  }

  const action = record.action.toLowerCase();
  if (action.includes("error") || action.includes("fail")) return "error";
  if (action.includes("warn") || action.includes("denied")) return "warning";
  return "info";
}
