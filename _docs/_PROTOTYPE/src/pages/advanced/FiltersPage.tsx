import { Filter, Info, Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/router";

const FACETS = ["Category", "Price range", "Brand", "Rating", "Availability"];

const FILTER_SETS = [
  { name: "Store catalog", dataset: "Products", active: true, facets: FACETS },
  { name: "Marketplace listings", dataset: "Listings", active: true, facets: ["Category", "Price range", "Seller", "Condition"] },
  { name: "Blog archive", dataset: "Posts", active: false, facets: ["Topic", "Author", "Date"] },
  { name: "Help center", dataset: "Articles", active: true, facets: ["Section", "Product", "Updated"] },
  { name: "Job board", dataset: "Openings", active: false, facets: ["Department", "Location", "Type", "Seniority"] },
  { name: "Event directory", dataset: "Events", active: true, facets: ["Category", "City", "Date", "Price range"] },
];

export function FiltersPage() {
  return (
    <div>
      <PageHeader
        title="Filters"
        description="Build faceted filter sets that bind to your listings and collections."
        icon={<Filter />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Button className="gap-1.5">
              <Plus className="size-4" /> New filter set
            </Button>
          </>
        }
      />

      <Card className="mb-5 flex items-start gap-3 bg-primary-soft/50 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-primary-soft-foreground">
          <Info className="size-4" />
        </span>
        <div className="min-w-0 text-sm">
          <div className="font-medium text-foreground">Filters bind to listings</div>
          <p className="mt-0.5 text-muted-foreground">
            Each filter set attaches to a dataset and exposes its facets on the matching listing pages,
            so visitors can narrow results without any custom code.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {FILTER_SETS.map((set) => (
          <Card key={set.name} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                  <Filter className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-display text-[15px] font-semibold">{set.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    Bound to
                    <Badge variant="outline">{set.dataset}</Badge>
                  </div>
                </div>
              </div>
              <Switch defaultChecked={set.active} />
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {set.facets.map((facet) => (
                <Badge key={facet} variant="secondary">
                  {facet}
                </Badge>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">{set.facets.length} facets</span>
              <Link to="/advanced/filters/sample">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Pencil className="size-4" /> Edit
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
