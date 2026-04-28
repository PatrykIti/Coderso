import { Image, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function LogoUploadCard() {
  return (
    <Card className="border-border/60">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Image className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Branding</CardTitle>
            <CardDescription>
              Upload a logo and favicon for the admin experience.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-start md:gap-8 md:space-y-0">
          <div className="space-y-3">
            <label className={labelClassName}>Site logo</label>
            <button
              type="button"
              className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-6 text-center transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Upload site logo"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Click to upload logo</p>
                <p className="text-xs text-muted-foreground">
                  PNG, SVG or WebP (max. 2MB)
                </p>
              </div>
            </button>
          </div>
          <Separator className="hidden md:block" orientation="vertical" />
          <Separator className="md:hidden" />
          <div className="space-y-3">
            <label className={labelClassName}>Favicon</label>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted/30">
                <Image className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Button variant="outline" size="sm" className="w-full">
                  Upload new
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
