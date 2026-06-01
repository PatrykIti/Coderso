import type { LucideIcon } from "lucide-react";

export type AccessLogStatus = "success" | "failed";

export type AccessLogMatchContext = {
  field: "path" | "ip" | "user" | "email";
  label: string;
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
