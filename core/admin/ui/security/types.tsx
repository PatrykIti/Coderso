import type { LucideIcon } from "lucide-react";

export type AccessLogStatus = "success" | "failed";

export type AccessLogMatchContext = {
  field: "path" | "ip" | "user" | "email";
  label: string;
};

export type AccessLogSessionState =
  | "none"
  | "missing"
  | "active"
  | "current"
  | "revoked"
  | "expired";

export type AccessLogSessionReason =
  | "historical"
  | "failed_attempt"
  | "system"
  | "missing_relation";

export type AccessLogSessionAction = {
  enabled: boolean;
  reason?: string;
};

export type AccessLogSessionContext = {
  state: AccessLogSessionState;
  label: string;
  reason?: AccessLogSessionReason;
  sessionId?: string;
  userId?: string;
  current?: boolean;
  expiresAt?: string | null;
  revokedAt?: string | null;
  view: AccessLogSessionAction;
  revoke: AccessLogSessionAction;
};

export type AccessLogItem = {
  id: string;
  user: {
    name: string;
    detail: string;
  };
  ipAddress: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs?: number | null;
  userAgent?: string | null;
  matchContext?: AccessLogMatchContext | null;
  session: AccessLogSessionContext;
  device: {
    label: string;
    icon: LucideIcon;
  };
  timestamp: {
    date: string;
    time: string;
  };
  status: AccessLogStatus;
};
