import {
  CalendarDays,
  CircleDot,
  FolderTree,
  Image as ImageIcon,
  Rocket,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import {
  EditorPreviewFrame,
  EditorRailGroup,
  EditorRailItem,
} from "@/components/patterns/EditorPreviewFrame";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/router";

const FIELDS = [
  { label: "Image", checked: true },
  { label: "Title", checked: true },
  { label: "Excerpt", checked: true },
  { label: "Date", checked: true },
  { label: "Author", checked: false },
];

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function ListingEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Listings", to: "/advanced/listings" },
          { label: "Latest articles" },
        ]}
        title="Latest articles"
        description="Bind a query to a repeatable layout and tune how results render."
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
        title="Listing editor"
        toolbar={<Badge variant="outline">Latest articles · draft</Badge>}
        left={
          <>
            <EditorRailGroup label="Data">
              <EditorRailItem icon={<FolderTree />} active>
                Source: Articles
              </EditorRailItem>
            </EditorRailGroup>
            <EditorRailGroup label="Filters">
              <EditorRailItem icon={<CircleDot />}>Status</EditorRailItem>
              <EditorRailItem icon={<FolderTree />}>Category</EditorRailItem>
              <EditorRailItem icon={<CalendarDays />}>Date</EditorRailItem>
              <EditorRailItem icon={<User />}>Author</EditorRailItem>
            </EditorRailGroup>
          </>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Layout</span>
              <Badge variant="soft">Selected</Badge>
            </div>
            <InspectorRow label="Layout">
              <Select defaultValue="grid">
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="carousel">Carousel</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Columns">
              <Select defaultValue="2">
                <option value="1">1 column</option>
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
                <option value="4">4 columns</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Items per page">
              <Input defaultValue="6" className="w-20" />
            </InspectorRow>
            <InspectorRow label="Fields shown">
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                {FIELDS.map((field) => (
                  <label key={field.label} className="flex items-center gap-2.5 text-sm">
                    <Checkbox defaultChecked={field.checked} />
                    {field.label}
                  </label>
                ))}
              </div>
            </InspectorRow>
            <InspectorRow label="Sort">
              <Select defaultValue="newest">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
                <option value="popular">Most viewed</option>
              </Select>
            </InspectorRow>
          </>
        }
        canvas={
          <div className="mx-auto max-w-3xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-lg font-semibold">Latest articles</div>
              <Badge variant="info">Bound query · 6 results</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground">
                    <ImageIcon className="size-7" />
                  </div>
                  <div className="p-4">
                    <div className="h-3 w-3/4 rounded bg-muted-foreground/25" />
                    <div className="mt-2.5 h-2 w-full rounded bg-muted-foreground/12" />
                    <div className="mt-1.5 h-2 w-5/6 rounded bg-muted-foreground/12" />
                    <div className="mt-3">
                      <Badge variant="secondary">Article</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Non-functional preview of the listing editor.{" "}
        <Link to="/advanced/listings" className="text-primary hover:underline">
          Back to listings
        </Link>
      </p>
    </div>
  );
}
