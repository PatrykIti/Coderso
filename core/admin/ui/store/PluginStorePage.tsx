import {
  BarChart3,
  Globe,
  Palette,
  Rocket,
  Shield,
  Sparkles,
} from "lucide-react";

import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { PluginCard } from "./PluginCard";
import { PluginFilters } from "./PluginFilters";
import type { PluginSummary } from "./types";

const plugins: PluginSummary[] = [
  {
    id: "seo-optimizer",
    name: "SEO Optimizer Pro",
    description:
      "Automatically generate meta tags, sitemaps, and optimize content for search engines.",
    version: "2.4.0",
    status: "verified",
    icon: <Rocket className="h-6 w-6" />,
    tags: ["seo", "automation"],
    securityScore: 96,
    lastUpdated: "Jan 20, 2026",
    downloads: "32k installs",
    changelog: [
      "v2.4.0 Added sitemap batching and faster crawl reports.",
      "v2.3.2 Updated CVE dependency scanners.",
    ],
  },
  {
    id: "analytics",
    name: "Nextless Analytics",
    description:
      "Privacy-focused analytics dashboard integrated directly into your CMS.",
    version: "3.1.2",
    status: "official",
    installed: true,
    icon: <BarChart3 className="h-6 w-6" />,
    tags: ["analytics", "first-party"],
    securityScore: 99,
    lastUpdated: "Jan 18, 2026",
    downloads: "120k installs",
    changelog: [
      "v3.1.2 Added realtime goals view.",
      "v3.1.0 Improved bot filtering logic.",
    ],
  },
  {
    id: "localizer",
    name: "Polyglot Localizer",
    description:
      "AI-powered translation for all your content types. Supports 50+ languages.",
    version: "1.0.5",
    status: "verified",
    icon: <Globe className="h-6 w-6" />,
    tags: ["i18n", "translations"],
    securityScore: 92,
    lastUpdated: "Jan 12, 2026",
    downloads: "8.7k installs",
    changelog: [
      "v1.0.5 Added glossary lock for brand terms.",
      "v1.0.3 Added Polish and Czech translation packs.",
    ],
  },
  {
    id: "security-center",
    name: "Security Center",
    description:
      "Monitor access attempts, auto-lock suspicious sessions, and track CVEs.",
    version: "2.0.1",
    status: "official",
    icon: <Shield className="h-6 w-6" />,
    tags: ["security", "monitoring"],
    securityScore: 98,
    lastUpdated: "Jan 22, 2026",
    downloads: "47k installs",
    changelog: [
      "v2.0.1 Added IP allowlist import.",
      "v2.0.0 Introduced automated session lockouts.",
    ],
  },
  {
    id: "brand-kit",
    name: "Brand Kit",
    description:
      "Sync design tokens across teams and export theme presets for clients.",
    version: "0.9.4",
    status: "community",
    icon: <Palette className="h-6 w-6" />,
    tags: ["design", "themes"],
    securityScore: 90,
    lastUpdated: "Jan 9, 2026",
    downloads: "5.2k installs",
    changelog: [
      "v0.9.4 Added token diff view.",
      "v0.9.0 New export pipeline for Figma.",
    ],
  },
  {
    id: "ai-content",
    name: "Aurora AI Writer",
    description:
      "Generate drafts, rewrite headlines, and suggest content improvements.",
    version: "1.6.0",
    status: "community",
    icon: <Sparkles className="h-6 w-6" />,
    tags: ["ai", "assistant"],
    securityScore: 88,
    lastUpdated: "Jan 14, 2026",
    downloads: "11k installs",
    changelog: [
      "v1.6.0 Added tone presets per content type.",
      "v1.5.2 Added Czech language prompts.",
    ],
  },
];

export function PluginStorePage() {
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
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Plugin Store"
          description="Discover and install official and community plugins. Every plugin is scanned for security vulnerabilities."
        />
        <PluginFilters />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
