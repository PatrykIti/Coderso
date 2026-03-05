import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { PostEditorPreferences } from "./postEditorPreferences";

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
  const setPreference = <K extends keyof PostEditorPreferences>(
    key: K,
    value: PostEditorPreferences[K]
  ) => {
    onChange({ ...preferences, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editor settings</DialogTitle>
          <DialogDescription>
            Configure startup behavior, panel defaults, and writing guidance for post editor.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <section className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-semibold">Startup</p>
              <p className="text-xs text-muted-foreground">
                Decide how editor opens and which defaults should be applied per post.
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Open in focus mode</p>
                <p className="text-xs text-muted-foreground">
                  Start with side panels hidden to maximize writing area.
                </p>
              </div>
              <Switch
                checked={preferences.focusModeOnOpen}
                onCheckedChange={(checked) => setPreference("focusModeOnOpen", checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Restore panel state</p>
                <p className="text-xs text-muted-foreground">
                  Reopen side panels and tab context from previous editor session.
                </p>
              </div>
              <Switch
                checked={preferences.restoreLastSidebarsState}
                onCheckedChange={(checked) =>
                  setPreference("restoreLastSidebarsState", checked)
                }
              />
            </label>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Default inspector tab</label>
              <Select
                value={preferences.defaultInspectorTab}
                onValueChange={(value) =>
                  setPreference(
                    "defaultInspectorTab",
                    value === "block" ? "block" : "post"
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose default inspector tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Post</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-semibold">Panels and density</p>
              <p className="text-xs text-muted-foreground">
                Tune rail width and visual density for your daily editing rhythm.
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Compact side panels</p>
                <p className="text-xs text-muted-foreground">
                  Reduce left and right rail widths to free additional canvas space.
                </p>
              </div>
              <Switch
                checked={preferences.compactSidePanels}
                onCheckedChange={(checked) => setPreference("compactSidePanels", checked)}
              />
            </label>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Editor density</label>
              <Select
                value={preferences.editorDensity}
                onValueChange={(value) =>
                  setPreference(
                    "editorDensity",
                    value === "compact" ? "compact" : "comfortable"
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose editor density" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-semibold">Guidance</p>
              <p className="text-xs text-muted-foreground">
                Show or hide contextual hints in outline and list views.
              </p>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Show outline hints</p>
                <p className="text-xs text-muted-foreground">
                  Display heading hierarchy warnings in outline mode.
                </p>
              </div>
              <Switch
                checked={preferences.showOutlineHints}
                onCheckedChange={(checked) => setPreference("showOutlineHints", checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Show keyboard hints</p>
                <p className="text-xs text-muted-foreground">
                  Show keyboard reorder shortcuts in list view sidebar.
                </p>
              </div>
              <Switch
                checked={preferences.showKeyboardHints}
                onCheckedChange={(checked) => setPreference("showKeyboardHints", checked)}
              />
            </label>
          </section>
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
