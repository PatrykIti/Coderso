import { ArrowLeft, Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorShell } from "@/ui/layouts/EditorShell";
import type { CustomScreenStatus } from "@/services/customScreensClient";

const statusLabelMap: Record<CustomScreenStatus, string> = {
  draft: "Draft",
  active: "Active",
};

export type CustomScreenShellProps = {
  name: string;
  status: CustomScreenStatus;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isCreateMode?: boolean;
  saveDisabled?: boolean;
  additionalActions?: React.ReactNode;
  onSave: () => void;
  onBack: () => void;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelClassName?: string;
  children: React.ReactNode;
};

export function CustomScreenShell({
  name,
  status,
  hasUnsavedChanges,
  isSaving,
  isCreateMode,
  saveDisabled,
  additionalActions,
  onSave,
  onBack,
  leftPanel,
  rightPanel,
  rightPanelClassName,
  children,
}: CustomScreenShellProps) {
  const resolvedName = name.trim().length > 0 ? name : isCreateMode ? "New screen" : "Untitled";
  return (
    <EditorShell
      activeHref="/admin/coderso/custom-screens"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      rightPanelClassName={rightPanelClassName}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Coderso</span>
          <span>/</span>
          <span>Screens</span>
          <span>/</span>
          <span className="text-foreground">{resolvedName}</span>
          <Badge variant={status === "active" ? "default" : "outline"} className="ml-1 text-[10px] uppercase">
            {statusLabelMap[status] ?? status}
          </Badge>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
      topbarActions={
        <div className="flex items-center gap-2">
          {additionalActions}
          <Button variant="outline" size="sm" className="gap-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={onSave}
            disabled={Boolean(saveDisabled) || isSaving}
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : isCreateMode ? "Create screen" : "Save screen"}
          </Button>
        </div>
      }
    >
      {children}
    </EditorShell>
  );
}
