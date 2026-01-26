import { PlusCircle, Save, SlidersHorizontal, Type, Image, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ContentTypeSidebar } from "./ContentTypeSidebar";
import { FieldCard } from "./FieldCard";
import { SchemaPreviewPanel } from "./SchemaPreviewPanel";

const sampleFields = [
  {
    id: "title",
    name: "Title",
    typeLabel: "String",
    description: "Primary headline displayed across listings.",
    badges: ["Required", "Unique"],
    icon: <Type className="h-5 w-5" />,
    expanded: true,
    settings: {
      displayName: "Title",
      apiId: "title",
      fieldType: "text",
      description: "Visible in cards, previews, and SEO metadata.",
      validation: { required: true, unique: true, limitLength: true },
      helpText: "Keep titles concise and searchable.",
    },
  },
  {
    id: "slug",
    name: "Slug",
    typeLabel: "UID",
    description: "Auto-generated from the title.",
    meta: "Targets: Title",
    icon: <Link2 className="h-5 w-5" />,
    settings: {
      displayName: "Slug",
      apiId: "slug",
      fieldType: "text",
      description: "Used to build the URL path for each entry.",
      validation: { required: true, unique: true },
      helpText: "Editors can override the slug when needed.",
    },
  },
  {
    id: "cover-image",
    name: "Cover Image",
    typeLabel: "Media",
    description: "Hero image for the blog post.",
    badges: ["Single Asset"],
    icon: <Image className="h-5 w-5" />,
    settings: {
      displayName: "Cover Image",
      apiId: "coverImage",
      fieldType: "media",
      description: "Shown on the detail page and social previews.",
      validation: { required: false, unique: false },
      helpText: "Use high quality images (min 1600px wide).",
      typeOptions: ["media", "text", "rich-text", "relation"],
    },
  },
];

export function SchemaBuilderPage() {
  return (
    <SplitShell
      activeHref="/admin/content-types"
      rightPanel={<SchemaPreviewPanel />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span>Schema Builder</span>
          <span>/</span>
          <span className="text-foreground">Blog Post</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost">Discard</Button>
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            Save schema
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Blog Post"
          description="Define the structure for your main blog articles and the /blog route."
          actions={
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Edit metadata
            </Button>
          }
        />
        <div className="flex gap-6">
          <aside className="hidden w-72 shrink-0 overflow-hidden rounded-xl border bg-background lg:block">
            <ContentTypeSidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {sampleFields.map((field) => (
              <FieldCard key={field.id} {...field} />
            ))}
            <Button variant="outline" className="w-full gap-2">
              <PlusCircle className="h-4 w-4" />
              Add new field
            </Button>
          </div>
        </div>
      </div>
    </SplitShell>
  );
}
