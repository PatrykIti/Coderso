import {
  Image as ImageIcon,
  Heading,
  MousePointerClick,
  Rocket,
  TextCursorInput,
  Type,
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
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/router";

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function PopupEditorPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Popups", to: "/advanced/popups" },
          { label: "Newsletter signup" },
        ]}
        title="Newsletter signup"
        description="Design the popup and decide when and to whom it appears."
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
        title="Popup editor"
        toolbar={<Badge variant="outline">Newsletter signup · draft</Badge>}
        left={
          <EditorRailGroup label="Content">
            <EditorRailItem icon={<Heading />} active>
              Heading
            </EditorRailItem>
            <EditorRailItem icon={<Type />}>Text</EditorRailItem>
            <EditorRailItem icon={<TextCursorInput />}>Input</EditorRailItem>
            <EditorRailItem icon={<MousePointerClick />}>Button</EditorRailItem>
            <EditorRailItem icon={<ImageIcon />}>Image</EditorRailItem>
          </EditorRailGroup>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Display rules</span>
              <Badge variant="soft">Settings</Badge>
            </div>
            <InspectorRow label="Trigger">
              <Select defaultValue="exit">
                <option value="exit">Exit intent</option>
                <option value="timed">Timed</option>
                <option value="scroll">Scroll depth</option>
                <option value="load">On load</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Delay">
              <div className="flex items-center gap-2">
                <Input defaultValue="3" className="w-20" />
                <span className="text-xs text-muted-foreground">seconds</span>
              </div>
            </InspectorRow>
            <InspectorRow label="Frequency">
              <Select defaultValue="once">
                <option value="once">Once per visitor</option>
                <option value="every">Every visit</option>
                <option value="weekly">Weekly</option>
              </Select>
            </InspectorRow>
            <InspectorRow label="Audience">
              <Select defaultValue="all">
                <option value="all">All visitors</option>
                <option value="new">New visitors</option>
                <option value="returning">Returning</option>
              </Select>
            </InspectorRow>
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span className="text-sm font-medium">Show on mobile</span>
              <Switch defaultChecked />
            </div>
          </>
        }
        canvas={
          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl bg-muted p-6">
            {/* Dimmed page backdrop */}
            <div className="pointer-events-none absolute inset-0 p-8 opacity-40">
              <div className="h-4 w-40 rounded bg-muted-foreground/30" />
              <div className="mt-4 h-2.5 w-3/4 rounded bg-muted-foreground/20" />
              <div className="mt-2 h-2.5 w-2/3 rounded bg-muted-foreground/20" />
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-muted-foreground/10" />
                ))}
              </div>
            </div>

            {/* Centered popup */}
            <Card className="relative z-10 w-full max-w-sm p-6 text-center shadow-card">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
                <ImageIcon className="size-5" />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight">
                Join our newsletter
              </h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
                Get product updates and tips, straight to your inbox. No spam, ever.
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="mt-4 flex flex-col gap-2.5">
                <Input placeholder="you@company.com" />
                <Button type="submit" className="w-full">
                  Subscribe
                </Button>
              </form>
              <button className="mt-3 text-xs text-muted-foreground hover:text-foreground">
                No thanks
              </button>
            </Card>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Non-functional preview of the popup editor.{" "}
        <Link to="/advanced/popups" className="text-primary hover:underline">
          Back to popups
        </Link>
      </p>
    </div>
  );
}
