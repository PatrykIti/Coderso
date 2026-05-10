import { Badge } from "@/components/ui/badge";
import type {
  CollectionWorkspaceCandidate,
  ContentTypeCollectionWorkspaceSummary,
} from "@/services/contentTypesClient";

type CollectionOverviewProps = {
  summary: ContentTypeCollectionWorkspaceSummary;
};

type ResourceItem = {
  key: keyof ContentTypeCollectionWorkspaceSummary["canonical"];
  label: string;
  value: CollectionWorkspaceCandidate | string | null;
};

const formatUpdatedAt = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getCandidateMeta = (candidate: CollectionWorkspaceCandidate) => {
  const items = [
    candidate.status,
    candidate.slug ? `/${candidate.slug}` : null,
    candidate.role,
    formatUpdatedAt(candidate.updatedAt),
  ].filter(Boolean);
  return items.join(" · ");
};

const renderResourceValue = (item: ResourceItem) => {
  if (!item.value) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline">Missing</Badge>
      </div>
    );
  }

  if (typeof item.value === "string") {
    return <span className="truncate text-sm font-medium">{item.value}</span>;
  }

  const meta = getCandidateMeta(item.value);
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{item.value.label}</div>
      {meta ? <div className="truncate text-xs text-muted-foreground">{meta}</div> : null}
    </div>
  );
};

export function CollectionOverview({ summary }: CollectionOverviewProps) {
  const resourceItems: ResourceItem[] = [
    {
      key: "contentRoute",
      label: "Route",
      value: summary.canonical.contentRoute?.listPath ?? null,
    },
    { key: "detailPage", label: "Detail page", value: summary.canonical.detailPage },
    { key: "listPage", label: "List page", value: summary.canonical.listPage },
    { key: "listingQuery", label: "Listing query", value: summary.canonical.listingQuery },
    {
      key: "listingTemplate",
      label: "Listing template",
      value: summary.canonical.listingTemplate,
    },
    { key: "adminScreen", label: "Admin screen", value: summary.canonical.adminScreen },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{summary.contentType.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>/{summary.contentType.slug}</span>
              <span>{summary.contentType.fieldCount} fields</span>
              {formatUpdatedAt(summary.contentType.updatedAt) ? (
                <span>{formatUpdatedAt(summary.contentType.updatedAt)}</span>
              ) : null}
            </div>
          </div>
          <Badge variant={summary.contentType.status === "published" ? "default" : "outline"}>
            {summary.contentType.status}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <div className="text-sm font-medium">Linked resources</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-2xl font-semibold">{summary.linkedSecondary.pages.length}</div>
            <div className="text-xs text-muted-foreground">Pages</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {summary.linkedSecondary.adminScreens.length}
            </div>
            <div className="text-xs text-muted-foreground">Screens</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Canonical resources</h2>
          <Badge variant={summary.unresolved.length === 0 ? "default" : "outline"}>
            {summary.unresolved.length === 0 ? "Ready" : `${summary.unresolved.length} open`}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resourceItems.map((item) => (
            <div key={item.key} className="min-w-0 rounded-lg border bg-background p-4">
              <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                {item.label}
              </div>
              {renderResourceValue(item)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
