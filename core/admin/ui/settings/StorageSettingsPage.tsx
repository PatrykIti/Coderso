import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe2,
  HardDrive,
  Info,
  KeyRound,
  Link2,
  Lock,
  ShieldCheck,
  UploadCloud,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { isApiClientError } from "@/services/apiClient";
import {
  getStorageSettings,
  updateStorageSettings,
  type StorageDriver,
} from "@/services/settingsClient";
import { SettingsShell } from "@/ui/layouts/SettingsShell";
import { useAutoSaveEffect, useSettingsAutoSave } from "@/ui/settings/useSettingsAutoSave";

import { SettingsSidebar } from "./SettingsSidebar";
import {
  StorageProviderCard,
  type StorageProviderId,
} from "./StorageProviderCard";

type StorageProviderDefinition = {
  id: StorageProviderId;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

type StorageFieldOption = {
  value: string;
  label: string;
};

type StorageFieldId =
  | "localDir"
  | "publicBaseUrl"
  | "maxSizeBytes"
  | "allowedMime"
  | "s3AccessKey"
  | "s3SecretKey"
  | "s3Bucket"
  | "s3Region"
  | "s3Endpoint"
  | "azureAccount"
  | "azureKey"
  | "azureContainer"
  | "azureConnectionString";

type StorageField = {
  id: StorageFieldId;
  label: string;
  type: "text" | "password" | "select";
  placeholder?: string;
  icon: LucideIcon;
  options?: StorageFieldOption[];
  helper?: string;
};

type ProviderConfig = {
  title: string;
  description: string;
  icon: LucideIcon;
  fields: StorageField[];
  noteTitle: string;
  noteDescription: string;
};

type StorageFormState = {
  driver: StorageProviderId;
  localDir: string;
  publicBaseUrl: string;
  maxSizeBytes: string;
  allowedMime: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Bucket: string;
  s3Region: string;
  s3Endpoint: string;
  azureAccount: string;
  azureKey: string;
  azureContainer: string;
  azureConnectionString: string;
};

type SecretFlags = {
  s3AccessKey: boolean;
  s3SecretKey: boolean;
  azureKey: boolean;
  azureConnectionString: boolean;
};

const providerOptions: StorageProviderDefinition[] = [
  {
    id: "local",
    title: "Local Storage",
    description: "Store files directly on your server.",
    icon: HardDrive,
    badge: "Self-hosted",
  },
  {
    id: "s3",
    title: "Amazon S3",
    description: "AWS scalable object storage.",
    icon: UploadCloud,
    badge: "Recommended",
  },
  {
    id: "azure",
    title: "Azure Blob",
    description: "Microsoft Azure cloud storage.",
    icon: Database,
    badge: "Enterprise",
  },
];

const providerConfigs: Record<StorageProviderId, ProviderConfig> = {
  local: {
    title: "Local Storage Configuration",
    description: "Keep uploads on the same server as your CMS.",
    icon: HardDrive,
    fields: [
      {
        id: "localDir",
        label: "Storage Root",
        type: "text",
        placeholder: "/var/www/nextless/uploads",
        icon: HardDrive,
      },
    ],
    noteTitle: "Filesystem permissions",
    noteDescription:
      "Ensure the uploads directory is writable by the server process.",
  },
  s3: {
    title: "Amazon S3 Configuration",
    description: "Manage bucket credentials, region, and endpoint settings.",
    icon: UploadCloud,
    fields: [
      {
        id: "s3AccessKey",
        label: "Access Key",
        type: "text",
        placeholder: "AKIAIOSFODNN7EXAMPLE",
        icon: KeyRound,
      },
      {
        id: "s3SecretKey",
        label: "Secret Key",
        type: "password",
        placeholder: "••••••••",
        icon: Lock,
      },
      {
        id: "s3Bucket",
        label: "Bucket Name",
        type: "text",
        placeholder: "nextless-assets",
        icon: Database,
      },
      {
        id: "s3Region",
        label: "Region",
        type: "select",
        icon: Globe2,
        options: [
          { value: "us-east-1", label: "us-east-1 (N. Virginia)" },
          { value: "us-west-2", label: "us-west-2 (Oregon)" },
          { value: "eu-central-1", label: "eu-central-1 (Frankfurt)" },
          { value: "ap-southeast-1", label: "ap-southeast-1 (Singapore)" },
        ],
      },
      {
        id: "s3Endpoint",
        label: "Custom Endpoint",
        type: "text",
        placeholder: "https://s3.amazonaws.com",
        icon: Link2,
      },
    ],
    noteTitle: "IAM permissions",
    noteDescription:
      "Grant s3:PutObject, s3:GetObject, and s3:DeleteObject for this bucket.",
  },
  azure: {
    title: "Azure Blob Configuration",
    description: "Configure your storage account and container settings.",
    icon: Database,
    fields: [
      {
        id: "azureAccount",
        label: "Account Name",
        type: "text",
        placeholder: "nextlessstorage",
        icon: Database,
      },
      {
        id: "azureKey",
        label: "Account Key",
        type: "password",
        placeholder: "••••••••",
        icon: Lock,
      },
      {
        id: "azureContainer",
        label: "Container Name",
        type: "text",
        placeholder: "media-assets",
        icon: Database,
      },
      {
        id: "azureConnectionString",
        label: "Connection String",
        type: "password",
        placeholder: "••••••••",
        icon: Link2,
      },
    ],
    noteTitle: "Access policy",
    noteDescription:
      "Use a private container and enable shared access signatures for secure delivery.",
  },
};

const globalFields: StorageField[] = [
  {
    id: "publicBaseUrl",
    label: "Storage File URL (Override)",
    type: "text",
    placeholder: "https://cdn.example.com",
    icon: Link2,
    helper:
      "Leave blank to auto-generate (S3/Azure endpoint or your public site URL + /media).",
  },
  {
    id: "maxSizeBytes",
    label: "Max Upload Size (bytes)",
    type: "text",
    placeholder: "10485760",
    icon: ShieldCheck,
  },
  {
    id: "allowedMime",
    label: "Allowed MIME Types",
    type: "text",
    placeholder: "image/*,application/pdf",
    icon: ShieldCheck,
  },
];

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const emptyFormState: StorageFormState = {
  driver: "local",
  localDir: "",
  publicBaseUrl: "",
  maxSizeBytes: "",
  allowedMime: "",
  s3AccessKey: "",
  s3SecretKey: "",
  s3Bucket: "",
  s3Region: "",
  s3Endpoint: "",
  azureAccount: "",
  azureKey: "",
  azureContainer: "",
  azureConnectionString: "",
};

const emptySecrets: SecretFlags = {
  s3AccessKey: false,
  s3SecretKey: false,
  azureKey: false,
  azureConnectionString: false,
};

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeSecret = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

const normalizeNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error("max_size_invalid");
  }
  return parsed;
};

