import type { LucideIcon } from "lucide-react";

export type AccessLogStatus = "success" | "failed";

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
