import { Layers3, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ContentTypeSummary } from "@/services/contentTypesClient";
import type { CustomScreenStatus } from "@/services/customScreensClient";
import { AdminLink } from "@/ui/shared/AdminLink";

type CustomScreenCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTypes: ContentTypeSummary[];
  onCreate: (payload: {
    name: string;
    contentTypeId: string;
    status: CustomScreenStatus;
    showInSidebar: boolean;
    sidebarLabel: string | null;
    openAfterCreate: boolean;
  }) => Promise<void> | void;
  openAfterCreate: boolean;
  onOpenAfterCreateChange: (value: boolean) => void;
  isSubmitting?: boolean;
  error?: string | null;
};

export function CustomScreenCreateDrawer({
  open,
  onOpenChange,
  contentTypes,
  onCreate,
  openAfterCreate,
  onOpenAfterCreateChange,
  isSubmitting = false,
  error,
}: CustomScreenCreateDrawerProps) {
  const [name, setName] = useState("");
  const [contentTypeId, setContentTypeId] = useState("");
  const [status, setStatus] = useState<CustomScreenStatus>("draft");
  const [showInSidebar, setShowInSidebar] = useState(false);
  const [sidebarLabel, setSidebarLabel] = useState("");

  const canSubmit = useMemo(
    () =>
      name.trim().length > 0 &&
      contentTypeId.trim().length > 0 &&
      contentTypes.length > 0,
    [contentTypeId, contentTypes.length, name]
  );
  const titleHint =
    contentTypes.length === 0
      ? "Create a content type before adding a custom screen."
      : name.trim().length === 0
        ? "Screen name is required before you can create the screen."
        : contentTypeId.trim().length === 0
          ? "Select a content type to enable Create Custom Screen."
          : "Ready to create the custom screen.";

  const handleSubmit = () => {
    if (!canSubmit || isSubmitting) return;
    onCreate({
      name: name.trim(),
      contentTypeId,
      status,
      showInSidebar,
      sidebarLabel:
        showInSidebar && sidebarLabel.trim().length > 0
          ? sidebarLabel.trim()
          : null,
      openAfterCreate,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full min-h-0 w-full flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <SheetTitle>Create Custom Screen</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Start from a content type and configure the builder next.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close create custom screen drawer"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-5">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create custom screen</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {contentTypes.length === 0 ? (
              <Alert>
                <AlertTitle>No content types available</AlertTitle>
                <AlertDescription>
                  Add a content type in{" "}
                  <AdminLink href="/coderso/engine" className="underline" prefetch>
                    Engine
                  </AdminLink>{" "}
                  before creating a custom screen.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Screen name
              </label>
              <Input
                placeholder="e.g. Product workspace"
                value={name}
                aria-describedby="custom-screen-create-name-hint"
                onChange={(event) => setName(event.target.value)}
              />
              <p
                id="custom-screen-create-name-hint"
                className="text-xs text-muted-foreground"
              >
                {name.trim().length === 0
                  ? "Name is required before you can create the custom screen."
                  : "The builder keeps the detailed layout and bindings."}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Content type
              </label>
              <Select
                value={contentTypeId || undefined}
                onValueChange={setContentTypeId}
                disabled={contentTypes.length === 0}
              >
                <SelectTrigger className="h-10">
                  <Layers3 className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Status
              </label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as CustomScreenStatus)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <label
                htmlFor="custom-screen-show-sidebar"
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <Checkbox
                  id="custom-screen-show-sidebar"
                  checked={showInSidebar}
                  onCheckedChange={(checked) => setShowInSidebar(checked === true)}
                />
                <span>
                  Add sidebar shortcut
                  {status === "draft"
                    ? " after activation"
                    : " for active admin navigation"}
                </span>
              </label>
              {showInSidebar ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Sidebar label
                  </label>
                  <Input
                    placeholder={name.trim() || "Shortcut label"}
                    value={sidebarLabel}
                    onChange={(event) => setSidebarLabel(event.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <Separator />
        <div className="bg-muted/30 px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label
              htmlFor="custom-screen-open-after-create"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="custom-screen-open-after-create"
                checked={openAfterCreate}
                onCheckedChange={(checked) =>
                  onOpenAfterCreateChange(checked === true)
                }
              />
              Open in builder after create
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Custom Screen"}
              </Button>
            </div>
          </div>
          {!canSubmit ? (
            <p className="mt-3 text-xs text-muted-foreground">{titleHint}</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
