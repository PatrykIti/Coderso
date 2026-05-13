import { BarChart3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const statusStyles: Record<string, string> = {
  Enabled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Disabled: "border-slate-200 bg-slate-50 text-slate-600",
};

export function PluginDetailsPage() {
  return (
    <AdminShell activeHref="/admin/store" breadcrumbs={["Store", "Plugins", "SEO Optimizer"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BarChart3 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">SEO Optimizer</h1>
                  <Badge variant="outline" className={statusStyles.Enabled}>
                    Enabled
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">v2.4.1 by Digital Labs</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
          </div>
        </div>

        <PluginDetailsTabs data={pluginDetails} />
      </div>
    </AdminShell>
  );
}
