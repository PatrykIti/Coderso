import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { WidgetComplexity, WidgetLibraryTab } from "./types";

type WidgetCatalogFiltersProps = {
  tab: WidgetLibraryTab;
  onTabChange: (value: WidgetLibraryTab) => void;
  recommendedCount: number;
  allCount: number;
  advancedMode: boolean;
  onAdvancedModeChange: (enabled: boolean) => void;
  moduleFilter: string;
  onModuleFilterChange: (value: string) => void;
  moduleOptions: Array<{ value: string; label: string }>;
  complexityFilter: "all" | WidgetComplexity;
  onComplexityFilterChange: (value: "all" | WidgetComplexity) => void;
};

export function WidgetCatalogFilters({
  tab,
  onTabChange,
  recommendedCount,
  allCount,
  advancedMode,
  onAdvancedModeChange,
  moduleFilter,
  onModuleFilterChange,
  moduleOptions,
  complexityFilter,
  onComplexityFilterChange,
}: WidgetCatalogFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs
        value={tab}
        onValueChange={(value) =>
          onTabChange(value === "all" ? "all" : "recommended")
        }
        >
        <TabsList className="h-9">
          <TabsTrigger value="recommended" className="text-xs">
            Recommended <Badge variant="outline" className="ml-2 text-[10px]">{recommendedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            All widgets <Badge variant="outline" className="ml-2 text-[10px]">{allCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5"
        title="Advanced mode unlocks module and complexity filters for detailed widget discovery."
      >
        <span className="text-xs text-muted-foreground">
          Advanced mode
        </span>
        <Switch
          id="widgets-advanced-mode"
          checked={advancedMode}
          onCheckedChange={onAdvancedModeChange}
          aria-label="Toggle advanced widget filters"
        />
      </div>
      <Select value={moduleFilter} onValueChange={onModuleFilterChange}>
        <SelectTrigger className="h-9 w-[150px] text-xs">
          <SelectValue placeholder="All modules" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modules</SelectItem>
          {moduleOptions.map((module) => (
            <SelectItem key={module.value} value={module.value}>
              {module.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={complexityFilter}
        onValueChange={(value) =>
          onComplexityFilterChange(
            value === "composite" || value === "atomic" ? value : "all"
          )
        }
        disabled={!advancedMode}
      >
        <SelectTrigger className="h-9 w-[150px] text-xs">
          <SelectValue placeholder="Complexity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All complexity</SelectItem>
          <SelectItem value="composite">Composite</SelectItem>
          <SelectItem value="atomic">Atomic</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
