import { Image as ImageIcon, Plus, Rocket } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";

const TAGS = ["Audio", "Wireless", "Bestseller"];

export function CommerceEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Products", to: "/advanced/commerce" },
          { label: "Wireless headphones" },
        ]}
        title="Wireless headphones"
        description="Edit product details, media, pricing, and inventory."
        actions={
          <>
            <Badge variant="soft">Preview only</Badge>
            <Button variant="ghost">Save draft</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Details">
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-title">Title</Label>
                <Input id="product-title" defaultValue="Wireless headphones" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-desc">Description</Label>
                <Textarea
                  id="product-desc"
                  rows={5}
                  defaultValue="Over-ear wireless headphones with active noise cancellation, 40-hour battery life, and plush memory-foam earcups."
                />
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Media" description="The first image is used as the cover.">
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="relative flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground"
                >
                  {i === 0 ? (
                    <Badge variant="soft" className="absolute left-1.5 top-1.5">
                      Cover
                    </Badge>
                  ) : null}
                  {i === 3 ? <Plus className="size-6" /> : <ImageIcon className="size-6" />}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-price">Price</Label>
                <Input id="product-price" defaultValue="199.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-compare">Compare-at</Label>
                <Input id="product-compare" defaultValue="249.00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-sku">SKU</Label>
                <Input id="product-sku" className="font-mono text-sm" defaultValue="WH-200-BLK" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Inventory">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 sm:max-w-[200px]">
                <Label htmlFor="product-stock">Stock</Label>
                <Input id="product-stock" defaultValue="128" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">Track inventory</div>
                  <div className="text-sm text-muted-foreground">
                    Reduce stock as orders are placed.
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Status">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-status">Status</Label>
                <Select id="product-status" defaultValue="active">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-visibility">Visibility</Label>
                <Select id="product-visibility" defaultValue="public">
                  <option value="public">Online store</option>
                  <option value="hidden">Hidden</option>
                </Select>
              </div>
              <Button className="w-full gap-1.5">
                <Rocket className="size-4" /> Publish
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Organization">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-category">Category</Label>
                <Select id="product-category" defaultValue="audio">
                  <option value="audio">Audio</option>
                  <option value="wearables">Wearables</option>
                  <option value="accessories">Accessories</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant="outline">+ Add</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-vendor">Vendor</Label>
                <Input id="product-vendor" defaultValue="Coderso Audio" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Price summary">
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="tabular-nums">$199.00</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Compare-at</dt>
                <dd className="tabular-nums text-muted-foreground line-through">$249.00</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums text-success">-20%</dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-medium">
                <dt>Customer pays</dt>
                <dd className="tabular-nums">$199.00</dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Non-functional product editor preview.{" "}
        <Link to="/advanced/commerce" className="text-primary hover:underline">
          Back to products
        </Link>
      </p>
    </div>
  );
}
