import { Eye, Redo2, Save, Send, Undo2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PostEditorTopBarProps = {
  status: string;
  dirty: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveDraft: () => void;
  onPreview: () => void;
  onPublish: () => void;
};

const statusLabel: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  scheduled: "Scheduled",
  archived: "Archived",
};

const statusStyle: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  published: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  archived: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export function PostEditorTopBar({
  status,
  dirty,
  saving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveDraft,
  onPreview,
  onPublish,
}: PostEditorTopBarProps) {
  return (
    <div className="border-b bg-background px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={statusStyle[status] ?? statusStyle.draft}
        >
          {statusLabel[status] ?? status}
        </Badge>
        {dirty ? (
          <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600">
            Unsaved changes
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
            Synced
          </Badge>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="mr-2 h-4 w-4" />
            Redo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreview}
          >
            <Eye className="mr-2 h-4 w-4" />
            Runtime preview
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onSaveDraft}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <Button type="button" size="sm" onClick={onPublish}>
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
