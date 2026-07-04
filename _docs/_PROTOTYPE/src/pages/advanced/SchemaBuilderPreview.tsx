import {
  Binary,
  CalendarDays,
  GitBranch,
  Hash,
  Image as ImageIcon,
  ListChecks,
  Type,
  WholeWord,
} from "lucide-react";
import { type ReactNode } from "react";

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

function InspectorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, defaultOn }: { label: string; defaultOn?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
      <div className="text-sm font-medium">{label}</div>
      <Switch defaultChecked={defaultOn} />
    </div>
  );
}

function FieldNode({
  icon,
  name,
  type,
  selected,
}: {
  icon: ReactNode;
  name: string;
  type: string;
  selected?: boolean;
}) {
  return (
    <Card
      className={
        "flex items-center gap-3 p-4 shadow-soft transition-colors " +
        (selected ? "border-2 border-primary" : "hover:border-primary/40")
      }
    >
      <span
        className={
          "flex size-9 items-center justify-center rounded-xl [&_svg]:size-4 " +
          (selected
            ? "bg-primary-soft text-primary"
            : "bg-muted text-muted-foreground")
        }
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{type}</div>
      </div>
      <span
        className={
          "size-2.5 rounded-full " + (selected ? "bg-primary" : "bg-muted-foreground/30")
        }
      />
    </Card>
  );
}

export function SchemaBuilderPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Engine", to: "/advanced/engine" },
          { label: "Article" },
          { label: "Schema" },
        ]}
        title="Schema"
        description="Compose your content model visually."
        icon={<GitBranch />}
        actions={<Button>Save</Button>}
      />

      <EditorPreviewFrame
        title="Schema builder"
        toolbar={<Badge variant="outline">8 fields</Badge>}
        device={false}
        left={
          <EditorRailGroup label="Field types">
            <EditorRailItem icon={<Type />}>Text</EditorRailItem>
            <EditorRailItem icon={<Hash />}>Number</EditorRailItem>
            <EditorRailItem icon={<Binary />}>Boolean</EditorRailItem>
            <EditorRailItem icon={<CalendarDays />}>Date</EditorRailItem>
            <EditorRailItem icon={<WholeWord />}>Rich text</EditorRailItem>
            <EditorRailItem icon={<ImageIcon />}>Media</EditorRailItem>
            <EditorRailItem icon={<GitBranch />}>Relation</EditorRailItem>
            <EditorRailItem icon={<ListChecks />}>Select</EditorRailItem>
          </EditorRailGroup>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Field inspector</span>
              <Badge variant="soft">Body</Badge>
            </div>
            <InspectorRow label="Label">
              <Input defaultValue="Body" />
            </InspectorRow>
            <InspectorRow label="Field type">
              <Select defaultValue="richtext">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
                <option value="richtext">Rich text</option>
                <option value="media">Media</option>
                <option value="relation">Relation</option>
                <option value="select">Select</option>
              </Select>
            </InspectorRow>
            <ToggleRow label="Required" defaultOn />
            <ToggleRow label="Unique" />
            <InspectorRow label="Default value">
              <Input placeholder="—" />
            </InspectorRow>
            <InspectorRow label="Help text">
              <Input defaultValue="The main content of the article." />
            </InspectorRow>
          </>
        }
        canvas={
          <div className="mx-auto flex max-w-xl flex-col items-stretch gap-3">
            <FieldNode icon={<Type />} name="Title" type="Text · required" />
            <div className="mx-auto h-4 w-px bg-border" />
            <FieldNode icon={<WholeWord />} name="Body" type="Rich text · required" selected />
            <div className="mx-auto h-4 w-px bg-border" />
            <FieldNode icon={<ImageIcon />} name="Cover image" type="Media" />
            <div className="mx-auto h-4 w-px bg-border" />
            <FieldNode icon={<GitBranch />} name="Author" type="Relation → User" />
            <div className="mx-auto h-4 w-px bg-border" />
            <FieldNode icon={<CalendarDays />} name="Published at" type="Date" />
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
              <Hash className="size-4" /> Add field
            </button>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        This is a non-functional preview of the schema builder.{" "}
        <Link to="/advanced/engine" className="text-primary hover:underline">
          Back to engine
        </Link>
      </p>
    </div>
  );
}
