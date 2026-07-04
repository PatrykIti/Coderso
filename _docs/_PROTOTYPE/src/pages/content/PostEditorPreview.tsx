import {
  Code2,
  Eye,
  Heading,
  Image as ImageIcon,
  List,
  Pilcrow,
  Quote,
  Rocket,
  SquareDashedBottomCode,
  Upload,
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
import { Link } from "@/lib/router";

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function PostEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Posts", to: "/posts" }, { label: "Introducing Coderso 2.0" }]}
        title="Introducing Coderso 2.0"
        description="Write, format, and publish your story."
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
        title="Post editor"
        toolbar={<Badge variant="outline">Draft · autosaved</Badge>}
        left={
          <EditorRailGroup label="Blocks">
            <EditorRailItem icon={<Pilcrow />} active>
              Paragraph
            </EditorRailItem>
            <EditorRailItem icon={<Heading />}>Heading</EditorRailItem>
            <EditorRailItem icon={<ImageIcon />}>Image</EditorRailItem>
            <EditorRailItem icon={<Quote />}>Quote</EditorRailItem>
            <EditorRailItem icon={<Code2 />}>Code</EditorRailItem>
            <EditorRailItem icon={<List />}>List</EditorRailItem>
            <EditorRailItem icon={<SquareDashedBottomCode />}>Embed</EditorRailItem>
          </EditorRailGroup>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Post settings</span>
              <Badge variant="soft">Draft</Badge>
            </div>
            <InspectorRow label="Status">
              <Select defaultValue="draft">
                <option value="draft">Draft</option>
                <option value="review">In review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Slug">
              <Input defaultValue="introducing-coderso-2-0" className="font-mono text-xs" />
            </InspectorRow>
            <InspectorRow label="Category">
              <Select defaultValue="product">
                <option value="product">Product</option>
                <option value="engineering">Engineering</option>
                <option value="company">Company</option>
                <option value="design">Design</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Tags">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <Badge variant="soft">release</Badge>
                <Badge variant="soft">cms</Badge>
                <Badge variant="soft">announcement</Badge>
              </div>
              <Input placeholder="Add a tag…" />
            </InspectorRow>
            <InspectorRow label="Featured image">
              <div className="flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <ImageIcon className="size-6" />
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5">
                <Upload className="size-4" /> Upload
              </Button>
            </InspectorRow>

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                SEO
              </div>
              <InspectorRow label="Meta title">
                <Input defaultValue="Introducing Coderso 2.0" />
              </InspectorRow>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                Meta description
              </div>
              <Input defaultValue="A modern CMS for teams who care about craft." />
            </div>
          </>
        }
        canvas={
          <Card className="mx-auto max-w-2xl p-10 shadow-card">
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Introducing Coderso 2.0
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              By Alex Rivera · Product · 6 min read
            </p>

            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/90">
              <p>
                Today we are thrilled to announce Coderso 2.0 — a complete rethink of how teams
                create, organize, and ship content. We rebuilt the editor from the ground up to be
                calmer, faster, and more delightful to use every day.
              </p>
              <p>
                Whether you are publishing a changelog, a marketing page, or a long-form essay, the
                new canvas keeps you in flow. Blocks snap into place, formatting stays out of your
                way, and everything saves automatically.
              </p>
            </div>

            <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <ImageIcon className="size-8" />
            </div>

            <h2 className="mt-8 font-display text-xl font-semibold tracking-tight">What is new</h2>
            <div className="mt-3 space-y-4 text-[15px] leading-relaxed text-foreground/90">
              <p>
                A redesigned block editor, real-time collaboration, and a flexible content engine
                that adapts to your team. Every detail was tuned for clarity and speed.
              </p>
              <p>
                We cannot wait to see what you build. Upgrade today and tell us what you think — we
                are just getting started.
              </p>
            </div>
          </Card>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        This is a non-functional preview of the post editor.{" "}
        <Link to="/posts" className="text-primary hover:underline">
          Back to posts
        </Link>
      </p>
    </div>
  );
}
