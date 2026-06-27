import {
  AlignLeft,
  Columns3,
  Eye,
  Image as ImageIcon,
  Play,
  Rocket,
  Square,
  Type,
} from "lucide-react";
import { type ReactNode } from "react";

import { BlockChip, CanvasEditor } from "@/components/patterns/CanvasEditor";
import { PageHeader } from "@/components/patterns/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

const SWATCHES = ["#7c3aed", "#f1ecfe", "#ffffff", "#18171a"];

export function PageEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Pages", to: "/pages" }, { label: "Home" }]}
        title="Home"
        description="Visual page builder — edit on canvas with the floating panel."
        actions={
          <>
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

      <CanvasEditor
        title="Page builder"
        badge={
          <Badge variant="soft">
            <Eye /> Preview only
          </Badge>
        }
        toolbar={<Badge variant="outline">Home · draft</Badge>}
        panelTitle="Hero section"
        panelPosition="right"
        canvas={
          <div className="mx-auto max-w-2xl space-y-4">
            {/* (1) Hero — selected */}
            <div className="rounded-2xl border-2 border-primary bg-card p-10 text-center shadow-soft">
              <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
                New · v2.0
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">
                Build beautiful sites, faster
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                A modern CMS for teams who care about content and craft.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button>Get started</Button>
                <Button variant="outline">Live demo</Button>
              </div>
            </div>

            {/* (2) Feature grid */}
            <div className="rounded-2xl border border-dashed border-border bg-card/70 p-6">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl bg-muted/60 p-4">
                    <div className="mb-2 size-8 rounded-lg bg-primary-soft" />
                    <div className="h-2.5 w-3/4 rounded bg-muted-foreground/20" />
                    <div className="mt-1.5 h-2 w-full rounded bg-muted-foreground/10" />
                    <div className="mt-1 h-2 w-5/6 rounded bg-muted-foreground/10" />
                  </div>
                ))}
              </div>
            </div>

            {/* (3) Add section */}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
              <Square className="size-4" /> Add section
            </button>
          </div>
        }
        panel={
          <div className="flex flex-col gap-3 p-3">
            <Field label="Heading">
              <Input defaultValue="Build beautiful sites" />
            </Field>

            <Field label="Alignment">
              <Select defaultValue="center">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
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
                    data-selected={i === 1}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>

            <Field label="Padding">
              <div className="flex items-center gap-2">
                <Input defaultValue="96" className="w-16" />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </Field>

            <Separator />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Add block</span>
              <div className="grid grid-cols-3 gap-1.5">
                <BlockChip icon={<Type />} label="Heading" />
                <BlockChip icon={<AlignLeft />} label="Text" />
                <BlockChip icon={<Square />} label="Button" />
                <BlockChip icon={<ImageIcon />} label="Image" />
                <BlockChip icon={<Play />} label="Video" />
                <BlockChip icon={<Columns3 />} label="Columns" />
              </div>
            </div>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        The floating panel is the only control surface · non-functional preview.{" "}
        <Link to="/pages" className="text-primary hover:underline">
          Back to pages
        </Link>
      </p>
    </div>
  );
}
