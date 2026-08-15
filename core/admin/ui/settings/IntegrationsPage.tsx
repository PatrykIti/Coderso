import { BarChart3, MessageSquare, Plus, Search, Send, ShieldAlert, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import {
  checkIntegration,
  listIntegrations,
  requestIntegration,
  updateIntegration,
  type IntegrationRecord,
} from "@/services/integrationsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { IntegrationCard, type IntegrationCardProps } from "./IntegrationCard";
import { IntegrationDrawer } from "./IntegrationDrawer";
import { IntegrationRequestDialog } from "./IntegrationRequestDialog";
import { SettingsSidebar } from "./SettingsSidebar";

const iconMap: Record<
  string,
  { icon: IntegrationCardProps["icon"]; accent: IntegrationCardProps["accent"] }
> = {
  "google-analytics": { icon: BarChart3, accent: "amber" },
  slack: { icon: MessageSquare, accent: "violet" },
  resend: { icon: Send, accent: "emerald" },
  zapier: { icon: Zap, accent: "orange" },
  sentry: { icon: ShieldAlert, accent: "rose" },
  openai: { icon: Zap, accent: "violet" },
  openrouter: { icon: Zap, accent: "orange" },
};

function IntegrationsSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search integrations..."
        className="pl-9"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function IntegrationsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [items, setItems] = useState<IntegrationRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState("All Services");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const activeIntegration = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items]
  );

  const categories = useMemo(() => {
    const unique = new Set(items.map((item) => item.category).filter(Boolean));
    return ["All Services", ...Array.from(unique)];
  }, [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "All Services" && item.category !== filter) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [items, filter, query]);

  useEffect(() => {
    let active = true;
    listIntegrations()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load integrations.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenIntegration = (integration: IntegrationRecord) => {
    setActiveId(integration.id);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const handleSaveIntegration = async (id: string, config: Record<string, string | null>) => {
    setIsSaving(true);
    setDrawerError(null);
    try {
      const { item } = await updateIntegration(id, { config });
      setItems((prev) => prev.map((current) => (current.id === id ? item : current)));
      setDrawerOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setDrawerError(err.message);
      } else {
        setDrawerError("Failed to update integration.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (id: string) => {
    setCheckingId(id);
    setDrawerError(null);
    try {
      const { item } = await checkIntegration(id);
      setItems((prev) => prev.map((current) => (current.id === id ? item : current)));
    } catch (err) {
      if (isApiClientError(err)) {
        setDrawerError(err.message);
      } else {
        setDrawerError("Failed to test connection.");
      }
    } finally {
      setCheckingId(null);
    }
  };

  const handleRequestIntegration = async (payload: {
    name: string;
    website?: string | null;
    notes?: string | null;
  }) => {
    setIsRequesting(true);
    setRequestError(null);
    try {
      await requestIntegration(payload);
      setRequestOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setRequestError(err.message);
      } else {
        setRequestError("Failed to submit request.");
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="integrations" />}
      breadcrumbs={["Settings", "Integrations"]}
      search={<IntegrationsSearch value={query} onChange={setQuery} />}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card/70 px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <PageHeader
              title="Integrations"
              description="Connect your workflow with third-party services."
              actions={
                <Button
                  className="gap-2"
                  onClick={() => {
                    setRequestError(null);
                    setRequestOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Request new
                </Button>
              }
            />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((value) => {
                const isActive = value === filter;
                return (
                  <Button
                    key={value}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-full px-4 text-xs font-semibold",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setFilter(value)}
                  >
                    {value}
                  </Button>
                );
              })}
            </div>

            <Separator />

            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={`skeleton-${index}`}
                      className="h-[220px] rounded-xl border border-dashed bg-muted/30"
                    />
                  ))
                : visibleItems.map((integration) => {
                    const visuals = iconMap[integration.id] ?? {
                      icon: Zap,
                      accent: "orange" as const,
                    };
                    return (
                      <IntegrationCard
                        key={integration.id}
                        name={integration.name}
                        description={integration.description}
                        status={integration.status}
                        health={integration.health.status}
                        icon={visuals.icon}
                        accent={visuals.accent}
                        onAction={() => handleOpenIntegration(integration)}
                      />
                    );
                  })}
            </div>
          </div>
        </div>
      </div>
      <IntegrationDrawer
        key={`${activeIntegration?.id ?? "integration"}:${drawerOpen ? "open" : "closed"}`}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        integration={
          activeIntegration
            ? {
                id: activeIntegration.id,
                name: activeIntegration.name,
                status: activeIntegration.status,
                description: activeIntegration.description,
                scopes: activeIntegration.scopes,
                fields: activeIntegration.fields,
              }
            : null
        }
        isSaving={isSaving}
        isChecking={checkingId === activeIntegration?.id}
        error={drawerError}
        health={activeIntegration?.health ?? null}
        onSave={handleSaveIntegration}
        onCheck={handleTestConnection}
      />
      <IntegrationRequestDialog
        key={requestOpen ? "request-open" : "request-closed"}
        open={requestOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRequestError(null);
          }
          setRequestOpen(open);
        }}
        onSubmit={handleRequestIntegration}
        isSubmitting={isRequesting}
        error={requestError}
      />
    </SettingsShell>
  );
}
