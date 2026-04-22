import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MenuItemDeleteDialogProps = {
  open: boolean;
  itemLabel: string;
  descendantCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function MenuItemDeleteDialog({
  open,
  itemLabel,
  descendantCount,
  onOpenChange,
  onConfirm,
}: MenuItemDeleteDialogProps) {
  const hasChildren = descendantCount > 0;
  const childLabel =
    descendantCount === 1 ? "1 child item" : `${descendantCount} child items`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete menu item?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{itemLabel}</span>{" "}
            will be removed from the current draft menu.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-900">
          <p>This action cannot be undone after you save the menu.</p>
          <p>
            {hasChildren
              ? `This also removes ${childLabel}.`
              : "Only this item will be removed."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
