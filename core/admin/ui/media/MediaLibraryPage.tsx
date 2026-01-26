import { UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SplitShell } from "@/ui/layouts/SplitShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { MediaDetailsPanel } from "@/ui/media/MediaDetailsPanel";
import { MediaGrid } from "@/ui/media/MediaGrid";
import { MediaToolbar } from "@/ui/media/MediaToolbar";

export function MediaLibraryPage() {
  return (
    <SplitShell
      activeHref="/admin/media"
      rightPanel={<MediaDetailsPanel />}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Home</span>
          <span>/</span>
          <span className="text-foreground">Media Library</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Media Library"
          description="Manage your images and assets."
          actions={
            <Button className="gap-2">
              <UploadCloud className="h-4 w-4" />
              Upload New
            </Button>
          }
        />
        <MediaToolbar />
        <Card className="border-border/60">
          <CardContent className="space-y-8">
            <MediaGrid />
            <div className="flex justify-center">
              <Button variant="outline">Load More Assets</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SplitShell>
  );
}
