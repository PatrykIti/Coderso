import { useEffect, useRef } from "react";

export const shouldReturnFocus = (
  previousActive: boolean,
  nextActive: boolean
) => previousActive && !nextActive;

type UseFocusReturnOptions<TElement extends HTMLElement> = {
  active: boolean;
  targetRef: React.RefObject<TElement | null>;
};

export function useFocusReturn<TElement extends HTMLElement>({
  active,
  targetRef,
}: UseFocusReturnOptions<TElement>) {
  const previousActiveRef = useRef(active);

  useEffect(() => {
    if (shouldReturnFocus(previousActiveRef.current, active)) {
      const timer = window.setTimeout(() => {
        targetRef.current?.focus();
      }, 0);
      previousActiveRef.current = active;
      return () => window.clearTimeout(timer);
    }
    previousActiveRef.current = active;
    return undefined;
  }, [active, targetRef]);
}
