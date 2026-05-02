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
  previewData: Record<string, unknown>;
};

export function CustomScreenWorkspacePreviewDialog({
  open,
  onOpenChange,
  mode,
  contentType,
  listView,
  blocks,
  bindings,
  previewData,
}: CustomScreenWorkspacePreviewDialogProps) {
  const [deviceId, setDeviceId] = useState<PreviewDeviceId>("tablet");
  const resolvedDeviceId = mode === "list-view" ? "desktop" : deviceId;
  const device = previewDevices.find((entry) => entry.id === resolvedDeviceId) ?? previewDevices[0];
  const title = mode === "list-view" ? "List View Preview" : "Editor View Preview";
  const description =
    mode === "list-view"
      ? "Preview the records table the current screen will render in the admin workspace."
      : "Preview the widget-based record surface the current screen will render for record editing.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] overflow-hidden p-0">
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
        <div className="max-h-[75vh] overflow-auto bg-muted/20 p-6">
          {!contentType ? (
            <div className="rounded-xl border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
              Select a content type to preview this screen.
            </div>
          ) : mode === "list-view" ? (
            <div className="mx-auto w-full max-w-6xl">
              <CustomScreenEntriesTable
                items={buildCustomScreenPreviewEntries(contentType)}
                listView={listView}
                buildRowHref={() => "#"}
                onDelete={() => undefined}
                preview
              />
            </div>
          ) : (
            <div
              className="mx-auto rounded-3xl border bg-background p-6 shadow-sm"
              style={{ width: typeof device.width === "number" ? device.width : undefined }}
            >
              <CustomScreenPreview
                blocks={blocks}
                bindings={bindings}
                data={previewData}
                emptyTitle="Preview unavailable"
                emptyMessage="Add screen widgets and bindings to preview the editor view."
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
