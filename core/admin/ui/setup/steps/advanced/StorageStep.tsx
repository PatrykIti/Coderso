import { useCallback } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsField } from "@/ui/shared/SettingsSection";
import {
  getStorageSettings,
  updateStorageSettings,
  type StorageDriver,
  type StorageSettingsResponse,
  type StorageSettingsUpdate,
} from "@/services/settingsClient";

import type { WizardStepBodyProps } from "../stepTypes";
import { AdvancedStepShell } from "./AdvancedStepShell";
import { stripUnchangedSecret, useAdapterForm, useSaveAction } from "./advancedStepUtils";

// TASK-482-07-L01: Advanced-track Storage step. Thin adapter over the existing
// `GET/PATCH /settings/storage` surface (settingsClient.ts). Provider secrets
// (S3/Azure access keys) are masked on load (`configured` flags only) and an
// untouched secret field is OMITTED from the PATCH — never forwarded as "".

type StorageForm = {
  driver: StorageDriver;
  localDir: string;
  publicBaseUrl: string;
  s3Bucket: string;
  s3Region: string;
  s3Endpoint: string;
  s3AccessKey: string; // write-only
  s3SecretKey: string; // write-only
  azureContainer: string;
  azureAccount: string;
  azureKey: string; // write-only
  azureConnectionString: string; // write-only
};

const toForm = (data: StorageSettingsResponse): StorageForm => ({
  driver: data.driver,
  localDir: data.local.dir ?? "",
  publicBaseUrl: data.publicBaseUrl ?? "",
  s3Bucket: data.s3.bucket ?? "",
  s3Region: data.s3.region ?? "",
  s3Endpoint: data.s3.endpoint ?? "",
  s3AccessKey: "",
  s3SecretKey: "",
  azureContainer: data.azure.container ?? "",
  azureAccount: data.azure.account ?? "",
  azureKey: "",
  azureConnectionString: "",
});

const toPayload = (form: StorageForm): StorageSettingsUpdate => {
  const base: StorageSettingsUpdate = {
    driver: form.driver,
    publicBaseUrl: form.publicBaseUrl.trim() || null,
  };
  if (form.driver === "local") {
    base.local = { dir: form.localDir.trim() || null };
  }
  if (form.driver === "s3") {
    const accessKey = stripUnchangedSecret(form.s3AccessKey);
    const secretKey = stripUnchangedSecret(form.s3SecretKey);
    base.s3 = {
      bucket: form.s3Bucket.trim() || null,
      region: form.s3Region.trim() || null,
      endpoint: form.s3Endpoint.trim() || null,
      ...(accessKey === undefined ? {} : { accessKey }),
      ...(secretKey === undefined ? {} : { secretKey }),
    };
  }
  if (form.driver === "azure") {
    const key = stripUnchangedSecret(form.azureKey);
    const connectionString = stripUnchangedSecret(form.azureConnectionString);
    base.azure = {
      container: form.azureContainer.trim() || null,
      account: form.azureAccount.trim() || null,
      ...(key === undefined ? {} : { key }),
      ...(connectionString === undefined ? {} : { connectionString }),
    };
  }
  return base;
};

