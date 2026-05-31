import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  createWebhook,
  deleteWebhook,
  listWebhooks,
  testWebhook,
  updateWebhook,
  type WebhookRecord,
} from "@/services/webhooksClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { SettingsSidebar } from "./SettingsSidebar";
import { WebhookDrawer } from "./WebhookDrawer";
import { WebhooksTable, type WebhookRow } from "./WebhooksTable";

const formatRelative = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
};

const toRow = (record: WebhookRecord): WebhookRow => ({
  id: record.id,
  url: record.url,
  events: record.events,
  status: record.enabled ? "active" : "inactive",
  lastDelivery: record.lastDelivery
    ? {
        label: formatRelative(record.lastDelivery.deliveredAt),
        status:
          record.lastDelivery.status === "success"
            ? "success"
            : record.lastDelivery.status === "failed"
              ? "failed"
              : "pending",
      }
    : { label: "Never", status: "pending" },
});

export function WebhooksPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRecord | null>(null);
  const [items, setItems] = useState<WebhookRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const rows = useMemo(() => items.map(toRow), [items]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listWebhooks();
      setItems(data);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load webhooks.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listWebhooks()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load webhooks.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCreate = () => {
    setEditingWebhook(null);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const openEdit = (row: WebhookRow) => {
    const record = items.find((item) => item.id === row.id) ?? null;
    setEditingWebhook(record);
    setDrawerError(null);
    setDrawerOpen(true);
  };

  const handleSave = async (payload: {
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string | null;
  }) => {
    setIsSaving(true);
    setDrawerError(null);
    try {
      if (editingWebhook) {
        const { item } = await updateWebhook(editingWebhook.id, payload);
        setItems((prev) => prev.map((current) => (current.id === item.id ? item : current)));
      } else {
        const { item } = await createWebhook(payload);
        setItems((prev) => [item, ...prev]);
      }
      setDrawerOpen(false);
      setEditingWebhook(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setDrawerError(err.message);
      } else {
        setDrawerError("Failed to save webhook.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: WebhookRow) => {
    setBusyId(row.id);
    setError(null);
    try {
      await deleteWebhook(row.id);
      setItems((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to delete webhook.");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleTest = async () => {
    if (!editingWebhook) return;
    setIsSaving(true);
    setDrawerError(null);
    try {
      await testWebhook(editingWebhook.id);
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setDrawerError(err.message);
      } else {
        setDrawerError("Webhook test failed.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="webhooks" />}
      breadcrumbs={["Settings", "Webhooks"]}
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <PageHeader
              title="Webhooks"
              description="Send real-time content updates to external services."
              actions={
                <Button className="gap-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Create Webhook
                </Button>
              }
            />
          </div>
        </div>
        <div className="flex-1 p-6">
          {error ? (
            <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <WebhooksTable
            items={rows}
            onEdit={openEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            busyId={busyId}
          />
        </div>
      </div>
      <WebhookDrawer
        key={editingWebhook?.id ?? (drawerOpen ? "new-open" : "new")}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={editingWebhook ? "edit" : "create"}
        webhook={
          editingWebhook
            ? {
                id: editingWebhook.id,
                name: editingWebhook.name,
                url: editingWebhook.url,
                events: editingWebhook.events,
                enabled: editingWebhook.enabled,
              }
            : null
        }
        isSaving={isSaving}
        error={drawerError}
        onSave={handleSave}
        onTest={editingWebhook ? handleTest : undefined}
      />
    </SettingsShell>
  );
}
