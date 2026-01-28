import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export type EntryStatus = "draft" | "published" | "scheduled" | "archived";

const statusOptions: Array<{ value: EntryStatus; label: string }> = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

const statusStyles: Record<EntryStatus, string> = {
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  draft: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  scheduled: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  archived: "border-slate-500/30 bg-slate-500/10 text-slate-600",
};

type EntryMetadataPanelProps = {
  status: EntryStatus;
  onStatusChange: (status: EntryStatus) => void;
  publishDate: string;
  onPublishDateChange: (value: string) => void;
  title: string;
  slug: string;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  tags: string[];
};

export function EntryMetadataPanel({
  status,
  onStatusChange,
  publishDate,
  onPublishDateChange,
  title,
  slug,
  seoDescription,
  onSeoDescriptionChange,
  tags,
}: EntryMetadataPanelProps) {
  const previewTitle = title ? `${title} | Nextless CMS` : "Entry title | Nextless CMS";
  const previewUrl = `https://nextless.cms/blog/${slug || "entry-slug"}`;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-6 py-6">
        <div className="space-y-6 pb-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Publishing
              </p>
              <Badge variant="outline" className={statusStyles[status]}>
                {statusOptions.find((option) => option.value === status)?.label ?? status}
              </Badge>
            </div>
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Status
                  </label>
                  <Select
                    value={status}
                    onValueChange={(value) => onStatusChange(value as EntryStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Publish date
                  </label>
                  <div className="relative">
                    <Input
                      value={publishDate}
                      onChange={(event) => onPublishDateChange(event.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Search Engine Optimization
              </p>
              <Badge variant="outline" className="text-[10px] uppercase">
                Snippet
              </Badge>
            </div>
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Snippet preview
                  </p>
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-semibold text-primary">{previewTitle}</p>
                    <p className="text-[10px] text-emerald-700">{previewUrl}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {seoDescription || "Add a short summary for search results."}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                    Meta description
                  </label>
                  <Textarea
                    value={seoDescription}
                    onChange={(event) => onSeoDescriptionChange(event.target.value)}
                    rows={4}
                    className="resize-none bg-muted/30"
                    placeholder="Write a short description for search results..."
                  />
                </div>
              </CardContent>
            </Card>
          </section>
          <Separator />
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Taxonomy
            </p>
            <Card>
              <CardContent className="space-y-3 p-4">
                <label className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-primary/20 bg-primary/10 text-[10px] font-semibold text-primary"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Add tag..." />
              </CardContent>
            </Card>
          </section>
        </div>
      </ScrollArea>
      <div className="border-t px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Sarah Jenks</span>
            <span className="text-[10px] uppercase text-muted-foreground">
              Main author
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
