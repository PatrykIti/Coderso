import { ChevronDown, Database, GitBranch, Menu, Palette } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type {
  ExportIncludeOption,
  ExportRequest,
  ExportTarget,
} from "@/services/importExportClient";

type ExportOption = {
  id: ExportIncludeOption;
  label: string;
  defaultChecked?: boolean;
};

type ExportCard = {
  id: ExportTarget;
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
    id: "settings",
    title: "Site Settings",
    description: "Core site configuration",
    icon: Database,
    iconClassName: "bg-primary/10 text-primary",
    checkboxClassName: "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
    buttonVariant: "default",
    options: [{ id: "settings", label: "Settings values", defaultChecked: true }],
  },
  {
    id: "menus",
    title: "Navigation Menus",
    description: "Menu records and items",
    icon: Menu,
    iconClassName: "bg-amber-500/10 text-amber-500",
    checkboxClassName: "data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
    buttonVariant: "default",
    buttonClassName:
      "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-white dark:text-slate-900",
    options: [
      { id: "menus", label: "Menu records", defaultChecked: true },
      { id: "menu-items", label: "Menu items", defaultChecked: true },
    ],
  },
  {
    id: "themes",
    title: "Theme Configuration",
    description: "Public and admin themes",
    icon: Palette,
    iconClassName: "bg-emerald-500/10 text-emerald-600",
    checkboxClassName:
      "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",
    buttonVariant: "default",
    buttonClassName:
      "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-white dark:text-slate-900",
    options: [
      { id: "theme-profiles", label: "Theme profiles", defaultChecked: true },
      { id: "theme-routes", label: "Theme routes", defaultChecked: true },
      { id: "admin-theme-templates", label: "Admin theme templates", defaultChecked: true },
      { id: "admin-theme-profiles", label: "Admin theme profiles", defaultChecked: true },
    ],
  },
  {
    id: "redirects",
    title: "Redirect Rules",
    description: "URL redirect records",
    icon: GitBranch,
    iconClassName: "bg-rose-500/10 text-rose-600",
    checkboxClassName: "data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500",
    buttonVariant: "default",
    buttonClassName:
      "bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-white dark:text-slate-900",
    options: [{ id: "redirects", label: "Redirect rules", defaultChecked: true }],
  },
];

const dependencyMap: Partial<Record<ExportIncludeOption, ExportIncludeOption[]>> = {
  "menu-items": ["menus"],
  "theme-routes": ["theme-profiles"],
  "admin-theme-profiles": ["admin-theme-templates"],
};

const dependentMap: Partial<Record<ExportIncludeOption, ExportIncludeOption[]>> = {
  menus: ["menu-items"],
  "theme-profiles": ["theme-routes"],
  "admin-theme-templates": ["admin-theme-profiles"],
};

const createDefaultSelections = () =>
  Object.fromEntries(
    exportCards.map((card) => [
      card.id,
      card.options.filter((option) => option.defaultChecked).map((option) => option.id),
    ])
  ) as Record<ExportTarget, ExportIncludeOption[]>;

type ExportCardsProps = {
  onExport: (request: ExportRequest) => void;
  isExporting: boolean;
};

export function ExportCards({ onExport, isExporting }: ExportCardsProps) {
  const [selectedOptions, setSelectedOptions] = useState(createDefaultSelections);

  const updateOption = (cardId: ExportTarget, optionId: ExportIncludeOption, checked: boolean) => {
    setSelectedOptions((current) => {
      const next = new Set(current[cardId]);
      if (checked) {
        next.add(optionId);
        for (const dependency of dependencyMap[optionId] ?? []) {
          next.add(dependency);
        }
      } else {
        next.delete(optionId);
        for (const dependent of dependentMap[optionId] ?? []) {
          next.delete(dependent);
        }
      }
      return {
        ...current,
        [cardId]: Array.from(next),
      };
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {exportCards.map((card) => {
        const Icon = card.icon;
        const selected = selectedOptions[card.id] ?? [];
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
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
              </div>
              <div className="space-y-3">
                {card.options.map((option) => (
                  <label
                    key={option.id}
                    className="group flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <Checkbox
                      checked={selected.includes(option.id)}
                      onCheckedChange={(checked) =>
                        updateOption(card.id, option.id, checked === true)
                      }
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
                  disabled={isExporting || selected.length === 0}
                  onClick={() => onExport({ target: card.id, include: selected })}
                >
                  {isExporting ? "Preparing..." : "Download"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label={`${card.title} advanced export options unavailable`}
                  title="Advanced export options are not available for this export target."
                  disabled
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
