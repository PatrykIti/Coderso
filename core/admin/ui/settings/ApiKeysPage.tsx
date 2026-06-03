import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyRecord,
} from "@/services/apiKeysClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { ConfirmActionDialog, type ConfirmAction } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ApiKeyDialog } from "./ApiKeyDialog";
import { ApiKeySecretDialog } from "./ApiKeySecretDialog";
import { ApiKeysTable } from "./ApiKeysTable";
import { SettingsSidebar } from "./SettingsSidebar";

type PendingApiKeyAction = {
  kind: "rotate" | "revoke";
  key: ApiKeyRecord;
};

const toApiKeyErrorMessage = (err: unknown, fallback: string) =>
  isApiClientError(err) ? err.message : fallback;

const describeApiKey = (key: ApiKeyRecord) => `${key.name} (${key.prefix}...)`;

export function ApiKeysPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [secretDialog, setSecretDialog] = useState<{
    id: string;
    name: string;
    secret: string;
  } | null>(null);
  const [items, setItems] = useState<ApiKeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [copyableSecrets, setCopyableSecrets] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<PendingApiKeyAction | null>(null);

  const copyableIds = useMemo(() => new Set(Object.keys(copyableSecrets)), [copyableSecrets]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listApiKeys();
      setItems(data);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load API keys.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listApiKeys()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load API keys.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (payload: { name: string; scopes: string[] }) => {
    setIsSaving(true);
    setDialogError(null);
    try {
      const result = await createApiKey(payload);
      setItems((prev) => {
        const filtered = prev.filter((item) => item.id !== result.item.id);
        return [result.item, ...filtered];
      });
      setCopyableSecrets((prev) => ({ ...prev, [result.item.id]: result.secret }));
      setSecretDialog({
        id: result.item.id,
        name: result.item.name,
        secret: result.secret,
      });
      setDialogOpen(false);
    } catch (err) {
      if (isApiClientError(err)) {
        setDialogError(err.message);
      } else {
        setDialogError("Failed to create API key.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const performRotate = async (key: ApiKeyRecord) => {
    setBusyId(key.id);
    setError(null);
    try {
      const result = await rotateApiKey(key.id);
      setItems((prev) => prev.map((item) => (item.id === key.id ? result.item : item)));
      setCopyableSecrets((prev) => ({ ...prev, [result.item.id]: result.secret }));
      setSecretDialog({
        id: result.item.id,
        name: result.item.name,
        secret: result.secret,
      });
    } catch (err) {
      const message = toApiKeyErrorMessage(err, "Failed to rotate API key.");
      setError(message);
      throw new Error(message);
    } finally {
      setBusyId(null);
    }
  };

  const performRevoke = async (key: ApiKeyRecord) => {
    setBusyId(key.id);
    setError(null);
    try {
      await revokeApiKey(key.id);
      await refresh();
    } catch (err) {
      const message = toApiKeyErrorMessage(err, "Failed to revoke API key.");
      setError(message);
      throw new Error(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "rotate") {
      await performRotate(pendingAction.key);
      return;
    }
    await performRevoke(pendingAction.key);
  };

  const confirmAction: ConfirmAction | null = pendingAction
    ? {
        title: pendingAction.kind === "rotate" ? "Rotate API key?" : "Revoke API key?",
        description:
          pendingAction.kind === "rotate"
            ? "The current secret will stop working immediately. A new secret is shown once after rotation."
            : "This permanently revokes the API key and integrations using it will lose access.",
        targetLabel: describeApiKey(pendingAction.key),
        confirmLabel: pendingAction.kind === "rotate" ? "Rotate key" : "Revoke key",
        variant: pendingAction.kind === "rotate" ? "warning" : "destructive",
        onConfirm: handleConfirmAction,
      }
    : null;

  const handleCopy = (key: ApiKeyRecord) => {
    const secret = copyableSecrets[key.id];
    if (!secret || typeof navigator === "undefined") return;
    void navigator.clipboard.writeText(secret);
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setDialogError(null);
    }
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      sidebar={<SettingsSidebar activeId="api-keys" />}
      breadcrumbs={["Settings", "API Keys"]}
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <PageHeader
              title="API Keys"
              description="Create, rotate, and revoke access tokens for integrations."
              actions={
                <Button className="gap-2" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create API Key
                </Button>
              }
            />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            <ApiKeysTable
              items={items}
              isLoading={isLoading}
              busyId={busyId}
              copyableIds={copyableIds}
              onCopy={handleCopy}
              onRotate={(key) => setPendingAction({ kind: "rotate", key })}
              onRevoke={(key) => setPendingAction({ kind: "revoke", key })}
            />
          </div>
        </div>
      </div>
      <ApiKeyDialog
        key={dialogOpen ? "open" : "closed"}
        open={dialogOpen}
        onOpenChange={handleDialogOpen}
        onCreate={handleCreate}
        isSubmitting={isSaving}
        error={dialogError}
      />
      <ApiKeySecretDialog
        open={Boolean(secretDialog)}
        onOpenChange={(open) => {
          if (!open) {
            setSecretDialog(null);
            setCopyableSecrets((prev) => {
              if (!secretDialog) return prev;
              const next = { ...prev };
              delete next[secretDialog.id];
              return next;
            });
          }
        }}
        name={secretDialog?.name ?? ""}
        secret={secretDialog?.secret ?? ""}
      />
      {confirmAction ? (
        <ConfirmActionDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          action={confirmAction}
        />
      ) : null}
    </SettingsShell>
  );
}