export function StorageStep({ disabled }: WizardStepBodyProps) {
  const { data, form, setForm, loading, loadError } = useAdapterForm(
    getStorageSettings,
    toForm,
    "Failed to load storage settings."
  );
  const { saving, saveError, saved, run } = useSaveAction();

  const handleSave = useCallback(() => {
    if (!form) return;
    void run(async () => {
      await updateStorageSettings(toPayload(form));
      // Re-mask secret fields after a successful write.
      setForm((prev) =>
        prev
          ? {
              ...prev,
              s3AccessKey: "",
              s3SecretKey: "",
              azureKey: "",
              azureConnectionString: "",
            }
          : prev
      );
    }, "Failed to save storage settings.");
  }, [form, run, setForm]);

  const secretHint = (configured: boolean) =>
    configured ? "Configured. Leave blank to keep the current secret." : "Not configured yet.";

  return (
    <AdvancedStepShell
      loading={loading}
      loadError={loadError}
      saving={saving}
      saveError={saveError}
      saved={saved}
      savedLabel="Storage settings saved."
      onSave={handleSave}
      disabled={disabled}
    >
      {form ? (
        <>
          <SettingsField
            label="Storage driver"
            htmlFor="setup-storage-driver"
            hint="Where uploaded media is stored."
          >
            <Select
              value={form.driver}
              onValueChange={(value) =>
                setForm((prev) => (prev ? { ...prev, driver: value as StorageDriver } : prev))
              }
              disabled={disabled}
            >
              <SelectTrigger id="setup-storage-driver" className="w-full">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local filesystem</SelectItem>
                <SelectItem value="s3">Amazon S3 (compatible)</SelectItem>
                <SelectItem value="azure">Azure Blob Storage</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>

          <SettingsField
            label="Public media base URL"
            htmlFor="setup-storage-public-url"
            hint="Optional. Where uploaded media is served from."
          >
            <Input
              id="setup-storage-public-url"
              value={form.publicBaseUrl}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, publicBaseUrl: event.target.value } : prev))
              }
              placeholder="https://cdn.example.com"
              disabled={disabled}
              autoComplete="off"
            />
          </SettingsField>

          {form.driver === "local" ? (
            <SettingsField
              label="Local directory"
              htmlFor="setup-storage-local-dir"
              hint="Optional. Filesystem path for uploaded media."
            >
              <Input
                id="setup-storage-local-dir"
                value={form.localDir}
                onChange={(event) =>
                  setForm((prev) => (prev ? { ...prev, localDir: event.target.value } : prev))
                }
                placeholder="uploads"
                disabled={disabled}
                autoComplete="off"
              />
            </SettingsField>
          ) : null}

          {form.driver === "s3" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="Bucket" htmlFor="setup-storage-s3-bucket">
                <Input
                  id="setup-storage-s3-bucket"
                  value={form.s3Bucket}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, s3Bucket: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField label="Region" htmlFor="setup-storage-s3-region">
                <Input
                  id="setup-storage-s3-region"
                  value={form.s3Region}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, s3Region: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField label="Endpoint" htmlFor="setup-storage-s3-endpoint">
                <Input
                  id="setup-storage-s3-endpoint"
                  value={form.s3Endpoint}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, s3Endpoint: event.target.value } : prev))
                  }
                  placeholder="https://s3.amazonaws.com"
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField
                label="Access key"
                htmlFor="setup-storage-s3-access-key"
                hint={secretHint(data?.s3.accessKey.configured ?? false)}
              >
                <Input
                  id="setup-storage-s3-access-key"
                  type="password"
                  value={form.s3AccessKey}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, s3AccessKey: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField
                label="Secret key"
                htmlFor="setup-storage-s3-secret-key"
                hint={secretHint(data?.s3.secretKey.configured ?? false)}
              >
                <Input
                  id="setup-storage-s3-secret-key"
                  type="password"
                  value={form.s3SecretKey}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, s3SecretKey: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="new-password"
                />
              </SettingsField>
            </div>
          ) : null}

          {form.driver === "azure" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <SettingsField label="Container" htmlFor="setup-storage-azure-container">
                <Input
                  id="setup-storage-azure-container"
                  value={form.azureContainer}
                  onChange={(event) =>
                    setForm((prev) =>
                      prev ? { ...prev, azureContainer: event.target.value } : prev
                    )
                  }
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField label="Account" htmlFor="setup-storage-azure-account">
                <Input
                  id="setup-storage-azure-account"
                  value={form.azureAccount}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, azureAccount: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="off"
                />
              </SettingsField>
              <SettingsField
                label="Account key"
                htmlFor="setup-storage-azure-key"
                hint={secretHint(data?.azure.key.configured ?? false)}
              >
                <Input
                  id="setup-storage-azure-key"
                  type="password"
                  value={form.azureKey}
                  onChange={(event) =>
                    setForm((prev) => (prev ? { ...prev, azureKey: event.target.value } : prev))
                  }
                  disabled={disabled}
                  autoComplete="new-password"
                />
              </SettingsField>
              <SettingsField
                label="Connection string"
                htmlFor="setup-storage-azure-conn"
                hint={secretHint(data?.azure.connectionString.configured ?? false)}
              >
                <Input
                  id="setup-storage-azure-conn"
                  type="password"
                  value={form.azureConnectionString}
                  onChange={(event) =>
                    setForm((prev) =>
                      prev ? { ...prev, azureConnectionString: event.target.value } : prev
                    )
                  }
                  disabled={disabled}
                  autoComplete="new-password"
                />
              </SettingsField>
            </div>
          ) : null}
        </>
      ) : null}
    </AdvancedStepShell>
  );
}
