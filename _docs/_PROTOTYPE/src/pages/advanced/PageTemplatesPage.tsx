import { Eye, Pencil, Plus, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/router";

const TEMPLATES = [
  { id: "site-footer", name: "Site footer", scope: "Site-wide", usedOn: 24, sections: 4 },
  { id: "main-menu", name: "Main menu", scope: "Site-wide", usedOn: 24, sections: 1 },
  { id: "site-header", name: "Header", scope: "Site-wide", usedOn: 24, sections: 2 },
  { id: "blog-sidebar", name: "Blog sidebar", scope: "Section", usedOn: 12, sections: 3 },
  { id: "landing", name: "Landing", scope: "Page", usedOn: 3, sections: 7 },
  { id: "pricing", name: "Pricing", scope: "Page", usedOn: 1, sections: 4 },
  { id: "blog-post", name: "Blog post", scope: "Page", usedOn: 18, sections: 6 },
  { id: "product", name: "Product", scope: "Page", usedOn: 9, sections: 8 },
];

function PageThumb() {
  return (
    <div className="mb-4 flex h-36 flex-col gap-2 rounded-xl bg-muted p-3">
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-full bg-muted-foreground/30" />
        <div className="ml-auto flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5 w-5 rounded bg-muted-foreground/20" />
          ))}
        </div>
      </div>
      <div className="h-10 rounded-md bg-muted-foreground/20" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 rounded bg-muted-foreground/15" />
        ))}
      </div>
      <div className="mt-auto h-2 w-1/2 rounded bg-muted-foreground/15" />
    </div>
  );
}

export function PageTemplatesPage() {
  return (
    <div>
      <PageHeader
        title="Templates"
        description="Reusable, configurable layouts — edit once, update everywhere they're used."
        actions={
          <Link to="/advanced/page-templates/new">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New template
            </Button>
          </Link>
        }
      />

      <Card className="mb-6 flex items-center gap-3 bg-primary-soft/50 p-4">
        <RefreshCw className="size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Change a <span className="font-medium text-foreground">site-wide</span> template (like the
          footer or main menu) once and every page using it updates automatically.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TEMPLATES.map((template) => (
          <Card key={template.id} className="flex h-full flex-col p-4">
            <PageThumb />
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[15px] font-semibold">{template.name}</div>
              <Badge variant={template.scope === "Site-wide" ? "success" : "outline"}>
                {template.scope}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Used on {template.usedOn} {template.usedOn === 1 ? "page" : "pages"} · {template.sections}{" "}
              sections
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/advanced/page-templates/${template.id}`} className="flex-1">
                <Button variant="soft" size="sm" className="w-full gap-1.5">
                  <Pencil className="size-4" /> Edit
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <Eye className="size-4" /> Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
