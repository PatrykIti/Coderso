import { Code2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export function InspectorPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Hero Section</h3>
            <p className="text-xs text-muted-foreground">Homepage</p>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase">
            Selected
          </Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <Tabs defaultValue="content" className="gap-4">
          <TabsList variant="line">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="style">Styling</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Heading
              </label>
              <Input defaultValue="Build your system with Coderso" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Subheading
              </label>
              <Textarea
                rows={3}
                defaultValue="The headless CMS that treats your content like code."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Primary CTA
              </label>
              <Input defaultValue="Get started" />
            </div>
          </TabsContent>
          <TabsContent value="style" className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Background
              </label>
              <Input defaultValue="gradient/hero-dark" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Padding
                </label>
                <span className="text-xs text-muted-foreground">72px</span>
              </div>
              <Slider defaultValue={[72]} max={160} min={32} />
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Overlay gradient</p>
                <p className="text-xs text-muted-foreground">
                  Adds depth for readability
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </TabsContent>
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Custom ID
              </label>
              <Input defaultValue="hero" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                CSS classes
              </label>
              <Input defaultValue="hero-section bg-gradient" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                Enable custom script
              </div>
              <Switch />
            </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
