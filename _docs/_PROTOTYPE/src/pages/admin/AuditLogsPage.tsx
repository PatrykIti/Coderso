import { Download, ScrollText } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { Pagination } from "@/components/patterns/Pagination";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RELATIVE_TIMES, pick } from "@/lib/mock";

const CATEGORY: Record<string, BadgeProps["variant"]> = {
  Created: "success",
  Updated: "info",
  Deleted: "destructive",
  Login: "secondary",
};

type Event = {
  actor: string;
  action: string;
  target: string;
  category: keyof typeof CATEGORY;
  ip: string;
};

const EVENTS: Event[] = [
  { actor: "Maria Nowak", action: "published the page", target: "Pricing", category: "Created", ip: "84.23.11.5" },
  { actor: "Jonas Weber", action: "updated content on", target: "Home", category: "Updated", ip: "84.23.11.9" },
  { actor: "Chen Wei", action: "invited", target: "noah@coderso.dev", category: "Created", ip: "203.0.113.7" },
  { actor: "Aiko Tanaka", action: "deleted the draft", target: "Old landing", category: "Deleted", ip: "198.51.100.4" },
  { actor: "Patryk Ciechański", action: "changed settings on", target: "SMTP", category: "Updated", ip: "10.0.0.12" },
  { actor: "Liam O'Brien", action: "signed in from", target: "Warsaw, PL", category: "Login", ip: "91.198.174.2" },
  { actor: "Sofia Rossi", action: "uploaded", target: "hero-banner.png", category: "Created", ip: "172.16.4.88" },
  { actor: "Noah Andersson", action: "edited", target: "Case studies", category: "Updated", ip: "203.0.113.21" },
  { actor: "Maria Nowak", action: "removed a member", target: "guest@coderso.dev", category: "Deleted", ip: "84.23.11.5" },
  { actor: "Chen Wei", action: "signed in from", target: "Berlin, DE", category: "Login", ip: "146.70.30.1" },
];

export function AuditLogsPage() {
  return (
    <div>
      <PageHeader
        title="Audit logs"
        description="A complete, searchable history of every change made in your workspace."
        icon={<ScrollText />}
        actions={
          <Button variant="outline" className="gap-1.5">
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <FilterBar
        searchPlaceholder="Search events…"
        view="list"
        filters={
          <>
            <Select defaultValue="all" className="w-40">
              <option value="all">All categories</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="login">Login</option>
            </Select>
            <Select defaultValue="7d" className="w-36">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </Select>
          </>
        }
      />

      <SectionCard title="Activity" description="Most recent events first">
        <div className="relative">
          {EVENTS.map((event, index) => (
            <div key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
              {index < EVENTS.length - 1 ? (
                <span className="absolute bottom-1 left-[13px] top-9 w-px bg-border" aria-hidden />
              ) : null}
              <Avatar name={event.actor} size="sm" className="relative z-10" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <span className="text-sm font-medium text-foreground">{event.actor}</span>
                  <span className="text-sm text-muted-foreground">{event.action}</span>
                  <span className="text-sm font-medium text-primary">{event.target}</span>
                  <Badge variant={CATEGORY[event.category]}>{event.category}</Badge>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
                  <span className="font-mono">{event.ip}</span>
                  <span>·</span>
                  <span>{pick(RELATIVE_TIMES, index)}</span>
                </div>
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-0.5 text-xs sm:flex">
                <span className="font-mono text-muted-foreground">{event.ip}</span>
                <span className="text-muted-foreground">{pick(RELATIVE_TIMES, index)}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Pagination page={1} pageCount={12} total={142} pageSize={10} />
    </div>
  );
}
