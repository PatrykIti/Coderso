import {
  ChevronDown,
  Eye,
  Image as ImageIcon,
  Layout,
  LayoutGrid,
  Quote,
  Rocket,
  Square,
  Type,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import {
  EditorPreviewFrame,
  EditorRailGroup,
  EditorRailItem,
} from "@/components/patterns/EditorPreviewFrame";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Link } from "@/lib/router";

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function PageEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Pages", to: "/pages" }, { label: "Home" }]}
        title="Home"
        description="Visual page builder — drag sections, edit on canvas."
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

      <EditorPreviewFrame
        title="Page builder"
        toolbar={<Badge variant="outline">Home · draft</Badge>}
        left={
          <>
            <EditorRailGroup label="Layout">
              <EditorRailItem icon={<Layout />} active>
                Hero
              </EditorRailItem>
              <EditorRailItem icon={<LayoutGrid />}>Feature grid</EditorRailItem>
              <EditorRailItem icon={<Quote />}>Testimonial</EditorRailItem>
              <EditorRailItem icon={<Rocket />}>Call to action</EditorRailItem>
            </EditorRailGroup>
            <EditorRailGroup label="Blocks">
              <EditorRailItem icon={<Type />}>Heading</EditorRailItem>
              <EditorRailItem icon={<Square />}>Button</EditorRailItem>
              <EditorRailItem icon={<ImageIcon />}>Image</EditorRailItem>
            </EditorRailGroup>
          </>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Hero section</span>
              <Badge variant="soft">Selected</Badge>
            </div>
            <InspectorRow label="Heading">
              <Input defaultValue="Build beautiful sites" />
            </InspectorRow>
            <InspectorRow label="Alignment">
              <Select defaultValue="center">
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Background">
              <div className="flex items-center gap-2">
                {["#7c3aed", "#f1ecfe", "#ffffff", "#18171a"].map((c, i) => (
                  <span
                    key={c}
                    className="size-7 rounded-lg border border-border"
                    style={{ background: c, outline: i === 1 ? "2px solid var(--primary)" : undefined, outlineOffset: 2 }}
                  />
                ))}
              </div>
            </InspectorRow>
            <InspectorRow label="Padding">
              <div className="flex items-center gap-2">
                <Input defaultValue="96" className="w-16" />
                <span className="text-xs text-muted-foreground">px vertical</span>
              </div>
            </InspectorRow>
            <button className="mt-2 flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              Advanced <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </>
        }
        canvas={
          <div className="mx-auto max-w-2xl space-y-4">
            {/* Hero (selected) */}
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
            {/* Feature grid */}
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
            {/* Add section affordance */}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
              <Square className="size-4" /> Add section
            </button>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        This is a non-functional preview of the page builder.{" "}
        <Link to="/pages" className="text-primary hover:underline">
          Back to pages
        </Link>
      </p>
    </div>
  );
}
