import { LayoutGrid, List, Pencil, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";

const LISTINGS = [
  {
    name: "Latest articles",
    query: "Article where status = published, sort by date",
    type: "Article",
    layout: "Grid",
    items: 124,
    tone: "bg-primary-soft text-primary-soft-foreground",
  },
  {
    name: "Featured products",
    query: "Product where featured = true, sort by price",
    type: "Product",
    layout: "Grid",
    items: 18,
    tone: "bg-info-soft text-info",
  },
  {
    name: "Team members",
    query: "Author where active = true, sort by name",
    type: "Author",
    layout: "List",
    items: 12,
    tone: "bg-success-soft text-success",
  },
  {
    name: "Upcoming events",
    query: "Event where date >= today, sort by date",
    type: "Event",
    layout: "List",
    items: 9,
    tone: "bg-warning-soft text-warning",
  },
  {
    name: "Case studies",
    query: "Article where category = case-study, sort by date",
    type: "Article",
    layout: "Grid",
    items: 27,
    tone: "bg-primary-soft text-primary-soft-foreground",
  },
];

export function ListingsPage() {
  return (
    <div>
      <PageHeader
        title="Listings"
        description="Query your content types and render them anywhere."
        icon={<LayoutGrid />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Link to="/advanced/listings/sample">
              <Button className="gap-1.5">
                <Plus className="size-4" /> New listing
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LISTINGS.map((listing) => (
          <Card
            key={listing.name}
            className="flex h-full flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-start justify-between">
              <span className={`flex size-12 items-center justify-center rounded-xl ${listing.tone}`}>
                <LayoutGrid className="size-6" />
              </span>
              <span className="text-xs text-muted-foreground">{listing.items} items</span>
            </div>
            <div className="mt-4 font-display text-[15px] font-semibold">{listing.name}</div>
            <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">{listing.query}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="soft">{listing.type}</Badge>
              <Badge variant="outline">
                {listing.layout === "Grid" ? <LayoutGrid className="size-3" /> : <List className="size-3" />}
                {listing.layout}
              </Badge>
            </div>
            <Separator className="my-4" />
            <Link to="/advanced/listings/sample" className="mt-auto">
              <Button variant="soft" size="sm" className="w-full gap-1.5">
                <Pencil className="size-4" /> Edit
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
