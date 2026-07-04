import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

/**
 * Tiny hash router — zero dependencies so the prototype runs from any static host
 * (and `npm run dev`) and supports back/forward + shareable URLs while clicking through.
 */

type RouterValue = {
  path: string;
  navigate: (to: string) => void;
};

const RouterContext = createContext<RouterValue>({ path: "/", navigate: () => {} });

const isExternal = (to: string) => /^https?:\/\//.test(to) || to.startsWith("mailto:");

const normalize = (raw: string) => {
  const value = raw.replace(/^#/, "");
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
};

const readHash = () =>
  typeof window === "undefined" ? "/" : normalize(window.location.hash);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => readHash());

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", "#/");
    }
    const onHash = () => setPath(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((to: string) => {
    if (isExternal(to)) {
      window.open(to, "_blank", "noopener,noreferrer");
      return;
    }
    const target = to.startsWith("/") ? to : `/${to}`;
    window.location.hash = `#${target}`;
    window.requestAnimationFrame(() => {
      const scroller = document.querySelector("[data-app-scroll]");
      if (scroller) scroller.scrollTo({ top: 0 });
      else window.scrollTo({ top: 0 });
    });
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);
export const usePath = () => useContext(RouterContext).path;

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const external = isExternal(to);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (external || event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to);
  };
  const href = external ? to : `#${to.startsWith("/") ? to : `/${to}`}`;
  return (
    <a
      href={href}
      onClick={handleClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
      {...rest}
    >
      {children}
    </a>
  );
}
