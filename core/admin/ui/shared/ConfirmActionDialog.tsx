import { useEffect, useRef, useState, type ReactNode } from "react";

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
import { Input } from "@/components/ui/input";

export type ConfirmAction = {
  title: string;
  description: ReactNode;
  targetLabel?: string;
  confirmLabel: string;
  variant: "destructive" | "warning";
  requireTypedValue?: string;
  onConfirm: () => void | Promise<void>;
};

type ConfirmActionDialogBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancelLabel?: string;
  isConfirming?: boolean;
  confirmingLabel?: string;
  tone?: "destructive" | "warning";
  closeOnConfirm?: boolean;
  closeOnSuccess?: boolean;
  requireTypedValue?: string;
  targetLabel?: string;
  children?: ReactNode;
};

type ConfirmActionDialogProps = ConfirmActionDialogBaseProps &
  (
    | {
        action: ConfirmAction;
        title?: string;
        description?: ReactNode;
        confirmLabel?: string;
        onConfirm?: () => void | Promise<void>;
      }
    | {
        action?: undefined;
        title: string;
        description: ReactNode;
        confirmLabel: string;
        onConfirm: () => void | Promise<void>;
      }
  );

const toErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Action failed. Review the issue and try again.";

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
  closeOnConfirm = true,
  closeOnSuccess,
  requireTypedValue,
  targetLabel,
  children,
  action,
}: ConfirmActionDialogProps) {
  const [internalConfirming, setInternalConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typedValue, setTypedValue] = useState("");
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const resolvedTitle = action?.title ?? title ?? "Confirm action";
  const resolvedDescription = action?.description ?? description ?? "Confirm this action.";
  const resolvedConfirmLabel = action?.confirmLabel ?? confirmLabel ?? "Confirm";
  const resolvedTone = action?.variant ?? tone;
  const resolvedTargetLabel = action?.targetLabel ?? targetLabel;
  const resolvedRequiredValue = action?.requireTypedValue ?? requireTypedValue;
  const resolvedOnConfirm = action?.onConfirm ?? onConfirm;
  const shouldCloseOnSuccess = closeOnSuccess ?? closeOnConfirm;
  const confirming = isConfirming || internalConfirming;
  const typedConfirmationMatches =
    !resolvedRequiredValue || typedValue.trim() === resolvedRequiredValue;

  useEffect(() => {
    if (open && !wasOpenRef.current && typeof document !== "undefined") {
      openerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    wasOpenRef.current = open;
  }, [open]);

  const resetDialogState = () => {
    setError(null);
    setTypedValue("");
  };

  const restoreFocus = () => {
    const opener = openerRef.current;
    if (!opener) return;
    window.setTimeout(() => opener.focus(), 0);
  };

  const closeDialog = () => {
    resetDialogState();
    onOpenChange(false);
    restoreFocus();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (confirming && !nextOpen) return;
    if (!nextOpen) resetDialogState();
    onOpenChange(nextOpen);
    if (!nextOpen) restoreFocus();
  };

  const handleConfirm = async () => {
    if (!resolvedOnConfirm || confirming || !typedConfirmationMatches) return;
    setError(null);
    setInternalConfirming(true);
    try {
      await resolvedOnConfirm();
      if (shouldCloseOnSuccess) closeDialog();
    } catch (confirmError) {
      setError(toErrorMessage(confirmError));
    } finally {
      setInternalConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        {resolvedTargetLabel ? (
          <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
            {resolvedTargetLabel}
          </p>
        ) : null}
        {children ? (
          <Alert variant={resolvedTone}>
            <AlertDescription>{children}</AlertDescription>
          </Alert>
        ) : null}
        {resolvedRequiredValue ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm-action-typed-value">
              Type {resolvedRequiredValue} to confirm
            </label>
            <Input
              id="confirm-action-typed-value"
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              onInput={(event) => setTypedValue(event.currentTarget.value)}
              disabled={confirming}
              autoComplete="off"
            />
          </div>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button
            variant={resolvedTone === "destructive" ? "destructive" : "default"}
            onClick={() => void handleConfirm()}
            disabled={confirming || !typedConfirmationMatches || !resolvedOnConfirm}
          >
            {confirming ? (confirmingLabel ?? resolvedConfirmLabel) : resolvedConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
