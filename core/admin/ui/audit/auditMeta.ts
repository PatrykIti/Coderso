import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";

import type { AuditCategory, AuditStatus } from "./types";

type IconType = typeof FileText;

export const auditCategoryMeta: Record<
  AuditCategory,
  { label: string; icon: IconType; className: string }
> = {
  authentication: {
    label: "Authentication",
    icon: ShieldCheck,
    className: "bg-emerald-500/10 text-emerald-600",
  },
  content: {
    label: "Content",
    icon: FileText,
    className: "bg-blue-500/10 text-blue-600",
  },
  system: {
    label: "System",
    icon: AlertTriangle,
    className: "bg-rose-500/10 text-rose-600",
  },
};

export const auditStatusMeta: Record<
  AuditStatus,
  { label: string; className: string }
> = {
  success: {
    label: "Success",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  },
  warning: {
    label: "Warning",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  },
  error: {
    label: "Error",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-600",
  },
};
