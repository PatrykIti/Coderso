import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";

import type { AuditCategory, AuditStatus } from "./types";

type IconType = typeof FileText;

// TASK-479-27-L03: tokenized the audit category/status palette onto the soft
// semantic tokens (info/success/warning/destructive + their -soft surfaces) so
// the audit timeline reads in the violet/soft language with light + dark parity.
export const auditCategoryMeta: Record<
  AuditCategory,
  {
    label: string;
    icon: IconType;
    className: string;
    badgeVariant: "info" | "success" | "secondary";
  }
> = {
  authentication: {
    label: "Authentication",
    icon: ShieldCheck,
    className: "bg-info-soft text-info",
    badgeVariant: "info",
  },
  content: {
    label: "Content",
    icon: FileText,
    className: "bg-success-soft text-success",
    badgeVariant: "success",
  },
  system: {
    label: "System",
    icon: AlertTriangle,
    className: "bg-muted text-muted-foreground",
    badgeVariant: "secondary",
  },
};

export const auditStatusMeta: Record<AuditStatus, { label: string; className: string }> = {
  success: {
    label: "Success",
    className: "border-transparent bg-success-soft text-success",
  },
  warning: {
    label: "Warning",
    className: "border-transparent bg-warning-soft text-warning",
  },
  error: {
    label: "Error",
    className: "border-transparent bg-destructive/12 text-destructive",
  },
};
