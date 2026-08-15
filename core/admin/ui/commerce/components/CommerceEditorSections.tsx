import { Image as ImageIcon, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/ui/shared/SectionCard";

import type { CommerceProductDraft } from "../commerceEditorModel";
import { CommerceVariantsCard } from "./CommerceVariantsCard";

type CommerceEditorSectionsProps = {
  draft: CommerceProductDraft;
  onChange: (patch: Partial<CommerceProductDraft>) => void;
};

const parseMediaIds = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export function CommerceEditorSections({ draft, onChange }: CommerceEditorSectionsProps) {
  const mediaIds = parseMediaIds(draft.mediaIdsText);
  // Derived "Track inventory" sugar over the EXISTING `stockState` field — NOT a
  // new schema flag. Off => out_of_stock, On => in_stock.
  const trackInventory = draft.stockState !== "out_of_stock";

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Details">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label htmlFor="commerce-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="commerce-title"
              value={draft.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Oak Residence"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="commerce-slug" className="text-sm font-medium">
              Slug
            </label>
            <Input
              id="commerce-slug"
              value={draft.slug}
              onChange={(event) => onChange({ slug: event.target.value })}
              placeholder="oak-residence"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="commerce-excerpt" className="text-sm font-medium">
              Excerpt
            </label>
            <Textarea
              id="commerce-excerpt"
              rows={2}
              value={draft.excerpt}
              onChange={(event) => onChange({ excerpt: event.target.value })}
              placeholder="Short summary shown in cards..."
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="commerce-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="commerce-description"
              rows={6}
              value={draft.description}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="Long product description..."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Media" description="The first image is used as the cover.">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {mediaIds.map((id, index) => (
              <div
                key={`${id}-${index}`}
                className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-muted p-2 text-muted-foreground"
              >
                {index === 0 ? (
                  <Badge variant="soft" className="absolute left-1.5 top-1.5">
                    Cover
                  </Badge>
                ) : null}
                <ImageIcon className="size-6" />
                <span className="w-full truncate text-center font-mono text-[10px]">{id}</span>
              </div>
            ))}
            <label
              htmlFor="commerce-media-ids"
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:bg-accent/40"
            >
              <Plus className="size-6" />
              <span className="text-xs">Add</span>
            </label>
          </div>
          <div className="space-y-2">
            <label htmlFor="commerce-media-ids" className="text-sm font-medium">
              Media IDs
            </label>
            <Input
              id="commerce-media-ids"
              value={draft.mediaIdsText}
              onChange={(event) => onChange({ mediaIdsText: event.target.value })}
              placeholder="uuid-1, uuid-2"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated IDs. The first ID is used as the cover image.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="commerce-pricing-amount" className="text-sm font-medium">
              Amount (minor units)
            </label>
            <Input
              id="commerce-pricing-amount"
              value={draft.pricingAmount}
              onChange={(event) => onChange({ pricingAmount: event.target.value })}
              inputMode="numeric"
              placeholder="450000"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="commerce-pricing-currency" className="text-sm font-medium">
              Currency
            </label>
            <Input
              id="commerce-pricing-currency"
              value={draft.pricingCurrency}
              onChange={(event) => onChange({ pricingCurrency: event.target.value })}
              placeholder="USD"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="commerce-pricing-compare" className="text-sm font-medium">
              Compare-at amount
            </label>
            <Input
              id="commerce-pricing-compare"
              value={draft.pricingCompareAtAmount}
              onChange={(event) => onChange({ pricingCompareAtAmount: event.target.value })}
              inputMode="numeric"
              placeholder="470000"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Inventory">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="commerce-stock-state" className="text-sm font-medium">
                State
              </label>
              <Select
                value={draft.stockState}
                onValueChange={(value) =>
                  onChange({ stockState: value as CommerceProductDraft["stockState"] })
                }
              >
                <SelectTrigger id="commerce-stock-state" className="w-full">
                  <SelectValue placeholder="Select stock state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  <SelectItem value="backorder">Backorder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="commerce-stock-quantity" className="text-sm font-medium">
                Quantity
              </label>
              <Input
                id="commerce-stock-quantity"
                value={draft.stockQuantity}
                onChange={(event) => onChange({ stockQuantity: event.target.value })}
                inputMode="numeric"
                placeholder="10"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">Track inventory</div>
              <div className="text-sm text-muted-foreground">
                Keep this product available as stock is on hand.
              </div>
            </div>
            <Switch
              aria-label="Track inventory"
              checked={trackInventory}
              onCheckedChange={(checked) =>
                onChange({ stockState: checked ? "in_stock" : "out_of_stock" })
              }
            />
          </div>
        </div>
      </SectionCard>

      <CommerceVariantsCard draft={draft} onChange={onChange} />
    </div>
  );
}
