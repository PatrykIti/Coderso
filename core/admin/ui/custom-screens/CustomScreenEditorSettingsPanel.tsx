import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type ScreenEditorContentTypeOption = {
  id: string;
  name: string;
};

export type ScreenEditorSettingsValues = {
  name: string;
  contentTypeId: string;
  status: "draft" | "active";
  showInSidebar: boolean;
  sidebarLabel: string;
};

export type ScreenEditorSettingsActions = {
  onNameChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onStatusChange: (value: "draft" | "active") => void;
  onShowInSidebarChange: (value: boolean) => void;
  onSidebarLabelChange: (value: string) => void;
};

export type CustomScreenEditorSettingsPanelProps = {
  values: ScreenEditorSettingsValues;
  contentTypes: ScreenEditorContentTypeOption[];
  actions: ScreenEditorSettingsActions;
};

export type ScreenBindingOrphanPresentation = {
  count: number;
  fieldNames: string[];
  onRemove: () => void;
};

export function CustomScreenBindingOrphanAlert({
  count,
  fieldNames,
  onRemove,
}: ScreenBindingOrphanPresentation) {
  if (count === 0) return null;
  return (
    <Alert data-screen-orphan-notice="true">
      <AlertTitle>Orphaned field bindings</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {count} binding(s) reference{" "}
          {fieldNames.length > 0 ? `deleted field(s): ${fieldNames.join(", ")}` : "removed blocks"}.
          They block saving until removed.
        </span>
        <Button variant="outline" size="sm" onClick={onRemove} data-screen-remove-orphans="true">
          Remove orphaned bindings
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function CustomScreenEditorSettingsPanel({
  values,
  contentTypes,
  actions,
}: CustomScreenEditorSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Screen name
        </p>
        <Input
          value={values.name}
          onChange={(event) => actions.onNameChange(event.target.value)}
          placeholder="Custom screen name"
        />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content type
        </p>
        <Select value={values.contentTypeId} onValueChange={actions.onContentTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            {contentTypes.length === 0 ? (
              <SelectItem value="no-content-types" disabled>
                No content types available
              </SelectItem>
            ) : (
              contentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </p>
        <Select
          value={values.status}
          onValueChange={(value) => actions.onStatusChange(value as "draft" | "active")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sidebar shortcut
        </p>
        <div className="flex h-10 items-center justify-between rounded-md border px-3">
          <span className="text-sm text-muted-foreground">Show records workflow in left menu</span>
          <Switch
            checked={values.showInSidebar}
            onCheckedChange={(checked) => actions.onShowInSidebarChange(checked === true)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sidebar label
        </p>
        <Input
          value={values.sidebarLabel}
          onChange={(event) => actions.onSidebarLabelChange(event.target.value)}
          placeholder={values.name.trim() || "Use screen name"}
          disabled={!values.showInSidebar}
        />
        <p className="text-xs text-muted-foreground">
          When empty, the shortcut uses the screen name.
        </p>
      </div>
    </div>
  );
}
