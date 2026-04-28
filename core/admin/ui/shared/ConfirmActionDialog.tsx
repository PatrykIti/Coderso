import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  cancelLabel?: string;
  isConfirming?: boolean;
  confirmingLabel?: string;
  tone?: "destructive" | "warning";
  children?: ReactNode;
};

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  onOpenChange,
  onConfirm,
  cancelLabel = "Cancel",
  isConfirming = false,
  confirmingLabel,
  tone = "destructive",
  children,
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children ? (
          <Alert variant={tone}>
            <AlertDescription>{children}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void onConfirm()}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
