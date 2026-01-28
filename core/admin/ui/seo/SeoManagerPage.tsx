import { useMemo, useState } from "react";
import { Filter, Search, SearchCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { SeoDrawer } from "./SeoDrawer";
import { SeoTable, type SeoItem } from "./SeoTable";

const seoItems: SeoItem[] = [
  {
    id: "seo-home",
    title: "Homepage",
    path: "/",
    score: 92,
    metaStatus: "optimized",
    socialStatus: "ready",
    metaTitle: "Modern CMS for Next.js Developers | Nextless",
    metaDescription:
      "Build faster with Nextless CMS. A modern, headless content management system optimized for speed, SEO, and developer experience. Start for free today.",
    keywords: ["Headless CMS", "Next.js"],
    previewUrl: "https://nextless.com",
    previewPath: "homepage",
    analysisStatus: "passed",
    analysisNotes: [
      "Keyword found in Title and Meta Description",
      "Optimal length for both Title and Description",
      "Fast loading time detected for this page",
    ],
  },
  {
    id: "seo-services",
    title: "Services Page",
    path: "/services/overview",
    score: 65,
    metaStatus: "short",
    socialStatus: "missing",
    metaTitle: "Services & Solutions | Nextless",
    metaDescription:
      "Explore our modular services designed to accelerate content delivery.",
    keywords: ["Content workflow", "SEO tools"],
    previewUrl: "https://nextless.com",
    previewPath: "services",
    analysisStatus: "attention",
    analysisNotes: [
      "Meta description is shorter than recommended length",
      "Add social preview images for better sharing",
      "Consider adding keyword variation in the title",
    ],
  },
  {
    id: "seo-contact",
    title: "Contact Us",
    path: "/contact",
    score: 32,
    metaStatus: "missing",
    socialStatus: "missing",
    metaTitle: "Get in touch | Nextless",
    metaDescription: "",
    keywords: ["Support", "Contact"],
    previewUrl: "https://nextless.com",
    previewPath: "contact",
    analysisStatus: "attention",
    analysisNotes: [
      "Meta description is missing",
      "Add focus keywords to improve relevance",
      "Social preview assets are not configured",
    ],
  },
];

type SeoFilter = "all" | "optimized" | "needs-work" | "critical";

const filterOptions: Array<{ value: SeoFilter; label: string }> = [
  { value: "all", label: "All pages" },
  { value: "optimized", label: "Optimized" },
  { value: "needs-work", label: "Needs work" },
  { value: "critical", label: "Critical" },
];

function getHealth(item: SeoItem): Exclude<SeoFilter, "all"> {
  if (item.score >= 80) return "optimized";
  if (item.score >= 50) return "needs-work";
  return "critical";
}

export function SeoManagerPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SeoFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    seoItems[0]?.id ?? null
  );

  const filteredItems = useMemo(() => {
    return seoItems.filter((item) => {
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.path.toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || getHealth(item) === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter]);

  const selectedItem = seoItems.find((item) => item.id === selectedId) ?? null;

  return (
    <AdminShell
      activeHref="/admin/seo"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground">SEO Manager</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                SEO Manager
              </h1>
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold uppercase tracking-wide"
              >
                Global Scan: 88%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor page metadata, SEO scores, and quick fixes in one place.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages..."
                className="pl-9"
              />
            </div>
            <Button className="gap-2">
              <SearchCheck className="h-4 w-4" />
              Run Full Audit
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {filteredItems.length} pages
            </Badge>
            <span>Last scan: Jan 27, 2026</span>
          </div>
        </div>

        <SeoTable
          items={filteredItems}
          activeId={selectedId}
          onEdit={setSelectedId}
        />
      </div>

      <SeoDrawer
        key={selectedId ?? "empty"}
        item={selectedItem}
        open={Boolean(selectedItem)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedId(null);
        }}
      />
    </AdminShell>
  );
}
