import {
  AtSign,
  CalendarDays,
  CheckSquare,
  CircleDot,
  ListChecks,
  Paperclip,
  Phone,
  Rocket,
  Text,
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
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/router";

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function FormBuilderPreview() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Forms", to: "/advanced/forms" }, { label: "Contact form" }]}
        title="Contact form"
        description="Drag fields onto the canvas and configure them on the right."
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
        title="Form builder"
        toolbar={<Badge variant="outline">Contact form · draft</Badge>}
        left={
          <EditorRailGroup label="Fields">
            <EditorRailItem icon={<Type />}>Text</EditorRailItem>
            <EditorRailItem icon={<AtSign />} active>
              Email
            </EditorRailItem>
            <EditorRailItem icon={<Text />}>Textarea</EditorRailItem>
            <EditorRailItem icon={<ListChecks />}>Select</EditorRailItem>
            <EditorRailItem icon={<CheckSquare />}>Checkbox</EditorRailItem>
            <EditorRailItem icon={<CircleDot />}>Radio</EditorRailItem>
            <EditorRailItem icon={<CalendarDays />}>Date</EditorRailItem>
            <EditorRailItem icon={<Paperclip />}>File</EditorRailItem>
            <EditorRailItem icon={<Phone />}>Phone</EditorRailItem>
          </EditorRailGroup>
        }
        right={
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Email field</span>
              <Badge variant="soft">Selected</Badge>
            </div>
            <InspectorRow label="Label">
              <Input defaultValue="Email" />
            </InspectorRow>
            <InspectorRow label="Placeholder">
              <Input defaultValue="you@company.com" />
            </InspectorRow>
            <div className="mb-4 flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span className="text-sm font-medium">Required</span>
              <Switch defaultChecked />
            </div>
            <InspectorRow label="Help text">
              <Input defaultValue="We'll only use this to reply." />
            </InspectorRow>
            <InspectorRow label="Width">
              <Select defaultValue="full">
                <option value="full">Full</option>
                <option value="half">Half</option>
              </Select>
            </InspectorRow>
          </>
        }
        canvas={
          <div className="mx-auto max-w-lg">
            <Card className="p-6">
              <div className="mb-5">
                <div className="font-display text-lg font-semibold">Get in touch</div>
                <div className="text-sm text-muted-foreground">
                  Fill out the form and we'll get back to you shortly.
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-name">Full name</Label>
                  <Input id="form-name" placeholder="Jane Doe" />
                </div>
                <div className="flex flex-col gap-1.5 rounded-xl bg-primary-soft/40 p-3 ring-2 ring-primary">
                  <Label htmlFor="form-email">Email</Label>
                  <Input id="form-email" placeholder="you@company.com" />
                  <span className="text-xs text-muted-foreground">
                    We'll only use this to reply.
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-subject">Subject</Label>
                  <Select id="form-subject" defaultValue="general">
                    <option value="general">General enquiry</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="form-message">Message</Label>
                  <Textarea id="form-message" rows={4} placeholder="How can we help?" />
                </div>
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox className="mt-0.5" />
                  <span className="text-muted-foreground">
                    I agree to be contacted about my enquiry.
                  </span>
                </label>
                <Button type="submit" className="w-full">
                  Submit
                </Button>
              </form>
            </Card>
          </div>
        }
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Non-functional preview of the form builder.{" "}
        <Link to="/advanced/forms" className="text-primary hover:underline">
          Back to forms
        </Link>
      </p>
    </div>
  );
}
