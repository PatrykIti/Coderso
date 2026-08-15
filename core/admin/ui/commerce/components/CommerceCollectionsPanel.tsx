import { Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CommerceCollectionRecord, CommerceProductStatus } from "@/services/commerceClient";
import { SectionCard } from "@/ui/shared/SectionCard";

type CommerceCollectionsPanelProps = {
  collections: CommerceCollectionRecord[];
  selectedIds: string[];
  status: CommerceProductStatus;
  pricingAmount: string;
  pricingCompareAtAmount: string;
  pricingCurrency: string;
  publishButtonLabel: string;
  isSaving: boolean;
  onToggleCollection: (id: string, checked: boolean) => void;
  onStatusChange: (status: CommerceProductStatus) => void;
  onPublish: () => void;
  onCreateCollection: () => void;
};

const parseMinorUnits = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (minorUnits: number, currency: string) => {
  const normalizedCurrency = currency.trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: 2,
    }).format(minorUnits / 100);
  } catch {
    return `${normalizedCurrency} ${(minorUnits / 100).toFixed(2)}`;
  }
};

export function CommerceCollectionsPanel({
  collections,
  selectedIds,
  status,
  pricingAmount,
  pricingCompareAtAmount,
  pricingCurrency,
  publishButtonLabel,
  isSaving,
  onToggleCollection,
  onStatusChange,
  onPublish,
  onCreateCollection,
}: CommerceCollectionsPanelProps) {
  // Render-time price summary derivation over the EXISTING minor-units draft
  // fields. Pure display — writes no state.
  const amount = parseMinorUnits(pricingAmount) ?? 0;
  const compareAt = parseMinorUnits(pricingCompareAtAmount);
  const discountPercent =
    compareAt != null && compareAt > amount && compareAt > 0
      ? Math.round((1 - amount / compareAt) * 100)
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <SectionCard title="Status">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label htmlFor="commerce-status" className="text-sm font-medium">
              Status
            </label>
            <Select
              value={status}
              onValueChange={(value) => onStatusChange(value as CommerceProductStatus)}
            >
              <SelectTrigger id="commerce-status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full gap-2" onClick={onPublish} disabled={isSaving}>
            <Send className="h-4 w-4" />
            {publishButtonLabel}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Organization"
        description="Assign this product to one or more collections."
        bodyClassName="p-0"
      >
        <ScrollArea className="max-h-64 min-h-0">
          <div className="flex flex-col gap-2 p-4">
            {collections.length === 0 ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto justify-start px-0 text-xs"
                onClick={onCreateCollection}
              >
                Create your first collection
              </Button>
            ) : (
              collections.map((collection) => {
                const checked = selectedIds.includes(collection.id);
                return (
                  <label
                    key={collection.id}
                    className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => onToggleCollection(collection.id, value === true)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">
                        {collection.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        /{collection.slug}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Collections</span>
          <Badge variant="soft">{selectedIds.length} selected</Badge>
        </div>
      </SectionCard>

      <SectionCard title="Price summary">
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Price</dt>
            <dd className="tabular-nums">{formatMoney(amount, pricingCurrency)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Compare-at</dt>
            <dd className="tabular-nums text-muted-foreground line-through">
              {compareAt != null ? formatMoney(compareAt, pricingCurrency) : "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="tabular-nums text-success">
              {discountPercent != null ? `-${discountPercent}%` : "—"}
            </dd>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-medium">
            <dt>Customer pays</dt>
            <dd className="tabular-nums">{formatMoney(amount, pricingCurrency)}</dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  );
}
