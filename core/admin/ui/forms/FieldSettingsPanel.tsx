import { GitBranch, Info, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type FieldSettings = {
  id: string;
  label: string;
  type: string;
  helper?: string;
};

type FieldSettingsPanelProps = {
  field: FieldSettings;
};

const supportsPlaceholder = new Set(["text", "email", "textarea"]);
const supportsOptions = new Set(["select"]);
const supportsDefault = new Set(["checkbox"]);

export function FieldSettingsPanel({ field }: FieldSettingsPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 p-1 text-primary">
              <Settings2 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Field Settings</p>
              <p className="text-xs text-muted-foreground">{field.label}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
            {field.type}
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 py-5">
        <Tabs defaultValue="general" className="gap-4">
          <TabsList className="w-full" variant="default">
            <TabsTrigger value="general" className="flex-1 text-xs uppercase">
              General
            </TabsTrigger>
            <TabsTrigger value="logic" className="flex-1 text-xs uppercase">
              Logic
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1 text-xs uppercase">
              Style
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Label
                </label>
                <Input defaultValue={field.label} />
              </div>
              {supportsPlaceholder.has(field.type) ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Placeholder
                  </label>
                  <Input defaultValue="John Doe" />
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Helper Text
                </label>
                <Textarea
                  rows={2}
                  defaultValue={field.helper ?? "Additional guidance for this field."}
                />
              </div>
            </div>
            {supportsOptions.has(field.type) ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Options
                  </label>
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Define the selectable values for this field.
                  </div>
                </div>
              </>
            ) : null}
            {supportsDefault.has(field.type) ? (
              <>
                <Separator />
                <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Default state</p>
                    <p className="text-xs text-muted-foreground">
                      Pre-check this option for new submissions.
                    </p>
                  </div>
                  <Switch />
                </div>
              </>
            ) : null}
            <Separator />
            <div className="space-y-4">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Validation Rules
              </label>
              <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Required Field</p>
                  <p className="text-xs text-muted-foreground">
                    Prevent empty submissions.
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Regex Pattern
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    defaultValue="^[a-zA-Z ]*$"
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon-sm" aria-label="Regex help">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
            <Separator />
            <div className="rounded-xl border bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <GitBranch className="h-4 w-4" />
                Conditional Logic
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Show this field only if &quot;Subject&quot; is set to &quot;Technical
                Support&quot;.
              </p>
              <Button variant="link" className="mt-3 h-auto p-0 text-xs">
                Edit logic rule
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="logic" className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground">
              Logic rules and visibility conditions will appear here.
            </div>
          </TabsContent>
          <TabsContent value="style" className="space-y-3">
            <div className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground">
              Typography, spacing, and accent controls will appear here.
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
      <div className="border-t p-4">
        <Button variant="secondary" className="w-full">
          Duplicate Field
        </Button>
      </div>
    </div>
  );
}
