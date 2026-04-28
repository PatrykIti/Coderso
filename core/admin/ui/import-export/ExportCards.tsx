import { ChevronDown, Database, FileText, Image } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type ExportOption = {
  id: string;
  label: string;
  defaultChecked?: boolean;
};

type ExportCard = {
  id: string;
  title: string;
  description: string;
  icon: typeof Database;
  iconClassName: string;
  checkboxClassName: string;
  buttonVariant?: "default" | "secondary" | "outline";
  buttonClassName?: string;
  options: ExportOption[];
};

const exportCards: ExportCard[] = [
  {
    id: "content-types",
    title: "Content Types",
    description: "Definitions & schemas",
    icon: Database,
    iconClassName: "bg-primary/10 text-primary",
    checkboxClassName: "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
    buttonVariant: "default",
    options: [
      { id: "fields", label: "Field definitions", defaultChecked: true },
      { id: "validation", label: "Validation rules", defaultChecked: true },
      { id: "relations", label: "Related entries" },
    ],
  },
  {
    id: "pages",
    title: "Pages",
    description: "Live & draft content",
    icon: FileText,
    iconClassName: "bg-amber-500/10 text-amber-500",
    checkboxClassName: "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
    buttonVariant: "default",
    buttonClassName:
      "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-white dark:text-slate-900",
    options: [
      { id: "hierarchy", label: "Page hierarchy", defaultChecked: true },
      { id: "seo", label: "SEO metadata", defaultChecked: true },
      { id: "revisions", label: "Revision history" },
    ],
  },
  {
    id: "media",
    title: "Media",
    description: "Library assets",
    icon: Image,
    iconClassName: "bg-purple-500/10 text-purple-500",
    checkboxClassName: "data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500",
    buttonVariant: "default",
    buttonClassName:
      "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-white dark:text-slate-900",
    options: [
      { id: "references", label: "Asset references", defaultChecked: true },
      { id: "binaries", label: "Binary files (ZIP)" },
      { id: "alt-text", label: "Alternative text", defaultChecked: true },
    ],
  },
];

type ExportCardsProps = {
  onExport: (target: string) => void;
  isExporting: boolean;
};

export function ExportCards({ onExport, isExporting }: ExportCardsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {exportCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.id} className="border-border/60">
            <CardContent className="flex h-full flex-col gap-6">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    card.iconClassName
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{card.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {card.options.map((option) => (
                  <label
                    key={option.id}
                    className="group flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <Checkbox
                      defaultChecked={option.defaultChecked}
                      className={card.checkboxClassName}
                    />
                    <span className="transition-colors group-hover:text-foreground">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <Button
                  className={cn("flex-1", card.buttonClassName)}
                  variant={card.buttonVariant}
                  disabled={isExporting}
                  onClick={() => onExport(card.id)}
                >
                  {isExporting ? "Preparing..." : "Download"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Export options"
                  disabled={isExporting}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
