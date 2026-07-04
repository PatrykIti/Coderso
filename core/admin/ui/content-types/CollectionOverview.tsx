import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CollectionWorkspaceCandidate,
  ContentTypeCollectionWorkspaceSummary,
} from "@/services/contentTypesClient";
import { AdminLink } from "@/ui/shared/AdminLink";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import { buildDetailTemplateEditorHref } from "./detailTemplateEditorModel";

type CollectionOverviewProps = {
  summary: ContentTypeCollectionWorkspaceSummary;
  isCreatingDetailTemplate?: boolean;
  deletingDetailTemplateId?: string | null;
  onCreateDetailTemplate?: () => void;
  onDeleteDetailTemplate?: (candidate: CollectionWorkspaceCandidate) => void;
};

type ResourceItem = {
  key: keyof ContentTypeCollectionWorkspaceSummary["canonical"];
  label: string;
  value: CollectionWorkspaceCandidate | string | null;
  href?: string | null;
  actionHref?: string | null;
  actionLabel?: string | null;
  actionIcon?: "edit" | "create" | "open";
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
  const content = (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{item.value.label}</div>
      {meta ? <div className="truncate text-xs text-muted-foreground">{meta}</div> : null}
    </div>
  );

  if (item.href) {
    return (
      <AdminLink
        href={item.href}
        prefetch
        className="block min-w-0 rounded-md outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </AdminLink>
    );
  }

  return content;
};

export function CollectionOverview({
  summary,
  isCreatingDetailTemplate = false,
  deletingDetailTemplateId = null,
  onCreateDetailTemplate,
  onDeleteDetailTemplate,
}: CollectionOverviewProps) {
  const listingQueryCreateHref = `/advanced/listings/new?contentTypeId=${encodeURIComponent(
    summary.contentType.id
  )}`;
  const resourceItems: ResourceItem[] = [
    {
      key: "contentRoute",
      label: "Route",
      value: summary.canonical.contentRoute?.listPath ?? null,
      actionHref: "/settings/site",
      actionLabel: "Open settings",
      actionIcon: "open",
    },
    {
      key: "detailPage",
      label: "Detail page",
      value: summary.canonical.detailPage,
      href: summary.canonical.detailPage
        ? buildDetailTemplateEditorHref(summary.contentType.id, summary.canonical.detailPage.id)
        : null,
    },
    {
      key: "listPage",
      label: "List page",
      value: summary.canonical.listPage,
      href: summary.canonical.listPage
        ? `/pages/${encodeURIComponent(summary.canonical.listPage.id)}`
        : null,
      actionHref: summary.canonical.listPage
        ? `/pages/${encodeURIComponent(summary.canonical.listPage.id)}`
        : "/pages",
      actionLabel: summary.canonical.listPage ? "Edit page" : "Open Pages",
      actionIcon: summary.canonical.listPage ? "edit" : "open",
    },
    {
      key: "listingQuery",
      label: "Listing query",
      value: summary.canonical.listingQuery,
      href: summary.canonical.listingQuery
        ? `/advanced/listings/${encodeURIComponent(summary.canonical.listingQuery.id)}`
        : null,
      actionHref: summary.canonical.listingQuery
        ? `/advanced/listings/${encodeURIComponent(summary.canonical.listingQuery.id)}`
        : listingQueryCreateHref,
      actionLabel: summary.canonical.listingQuery ? "Edit query" : "Create query",
      actionIcon: summary.canonical.listingQuery ? "edit" : "create",
    },
    {
      key: "listingTemplate",
      label: "Listing template",
      value: summary.canonical.listingTemplate,
      href: "/advanced/listings?tab=templates",
      actionHref: "/advanced/listings?tab=templates",
      actionLabel: "Open templates",
      actionIcon: "open",
    },
    {
      key: "adminScreen",
      label: "Admin screen",
      value: summary.canonical.adminScreen,
      href: summary.canonical.adminScreen
        ? `/advanced/custom-screens/${encodeURIComponent(summary.canonical.adminScreen.id)}`
        : null,
      actionHref: summary.canonical.adminScreen
        ? `/advanced/custom-screens/${encodeURIComponent(summary.canonical.adminScreen.id)}`
        : "/advanced/custom-screens",
      actionLabel: summary.canonical.adminScreen ? "Edit screen" : "Open Screens",
      actionIcon: summary.canonical.adminScreen ? "edit" : "open",
    },
  ];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-semibold">
              {summary.contentType.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>/{summary.contentType.slug}</span>
              <span>{summary.contentType.fieldCount} fields</span>
              {formatUpdatedAt(summary.contentType.updatedAt) ? (
                <span>{formatUpdatedAt(summary.contentType.updatedAt)}</span>
              ) : null}
            </div>
          </div>
          <StatusBadge status={summary.contentType.status} />
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="text-sm font-medium">Linked resources</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="font-display text-2xl font-semibold">
              {summary.linkedSecondary.pages.length}
            </div>
            <div className="text-xs text-muted-foreground">Pages</div>
          </div>
          <div>
            <div className="font-display text-2xl font-semibold">
              {summary.linkedSecondary.adminScreens.length}
            </div>
            <div className="text-xs text-muted-foreground">Screens</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold">Canonical resources</h2>
          <Badge variant={summary.unresolved.length === 0 ? "success" : "outline"}>
            {summary.unresolved.length === 0 ? "Ready" : `${summary.unresolved.length} open`}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {resourceItems.map((item) => {
            const detailPage =
              item.key === "detailPage" && item.value && typeof item.value !== "string"
                ? item.value
                : null;
            const isDeletingDetailTemplate =
              Boolean(detailPage) && deletingDetailTemplateId === detailPage?.id;

            return (
              <div key={item.key} className="min-w-0 rounded-xl border bg-background p-4">
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                  {item.label}
                </div>
                {renderResourceValue(item)}
                {item.key === "detailPage" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.href ? (
                      <Button asChild variant="outline" size="sm">
                        <AdminLink href={item.href} prefetch>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </AdminLink>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="gap-2"
                        disabled={!onCreateDetailTemplate || isCreatingDetailTemplate}
                        onClick={onCreateDetailTemplate}
                      >
                        <Plus className="h-4 w-4" />
                        {isCreatingDetailTemplate ? "Creating..." : "Create detail template"}
                      </Button>
                    )}
                    {detailPage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={!onDeleteDetailTemplate || isDeletingDetailTemplate}
                        onClick={() => onDeleteDetailTemplate?.(detailPage)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {isDeletingDetailTemplate ? "Deleting..." : "Delete"}
                      </Button>
                    ) : null}
                  </div>
                ) : item.actionHref && item.actionLabel ? (
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <AdminLink href={item.actionHref} prefetch>
                        {item.actionIcon === "create" ? (
                          <Plus className="h-4 w-4" />
                        ) : item.actionIcon === "open" ? (
                          <ExternalLink className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                        {item.actionLabel}
                      </AdminLink>
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
