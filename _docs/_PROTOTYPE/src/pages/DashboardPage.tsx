import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  FileText,
  Image,
  MessageSquare,
  Newspaper,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { SectionCard } from "@/components/patterns/SectionCard";
import { AreaChart, Donut } from "@/components/patterns/charts";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Link } from "@/lib/router";
import { PAGE_TITLES, PEOPLE, pick, spark } from "@/lib/mock";

const ACTIVITY = [
  { who: "Maria Nowak", action: "published", target: "Pricing", time: "2m ago", icon: FileText },
  { who: "Jonas Weber", action: "uploaded 3 images to", target: "Media", time: "26m ago", icon: Image },
  { who: "Aiko Tanaka", action: "replied to a comment on", target: "Blog", time: "1h ago", icon: MessageSquare },
  { who: "Chen Wei", action: "invited", target: "noah@coderso.dev", time: "3h ago", icon: UserPlus },
  { who: "Liam O'Brien", action: "created a draft", target: "Case studies", time: "Yesterday", icon: Newspaper },
];

const TASKS = [
  { label: "Review 4 pending comments", done: false },
  { label: "Publish the June changelog", done: false },
  { label: "Connect Google Analytics", done: true },
  { label: "Set up automated backups", done: true },
];

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Welcome back, Patryk 👋"
        description="Here’s what’s happening across your workspace today."
        actions={
          <>
            <Select defaultValue="7d" className="w-36">
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </Select>
            <Button className="gap-1.5">
              <Plus className="size-4" /> Create
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visitors" value="48,271" delta="+12.4%" trend="up" icon={<Users />} spark={spark(2)} />
        <StatCard label="Pageviews" value="129k" delta="+8.1%" trend="up" icon={<Eye />} spark={spark(7)} />
        <StatCard label="Published pages" value="86" delta="+3" trend="up" icon={<FileText />} spark={spark(11)} />
        <StatCard label="Bounce rate" value="32.8%" delta="-2.3%" trend="down" icon={<TrendingUp />} spark={spark(5)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Traffic overview"
          description="Sessions across the last 7 days"
          action={<Tabs items={[{ value: "v", label: "Visitors" }, { value: "p", label: "Pageviews" }, { value: "s", label: "Sessions" }]} />}
        >
          <AreaChart data={[42, 55, 48, 70, 64, 82, 76, 95, 88, 104, 99, 120]} />
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3 text-sm">
            <div>
              <div className="text-muted-foreground">Avg. session</div>
              <div className="font-display text-lg font-semibold">3m 12s</div>
            </div>
            <div>
              <div className="text-muted-foreground">Top source</div>
              <div className="font-display text-lg font-semibold">Organic</div>
            </div>
            <div>
              <div className="text-muted-foreground">New vs returning</div>
              <div className="font-display text-lg font-semibold">64 / 36</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Content breakdown" description="By type">
          <div className="flex flex-col items-center">
            <div className="relative">
              <Donut
                segments={[
                  { value: 48, color: "var(--primary)" },
                  { value: 26, color: "var(--info)" },
                  { value: 18, color: "var(--success)" },
                  { value: 8, color: "var(--warning)" },
                ]}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-semibold">312</span>
                <span className="text-xs text-muted-foreground">items</span>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-sm">
              {[
                { label: "Pages", value: "48%", color: "bg-primary" },
                { label: "Posts", value: "26%", color: "bg-info" },
                { label: "Media", value: "18%", color: "bg-success" },
                { label: "Forms", value: "8%", color: "bg-warning" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${row.color}`} />
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="ml-auto font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Recent activity"
          action={
            <Link to="/audit">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowUpRight className="size-4" />
              </Button>
            </Link>
          }
          bodyClassName="p-0"
          padded={false}
        >
          <div className="divide-y divide-border">
            {ACTIVITY.map((item, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={item.who} size="sm" />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{item.who}</span>{" "}
                  <span className="text-muted-foreground">{item.action}</span>{" "}
                  <span className="font-medium text-primary">{item.target}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Your tasks">
            <div className="flex flex-col gap-1">
              {TASKS.map((task) => (
                <label
                  key={task.label}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <CheckCircle2
                    className={task.done ? "size-4.5 text-success" : "size-4.5 text-muted-foreground/50"}
                  />
                  <span className={task.done ? "text-muted-foreground line-through" : ""}>
                    {task.label}
                  </span>
                </label>
              ))}
            </div>
          </SectionCard>

          <Card className="bg-primary-soft/60 p-5">
            <Badge variant="soft" className="mb-2 bg-card">
              Tip
            </Badge>
            <div className="font-display text-[15px] font-semibold">Speed up publishing</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Create reusable section templates so your team ships pages faster.
            </p>
            <Link to="/advanced/page-templates">
              <Button variant="soft" size="sm" className="mt-3 bg-card">
                Explore templates
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <SectionCard
        className="mt-4"
        title="Recently edited pages"
        action={
          <Link to="/pages">
            <Button variant="ghost" size="sm" className="gap-1">
              All pages <ArrowUpRight className="size-4" />
            </Button>
          </Link>
        }
        bodyClassName="p-0"
        padded={false}
      >
        <div className="divide-y divide-border">
          {PAGE_TITLES.slice(0, 5).map((title, index) => (
            <Link
              key={title}
              to="/pages/sample"
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{title}</div>
                <div className="truncate text-xs text-muted-foreground">/{title.toLowerCase().replace(/\s+/g, "-")}</div>
              </div>
              <StatusBadge status={pick(["published", "draft", "scheduled"], index)} />
              <span className="hidden text-xs text-muted-foreground sm:block">
                edited by {pick(PEOPLE, index + 1).name.split(" ")[0]}
              </span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
