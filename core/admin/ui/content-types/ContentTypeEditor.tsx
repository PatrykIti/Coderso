import { Save, Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { ContentTypePreviewPanel } from "./ContentTypePreviewPanel";
import { SchemaBuilder, type ContentField } from "./SchemaBuilder";

const defaultFields: ContentField[] = [
  {
    id: "field-title",
    name: "title",
    type: "text",
    label: "Title",
    required: true,
    help: "Short title for listings",
  },
  {
    id: "field-body",
    name: "body",
    type: "richtext",
    label: "Body",
  },
];

type ContentTypeEditorProps = {
  initialName?: string;
  initialSlug?: string;
  initialFields?: ContentField[];
};

export function ContentTypeEditor({
  initialName = "Blog Post",
  initialSlug = "blog",
  initialFields = defaultFields,
}: ContentTypeEditorProps) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [fields, setFields] = useState<ContentField[]>(initialFields);

  return (
    <SplitShell
      activeHref="/admin/content-types"
      rightPanel={<ContentTypePreviewPanel name={name} slug={slug} fields={fields} />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span className="text-foreground">Content Types</span>
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button size="sm" className="gap-2">
            <Send className="h-4 w-4" />
            Publish
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHeader
          title="Content Type Editor"
          description="Define schema fields and validation rules."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Name
            </label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Slug
            </label>
            <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
          </div>
        </div>
        <SchemaBuilder fields={fields} onChange={setFields} />
      </div>
    </SplitShell>
  );
}