export function StorageSettingsPage() {
  const [activeProvider, setActiveProvider] =
    useState<StorageProviderId>("local");
  const [form, setForm] = useState<StorageFormState>(emptyFormState);
  const [secrets, setSecrets] = useState<SecretFlags>(emptySecrets);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { enabled: autoSaveEnabled, setEnabled: setAutoSaveEnabled } =
    useSettingsAutoSave();

  const activeConfig = providerConfigs[activeProvider];
  const ActiveIcon = activeConfig.icon;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    getStorageSettings()
      .then((result) => {
        if (!active) return;
        const driver = result.driver as StorageProviderId;
        setActiveProvider(driver);
        setForm({
          driver,
          localDir: result.local.dir ?? "",
          publicBaseUrl: result.publicBaseUrl ?? "",
          maxSizeBytes: result.maxSizeBytes ? String(result.maxSizeBytes) : "",
          allowedMime: result.allowedMime ?? "",
          s3AccessKey: "",
          s3SecretKey: "",
          s3Bucket: result.s3.bucket ?? "",
          s3Region: result.s3.region ?? "",
          s3Endpoint: result.s3.endpoint ?? "",
          azureAccount: result.azure.account ?? "",
          azureKey: "",
          azureContainer: result.azure.container ?? "",
          azureConnectionString: "",
        });
        setSecrets({
          s3AccessKey: result.s3.accessKey.configured,
          s3SecretKey: result.s3.secretKey.configured,
          azureKey: result.azure.key.configured,
          azureConnectionString: result.azure.connectionString.configured,
        });
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load storage settings.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleFieldChange = (field: StorageFieldId, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const busy = isLoading || isSaving;
  const maxSizeInvalid = (() => {
    const trimmed = form.maxSizeBytes.trim();
    if (!trimmed) return false;
    const parsed = Number(trimmed);
    return !Number.isFinite(parsed);
  })();
  const hasValidationErrors = maxSizeInvalid;

  const autoSaveValue = useMemo(
    () => ({
      ...form,
      activeProvider,
    }),
    [activeProvider, form]
  );

  const handleSave = useCallback(async () => {
    if (busy) return false;
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const payload = {
        driver: activeProvider as StorageDriver,
        local: { dir: normalizeOptional(form.localDir) },
        publicBaseUrl: normalizeOptional(form.publicBaseUrl),
        maxSizeBytes: normalizeNumber(form.maxSizeBytes),
        allowedMime: normalizeOptional(form.allowedMime),
        s3: {
          bucket: normalizeOptional(form.s3Bucket),
          region: normalizeOptional(form.s3Region),
          endpoint: normalizeOptional(form.s3Endpoint),
          accessKey: normalizeSecret(form.s3AccessKey),
          secretKey: normalizeSecret(form.s3SecretKey),
        },
        azure: {
          container: normalizeOptional(form.azureContainer),
          account: normalizeOptional(form.azureAccount),
          key: normalizeSecret(form.azureKey),
          connectionString: normalizeSecret(form.azureConnectionString),
        },
      };

      const updated = await updateStorageSettings(payload);
      setForm((prev) => ({
        ...prev,
        driver: updated.driver,
        localDir: updated.local.dir ?? "",
        publicBaseUrl: updated.publicBaseUrl ?? "",
        maxSizeBytes: updated.maxSizeBytes ? String(updated.maxSizeBytes) : "",
        allowedMime: updated.allowedMime ?? "",
        s3AccessKey: "",
        s3SecretKey: "",
        s3Bucket: updated.s3.bucket ?? "",
        s3Region: updated.s3.region ?? "",
        s3Endpoint: updated.s3.endpoint ?? "",
        azureAccount: updated.azure.account ?? "",
        azureKey: "",
        azureContainer: updated.azure.container ?? "",
        azureConnectionString: "",
      }));
      setSecrets({
        s3AccessKey: updated.s3.accessKey.configured,
        s3SecretKey: updated.s3.secretKey.configured,
        azureKey: updated.azure.key.configured,
        azureConnectionString: updated.azure.connectionString.configured,
      });
      setSuccess("Storage settings updated.");
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === "max_size_invalid") {
        setError("Max upload size must be a number.");
      } else if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update storage settings.");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeProvider, busy, form]);

  useAutoSaveEffect({
    enabled: autoSaveEnabled,
    isReady: !busy,
    hasErrors: hasValidationErrors,
    value: autoSaveValue,
    onSave: handleSave,
  });

  const fieldValues = useMemo(() => form, [form]);

  const renderField = (field: StorageField) => {
    const value = fieldValues[field.id] ?? "";
    const showSecretHint =
      (field.id === "s3AccessKey" && secrets.s3AccessKey) ||
      (field.id === "s3SecretKey" && secrets.s3SecretKey) ||
      (field.id === "azureKey" && secrets.azureKey) ||
      (field.id === "azureConnectionString" && secrets.azureConnectionString);

    if (field.type === "select" && field.options) {
      return (
        <Select
          value={value}
          onValueChange={(next) => handleFieldChange(field.id, next)}
        >
          <SelectTrigger className="bg-muted/40">
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <div className="space-y-2">
        <Input
          type={field.type === "password" ? "password" : "text"}
          value={value}
          placeholder={showSecretHint ? "••••••••" : field.placeholder}
          onChange={(event) => handleFieldChange(field.id, event.target.value)}
          className="bg-muted/30"
        />
        {field.helper ? (
          <p className="text-xs text-muted-foreground">{field.helper}</p>
        ) : null}
      </div>
    );
  };

  return (
    <SettingsShell
      activeHref="/admin/settings"
      showSearch={false}
      sidebar={<SettingsSidebar activeId="storage" />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground">Storage</span>
        </div>
      }
    >
      <div className="flex min-h-full flex-col">
        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 pb-28">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-primary/20 text-primary">
                  Storage Settings
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Configure where assets are stored and delivered.
                </span>
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Storage settings error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {success ? (
              <Alert>
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              {providerOptions.map((provider) => (
                <StorageProviderCard
                  key={provider.id}
                  id={provider.id}
                  title={provider.title}
                  description={provider.description}
                  icon={provider.icon}
                  badge={provider.badge}
                  isActive={provider.id === activeProvider}
                  onSelect={(id) => {
                    setActiveProvider(id);
                    setForm((prev) => ({ ...prev, driver: id }));
                  }}
                />
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ActiveIcon className="h-5 w-5 text-primary" />
                          {activeConfig.title}
                        </CardTitle>
                        <CardDescription>{activeConfig.description}</CardDescription>
                      </div>
                      <CardAction>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={isLoading}
                        >
                          <Wifi className="h-4 w-4" />
                          Test Connection
                        </Button>
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {activeConfig.fields.map((field) => {
                      const FieldIcon = field.icon;
                      return (
                        <div key={field.id} className="space-y-2">
                          <label className={labelClassName}>{field.label}</label>
                          <div className="relative">
                            <FieldIcon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <div className="pl-7">
                              {renderField(field)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <Separator />
                    <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <Info className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">
                            {activeConfig.noteTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activeConfig.noteDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Upload Policies
                    </CardTitle>
                    <CardDescription>
                      Defaults used for all uploads across the CMS.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {globalFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className={labelClassName}>{field.label}</label>
                        <div className="relative">
                          <field.icon className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <div className="pl-7">
                            {renderField(field)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
                      Changing the storage driver does not migrate existing files.
                      New uploads will use the selected provider immediately.
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-border/60 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Security Summary
                    </CardTitle>
                    <CardDescription>
                      Secrets are encrypted at rest. Update fields to rotate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>S3 Access Key</span>
                      <Badge variant={secrets.s3AccessKey ? "default" : "secondary"}>
                        {secrets.s3AccessKey ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>S3 Secret Key</span>
                      <Badge variant={secrets.s3SecretKey ? "default" : "secondary"}>
                        {secrets.s3SecretKey ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Azure Account Key</span>
                      <Badge variant={secrets.azureKey ? "default" : "secondary"}>
                        {secrets.azureKey ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Azure Connection String</span>
                      <Badge
                        variant={
                          secrets.azureConnectionString ? "default" : "secondary"
                        }
                      >
                        {secrets.azureConnectionString ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 z-10 border-t bg-background/90 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={autoSaveEnabled}
                onCheckedChange={(checked) => setAutoSaveEnabled(Boolean(checked))}
                disabled={busy}
              />
              <span>Auto-save settings across all screens</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="gap-2"
                onClick={handleSave}
                disabled={busy || hasValidationErrors}
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
