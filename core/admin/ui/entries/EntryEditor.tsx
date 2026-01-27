import { Eye, Save, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
import { Separator } from "@/components/ui/separator";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { FieldRenderer } from "./FieldRenderer";
import type { ContentField } from "../content-types/SchemaBuilder";

type EntryStatus = "draft" | "published";

const entrySchema: ContentField[] = [
  {
    id: "title",
    name: "title",
    type: "text",
    label: "Title",
    required: true,
    help: "Displayed on listing cards and metadata.",
  },
  {
    id: "slug",
    name: "slug",
    type: "text",
    label: "Slug",
    required: true,
    help: "URL-friendly identifier (kebab-case).",
  },
  {
    id: "summary",
    name: "summary",
    type: "richtext",
    label: "Summary",
    help: "Short intro used for previews and SEO.",
  },
  {
    id: "read-time",
    name: "read-time",
    type: "number",
    label: "Read time (minutes)",
    defaultValue: "5",
  },
  {
    id: "featured",
    name: "featured",
    type: "boolean",
    label: "Featured entry",
    help: "Highlight on the homepage.",
    defaultValue: "false",
  },
  {
    id: "priority",
    name: "priority",
    type: "select",
    label: "Priority",
    options: ["low", "normal", "high"],
    defaultValue: "normal",
  },
  {
    id: "cover",
    name: "cover-image",
    type: "media",
    label: "Cover image",
    help: "Used in social previews.",
  },
  {
    id: "related",
    name: "related-entry",
    type: "relation",
    label: "Related entry",
    relation: { target: "news" },
  },
];

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

export function EntryEditor() {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    buildInitialValues(entrySchema)
  );
  const [status, setStatus] = useState<EntryStatus>("draft");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  const scheduleAutosave = () => {
    setIsAutosaving(true);
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = setTimeout(() => {
      setIsAutosaving(false);
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
    }, 900);
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    scheduleAutosave();
  };

  const handleSaveDraft = async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    setStatus("draft");
    setHasUnsavedChanges(false);
    setLastSavedAt(new Date());
    setIsAutosaving(false);
  };

  const handlePublish = async () => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    setStatus("published");
    setHasUnsavedChanges(false);
    setLastSavedAt(new Date());
    setIsAutosaving(false);
  };

  const lastSavedLabel = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not saved yet";

  return (
    <SplitShell
      activeHref="/admin/entries"
      rightPanel={
        <EntryMetaPanel
          status={status}
          lastSavedLabel={lastSavedLabel}
          isAutosaving={isAutosaving}
        />
      }
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Content</span>
          <span>/</span>
          <span>Entries</span>
          <span>/</span>
          <span className="text-foreground">Blog Post</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            {status}
          </span>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={handleSaveDraft}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
          <Button size="sm" className="gap-2" onClick={handlePublish}>
            <Send className="h-4 w-4" />
            Publish
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <PageHeader
          title="Entry Editor"
          description="Edit fields for the Blog Post content type."
        />
        <Card>
          <CardHeader>
            <CardTitle>Entry fields</CardTitle>
            <CardDescription>
              Fields are generated from the content type schema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {entrySchema.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.type !== "boolean" ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      {field.help ? (
                        <p className="text-xs text-muted-foreground">
                          {field.help}
                        </p>
                      ) : null}
                    </div>
                    {field.required ? (
                      <Badge variant="outline">Required</Badge>
                    ) : null}
                  </div>
                ) : null}
                <FieldRenderer
                  field={field}
                  value={values[field.name]}
                  onChange={(value) => handleFieldChange(field.name, value)}
                />
                {field.type === "boolean" && field.help ? (
                  <p className="text-xs text-muted-foreground">{field.help}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </SplitShell>
  );
}

type EntryMetaPanelProps = {
  status: EntryStatus;
  lastSavedLabel: string;
  isAutosaving: boolean;
};

function EntryMetaPanel({
  status,
  lastSavedLabel,
  isAutosaving,
}: EntryMetaPanelProps) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Entry Status</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{status}</Badge>
          <span className="text-xs text-muted-foreground">
            {isAutosaving ? "Autosaving..." : "Autosave enabled"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Last saved: {lastSavedLabel}</p>
      </div>
      <Separator />
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Preview Link</h3>
        <Input
          readOnly
          value="https://preview.nextless.local/entry/launch-announcement"
        />
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Eye className="h-4 w-4" />
          Open Preview
        </Button>
      </div>
      <Separator />
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>Locale: en-US</p>
        <p>Author: admin@nextless.dev</p>
        <p>Content type: Blog Post</p>
      </div>
    </div>
  );
}
