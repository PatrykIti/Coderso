import { ArrowUpRight, BookOpen, Newspaper, Plus, Search, ShoppingBag } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/router";

const MODULES = [
  { name: "Site search", icon: Search, scope: "Whole site", ranking: "Balanced relevance", presets: 4 },
  { name: "Product search", icon: ShoppingBag, scope: "Products", ranking: "Best sellers first", presets: 6 },
  { name: "Docs search", icon: BookOpen, scope: "Documentation", ranking: "Most recent", presets: 3 },
  { name: "Blog search", icon: Newspaper, scope: "Posts", ranking: "Popularity weighted", presets: 5 },
];

export function SearchModulePage() {
  return (
    <div>
      <PageHeader
        title="Search modules"
        description="Configure scoped search experiences with custom ranking presets."
        icon={<Search />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Button className="gap-1.5">
              <Plus className="size-4" /> New module
            </Button>
          </>
        }
      />

      <Card className="mb-5 p-5">
        <div className="mb-3 text-sm font-medium text-foreground">Search preview</div>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <div className="flex h-11 w-full cursor-not-allowed items-center rounded-2xl border border-border bg-muted/50 pl-10 pr-3 text-sm text-muted-foreground shadow-soft">
            Search products…
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          This is a non-interactive preview of how the module renders on the front end.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((module) => (
          <Card key={module.name} className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                <module.icon className="size-6" />
              </span>
              <Badge variant="outline">{module.scope}</Badge>
            </div>
            <div className="mt-4 font-display text-[15px] font-semibold">{module.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{module.ranking}</div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">{module.presets} presets</span>
              <Link to="/advanced/search-modules/sample">
                <Button variant="ghost" size="sm" className="gap-1">
                  Edit <ArrowUpRight className="size-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
