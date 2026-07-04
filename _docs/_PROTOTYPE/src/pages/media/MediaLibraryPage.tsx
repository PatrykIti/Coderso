import {
  FileAudio,
  FileText,
  FileVideo,
  HardDrive,
  Image as ImageIcon,
  Music,
  Upload,
  Video,
} from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { SectionCard } from "@/components/patterns/SectionCard";
import { FilterBar } from "@/components/patterns/FilterBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { seeded } from "@/lib/mock";

const FOLDERS = [
  { label: "All files", icon: HardDrive, count: 248, active: true },
  { label: "Images", icon: ImageIcon, count: 182 },
  { label: "Videos", icon: Video, count: 34 },
  { label: "Documents", icon: FileText, count: 23 },
  { label: "Audio", icon: Music, count: 9 },
];

const KINDS = [
  { icon: ImageIcon, type: "Image", ext: "png", tone: "bg-primary-soft text-primary-soft-foreground" },
  { icon: FileVideo, type: "Video", ext: "mp4", tone: "bg-info-soft text-info" },
  { icon: FileText, type: "Doc", ext: "pdf", tone: "bg-warning-soft text-warning" },
  { icon: FileAudio, type: "Audio", ext: "mp3", tone: "bg-success-soft text-success" },
  { icon: ImageIcon, type: "Image", ext: "jpg", tone: "bg-primary-soft text-primary-soft-foreground" },
];

const NAMES = [
  "hero-banner",
  "team-photo",
  "product-demo",
  "brand-guide",
  "podcast-ep12",
  "landing-cover",
  "feature-grid",
  "onboarding-clip",
  "pricing-sheet",
  "ambient-loop",
  "blog-thumb",
  "office-tour",
  "case-study",
  "intro-jingle",
  "gallery-01",
];

const MEDIA = NAMES.map((name, index) => {
  const kind = KINDS[index % KINDS.length];
  return {
    name: `${name}.${kind.ext}`,
    size: `${seeded(index, 9, 0.3).toFixed(1)} MB`,
    icon: kind.icon,
    type: kind.type,
    tone: kind.tone,
  };
});

export function MediaLibraryPage() {
  return (
    <div>
      <PageHeader
        title="Media library"
        description="Browse, organize, and reuse images, video, and files."
        actions={
          <Button className="gap-1.5">
            <Upload className="size-4" /> Upload
          </Button>
        }
      />

      <SectionCard
        title="Storage"
        description="6.2 GB of 10 GB used"
        icon={<HardDrive className="size-4" />}
        className="mb-6"
        action={
          <Button variant="outline" size="sm">
            Manage plan
          </Button>
        }
      >
        <Progress value={62} className="h-2.5" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>62% used</span>
          <span className="tabular-nums">3.8 GB available</span>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="flex flex-col gap-1">
          {FOLDERS.map((folder) => (
            <button
              key={folder.label}
              type="button"
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                folder.active
                  ? "bg-primary-soft font-medium text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2.5">
                <folder.icon className="size-4" />
                {folder.label}
              </span>
              <span className="text-xs tabular-nums">{folder.count}</span>
            </button>
          ))}
        </nav>

        <div>
          <FilterBar searchPlaceholder="Search media…" view="grid" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {MEDIA.map((item) => (
              <Card
                key={item.name}
                className="group overflow-hidden p-2 transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div className="relative flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <item.icon className="size-8" />
                  <Badge variant="outline" className="absolute left-2 top-2 bg-card/80 backdrop-blur">
                    {item.type}
                  </Badge>
                </div>
                <div className="px-1 pb-1 pt-2.5">
                  <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.size}</span>
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-md [&_svg]:size-3",
                        item.tone,
                      )}
                    >
                      <item.icon />
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
