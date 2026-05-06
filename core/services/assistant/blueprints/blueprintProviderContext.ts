import { listBlueprintCapabilities } from "./blueprintCapabilityRegistry";

export type BlueprintProviderContextPackage = {
  schemaVersion: 1;
  capabilities: Array<{
    id: string;
    label: string;
    family: string;
    aliases: string[];
    provides: Array<{
      kind: string;
      key: string;
      label: string;
    }>;
    resources: Array<{
      kind: string;
      key: string;
      executable: boolean;
      stableTarget: string;
    }>;
    pageSections: Array<{
      key: string;
      slot: string;
      kind: string;
    }>;
    adminSurfaces: Array<{
      key: string;
      surface: string;
    }>;
    gated: Array<{
      kind: string;
      key: string;
      blocking: boolean;
    }>;
  }>;
  warnings: string[];
};

export const buildBlueprintProviderContext = (options?: {
  maxCapabilities?: number;
}): BlueprintProviderContextPackage => {
  const warnings: string[] = [];
  const maxCapabilities = Math.max(1, Math.floor(options?.maxCapabilities ?? 24));
  const capabilities = listBlueprintCapabilities();
  if (capabilities.length > maxCapabilities) warnings.push("blueprint_capabilities_truncated");
  warnings.push("detail_pages_unavailable");

  return {
    schemaVersion: 1,
    capabilities: capabilities.slice(0, maxCapabilities).map((capability) => ({
      id: capability.id,
      label: capability.label,
      family: capability.family,
      aliases: [...(capability.aliases ?? [])],
      provides: capability.provides.map((entry) => ({
        kind: entry.kind,
        key: entry.key,
        label: entry.label,
      })),
      resources: capability.resources.map((entry) => ({
        kind: entry.kind,
        key: entry.key,
        executable: entry.executable,
        stableTarget: entry.stableTarget,
      })),
      pageSections: capability.pageSections.map((entry) => ({
        key: entry.key,
        slot: entry.slot,
        kind: entry.kind,
      })),
      adminSurfaces: capability.adminSurfaces.map((entry) => ({
        key: entry.key,
        surface: entry.surface,
      })),
      gated: capability.gated.map((entry) => ({
        kind: entry.kind,
        key: entry.key,
        blocking: entry.blocking ?? false,
      })),
    })),
    warnings,
  };
};
