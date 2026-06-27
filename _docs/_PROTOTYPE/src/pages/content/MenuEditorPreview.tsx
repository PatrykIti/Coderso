import {
  ChevronRight,
  CornerDownRight,
  FileText,
  FolderTree,
  GripVertical,
  Link as LinkIcon,
  Newspaper,
  Rocket,
  SquareMousePointer,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import {
  EditorPreviewFrame,
  EditorRailGroup,
  EditorRailItem,
} from "@/components/patterns/EditorPreviewFrame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/router";

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function MenuItem({
  label,
  url,
  nested,
  active,
}: {
  label: string;
  url: string;
  nested?: boolean;
  active?: boolean;
}) {
  return (
    <div className={nested ? "pl-8" : undefined}>
      <div
        className={
          "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-accent " +
          (active ? "border-primary bg-primary-soft/40" : "border-border bg-card")
        }
      >
        <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
        {nested ? <CornerDownRight className="size-4 shrink-0 text-muted-foreground" /> : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate font-mono text-xs text-muted-foreground">{url}</div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

export function MenuEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Menus", to: "/menus" }, { label: "Header navigation" }]}
        title="Header navigation"
        description="Arrange links, nest items, and control visibility."
        actions={
          <>
            <Button variant="ghost">Save</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <EditorPreviewFrame
        title="Menu editor"
        toolbar={<Badge variant="outline">8 items</Badge>}
        device={false}
        left={
          <EditorRailGroup label="Add items">
            <EditorRailItem icon={<FileText />}>Pages</EditorRailItem>
            <EditorRailItem icon={<Newspaper />}>Posts</EditorRailItem>
            <EditorRailItem icon={<LinkIcon />}>Custom link</EditorRailItem>
            <EditorRailItem icon={<FolderTree />}>Categories</EditorRailItem>
            <EditorRailItem icon={<SquareMousePointer />}>Button</EditorRailItem>
          </EditorRailGroup>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Item settings</span>
              <Badge variant="soft">Products</Badge>
            </div>
            <InspectorRow label="Label">
              <Input defaultValue="Products" />
            </InspectorRow>
            <InspectorRow label="URL">
              <Input defaultValue="/products" className="font-mono text-xs" />
            </InspectorRow>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
              <div className="text-sm font-medium">Open in new tab</div>
              <Switch />
            </div>
            <div className="mt-3">
              <InspectorRow label="Visibility">
                <Select defaultValue="everyone">
                  <option value="everyone">Everyone</option>
                  <option value="members">Members only</option>
                  <option value="guests">Logged-out only</option>
                  <option value="hidden">Hidden</option>
                </Select>
              </InspectorRow>
            </div>
          </>
        }
        canvas={
          <Card className="mx-auto max-w-xl p-4 shadow-card">
            <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Header navigation
            </div>
            <div className="space-y-2">
              <MenuItem label="Home" url="/" />
              <MenuItem label="Products" url="/products" active />
              <MenuItem label="Plans" url="/products/plans" nested />
              <MenuItem label="Features" url="/products/features" nested />
              <MenuItem label="Pricing" url="/pricing" />
              <MenuItem label="Blog" url="/blog" />
              <MenuItem label="Contact" url="/contact" />
            </div>
            <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
              <LinkIcon className="size-4" /> Add menu item
            </button>
          </Card>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        This is a non-functional preview of the menu editor.{" "}
        <Link to="/menus" className="text-primary hover:underline">
          Back to menus
        </Link>
      </p>
    </div>
  );
}
