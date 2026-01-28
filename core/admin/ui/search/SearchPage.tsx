import { useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminShell } from "@/ui/layouts/AdminShell";

import {
  SearchResults,
  groupResults,
  type SearchItem,
  type SearchItemType,
} from "./SearchResults";

const recentSearches = [
  "Summer Campaign 2024",
  "Pricing Page Assets",
  "User: Alex Rivera",
];

const categoryFilters = [
  { id: "marketing", label: "Marketing", checked: true },
  { id: "products", label: "Products", checked: false },
  { id: "support", label: "Support", checked: false },
  { id: "legal", label: "Legal", checked: false },
];

const sampleResults: SearchItem[] = [
  {
    id: "page-1",
    type: "page",
    title: "Marketing Strategy 2024",
    subtitle: "/corporate/marketing/strategy-2024",
  },
  {
    id: "page-2",
    type: "page",
    title: "Global Campaign Assets",
    subtitle: "/resources/campaigns/global",
  },
  {
    id: "entry-1",
    type: "entry",
    title: "Spring Sale Announcement",
    meta: "Blog Post",
    subtitle: "Published Oct 12, 2023",
  },
  {
    id: "entry-2",
    type: "entry",
    title: "Marketing Roadmap v2",
    meta: "Internal Document",
    subtitle: "Draft",
  },
  {
    id: "media-1",
    type: "media",
    title: "campaign_hero.jpg",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "media-2",
    type: "media",
    title: "marketing_presentation.pdf",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "media-3",
    type: "media",
    title: "team_discussion.mov",
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "user-1",
    type: "user",
    title: "Marketing Specialist",
    subtitle: "marketing-team@nextless.com",
    initials: "MS",
  },
  {
    id: "user-2",
    type: "user",
    title: "Alex Rivera",
    subtitle: "alex.r@nextless.com",
    initials: "AR",
  },
];

type ContentFilter = "all" | SearchItemType;

const contentFilters: { value: ContentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "page", label: "Pages" },
  { value: "entry", label: "Entries" },
  { value: "media", label: "Media" },
  { value: "user", label: "Users" },
];

function filterGroups(groups: ReturnType<typeof groupResults>, value: ContentFilter) {
  if (value === "all") return groups;
  return groups.filter((group) => group.type === value);
}

export function SearchPage() {
  const [query, setQuery] = useState("marketing campaign");
  const groups = useMemo(() => groupResults(sampleResults), []);

  return (
    <AdminShell
      activeHref="/admin/search"
      showSearch={false}
      breadcrumbs={<span className="text-sm text-muted-foreground">Search</span>}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="gap-4 py-5">
            <div className="space-y-4 px-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Recent Searches
                </p>
                <ScrollArea className="max-h-40 pr-2">
                  <div className="space-y-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground/70" />
                        <span className="font-medium">{item}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Filters
                  </p>
                  <Button variant="ghost" size="xs">
                    Clear
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Date Range
                  </p>
                  <Select defaultValue="last-7-days">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last-7-days">Last 7 days</SelectItem>
                      <SelectItem value="last-30-days">Last 30 days</SelectItem>
                      <SelectItem value="last-12-months">Last 12 months</SelectItem>
                      <SelectItem value="all-time">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Category
                  </p>
                  <div className="space-y-2">
                    {categoryFilters.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Checkbox defaultChecked={category.checked} />
                        <span>{category.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="gap-4 py-4">
              <div className="relative px-6">
                <Search className="absolute left-10 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for pages, entries, files, or users..."
                  className="h-14 rounded-2xl bg-muted/40 pl-12 pr-20 text-base font-medium"
                />
                <Badge
                  variant="outline"
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide"
                >
                  Cmd K
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-6 text-xs text-muted-foreground">
                <span>Try:</span>
                {recentSearches.map((item) => (
                  <Button
                    key={item}
                    variant="ghost"
                    size="xs"
                    className="h-6 px-2 text-xs font-medium"
                  >
                    {item}
                  </Button>
                ))}
              </div>
            </Card>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Content Type
              </p>
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList variant="line">
                  {contentFilters.map((filter) => (
                    <TabsTrigger key={filter.value} value={filter.value}>
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {contentFilters.map((filter) => (
                  <TabsContent key={filter.value} value={filter.value}>
                    <SearchResults
                      variant="page"
                      query={query}
                      groups={filterGroups(groups, filter.value)}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
