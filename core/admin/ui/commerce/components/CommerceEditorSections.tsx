import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { CommerceProductDraft } from "../commerceEditorModel";

type CommerceEditorSectionsProps = {
  draft: CommerceProductDraft;
  onChange: (patch: Partial<CommerceProductDraft>) => void;
};

export function CommerceEditorSections({
  draft,
  onChange,
}: CommerceEditorSectionsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <label htmlFor="commerce-status" className="text-sm font-medium">
              Status
            </label>
            <Select
              value={draft.status}
              onValueChange={(value) =>
                onChange({ status: value as CommerceProductDraft["status"] })
              }
            >
              <SelectTrigger id="commerce-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
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
              onChange={(event) =>
                onChange({ pricingCompareAtAmount: event.target.value })
              }
              inputMode="numeric"
              placeholder="470000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
              <SelectTrigger id="commerce-stock-state">
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
        </CardContent>
      </Card>
    </div>
  );
}
