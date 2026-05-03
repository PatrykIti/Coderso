import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContentTypeSummary } from "@/services/contentTypesClient";

import type {
  CustomScreenBinding,
  CustomScreenListViewDefinition,
} from "../../../services/customScreens/customScreenSchemas";
import type { Block } from "@/ui/pages/builder/types";
import { CustomScreenEntriesTable } from "./CustomScreenEntriesTable";
import { CustomScreenPreview } from "./CustomScreenPreview";
import { buildCustomScreenPreviewEntries } from "./ListViewCanvas";
import type { CustomScreenPreviewRecordState } from "./customScreenPreviewData";

const previewDevices = [
  { id: "desktop", label: "Desktop", width: "100%", icon: Monitor },
  { id: "tablet", label: "Tablet", width: 900, icon: Tablet },
  { id: "mobile", label: "Mobile", width: 430, icon: Smartphone },
] as const;

type PreviewDeviceId = (typeof previewDevices)[number]["id"];

type CustomScreenWorkspacePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "list-view" | "editor-view";
  contentType: ContentTypeSummary | null;
  listView: CustomScreenListViewDefinition;
  blocks: Block[];
  bindings: CustomScreenBinding[];
  previewRecordState: CustomScreenPreviewRecordState;
  previewLoading?: boolean;
};

export function CustomScreenWorkspacePreviewDialog({
  open,
  onOpenChange,
  mode,
  contentType,
  listView,
  blocks,
  bindings,
  previewRecordState,
  previewLoading = false,
}: CustomScreenWorkspacePreviewDialogProps) {
  const [deviceId, setDeviceId] = useState<PreviewDeviceId>("desktop");
  const resolvedDeviceId = mode === "list-view" ? "desktop" : deviceId;
  const device = previewDevices.find((entry) => entry.id === resolvedDeviceId) ?? previewDevices[0];
  const title = mode === "list-view" ? "List View Preview" : "Editor View Preview";
  const description =
    mode === "list-view"
      ? "Preview the records table the current screen will render in the admin workspace."
      : "Preview the widget-based record surface the current screen will render for record editing.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(96vw,1600px)] max-w-none overflow-hidden p-0"
        data-preview-shell="roomy"
      >
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {previewDevices.map((entry) => {
                const Icon = entry.icon;
                const active = entry.id === device.id;
                return (
                  <Button
                    key={entry.id}
                    type="button"
                    variant={active ? "secondary" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setDeviceId(entry.id)}
                    disabled={mode === "list-view" && entry.id !== "desktop"}
                  >
                    <Icon className="h-4 w-4" />
                    {entry.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[88vh] overflow-auto bg-muted/20 p-6" data-preview-body="scrollable">
          {mode === "list-view" && !contentType ? (
            <div className="rounded-xl border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
              Select a content type to preview this screen.
            </div>
          ) : mode === "list-view" ? (
            <div className="mx-auto w-full min-w-[1100px]" data-preview-list-shell="wide">
              <CustomScreenEntriesTable
                items={buildCustomScreenPreviewEntries(contentType!)}
                listView={listView}
                buildRowHref={() => "#"}
                onDelete={() => undefined}
                preview
              />
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
              <div className="rounded-lg border border-dashed bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                {previewLoading
                  ? `Loading the first record for ${contentType?.name ?? "this content type"}. Schema fallback values are shown until preview data is ready.`
                  : (previewRecordState.note ?? "Previewing the current screen definition.")}
              </div>
              <div
                className="mx-auto w-full rounded-3xl border bg-background p-6 shadow-sm"
                data-preview-device={device.id}
                style={{
                  width: typeof device.width === "number" ? device.width : undefined,
                  minHeight: 720,
                }}
              >
                <CustomScreenPreview
                  blocks={blocks}
                  bindings={bindings}
                  data={previewRecordState.data}
                  emptyTitle="Preview unavailable"
                  emptyMessage="Add screen widgets and bindings to preview the editor view."
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
