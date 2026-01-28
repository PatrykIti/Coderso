import { useState } from "react";
import {
  Database,
  Globe2,
  HardDrive,
  Info,
  KeyRound,
  Link2,
  Lock,
  Save,
  ShieldCheck,
  UploadCloud,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { SettingsShell } from "@/ui/layouts/SettingsShell";

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

type StorageField = {
  id: string;
  label: string;
  type: "text" | "password" | "select";
  placeholder?: string;
  icon: LucideIcon;
  options?: StorageFieldOption[];
};

type ProviderConfig = {
  title: string;
  description: string;
  icon: LucideIcon;
  fields: StorageField[];
  noteTitle: string;
  noteDescription: string;
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
        id: "root-path",
        label: "Storage Root",
        type: "text",
        placeholder: "/var/www/nextless/uploads",
        icon: HardDrive,
      },
      {
        id: "public-url",
        label: "Public URL",
        type: "text",
        placeholder: "https://assets.example.com",
        icon: Link2,
      },
      {
        id: "visibility",
        label: "Default Visibility",
        type: "select",
        icon: ShieldCheck,
        options: [
          { value: "public", label: "Public" },
          { value: "private", label: "Private" },
        ],
      },
      {
        id: "retention",
        label: "Retention Policy",
        type: "select",
        icon: ShieldCheck,
        options: [
          { value: "standard", label: "Standard" },
          { value: "archival", label: "Archival" },
        ],
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
        id: "access-key",
        label: "Access Key",
        type: "text",
        placeholder: "AKIAIOSFODNN7EXAMPLE",
        icon: KeyRound,
      },
      {
        id: "secret-key",
        label: "Secret Key",
        type: "password",
        placeholder: "****************",
        icon: Lock,
      },
      {
        id: "bucket-name",
        label: "Bucket Name",
        type: "text",
        placeholder: "nextless-assets",
        icon: Database,
      },
      {
        id: "region",
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
        id: "endpoint",
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
        id: "account-name",
        label: "Account Name",
        type: "text",
        placeholder: "nextlessstorage",
        icon: Database,
      },
      {
        id: "account-key",
        label: "Account Key",
        type: "password",
        placeholder: "****************",
        icon: Lock,
      },
      {
        id: "container-name",
        label: "Container Name",
        type: "text",
        placeholder: "media-assets",
        icon: Database,
      },
      {
        id: "region",
        label: "Region",
        type: "select",
        icon: Globe2,
        options: [
          { value: "eastus", label: "East US" },
          { value: "westeurope", label: "West Europe" },
          { value: "centralus", label: "Central US" },
          { value: "southeastasia", label: "Southeast Asia" },
        ],
      },
    ],
    noteTitle: "Access policy",
    noteDescription:
      "Use a private container and enable shared access signatures for secure delivery.",
  },
};

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function StorageSettingsPage() {
  const [activeProvider, setActiveProvider] =
    useState<StorageProviderId>("s3");
  const activeMeta =
    providerOptions.find((provider) => provider.id === activeProvider) ??
    providerOptions[0];
  const activeConfig = providerConfigs[activeProvider];

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
      topbarActions={
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="gap-2 border-emerald-200 bg-emerald-50 text-emerald-600"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Active: {activeMeta.title}
          </Badge>
          <Button size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        <div className="border-b bg-background/70 px-6 py-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Storage Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure where your media assets are stored.
            </p>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-8">
            <section className="space-y-4">
              <div>
                <p className={labelClassName}>Storage Provider</p>
                <p className="text-sm text-muted-foreground">
                  Select a provider for asset uploads and delivery.
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label="Storage providers"
                className="grid gap-4 md:grid-cols-3"
              >
                {providerOptions.map((provider) => (
                  <StorageProviderCard
                    key={provider.id}
                    id={provider.id}
                    title={provider.title}
                    description={provider.description}
                    icon={provider.icon}
                    badge={provider.badge}
                    isActive={provider.id === activeProvider}
                    onSelect={setActiveProvider}
                  />
                ))}
              </div>
            </section>

            <Card className="border-muted/60">
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <activeConfig.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {activeConfig.title}
                    </CardTitle>
                    <CardDescription>{activeConfig.description}</CardDescription>
                  </div>
                </div>
                <CardAction>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Wifi className="h-4 w-4" />
                    Test Connection
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {activeConfig.fields.map((field) => {
                    const fieldId = `${activeProvider}-${field.id}`;
                    const Icon = field.icon;
                    if (field.type === "select") {
                      return (
                        <div key={field.id} className="space-y-2">
                          <label htmlFor={fieldId} className={labelClassName}>
                            {field.label}
                          </label>
                          <div className="relative">
                            <Icon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Select defaultValue={field.options?.[0]?.value}>
                              <SelectTrigger id={fieldId} className="w-full pl-9">
                                <SelectValue
                                  placeholder={`Select ${field.label.toLowerCase()}`}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.id} className="space-y-2">
                        <label htmlFor={fieldId} className={labelClassName}>
                          {field.label}
                        </label>
                        <div className="relative">
                          <Icon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={fieldId}
                            type={field.type}
                            placeholder={field.placeholder}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Separator />
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Info className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
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
          </div>
        </div>
      </div>
    </SettingsShell>
  );
}
