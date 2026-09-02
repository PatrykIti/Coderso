import { useCallback, useRef } from "react";

export type FocusReturnTarget = "inserter" | "outline" | "details";

type FocusReturnTargetElement = React.RefObject<HTMLElement | null> | HTMLElement;

type FocusableRef = FocusReturnTargetElement | null;

type FocusReturnHandle = {
  capture: (target: FocusReturnTarget, element?: FocusableRef) => void;
  returnFocus: (target: FocusReturnTarget) => void;
  clear: (target?: FocusReturnTarget) => void;
};

/** `HTMLElement` instance test kept SSR-safe: in a DOM-less environment no
 * element instances can exist, so every surviving value is a ref object. */
const isElementInstance = (value: FocusReturnTargetElement): value is HTMLElement =>
  typeof HTMLElement !== "undefined" && value instanceof HTMLElement;

const resolveElement = (value?: FocusableRef): HTMLElement | null => {
  if (!value) return null;
  if (isElementInstance(value)) return value;
  return value.current ?? null;
};

export const shouldReturnFocus = (wasOpen: boolean, isOpen: boolean) => wasOpen && !isOpen;

export function useFocusReturn(): FocusReturnHandle {
  const openersRef = useRef<Record<FocusReturnTarget, HTMLElement | null>>({
    inserter: null,
    outline: null,
    details: null,
  });

  const capture = useCallback((target: FocusReturnTarget, element?: FocusableRef) => {
    if (typeof document === "undefined") return;
    const resolved = resolveElement(element) ?? (document.activeElement as HTMLElement | null);
    if (!resolved) return;
    openersRef.current[target] = resolved;
  }, []);

  const returnFocus = useCallback((target: FocusReturnTarget) => {
    const resolved = openersRef.current[target];
    if (!resolved) return;
    if (!resolved.isConnected) return;
    if (typeof resolved.focus !== "function") return;
    resolved.focus();
  }, []);

  const clear = useCallback((target?: FocusReturnTarget) => {
    if (target) {
      openersRef.current[target] = null;
      return;
    }
    openersRef.current = {
      inserter: null,
      outline: null,
      details: null,
    };
  }, []);

  return { capture, returnFocus, clear };
}
