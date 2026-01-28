import { RefreshCcw } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminShell } from "@/ui/layouts/AdminShell";

import { EntryEditorHeader, EntryEditorHeaderActions } from "./EntryEditorHeader";
import { EntryMetadataPanel, type EntryStatus } from "./EntryMetadataPanel";
import { FieldRenderer } from "./FieldRenderer";
import type { ContentField } from "../content-types/SchemaBuilder";

const entrySchema: ContentField[] = [
  {
    id: "title",
    name: "title",
    type: "text",
    label: "Title",
    required: true,
    defaultValue: "Mastering Headless CMS Architecture",
  },
  {
    id: "slug",
    name: "slug",
    type: "text",
    label: "Slug",
    required: true,
    defaultValue: "mastering-headless-cms",
  },
  {
    id: "body",
    name: "body",
    type: "richtext",
    label: "Entry content",
    required: true,
    help: "Write the main story for this entry.",
    defaultValue:
      "Headless CMS platforms give teams the freedom to deliver content across channels without locking into a single frontend.",
  },
  {
    id: "cover",
    name: "cover-image",
    type: "media",
    label: "Featured image",
    help: "Used for social previews and listing cards.",
  },
  {
    id: "related",
    name: "related-entry",
    type: "relation",
    label: "Related entry",
    relation: { target: "blog" },
    options: ["Launch announcement", "Roadmap update", "Hiring playbook"],
    help: "Connect to another entry in the same collection.",
  },
];

const contentFields = entrySchema.filter((field) => field.type === "richtext");
const mediaFields = entrySchema.filter((field) => field.type === "media");
const relationFields = entrySchema.filter((field) => field.type === "relation");

function resolveDefaultValue(field: ContentField) {
  if (field.defaultValue === undefined || field.defaultValue === "") return null;
  if (field.type === "number") {
    const parsed = Number(field.defaultValue);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (field.type === "boolean") {
    return field.defaultValue === "true";
  }
  return field.defaultValue;
}

function buildInitialValues(fields: ContentField[]) {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    const fallback = field.type === "boolean" ? false : "";
    acc[field.name] = resolveDefaultValue(field) ?? fallback;
    return acc;
  }, {});
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function EntryEditor() {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(entrySchema)
  );
  const [status, setStatus] = useState<EntryStatus>("published");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [publishDate, setPublishDate] = useState("Oct 24, 2023 10:30 AM");
  const [seoDescription, setSeoDescription] = useState(
    "Learn how headless architecture can improve your performance and developer experience with modern tools."
  );
  const [tags] = useState(["HEADLESS", "ARCHITECTURE", "PERFORMANCE"]);

  const handleFieldChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handlePreview = () => {};

  const handlePublish = () => {
    setStatus("published");
    setHasUnsavedChanges(false);
  };

  const handleStatusChange = (nextStatus: EntryStatus) => {
    setStatus(nextStatus);
    setHasUnsavedChanges(true);
  };

  const title = String(values.title ?? "");
  const slug = String(values.slug ?? "");

  const handleGenerateSlug = () => {
    handleFieldChange("slug", slugify(title));
  };

  const renderFieldCard = (field: ContentField) => (
    <Card key={field.id}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{field.label}</CardTitle>
          {field.required ? <Badge variant="outline">Required</Badge> : null}
        </div>
        {field.help ? <CardDescription>{field.help}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <FieldRenderer
          field={field}
          value={values[field.name]}
          onChange={(value) => handleFieldChange(field.name, value)}
        />
      </CardContent>
    </Card>
  );

  return (
    <AdminShell
      activeHref="/admin/entries"
      showSearch={false}
      contentClassName="p-0 overflow-hidden"
      breadcrumbs={
        <EntryEditorHeader
          status={status}
          hasUnsavedChanges={hasUnsavedChanges}
          contentType="Blog Posts"
          entryLabel="Edit Entry"
        />
      }
      topbarActions={
        <EntryEditorHeaderActions
          status={status}
          onPreview={handlePreview}
          onPublish={handlePublish}
        />
      }
    >
      <div className="flex h-full min-h-[calc(100vh-4rem)]">
        <ScrollArea className="flex-1 bg-background">
          <div className="mx-auto flex max-w-4xl flex-col gap-8 px-10 py-10">
            <div className="space-y-4">
              <Textarea
                value={title}
                onChange={(event) => handleFieldChange("title", event.target.value)}
                rows={2}
                className="min-h-[96px] resize-none border-none bg-transparent p-0 text-4xl font-semibold leading-tight tracking-tight focus-visible:ring-0"
                placeholder="Enter post title..."
              />
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Slug
                </span>
                <div className="flex flex-1 items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">/blog/</span>
                  <Input
                    value={slug}
                    onChange={(event) =>
                      handleFieldChange("slug", event.target.value)
                    }
                    className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-mono focus-visible:ring-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleGenerateSlug}
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <Tabs defaultValue="content" className="space-y-6">
              <TabsList variant="line">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="relations">Relations</TabsTrigger>
              </TabsList>
              <TabsContent value="content" className="space-y-6">
                {contentFields.map(renderFieldCard)}
              </TabsContent>
              <TabsContent value="media" className="space-y-6">
                {mediaFields.map(renderFieldCard)}
              </TabsContent>
              <TabsContent value="relations" className="space-y-6">
                {relationFields.map(renderFieldCard)}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
        <aside className="hidden w-96 shrink-0 border-l bg-muted/30 lg:block">
          <EntryMetadataPanel
            status={status}
            onStatusChange={handleStatusChange}
            publishDate={publishDate}
            onPublishDateChange={setPublishDate}
            title={title}
            slug={slug}
            seoDescription={seoDescription}
            onSeoDescriptionChange={setSeoDescription}
            tags={tags}
          />
        </aside>
      </div>
    </AdminShell>
  );
}
