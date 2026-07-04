import { Calendar, Image as ImageIcon, Rocket, Upload } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/lib/router";

const TAGS = ["Product", "Release notes", "Engineering"];

export function EntryEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Entries", to: "/advanced/entries" }, { label: "Article" }]}
        title="Edit entry"
        description="Compose and publish an entry in this content type."
        actions={
          <>
            <Badge variant="soft">Preview only</Badge>
            <Button variant="ghost">Save draft</Button>
            <Button className="gap-1.5">
              <Rocket className="size-4" /> Publish
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <SectionCard title="Content" description="The main body of this entry.">
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-title">Title</Label>
                <Input id="entry-title" defaultValue="How we rebuilt the page editor" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-slug">Slug</Label>
                <Input
                  id="entry-slug"
                  className="font-mono text-sm"
                  defaultValue="/how-we-rebuilt-the-page-editor"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Body</Label>
                <div className="rounded-xl border border-border bg-muted/40 p-5">
                  <div className="mb-3 inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
                    Rich text
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 w-2/5 rounded bg-muted-foreground/25" />
                    <div className="h-2.5 w-full rounded bg-muted-foreground/15" />
                    <div className="h-2.5 w-11/12 rounded bg-muted-foreground/15" />
                    <div className="h-2.5 w-4/5 rounded bg-muted-foreground/15" />
                    <div className="h-3" />
                    <div className="h-2.5 w-full rounded bg-muted-foreground/15" />
                    <div className="h-2.5 w-10/12 rounded bg-muted-foreground/15" />
                    <div className="h-2.5 w-3/4 rounded bg-muted-foreground/15" />
                  </div>
                </div>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Media" description="Cover image shown in listings and previews.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground sm:w-64">
                <ImageIcon className="size-7" />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="gap-1.5">
                  <Upload className="size-4" /> Upload cover
                </Button>
                <span className="text-xs text-muted-foreground">JPG or PNG, up to 5&nbsp;MB.</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Publish">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-status">Status</Label>
                <Select id="entry-status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="review">In review</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-visibility">Visibility</Label>
                <Select id="entry-visibility" defaultValue="public">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="password">Password protected</option>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" /> Schedule
                </span>
                <span className="text-sm text-muted-foreground">Jun 27, 2026</span>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Button className="w-full gap-1.5">
                  <Rocket className="size-4" /> Publish
                </Button>
                <Button variant="ghost" className="w-full">
                  Save draft
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Taxonomy">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-category">Category</Label>
                <Select id="entry-category" defaultValue="eng">
                  <option value="eng">Engineering</option>
                  <option value="product">Product</option>
                  <option value="design">Design</option>
                  <option value="company">Company</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  <Badge variant="outline">+ Add</Badge>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Metadata">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd>Jun 18, 2026</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>Jun 27, 2026</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Author</dt>
                <dd>Maria Nowak</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Entry ID</dt>
                <dd className="font-mono text-xs">ent_8f21a0</dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Non-functional entry editor preview.{" "}
        <Link to="/advanced/entries" className="text-primary hover:underline">
          Back to entries
        </Link>
      </p>
    </div>
  );
}
