import { ArrowUpRight, LayoutGrid } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link } from "@/lib/router";
import { routes, type RouteDef } from "@/pages/routes";

const sampleHref = (path: string) =>
  path
    .replace(":id", "sample")
    .replace(":type", "article")
    .replace(":entryId", "1")
    .replace(":detailPageId", "1");

const GROUP_ORDER = [
  "Main",
  "Advanced",
  "Editors",
  "Store",
  "Visual",
  "Tools",
  "Admin",
  "Settings",
  "Auth",
];

export function ScreensIndexPage() {
  const grouped = new Map<string, RouteDef[]>();
  for (const route of routes) {
    if (route.group === "Prototype") continue;
    const list = grouped.get(route.group) ?? [];
    list.push(route);
    grouped.set(route.group, list);
  }
  const groups = [...grouped.keys()].sort(
    (a, b) => (GROUP_ORDER.indexOf(a) + 1 || 99) - (GROUP_ORDER.indexOf(b) + 1 || 99),
  );

  return (
    <div>
      <PageHeader
        icon={<LayoutGrid />}
        title="All screens"
        description={`Click through every screen in the prototype — ${routes.length - 1} routes across the admin.`}
        actions={<Badge variant="soft">Prototype index</Badge>}
      />

      <div className="flex flex-col gap-8">
        {groups.map((group) => {
          const list = grouped.get(group)!;
          return (
            <section key={group}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h2>
                <span className="text-xs text-muted-foreground">{list.length}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((route) => (
                  <Link key={route.path} to={sampleHref(route.path)}>
                    <Card className="group h-full p-4 transition-all hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{route.title}</div>
                          <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                            {route.path}
                          </div>
                        </div>
                        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      {route.group === "Editors" ? (
                        <Badge variant="outline" className="mt-3">
                          Preview only
                        </Badge>
                      ) : null}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
