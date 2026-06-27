import {
  AlignLeft,
  Columns3,
  Eye,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Rocket,
  Square,
  Type,
} from "lucide-react";
import { type ReactNode } from "react";

import { BlockChip, CanvasEditor } from "@/components/patterns/CanvasEditor";
import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link, usePath } from "@/lib/router";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const NAMES: Record<string, string> = {
  "site-footer": "Site footer",
  "main-menu": "Main menu",
  "site-header": "Header",
  "blog-sidebar": "Blog sidebar",
  new: "New template",
};

const titleCase = (s: string) =>
  s
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ") || "New template";

const SWATCHES = ["#ffffff", "#f1ecfe", "#7c3aed", "#18171a"];
const MENU_LINKS = ["Home", "Pricing", "About", "Blog", "Contact"];
const FOOTER_COLS = ["Product", "Company", "Resources", "Legal"];

export function PageTemplateEditorPreview() {
  const id = usePath().split("/").filter(Boolean).pop() || "new";
  const name = NAMES[id] ?? titleCase(id);
  const isMenu = id.includes("menu");
  const isSiteWide =
    ["site-footer", "main-menu", "site-header", "new"].includes(id) ||
    id.includes("footer") ||
    id.includes("header") ||
    id.includes("menu");
  const usedOn = isSiteWide ? 24 : 8;

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Templates", to: "/advanced/page-templates" },
          { label: name },
        ]}
        title={name}
        description="Reusable template — changes apply everywhere it's used."
        actions={
          <>
            <Badge variant={isSiteWide ? "success" : "outline"}>
              {isSiteWide ? "Site-wide" : "Page"}
            </Badge>
            <Button variant="outline" className="gap-1.5">
              <Eye className="size-4" /> Preview
            </Button>
            <Button variant="ghost">Save draft</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <Card className="mb-4 flex items-center gap-3 bg-primary-soft/50 p-4">
        <RefreshCw className="size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Editing this template updates {usedOn} pages that use it.
        </p>
      </Card>

      <CanvasEditor
        title="Template editor"
        badge={
          <Badge variant="soft">
            <Eye /> Preview only
          </Badge>
        }
        toolbar={<Badge variant="outline">{name} · draft</Badge>}
        panelTitle={isMenu ? "Menu" : "Footer columns"}
        panelPosition="right"
        canvas={
          <div className="mx-auto max-w-2xl space-y-4">
            {/* Selected template block */}
            <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-soft">
              {isMenu ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="size-9 shrink-0 rounded-xl bg-primary-soft" />
                    <div className="flex flex-1 items-center justify-center gap-1.5">
                      {MENU_LINKS.map((label) => (
                        <span
                          key={label}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <Button size="sm">Get started</Button>
                  </div>
                  <p className="mt-5 text-center text-xs text-muted-foreground">
                    Appears at the top of every page
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    {FOOTER_COLS.map((heading) => (
                      <div key={heading} className="space-y-2.5">
                        <div className="h-2.5 w-2/3 rounded bg-muted-foreground/30" />
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-2 w-full rounded bg-muted-foreground/10"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <Separator className="my-6" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">© Acme Studio</span>
                    <div className="flex items-center gap-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="size-7 rounded-lg bg-muted" />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Add block — outside the selected block */}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
              <Square className="size-4" /> Add block
            </button>
          </div>
        }
        panel={
          <div className="flex flex-col gap-3 p-3">
            {isMenu ? (
              <>
                <Field label="Links">
                  <div className="flex flex-col gap-1.5">
                    {MENU_LINKS.map((label) => (
                      <div
                        key={label}
                        className="flex h-8 items-center rounded-lg border border-input bg-card px-3 text-sm shadow-soft"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </Field>

                <Field label="Style">
                  <Select defaultValue="inline">
                    <option value="inline">Inline</option>
                    <option value="stacked">Stacked</option>
                  </Select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Columns">
                  <Select defaultValue="4">
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </Select>
                </Field>

                <Field label="Background">
                  <div className="flex items-center gap-2">
                    {SWATCHES.map((c, i) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Background ${c}`}
                        className="size-7 rounded-lg border border-border ring-primary ring-offset-2 ring-offset-popover data-[selected=true]:ring-2"
                        data-selected={i === 0}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Padding">
                  <div className="flex items-center gap-2">
                    <Input defaultValue="64" className="w-16" />
                    <span className="text-xs text-muted-foreground">px</span>
                  </div>
                </Field>
              </>
            )}

            <Separator />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Add block</span>
              <div className="grid grid-cols-3 gap-1.5">
                <BlockChip icon={<Type />} label="Heading" />
                <BlockChip icon={<AlignLeft />} label="Text" />
                <BlockChip icon={<Link2 />} label="Link" />
                <BlockChip icon={<ImageIcon />} label="Image" />
                <BlockChip icon={<Square />} label="Button" />
                <BlockChip icon={<Columns3 />} label="Columns" />
              </div>
            </div>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Templates are reusable — edit once, update everywhere.{" "}
        <Link to="/advanced/page-templates" className="text-primary hover:underline">
          Back to templates
        </Link>
      </p>
    </div>
  );
}
