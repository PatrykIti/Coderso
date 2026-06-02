import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";

import { useAdminBasePath } from "@/ui/contexts/AdminBasePathContext";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { isExternalHref, resolveAdminHref } from "@/utils/adminPaths";

export type AdminLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
};

const shouldIgnoreClick = (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.defaultPrevented) return true;
  if (event.button > 0) return true;
  if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return true;
  return false;
};

export const AdminLink = forwardRef<HTMLAnchorElement, AdminLinkProps>(
  (
    {
      href,
      onClick,
      onMouseEnter,
      onFocus,
      prefetch = false,
      replace = false,
      target,
      download,
      ...props
    },
    ref
  ) => {
    const adminBasePath = useAdminBasePath();
    const { navigate, prefetch: prefetchRoute } = useAdminRouter();
    const resolvedHref = resolveAdminHref(adminBasePath, href);

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (shouldIgnoreClick(event)) return;
      if (target === "_blank" || download) return;
      if (event.currentTarget.dataset.adminNoSpa === "true") return;
      if (isExternalHref(resolvedHref)) return;
      event.preventDefault();
      navigate(resolvedHref, { replace });
    };

    const handlePrefetch = () => {
      if (!prefetch) return;
      if (isExternalHref(resolvedHref)) return;
      prefetchRoute(resolvedHref);
    };

    return (
      <a
        ref={ref}
        href={resolvedHref}
        onClick={handleClick}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          handlePrefetch();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          handlePrefetch();
        }}
        target={target}
        download={download}
        {...props}
      />
    );
  }
);

AdminLink.displayName = "AdminLink";
