import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export type PostEditorPreferences = {
  focusModeOnOpen: boolean;
  compactSidePanels: boolean;
  showOutlineHints: boolean;
};

type PostEditorSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: PostEditorPreferences;
  onChange: (next: PostEditorPreferences) => void;
  onReset: () => void;
};

export function PostEditorSettingsDialog({
  open,
  onOpenChange,
  preferences,
  onChange,
  onReset,
}: PostEditorSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editor settings</DialogTitle>
          <DialogDescription>
            Configure how the post editor opens and how panel chrome is displayed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Open in full width mode</p>
              <p className="text-xs text-muted-foreground">
                Hide side panels by default when opening posts.
              </p>
            </div>
            <Switch
              checked={preferences.focusModeOnOpen}
              onCheckedChange={(checked) =>
                onChange({ ...preferences, focusModeOnOpen: checked })
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Compact side panels</p>
              <p className="text-xs text-muted-foreground">
                Reduce left/right panel width to maximize writing space.
              </p>
            </div>
            <Switch
              checked={preferences.compactSidePanels}
              onCheckedChange={(checked) =>
                onChange({ ...preferences, compactSidePanels: checked })
              }
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Show outline hints</p>
              <p className="text-xs text-muted-foreground">
                Display helper text in the document outline panel.
              </p>
            </div>
            <Switch
              checked={preferences.showOutlineHints}
              onCheckedChange={(checked) =>
                onChange({ ...preferences, showOutlineHints: checked })
              }
            />
          </label>
        </div>

        <DialogFooter className="justify-between">
          <Button type="button" variant="outline" onClick={onReset}>
            Reset defaults
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
