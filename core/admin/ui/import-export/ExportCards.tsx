import { ChevronDown, Database, GitBranch, Menu, Palette } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  options: ExportOption[];
};

const exportCards: ExportCard[] = [
  {
    id: "settings",
    title: "Site Settings",
    description: "Core site configuration",
    icon: Database,
    options: [{ id: "settings", label: "Settings values", defaultChecked: true }],
  },
  {
    id: "menus",
    title: "Navigation Menus",
    description: "Menu records and items",
    icon: Menu,
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
  exportingTargets: ExportTarget[];
};

export function ExportCards({ onExport, exportingTargets }: ExportCardsProps) {
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {exportCards.map((card) => {
        const Icon = card.icon;
        const selected = selectedOptions[card.id] ?? [];
        const isExporting = exportingTargets.includes(card.id);
        return (
          <Card key={card.id} className="rounded-2xl border-border shadow-soft">
            <CardContent className="flex h-full flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                  <Icon className="size-5" />
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
                    />
                    <span className="transition-colors group-hover:text-foreground">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-2">
                <Button
                  className="flex-1"
                  disabled={isExporting || selected.length === 0}
                  onClick={() => onExport({ target: card.id, include: selected })}
                >
                  {isExporting ? "Preparing..." : "Download"}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  aria-label={`${card.title} advanced export options unavailable`}
                  title="Advanced export options are not available for this export target."
                  disabled
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
