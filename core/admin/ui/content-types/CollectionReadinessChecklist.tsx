import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  CollectionWorkspaceResourceKind,
  CollectionWorkspaceUnresolved,
  ContentTypeCollectionWorkspaceSummary,
} from "@/services/contentTypesClient";

type CollectionReadinessChecklistProps = {
  summary: ContentTypeCollectionWorkspaceSummary;
};

type ReadinessItem = {
  resource: CollectionWorkspaceResourceKind;
  label: string;
  ready: boolean;
};

const resourceLabels: Record<CollectionWorkspaceResourceKind, string> = {
  contentRoute: "Content route",
  detailPage: "Detail page",
  listPage: "List page",
  listingQuery: "Listing query",
  listingTemplate: "Listing template",
  adminScreen: "Admin screen",
};

const reasonLabels: Record<CollectionWorkspaceUnresolved["reason"], string> = {
  missing_content_route: "Route missing",
  canonical_resolution_deferred: "Waiting for canonical page",
  explicit_link_missing: "Explicit link missing",
  ambiguous_candidates: "Multiple candidates",
  permission_missing: "Permission missing",
};

const buildReadinessItems = (summary: ContentTypeCollectionWorkspaceSummary): ReadinessItem[] => [
  {
    resource: "contentRoute",
    label: resourceLabels.contentRoute,
    ready: summary.canonical.contentRoute !== null,
  },
  {
    resource: "detailPage",
    label: resourceLabels.detailPage,
    ready: summary.canonical.detailPage !== null,
  },
  {
    resource: "listPage",
    label: resourceLabels.listPage,
    ready: summary.canonical.listPage !== null,
  },
  {
    resource: "listingQuery",
    label: resourceLabels.listingQuery,
    ready: summary.canonical.listingQuery !== null,
  },
  {
    resource: "listingTemplate",
    label: resourceLabels.listingTemplate,
    ready: summary.canonical.listingTemplate !== null,
  },
  {
    resource: "adminScreen",
    label: resourceLabels.adminScreen,
    ready: summary.canonical.adminScreen !== null,
  },
];

export function CollectionReadinessChecklist({ summary }: CollectionReadinessChecklistProps) {
  const unresolvedByResource = new Map(summary.unresolved.map((item) => [item.resource, item]));
  const items = buildReadinessItems(summary);
  const readyCount = items.filter((item) => item.ready).length;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Readiness</h2>
          <p className="text-sm text-muted-foreground">
            {readyCount} of {items.length} canonical resources linked
          </p>
        </div>
        <Badge variant={readyCount === items.length ? "success" : "warning"}>
          {readyCount === items.length ? "Ready" : "Needs attention"}
        </Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => {
          const unresolved = unresolvedByResource.get(item.resource);
          return (
            <div
              key={item.resource}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-background p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                {item.ready ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--admin-state-success)]" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--admin-state-warning)]" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.label}</div>
                  {unresolved ? (
                    <div className="truncate text-xs text-muted-foreground">
                      {reasonLabels[unresolved.reason]}
                    </div>
                  ) : null}
                </div>
              </div>
              <Badge variant={item.ready ? "success" : "outline"}>
                {item.ready ? "Ready" : "Open"}
              </Badge>
            </div>
          );
        })}
      </div>
    </section>
  );
}
