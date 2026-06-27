import { Eye, Plus } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/router";

const TEMPLATES = [
  { name: "Landing", sections: 7 },
  { name: "About", sections: 5 },
  { name: "Pricing", sections: 4 },
  { name: "Contact", sections: 3 },
  { name: "Blog post", sections: 6 },
  { name: "Product", sections: 8 },
  { name: "Portfolio", sections: 5 },
  { name: "Coming soon", sections: 2 },
];

function PageThumb() {
  return (
    <div className="mb-4 flex h-36 flex-col gap-2 rounded-xl bg-muted p-3">
      {/* nav */}
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-full bg-muted-foreground/30" />
        <div className="ml-auto flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5 w-5 rounded bg-muted-foreground/20" />
          ))}
        </div>
      </div>
      {/* hero */}
      <div className="h-10 rounded-md bg-muted-foreground/20" />
      {/* cards row */}
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-7 rounded bg-muted-foreground/15" />
        ))}
      </div>
      {/* footer */}
      <div className="mt-auto h-2 w-1/2 rounded bg-muted-foreground/15" />
    </div>
  );
}

export function PageTemplatesPage() {
  return (
    <div>
      <PageHeader
        title="Page templates"
        description="Reusable, ready-to-edit page layouts for your whole team."
        actions={
          <Button className="gap-1.5">
            <Plus className="size-4" /> New template
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TEMPLATES.map((template) => (
          <Card key={template.name} className="flex h-full flex-col p-4">
            <PageThumb />
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-[15px] font-semibold">{template.name}</div>
              <Badge variant="outline">{template.sections} sections</Badge>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to="/advanced/page-templates/sample" className="flex-1">
                <Button variant="soft" size="sm" className="w-full">
                  Use template
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
