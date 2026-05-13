import { Badge } from "@/components/ui/badge";
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
  isCreateMode?: boolean;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelClassName?: string;
  children: React.ReactNode;
};

export function CustomScreenShell({
  name,
  status,
  hasUnsavedChanges,
  isCreateMode,
  leftPanel,
  rightPanel,
  rightPanelClassName,
  children,
}: CustomScreenShellProps) {
  const resolvedName = name.trim().length > 0 ? name : isCreateMode ? "New screen" : "Untitled";
  return (
    <EditorShell
      activeHref="/admin/advanced/custom-screens"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      rightPanelClassName={rightPanelClassName}
      breadcrumbs={["Coderso", "Screens", resolvedName]}
      topbarActions={
        <div className="flex items-center gap-2">
          <Badge
            variant={status === "active" ? "default" : "outline"}
            className="ml-1 text-[10px] uppercase"
          >
            {statusLabelMap[status] ?? status}
          </Badge>
          {hasUnsavedChanges ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              Unsaved changes
            </span>
          ) : null}
        </div>
      }
    >
      {children}
    </EditorShell>
  );
}
