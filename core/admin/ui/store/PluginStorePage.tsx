import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    name: "Coderso Analytics",
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
    name: "Coderso Analytics",
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
  const [category, setCategory] = useState("all");
  const [storeItems, setStoreItems] = useState(catalog);
  const [selectedStoreId, setSelectedStoreId] = useState(storeItems[0]?.id ?? "");
  const [selectedVersion, setSelectedVersion] = useState(storeItems[0]?.versions[0]?.version ?? "");
  const [installedPlugins, setInstalledPlugins] = useState(installedSeed);
  const [selectedInstalled, setSelectedInstalled] = useState(installedSeed[0]?.name ?? "");

  const selectedStore = storeItems.find((item) => item.id === selectedStoreId);
  const selectedInstalledPlugin = installedPlugins.find(
    (plugin) => plugin.name === selectedInstalled
  );

  // TASK-479-24-L01: presentational featured banner — render-time derivation over
  // existing catalog state (no new effect, no fetch, no sync setState).
  const featured = useMemo(
    () => storeItems.find((item) => item.status === "official") ?? storeItems[0],
    [storeItems]
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
        item.id === selectedStore.id ? { ...item, installedVersion: version } : item
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
      prev.map((item) => (item.name === selectedInstalledPlugin.name ? { ...item, policy } : item))
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
    <AdminShell activeHref="/admin/store" breadcrumbs={["Store", "Plugin Store"]}>
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
            <Card className="relative mb-6 gap-0 overflow-hidden border-0 bg-primary p-7 text-primary-foreground shadow-card">
              <div className="absolute -right-10 -top-10 size-48 rounded-full bg-white/10 blur-2xl" />
              <div className="relative max-w-lg">
                <Badge className="mb-3 border-white/20 bg-white/15 text-white">Featured</Badge>
                <h2 className="font-display text-2xl font-bold">{featured?.name}</h2>
                <p className="mt-1.5 text-sm text-white/80">{featured?.description}</p>
                <Button
                  variant="soft"
                  className="mt-4 bg-white text-primary hover:bg-white/90"
                  onClick={() => {
                    if (featured) handleSelectStore(featured.id);
                  }}
                >
                  View plugin
                </Button>
              </div>
            </Card>

            <Tabs value={category} onValueChange={setCategory} className="mb-5 w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="marketing">Marketing</TabsTrigger>
                <TabsTrigger value="commerce">Commerce</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
                <TabsTrigger value="themes">Themes</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <StoreList
                items={storeItems}
                selectedId={selectedStoreId}
                query={query}
                category={category}
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
