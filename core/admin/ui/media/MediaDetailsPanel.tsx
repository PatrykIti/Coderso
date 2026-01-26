import { Copy, Link2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function MediaDetailsPanel() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Details</h2>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <Card className="border-border/60">
        <CardContent className="space-y-4">
          <div className="aspect-[4/3] rounded-lg bg-muted" />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="uppercase">Type</p>
              <p className="text-sm text-foreground">JPG Image</p>
            </div>
            <div>
              <p className="uppercase">Size</p>
              <p className="text-sm text-foreground">2.4 MB</p>
            </div>
            <div>
              <p className="uppercase">Dimensions</p>
              <p className="text-sm text-foreground">1920 x 1080</p>
            </div>
            <div>
              <p className="uppercase">Date</p>
              <p className="text-sm text-foreground">Oct 24, 2023</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">File Name</label>
          <Input defaultValue="hero-banner_v2.jpg" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Alt Text</label>
          <Input defaultValue="Alpine mountain landscape" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Caption</label>
          <Textarea rows={3} defaultValue="Beautiful scenery captured in winter." />
        </div>
      </div>

      <Separator />

      <div className="mt-auto space-y-3">
        <Button className="w-full">Save Changes</Button>
        <Button variant="outline" className="w-full gap-2">
          <Copy className="h-4 w-4" />
          Copy Link
        </Button>
        <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
          <Link2 className="h-4 w-4" />
          Open in new tab
        </Button>
      </div>
    </div>
  );
}
