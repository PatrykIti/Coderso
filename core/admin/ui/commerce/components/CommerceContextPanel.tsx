import type { CommerceProductRecord } from "@/services/commerceClient";
import { StatusBadge } from "@/ui/shared/StatusBadge";

import type { CommerceProductDraft } from "../commerceEditorModel";

type CommerceContextPanelProps = {
  isCreateMode: boolean;
  draft: CommerceProductDraft;
  product: CommerceProductRecord | null;
  hasUnsavedChanges: boolean;
};

const formatDateTime = (value: string | null) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export function CommerceContextPanel({
  isCreateMode,
  draft,
  product,
  hasUnsavedChanges,
}: CommerceContextPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div>
        <h2 className="font-display text-sm font-semibold">Product context</h2>
        <p className="text-xs text-muted-foreground">
          {isCreateMode
            ? "New product draft. Save to create an ID and runtime slug."
            : "Product metadata and publication lifecycle."}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-muted-foreground">Status</span>
          <StatusBadge status={draft.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-muted-foreground">Changes</span>
          <span className="text-xs text-foreground">{hasUnsavedChanges ? "Unsaved" : "Saved"}</span>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="uppercase text-muted-foreground">Product ID</span>
          <span className="truncate font-mono text-foreground">{product?.id ?? "Not created"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="uppercase text-muted-foreground">Updated</span>
          <span className="text-foreground">{formatDateTime(product?.updatedAt ?? null)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="uppercase text-muted-foreground">Published</span>
          <span className="text-foreground">{formatDateTime(product?.publishedAt ?? null)}</span>
        </div>
      </div>
    </div>
  );
}
