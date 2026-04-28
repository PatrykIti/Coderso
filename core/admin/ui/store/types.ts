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

export type StoreCatalogVersion = {
  version: string;
  releaseType: "normal" | "security";
  compatible: boolean;
};

export type StoreCatalogItem = {
  id: string;
  name: string;
  description: string;
  status: PluginStatus;
  tags: string[];
  securityScore: number;
  lastUpdated: string;
  downloads: string;
  latestVersion: string;
  installedVersion?: string;
  permissions: string[];
  versions: StoreCatalogVersion[];
};
