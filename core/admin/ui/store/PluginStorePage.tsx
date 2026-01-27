import { useMemo, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { PluginDetail } from "../plugins/PluginDetail";
import { PluginList } from "../plugins/PluginList";
import type { InstalledPlugin, UpdatePolicy } from "../plugins/types";
import { StoreDetail } from "./StoreDetail";
import { StoreList } from "./StoreList";
import type { StoreCatalogItem } from "./types";

const catalog: StoreCatalogItem[] = [
  {
    id: "seo-boost",
    name: "SEO Boost",
    description: "Improve metadata, sitemaps, and on-page SEO scoring.",
    status: "verified",
    tags: ["seo", "automation"],
    securityScore: 96,
    lastUpdated: "Jan 22, 2026",
    downloads: "32k installs",
    latestVersion: "2.4.0",
    installedVersion: "2.3.2",
    permissions: ["content:read", "content:write"],
    versions: [
      { version: "2.4.0", releaseType: "security", compatible: true },
      { version: "2.3.2", releaseType: "normal", compatible: true },
    ],
  },
  {
    id: "analytics",
    name: "Nextless Analytics",
    description: "Privacy-focused analytics dashboard inside the CMS.",
    status: "official",
    tags: ["analytics", "insights"],
    securityScore: 99,
    lastUpdated: "Jan 18, 2026",
    downloads: "120k installs",
    latestVersion: "3.1.2",
    installedVersion: "3.1.2",
    permissions: ["admin:ui", "content:read"],
    versions: [
      { version: "3.1.2", releaseType: "security", compatible: true },
      { version: "3.1.0", releaseType: "normal", compatible: true },
    ],
  },
  {
    id: "localizer",
    name: "Polyglot Localizer",
    description: "Translate content types across 50+ languages.",
    status: "community",
    tags: ["i18n", "ai"],
    securityScore: 88,
    lastUpdated: "Jan 10, 2026",
    downloads: "8.7k installs",
    latestVersion: "1.0.5",
    permissions: ["content:read", "content:write"],
    versions: [
      { version: "1.0.5", releaseType: "normal", compatible: true },
      { version: "1.0.4", releaseType: "normal", compatible: true },
    ],
  },
];

const installedSeed: InstalledPlugin[] = [
  {
    name: "SEO Boost",
    version: "2.3.2",
    status: "enabled",
    enabled: true,
    policy: "auto-security",
    lastUpdated: "Jan 15, 2026",
    updateAvailable: "2.4.0",
    permissions: ["content:read", "content:write"],
  },
  {
    name: "Nextless Analytics",
    version: "3.1.2",
    status: "enabled",
    enabled: true,
    policy: "manual",
    lastUpdated: "Jan 18, 2026",
    permissions: ["admin:ui", "content:read"],
  },
];

export function PluginStorePage() {
  const [query, setQuery] = useState("");
  const [storeItems, setStoreItems] = useState(catalog);
  const [selectedStoreId, setSelectedStoreId] = useState(storeItems[0]?.id ?? "");
  const [selectedVersion, setSelectedVersion] = useState(
    storeItems[0]?.versions[0]?.version ?? ""
  );
  const [installedPlugins, setInstalledPlugins] = useState(installedSeed);
  const [selectedInstalled, setSelectedInstalled] = useState(installedSeed[0]?.name ?? "");

  const selectedStore = storeItems.find((item) => item.id === selectedStoreId);
  const selectedInstalledPlugin = installedPlugins.find(
    (plugin) => plugin.name === selectedInstalled
  );

  const storeSelection = useMemo(() => {
    if (!selectedStore) return { plugin: undefined, version: "" };
    const defaultVersion = selectedStore.versions[0]?.version ?? "";
    return {
      plugin: selectedStore,
      version: selectedVersion || defaultVersion,
    };
  }, [selectedStore, selectedVersion]);

  const handleSelectStore = (id: string) => {
    setSelectedStoreId(id);
    const next = storeItems.find((item) => item.id === id);
    setSelectedVersion(next?.versions[0]?.version ?? "");
  };

  const handleInstall = (version: string) => {
    if (!selectedStore) return;

    setInstalledPlugins((prev) => {
      const existing = prev.find((item) => item.name === selectedStore.name);
      if (existing) {
        return prev.map((item) =>
          item.name === selectedStore.name
            ? {
                ...item,
                version,
                status: "enabled",
                enabled: true,
                lastUpdated: "Today",
                updateAvailable: undefined,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          name: selectedStore.name,
          version,
          status: "enabled",
          enabled: true,
          policy: "auto-security",
          lastUpdated: "Today",
          permissions: selectedStore.permissions,
        },
      ];
    });

    setStoreItems((prev) =>
      prev.map((item) =>
        item.id === selectedStore.id
          ? { ...item, installedVersion: version }
          : item
      )
    );
    setSelectedInstalled(selectedStore.name);
  };

  const handleUpdate = (version: string) => {
    if (!selectedStore) return;
    handleInstall(version);
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (!selectedInstalledPlugin) return;
    setInstalledPlugins((prev) =>
      prev.map((item) =>
        item.name === selectedInstalledPlugin.name
          ? {
              ...item,
              enabled,
              status: enabled ? "enabled" : "disabled",
            }
          : item
      )
    );
  };

  const handlePolicyChange = (policy: UpdatePolicy) => {
    if (!selectedInstalledPlugin) return;
    setInstalledPlugins((prev) =>
      prev.map((item) =>
        item.name === selectedInstalledPlugin.name ? { ...item, policy } : item
      )
    );
  };

  const handleUpdateCheck = () => {
    if (!selectedInstalledPlugin) return;
    setInstalledPlugins((prev) =>
      prev.map((item) =>
        item.name === selectedInstalledPlugin.name
          ? {
              ...item,
              updateAvailable: item.updateAvailable ?? "1.0.0",
            }
          : item
      )
    );
  };

  return (
    <AdminShell
      activeHref="/admin/store"
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Store</span>
          <span>/</span>
          <span className="text-foreground">Plugin Store</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Plugin Store"
          description="Browse verified plugins, install securely, and manage update policies."
        />
        <Tabs defaultValue="store" className="w-full">
          <TabsList>
            <TabsTrigger value="store">Store</TabsTrigger>
            <TabsTrigger value="installed">Installed</TabsTrigger>
          </TabsList>
          <TabsContent value="store" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <StoreList
                items={storeItems}
                selectedId={selectedStoreId}
                query={query}
                onQueryChange={setQuery}
                onSelect={handleSelectStore}
              />
              <StoreDetail
                plugin={storeSelection.plugin}
                selectedVersion={storeSelection.version}
                onSelectVersion={setSelectedVersion}
                onInstall={handleInstall}
                onUpdate={handleUpdate}
              />
            </div>
          </TabsContent>
          <TabsContent value="installed" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <PluginList
                items={installedPlugins}
                selectedName={selectedInstalled}
                onSelect={setSelectedInstalled}
              />
              <PluginDetail
                plugin={selectedInstalledPlugin}
                onToggleEnabled={handleToggleEnabled}
                onPolicyChange={handlePolicyChange}
                onUpdate={handleUpdateCheck}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
