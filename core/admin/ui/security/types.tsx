import type { LucideIcon } from "lucide-react";

export type AccessLogStatus = "success" | "failed";

export type AccessLogItem = {
  id: string;
  user: {
    name: string;
    detail: string;
  };
  ipAddress: string;
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
