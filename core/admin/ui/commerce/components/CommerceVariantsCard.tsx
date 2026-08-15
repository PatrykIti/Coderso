import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommerceStockState, CommerceVariant } from "@/services/commerceClient";
import { SectionCard } from "@/ui/shared/SectionCard";

import {
  addVariant,
  parseIntegerOrNull,
  removeVariantAt,
  removeVariantAttribute,
  renameVariantAttributeKey,
  setDefaultVariantAt,
  setVariantAttribute,
  updateVariantAt,
  type CommerceProductDraft,
} from "../commerceEditorModel";
import { AttributesEditor } from "./AttributesEditor";

type CommerceVariantsCardProps = {
  draft: CommerceProductDraft;
  onChange: (patch: Partial<CommerceProductDraft>) => void;
};

/**
 * TASK-488-01-L02: "Variants" section card rendered inside the product editor
 * (after the Inventory card). Mutates `draft.variants` ONLY through the L01
 * model helpers and reports changes through the existing `onChange` prop, so
 * the editor's dirty-state, snapshot/discard, and save round-trip work without
 * any change to `CommerceEditorPage`.
 */
export function CommerceVariantsCard({ draft, onChange }: CommerceVariantsCardProps) {
  const variants = draft.variants;
  const emit = (next: CommerceVariant[]) => onChange({ variants: next });

  return (
    <SectionCard
      title="Variants"
      description="Offer SKU-level pricing, stock, and attributes."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => emit(addVariant(variants, draft.pricingCurrency))}
        >
          <Plus className="h-4 w-4" />
          Add variant
        </Button>
      }
    >
      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No variants. The base product price/stock applies. Add a variant to offer SKU-level
          pricing, stock, and attributes.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? index}
              className="space-y-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  value={variant.title}
                  placeholder="Variant title"
                  onChange={(event) =>
                    emit(updateVariantAt(variants, index, { title: event.target.value }))
                  }
                />
                <label className="flex shrink-0 items-center gap-2 text-xs">
                  <Checkbox
                    checked={variant.isDefault}
                    aria-label={`Default variant ${index + 1}`}
                    onCheckedChange={(checked) =>
                      emit(
                        checked === true
                          ? setDefaultVariantAt(variants, index)
                          : updateVariantAt(variants, index, { isDefault: false })
                      )
                    }
                  />
                  Default
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove variant ${index + 1}`}
                  onClick={() => emit(removeVariantAt(variants, index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Input
                value={variant.sku ?? ""}
                placeholder="SKU (optional)"
                onChange={(event) =>
                  emit(updateVariantAt(variants, index, { sku: event.target.value || null }))
                }
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Amount (minor units)
                  </label>
                  <Input
                    value={String(variant.pricing.amount)}
                    inputMode="numeric"
                    placeholder="450000"
                    onChange={(event) =>
                      emit(
                        updateVariantAt(variants, index, {
                          pricing: {
                            ...variant.pricing,
                            amount: parseIntegerOrNull(event.target.value) ?? 0,
                          },
                        })
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Currency</label>
                  <Input
                    value={variant.pricing.currency}
                    placeholder="USD"
                    onChange={(event) =>
                      emit(
                        updateVariantAt(variants, index, {
                          pricing: { ...variant.pricing, currency: event.target.value },
                        })
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Compare-at amount
                  </label>
                  <Input
                    value={
                      variant.pricing.compareAtAmount == null
                        ? ""
                        : String(variant.pricing.compareAtAmount)
                    }
                    inputMode="numeric"
                    placeholder="470000"
                    onChange={(event) =>
                      emit(
                        updateVariantAt(variants, index, {
                          pricing: {
                            ...variant.pricing,
                            compareAtAmount: parseIntegerOrNull(event.target.value),
                          },
                        })
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Select
                    value={variant.stock.state}
                    onValueChange={(state) =>
                      emit(
                        updateVariantAt(variants, index, {
                          stock: { ...variant.stock, state: state as CommerceStockState },
                        })
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
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
                  <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                  <Input
                    value={variant.stock.quantity == null ? "" : String(variant.stock.quantity)}
                    inputMode="numeric"
                    placeholder="10"
                    onChange={(event) =>
                      emit(
                        updateVariantAt(variants, index, {
                          stock: {
                            ...variant.stock,
                            quantity: parseIntegerOrNull(event.target.value),
                          },
                        })
                      )
                    }
                  />
                </div>
              </div>

              <AttributesEditor
                attributes={variant.attributes}
                onSet={(key, value) => emit(setVariantAttribute(variants, index, key, value))}
                onRemove={(key) => emit(removeVariantAttribute(variants, index, key))}
                onRenameKey={(prevKey, nextKey) =>
                  emit(renameVariantAttributeKey(variants, index, prevKey, nextKey))
                }
              />
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
