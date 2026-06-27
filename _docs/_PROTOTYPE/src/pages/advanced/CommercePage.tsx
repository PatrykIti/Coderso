import { CreditCard, DollarSign, Plus, ShoppingBag, ShoppingCart } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { DataTable, type Column } from "@/components/patterns/DataTable";
import { Pagination } from "@/components/patterns/Pagination";
import { StatusBadge } from "@/components/patterns/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { spark } from "@/lib/mock";

type Stock = "in" | "low" | "out";

type Product = {
  name: string;
  sku: string;
  price: string;
  stock: Stock;
  status: string;
  sales: string;
};

const PRODUCTS: Product[] = [
  { name: "Aurora Desk Lamp", sku: "LAMP-AUR-01", price: "$49.00", stock: "in", status: "published", sales: "1,284" },
  { name: "Linen Throw Blanket", sku: "HOME-LIN-22", price: "$79.00", stock: "low", status: "published", sales: "942" },
  { name: "Ceramic Pour-Over Set", sku: "KIT-CER-08", price: "$64.00", stock: "in", status: "published", sales: "771" },
  { name: "Walnut Wall Clock", sku: "DEC-WAL-14", price: "$120.00", stock: "out", status: "draft", sales: "0" },
  { name: "Matte Travel Mug", sku: "DRK-MUG-03", price: "$24.00", stock: "in", status: "published", sales: "2,109" },
  { name: "Field Notebook Trio", sku: "STA-NTB-09", price: "$18.00", stock: "low", status: "scheduled", sales: "604" },
  { name: "Brushed Steel Kettle", sku: "KIT-KET-11", price: "$95.00", stock: "in", status: "published", sales: "488" },
  { name: "Organic Cotton Tote", sku: "BAG-TOT-05", price: "$32.00", stock: "out", status: "draft", sales: "0" },
];

const STOCK_BADGE: Record<Stock, { variant: "success" | "warning" | "destructive"; label: string }> = {
  in: { variant: "success", label: "In stock" },
  low: { variant: "warning", label: "Low stock" },
  out: { variant: "destructive", label: "Out of stock" },
};

const columns: Column<Product>[] = [
  {
    key: "name",
    header: "Product",
    render: (row) => (
      <Link to="/advanced/commerce/sample" className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <ShoppingBag className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.name}</span>
          <span className="block truncate font-mono text-xs text-muted-foreground">{row.sku}</span>
        </span>
      </Link>
    ),
  },
  {
    key: "price",
    header: "Price",
    align: "right",
    render: (row) => <span className="text-sm font-medium tabular-nums">{row.price}</span>,
  },
  {
    key: "stock",
    header: "Stock",
    render: (row) => <Badge variant={STOCK_BADGE[row.stock].variant}>{STOCK_BADGE[row.stock].label}</Badge>,
  },
  { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
  {
    key: "sales",
    header: "Sales",
    align: "right",
    render: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.sales}</span>,
  },
];

export function CommercePage() {
  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalog, pricing, and inventory."
        icon={<ShoppingBag />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Button className="gap-1.5">
              <Plus className="size-4" /> Add product
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value="$84,210" delta="+14.2%" trend="up" icon={<DollarSign />} spark={spark(3)} />
        <StatCard label="Orders" value="1,932" delta="+6.8%" trend="up" icon={<ShoppingCart />} spark={spark(9)} />
        <StatCard label="Avg. order value" value="$43.58" delta="-1.4%" trend="down" icon={<CreditCard />} spark={spark(6)} />
      </div>

      <FilterBar searchPlaceholder="Search products…" view="grid" />

      <DataTable columns={columns} rows={PRODUCTS} selectable onRowClick={() => {}} />
      <Pagination page={1} pageCount={6} total={64} pageSize={12} />
    </div>
  );
}
