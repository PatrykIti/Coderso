import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { PluginDetailsTabs, type PluginDetailsData } from "./PluginDetailsTabs";

const pluginDetails: PluginDetailsData = {
  description:
    "Supercharge your website's search engine visibility with the SEO Optimizer plugin. This toolkit provides real-time content analysis, automated meta tags, and XML sitemap management inside Coderso CMS.",
  features: [
    "Dynamic meta title and description templates",
    "Focus keyword analysis and density reports",
    "Social media open graph preview and editing",
    "Automatic canonical URL generation",
    "Advanced redirection manager (301, 302, 307)",
  ],
  screenshots: [
    {
      title: "Content analysis dashboard",
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    },
    {
      title: "Metadata editor",
      src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    },
  ],
  info: [
    {
      label: "Author",
      value: "Digital Labs Inc.",
      actionLabel: "View website",
    },
    {
      label: "Compatibility",
      value: "Coderso CMS 2.0+",
      note: "Fully compatible with your version",
    },
    {
      label: "Installed on",
      value: "October 24, 2023",
    },
    {
      label: "License",
      value: "MIT License",
    },
  ],
  support: {
    title: "Support",
    description:
      "Need help with this plugin? Visit the official support documentation or contact the developer.",
    cta: "Documentation",
  },
  permissions: [
    {
      scope: "content:read",
      access: "Read",
      description: "View entries, metadata, and SEO audits.",
    },
    {
      scope: "content:write",
      access: "Write",
      description: "Update meta titles, descriptions, and canonical URLs.",
    },
    {
      scope: "settings:write",
      access: "Admin",
      description: "Manage sitemap schedules and redirect rules.",
    },
    {
      scope: "media:read",
      access: "Read",
      description: "Access image metadata for OG previews.",
    },
    {
      scope: "analytics:read",
      access: "Read",
      description: "Collect performance metrics for scoring.",
    },
  ],
  changelog: [
    {
      version: "2.4.1",
      date: "Jan 20, 2026",
      type: "security",
      highlights: [
        "Patched sitemap index injection edge case.",
        "Improved validation for canonical URL overrides.",
      ],
    },
    {
      version: "2.4.0",
      date: "Jan 12, 2026",
      type: "feature",
      highlights: [
        "Added automated OG image hints for social sharing.",
        "Introduced bulk meta description suggestions.",
      ],
    },
    {
      version: "2.3.5",
      date: "Dec 22, 2025",
      type: "fix",
      highlights: [
        "Fixed keyword density calculation for short content blocks.",
        "Updated translations for the audit sidebar.",
      ],
    },
  ],
  settings: [
    {
      id: "auto-update",
      label: "Enable auto-updates",
      description: "Install signed security updates automatically.",
      enabled: true,
    },
    {
      id: "og-preview",
      label: "Generate OG previews",
      description: "Create social preview thumbnails for new posts.",
      enabled: true,
    },
    {
      id: "audit-notifications",
      label: "Audit notifications",
      description: "Send weekly SEO score summaries to admins.",
      enabled: false,
    },
  ],
};

export function PluginDetailsPage() {
  return (
    <AdminShell activeHref="/admin/store" breadcrumbs={["Store", "Plugins", "SEO Optimizer"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <Card className="gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
              <BarChart3 className="size-8" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-semibold">SEO Optimizer</h1>
                <Badge variant="success">Enabled</Badge>
              </div>
              <div className="text-sm text-muted-foreground">v2.4.1 by Digital Labs</div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-2">
              <span className="text-sm font-medium text-muted-foreground">Auto-update</span>
              <Switch defaultChecked />
            </div>
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              Uninstall
            </Button>
          </div>
        </Card>

        <PluginDetailsTabs data={pluginDetails} />
      </div>
    </AdminShell>
  );
}
