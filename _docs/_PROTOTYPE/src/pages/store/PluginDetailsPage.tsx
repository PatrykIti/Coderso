import {
  BarChart3,
  Check,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  LifeBuoy,
  MessageSquare,
  Shield,
  Star,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";

const FEATURES = [
  "Real-time visitor and pageview dashboards",
  "Funnel, retention, and cohort reports",
  "Custom events with no-code tagging",
  "Goal tracking and conversion attribution",
  "Scheduled email reports for your team",
  "GDPR-friendly, cookieless tracking mode",
];

const INFO = [
  { label: "Version", value: "2.4.1" },
  { label: "Updated", value: "3 days ago" },
  { label: "Downloads", value: "12,418" },
  { label: "Category", value: "Analytics" },
  { label: "License", value: "MIT" },
];

const PERMISSIONS = [
  { icon: BarChart3, label: "Read site analytics & traffic data" },
  { icon: Globe, label: "Inject tracking script on public pages" },
  { icon: FileText, label: "Read page and post metadata" },
  { icon: Shield, label: "Store aggregated metrics securely" },
];

const SUPPORT = [
  { icon: Globe, label: "Documentation", to: "/store/plugins/sample" },
  { icon: MessageSquare, label: "Community forum", to: "/store/plugins/sample" },
  { icon: LifeBuoy, label: "Contact support", to: "/store/plugins/sample" },
];

export function PluginDetailsPage() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Plugin store", to: "/store" },
          { label: "Analytics Pro" },
        ]}
        title="Analytics Pro"
      />

      {/* Hero */}
      <Card className="mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <BarChart3 className="size-8" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold">Analytics Pro</h2>
              <Badge variant="success">Installed</Badge>
            </div>
            <div className="text-sm text-muted-foreground">by Coderso</div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-warning text-warning" />
                <span className="font-medium text-foreground">4.9</span>
                <span>(842 reviews)</span>
              </span>
              <span className="size-1 rounded-full bg-border" />
              <span>12k installs</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button className="gap-1.5">Install</Button>
          <Button variant="outline" className="gap-1.5">
            <ExternalLink className="size-4" /> Visit site
          </Button>
        </div>
      </Card>

      <div className="mb-6">
        <Tabs
          variant="underline"
          items={[
            { value: "overview", label: "Overview" },
            { value: "reviews", label: "Reviews", count: 842 },
            { value: "changelog", label: "Changelog" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <SectionCard title="About this plugin" icon={<BarChart3 />}>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Analytics Pro brings beautiful, privacy-first analytics directly into your
                Coderso admin. Understand exactly how visitors move through your site with
                real-time dashboards, funnels, and conversion tracking — no external tools
                required.
              </p>
              <p>
                Set up custom events without touching code, build cohort and retention
                reports, and schedule digests so your whole team stays in the loop. Every
                metric respects visitor privacy with a cookieless tracking mode that keeps
                you compliant by default.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="What's included" icon={<Check />}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Screenshots" icon={<ImageIcon />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground"
                >
                  <ImageIcon className="size-6" />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-6">
          <SectionCard title="Information">
            <dl className="flex flex-col divide-y divide-border text-sm">
              {INFO.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard title="Permissions">
            <ul className="flex flex-col gap-3">
              {PERMISSIONS.map((permission) => (
                <li key={permission.label} className="flex items-start gap-2.5 text-sm">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-3.5">
                    <permission.icon />
                  </span>
                  <span className="text-muted-foreground">{permission.label}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Support">
            <div className="flex flex-col gap-1">
              {SUPPORT.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&_svg]:size-4"
                >
                  <item.icon className="text-muted-foreground" />
                  <span className="flex-1">{item.label}</span>
                  <ExternalLink className="size-3.5 opacity-60" />
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
