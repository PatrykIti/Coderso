import type { ReactNode } from "react";

export type PluginStatus = "verified" | "official" | "community";

export type PluginSummary = {
  id: string;
  name: string;
  description: string;
  version: string;
  status: PluginStatus;
  installed?: boolean;
  icon: ReactNode;
  tags: string[];
  securityScore: number;
  lastUpdated: string;
  downloads: string;
  changelog: string[];
};
