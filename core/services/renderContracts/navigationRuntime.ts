// Runtime DOM bindings + client script for the navigation widget renderer.
// Split out of navigationRenderer.tsx so that module stays under the 1000-line
// gate; this module is Bun-free and depends only on DOM APIs.

const navigationRootSelector = '[data-navigation-widget="1"]';
const navigationLinkSelector = '[data-navigation-link="1"]';
const navigationSubmenuToggleSelector = '[data-navigation-submenu-toggle="1"]';
const navigationMobileToggleSelector = "[data-navigation-mobile-toggle]";
const navigationMobilePanelSelector = "[data-navigation-mobile-panel]";
const navigationFocusableSelector =
  'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const navigationDrawerAnimationMs = 180;
const navigationCollapseThreshold = 24;
const navigationCollapseJitter = 16;

type NavigationScrollTarget = Window | HTMLElement;

type NavigationRuntimeBindOptions = {
  scrollTarget?: NavigationScrollTarget | null;
};

const findNavigationRoots = (container: ParentNode): HTMLElement[] => {
  if (typeof HTMLElement === "undefined") return [];
  const roots: HTMLElement[] = [];
  if (container instanceof HTMLElement && container.matches(navigationRootSelector)) {
    roots.push(container);
  }
  roots.push(
    ...Array.from(container.querySelectorAll(navigationRootSelector)).filter(
      (node): node is HTMLElement => node instanceof HTMLElement
    )
  );
  return roots;
};

const getNavigationOwnerDocument = (root: HTMLElement) => root.ownerDocument ?? document;

const getNavigationWindow = (root: HTMLElement) =>
  getNavigationOwnerDocument(root).defaultView ?? window;

const getNavigationScrollY = (target: NavigationScrollTarget) =>
  target instanceof Window ? target.scrollY : target.scrollTop;

const parseNavigationScrollY = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isNavigationCollapsed = (root: HTMLElement) => root.dataset.navigationCollapsed === "true";

function resolveNavigationCollapsedState(
  currentY: number,
  previousY: number,
  wasCollapsed: boolean
): boolean {
  const delta = currentY - previousY;
  if (currentY <= navigationCollapseThreshold) return false;
  if (delta > navigationCollapseJitter) return true;
  if (delta < -navigationCollapseJitter) return false;
  return wasCollapsed;
}

function syncNavigationCollapsedState(root: HTMLElement, collapsed: boolean): void {
  root.dataset.navigationCollapsed = collapsed ? "true" : "false";
  root.classList.toggle("is-navigation-collapsed", collapsed);
}

function shouldStoreNavigationScrollY(currentY: number, previousY: number): boolean {
  return (
    currentY <= navigationCollapseThreshold ||
    Math.abs(currentY - previousY) > navigationCollapseJitter
  );
}

const getNavigationFocusableElements = (container: HTMLElement): HTMLElement[] => {
  if (typeof HTMLElement === "undefined") return [];
  return Array.from(container.querySelectorAll(navigationFocusableSelector)).filter(
    (candidate): candidate is HTMLElement => {
      if (!(candidate instanceof HTMLElement)) return false;
      if (candidate.hidden) return false;
      if (candidate.getAttribute("aria-hidden") === "true") return false;
      return candidate.offsetParent !== null || candidate === container.ownerDocument.activeElement;
    }
  );
};

const parseNavigationRuntimeUrl = (root: HTMLElement, href: string | null) => {
  if (!href || href.startsWith("#")) return null;
  try {
    const ownerWindow = getNavigationWindow(root);
    return new URL(href, ownerWindow.location.origin);
  } catch {
    return null;
  }
};

const resolveNavigationMatchingPath = (
  root: HTMLElement,
  href: string | null,
  mode: string | undefined
) => {
  const parsed = parseNavigationRuntimeUrl(root, href);
  const ownerWindow = getNavigationWindow(root);
  if (!parsed || parsed.origin !== ownerWindow.location.origin) return null;
  const currentPath = ownerWindow.location.pathname.replace(/\/$/, "") || "/";
  const targetPath = parsed.pathname.replace(/\/$/, "") || "/";
  if (mode === "exact") return currentPath === targetPath ? targetPath : null;
  if (mode === "pathname") {
    return targetPath === "/"
      ? currentPath === "/"
        ? targetPath
        : null
      : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)
        ? targetPath
        : null;
  }
  return null;
};

export function updateNavigationActiveLinks(root: HTMLElement): void {
  const mode = root.dataset.navigationActiveMode;
  const anchors = Array.from(root.querySelectorAll(navigationLinkSelector));
  const matches: Array<{ anchor: HTMLAnchorElement; path: string }> = [];
  for (const candidate of anchors) {
    if (!(candidate instanceof HTMLAnchorElement)) continue;
    candidate.dataset.navigationActive = "false";
    candidate.removeAttribute("aria-current");
    if (!mode || mode === "none") continue;
    const matchedPath = resolveNavigationMatchingPath(root, candidate.getAttribute("href"), mode);
    if (!matchedPath) continue;
    matches.push({ anchor: candidate, path: matchedPath });
  }

  if (matches.length === 0) return;

  const bestLength = matches.reduce((longest, match) => Math.max(longest, match.path.length), 0);
  for (const match of matches) {
    if (match.path.length !== bestLength) continue;
    match.anchor.dataset.navigationActive = "true";
    match.anchor.setAttribute("aria-current", "page");
  }
}

const resolveNavigationSubmenuPanel = (toggle: HTMLButtonElement): HTMLElement | null => {
  const controls = toggle.getAttribute("aria-controls");
  if (!controls) return null;
  const panel = getNavigationOwnerDocument(toggle).getElementById(controls);
  return panel instanceof HTMLElement ? panel : null;
};

const syncNavigationSubmenuPosition = (toggle: HTMLButtonElement, panel: HTMLElement): void => {
  const configured = panel.dataset.navigationDirection || "bottom";
  if (configured === "top" || configured === "bottom") {
    panel.dataset.navigationPosition = configured;
    return;
  }
  const ownerWindow = getNavigationWindow(toggle);
  const rect = panel.getBoundingClientRect();
  const shouldOpenUp =
    rect.bottom > ownerWindow.innerHeight - 24 && rect.top > ownerWindow.innerHeight / 2;
  panel.dataset.navigationPosition = shouldOpenUp ? "top" : "bottom";
};

const closeNavigationSiblingSubmenus = (
  root: HTMLElement,
  exceptToggle: HTMLButtonElement
): void => {
  for (const candidate of Array.from(root.querySelectorAll(navigationSubmenuToggleSelector))) {
    if (!(candidate instanceof HTMLButtonElement) || candidate === exceptToggle) continue;
    const panel = resolveNavigationSubmenuPanel(candidate);
    if (!panel) continue;
    candidate.dataset.state = "closed";
    candidate.setAttribute("aria-expanded", "false");
    panel.dataset.state = "closed";
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("hidden", "");
  }
};

export function setNavigationSubmenuState(toggle: HTMLButtonElement, open: boolean): void {
  const root = toggle.closest(navigationRootSelector);
  if (!(root instanceof HTMLElement)) return;
  const panel = resolveNavigationSubmenuPanel(toggle);
  if (!panel) return;
  if (open) {
    closeNavigationSiblingSubmenus(root, toggle);
    panel.removeAttribute("hidden");
    syncNavigationSubmenuPosition(toggle, panel);
  } else {
    panel.setAttribute("hidden", "");
  }
  toggle.dataset.state = open ? "open" : "closed";
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  panel.dataset.state = open ? "open" : "closed";
  panel.setAttribute("aria-hidden", open ? "false" : "true");
}

export function closeNavigationSubmenus(root: HTMLElement): void {
  for (const candidate of Array.from(root.querySelectorAll(navigationSubmenuToggleSelector))) {
    if (!(candidate instanceof HTMLButtonElement)) continue;
    setNavigationSubmenuState(candidate, false);
  }
}

const resolveNavigationDrawer = (root: HTMLElement) => {
  const trigger = root.querySelector(navigationMobileToggleSelector);
  const panel = root.querySelector(navigationMobilePanelSelector);
  if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return null;
  return { trigger, panel };
};

const syncNavigationToggleDecorations = (trigger: HTMLButtonElement, open: boolean): void => {
  trigger.dataset.state = open ? "open" : "closed";
  trigger.setAttribute("aria-expanded", open ? "true" : "false");
  trigger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
  for (const icon of Array.from(trigger.querySelectorAll("[data-navigation-mobile-icon]"))) {
    if (!(icon instanceof HTMLElement)) continue;
    const iconState = icon.dataset.navigationMobileIcon;
    icon.hidden = open ? iconState !== "close" : iconState !== "menu";
  }
  const label = trigger.querySelector("[data-navigation-mobile-label]");
  if (label instanceof HTMLElement) {
    label.textContent = open ? "Close" : "Menu";
  }
};

const clearNavigationPanelCloseTimer = (panel: HTMLElement): void => {
  const timerId = panel.dataset.navigationCloseTimer;
  if (!timerId) return;
  getNavigationWindow(panel).clearTimeout(Number(timerId));
  delete panel.dataset.navigationCloseTimer;
};

const setNavigationPanelOpenState = (panel: HTMLElement, open: boolean): void => {
  clearNavigationPanelCloseTimer(panel);
  panel.dataset.state = open ? "open" : "closed";
  panel.setAttribute("aria-hidden", open ? "false" : "true");
  if ("inert" in panel) {
    panel.inert = !open;
  }
  if (open) {
    panel.hidden = false;
    getNavigationWindow(panel).requestAnimationFrame(() => {
      panel.dataset.state = "open";
    });
  } else {
    const timer = getNavigationWindow(panel).setTimeout(() => {
      panel.hidden = true;
    }, navigationDrawerAnimationMs);
    panel.dataset.navigationCloseTimer = String(timer);
  }
};

const focusFirstNavigationDrawerTarget = (panel: HTMLElement, trigger: HTMLButtonElement): void => {
  const focusable = getNavigationFocusableElements(panel)[0];
  if (focusable instanceof HTMLElement) {
    focusable.focus();
    return;
  }
  if (!panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }
  panel.focus();
  trigger.blur();
};

export function setNavigationDrawerState(
  root: HTMLElement,
  open: boolean,
  focusTriggerOnClose = true
): void {
  const drawer = resolveNavigationDrawer(root);
  if (!drawer) return;
  const { trigger, panel } = drawer;
  syncNavigationToggleDecorations(trigger, open);
  setNavigationPanelOpenState(panel, open);
  if (open) {
    focusFirstNavigationDrawerTarget(panel, trigger);
    closeNavigationSubmenus(root);
  } else if (focusTriggerOnClose) {
    trigger.focus();
  }
}

export function updateNavigationCollapseState(
  roots: HTMLElement[],
  scrollTarget: NavigationScrollTarget
): void {
  const currentY = getNavigationScrollY(scrollTarget);
  for (const root of roots) {
    if (root.dataset.collapseOnScroll !== "true") continue;
    const previousY = parseNavigationScrollY(root.dataset.navigationLastScrollY, currentY);
    const collapsed = resolveNavigationCollapsedState(
      currentY,
      previousY,
      isNavigationCollapsed(root)
    );
    syncNavigationCollapsedState(root, collapsed);
    if (shouldStoreNavigationScrollY(currentY, previousY)) {
      root.dataset.navigationLastScrollY = String(currentY);
    }
  }
}

export function initializeNavigationRuntimeRoot(
  root: HTMLElement,
  scrollTarget: NavigationScrollTarget
): void {
  const drawer = resolveNavigationDrawer(root);
  if (drawer) {
    syncNavigationToggleDecorations(drawer.trigger, false);
    drawer.panel.hidden = true;
    drawer.panel.dataset.state = "closed";
    drawer.panel.setAttribute("aria-hidden", "true");
    if ("inert" in drawer.panel) {
      drawer.panel.inert = true;
    }
  }
  closeNavigationSubmenus(root);
  updateNavigationActiveLinks(root);
  const currentY = getNavigationScrollY(scrollTarget);
  if (root.dataset.collapseOnScroll === "true") {
    const previousY = parseNavigationScrollY(root.dataset.navigationLastScrollY, 0);
    const collapsed =
      root.dataset.navigationLastScrollY === undefined
        ? currentY > navigationCollapseThreshold || isNavigationCollapsed(root)
        : resolveNavigationCollapsedState(currentY, previousY, isNavigationCollapsed(root));
    syncNavigationCollapsedState(root, collapsed);
  }
  root.dataset.navigationLastScrollY = String(currentY);
}

export function bindNavigationRuntimeRoots(
  container: ParentNode,
  options: NavigationRuntimeBindOptions = {}
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const roots = findNavigationRoots(container);
  const scrollTarget = options.scrollTarget ?? window;
  if (!roots.length) return () => undefined;

  roots.forEach((root) => initializeNavigationRuntimeRoot(root, scrollTarget));
  updateNavigationCollapseState(roots, scrollTarget);

  const ownerDocument = roots[0]?.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;

  const handleClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const drawerTrigger = target.closest(navigationMobileToggleSelector);
    if (drawerTrigger instanceof HTMLButtonElement) {
      const root = drawerTrigger.closest(navigationRootSelector);
      if (!(root instanceof HTMLElement) || !roots.includes(root)) return;
      const nextOpen = drawerTrigger.getAttribute("aria-expanded") !== "true";
      setNavigationDrawerState(root, nextOpen, true);
      return;
    }

    const submenuTrigger = target.closest(navigationSubmenuToggleSelector);
    if (submenuTrigger instanceof HTMLButtonElement) {
      const root = submenuTrigger.closest(navigationRootSelector);
      if (!(root instanceof HTMLElement) || !roots.includes(root)) return;
      const nextOpen = submenuTrigger.getAttribute("aria-expanded") !== "true";
      setNavigationSubmenuState(submenuTrigger, nextOpen);
      return;
    }

    for (const root of roots) {
      if (root.contains(target)) continue;
      setNavigationDrawerState(root, false, false);
      closeNavigationSubmenus(root);
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      for (const root of roots) {
        const drawer = resolveNavigationDrawer(root);
        const drawerOpen = drawer?.trigger.getAttribute("aria-expanded") === "true";
        if (drawerOpen) {
          event.preventDefault();
          setNavigationDrawerState(root, false, true);
        }
        for (const toggle of Array.from(root.querySelectorAll(navigationSubmenuToggleSelector))) {
          if (!(toggle instanceof HTMLButtonElement)) continue;
          if (toggle.getAttribute("aria-expanded") !== "true") continue;
          event.preventDefault();
          setNavigationSubmenuState(toggle, false);
          toggle.focus();
        }
      }
      return;
    }

    if (event.key !== "Tab") return;
    for (const root of roots) {
      const drawer = resolveNavigationDrawer(root);
      if (!drawer) continue;
      if (drawer.trigger.getAttribute("aria-expanded") !== "true") continue;
      const focusables = [drawer.trigger, ...getNavigationFocusableElements(drawer.panel)];
      const currentIndex = focusables.indexOf(ownerDocument.activeElement as HTMLElement);
      if (currentIndex === -1 || focusables.length === 0) continue;
      if (event.shiftKey && currentIndex === 0) {
        event.preventDefault();
        focusables[focusables.length - 1]?.focus();
      } else if (!event.shiftKey && currentIndex === focusables.length - 1) {
        event.preventDefault();
        focusables[0]?.focus();
      }
    }
  };

  const handleScroll = () => updateNavigationCollapseState(roots, scrollTarget);
  const handleLocationChange = () => roots.forEach((root) => updateNavigationActiveLinks(root));

  ownerDocument.addEventListener("click", handleClick);
  ownerDocument.addEventListener("keydown", handleKeydown);
  scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
  ownerWindow.addEventListener("popstate", handleLocationChange);
  ownerWindow.addEventListener("hashchange", handleLocationChange);

  return () => {
    ownerDocument.removeEventListener("click", handleClick);
    ownerDocument.removeEventListener("keydown", handleKeydown);
    scrollTarget.removeEventListener("scroll", handleScroll);
    ownerWindow.removeEventListener("popstate", handleLocationChange);
    ownerWindow.removeEventListener("hashchange", handleLocationChange);
  };
}

export const navigationRuntimeClientScript = `
(() => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const listenersBound = window.__nextlessNavigationBound === true;
  window.__nextlessNavigationBound = true;

  const DRAWER_ANIMATION_MS = 180;
  const COLLAPSE_THRESHOLD = 24;
  const COLLAPSE_JITTER = 16;
  const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const getRoots = () =>
    Array.from(document.querySelectorAll('[data-navigation-widget="1"]')).filter(
      (candidate) => candidate instanceof HTMLElement
    );

  const getFocusableElements = (container) =>
    Array.from(container.querySelectorAll(focusableSelector)).filter((candidate) => {
      if (!(candidate instanceof HTMLElement)) return false;
      if (candidate.hidden) return false;
      if (candidate.getAttribute("aria-hidden") === "true") return false;
      return candidate.offsetParent !== null || candidate === document.activeElement;
    });

  const parseScrollY = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const resolveCollapsedState = (currentY, previousY, wasCollapsed) => {
    const delta = currentY - previousY;
    if (currentY <= COLLAPSE_THRESHOLD) return false;
    if (delta > COLLAPSE_JITTER) return true;
    if (delta < -COLLAPSE_JITTER) return false;
    return wasCollapsed;
  };

  const syncCollapsedState = (root, collapsed) => {
    root.dataset.navigationCollapsed = collapsed ? "true" : "false";
    root.classList.toggle("is-navigation-collapsed", collapsed);
  };

  const shouldStoreScrollY = (currentY, previousY) =>
    currentY <= COLLAPSE_THRESHOLD || Math.abs(currentY - previousY) > COLLAPSE_JITTER;

  const parseUrl = (href) => {
    if (!href || href.startsWith("#")) return null;
    try {
      return new URL(href, window.location.origin);
    } catch {
      return null;
    }
  };

  const resolveMatchingPath = (href, mode) => {
    const parsed = parseUrl(href);
    if (!parsed || parsed.origin !== window.location.origin) return null;
    const currentPath = window.location.pathname.replace(/\\/$/, "") || "/";
    const targetPath = parsed.pathname.replace(/\\/$/, "") || "/";
    if (mode === "exact") return currentPath === targetPath ? targetPath : null;
    if (mode === "pathname") {
      return targetPath === "/"
        ? currentPath === "/"
          ? targetPath
          : null
        : currentPath === targetPath || currentPath.startsWith(targetPath + "/")
          ? targetPath
          : null;
    }
    return null;
  };

  const updateActiveLinks = (root) => {
    const mode = root.dataset.navigationActiveMode;
    const anchors = Array.from(root.querySelectorAll('[data-navigation-link="1"]'));
    const matches = [];
    for (const candidate of anchors) {
      if (!(candidate instanceof HTMLAnchorElement)) continue;
      candidate.dataset.navigationActive = "false";
      candidate.removeAttribute("aria-current");
      if (!mode || mode === "none") continue;
      const matchedPath = resolveMatchingPath(candidate.getAttribute("href"), mode);
      if (!matchedPath) continue;
      matches.push({ anchor: candidate, path: matchedPath });
    }

    if (matches.length === 0) return;

    const bestLength = matches.reduce(
      (longest, match) => Math.max(longest, match.path.length),
      0
    );
    for (const match of matches) {
      if (match.path.length !== bestLength) continue;
      match.anchor.dataset.navigationActive = "true";
      match.anchor.setAttribute("aria-current", "page");
    }
  };

  const resolveSubmenuPanel = (toggle) => {
    const controls = toggle.getAttribute("aria-controls");
    if (!controls) return null;
    const panel = document.getElementById(controls);
    return panel instanceof HTMLElement ? panel : null;
  };

  const syncSubmenuPosition = (toggle, panel) => {
    const configured = panel.dataset.navigationDirection || "bottom";
    if (configured === "top" || configured === "bottom") {
      panel.dataset.navigationPosition = configured;
      return;
    }
    const rect = panel.getBoundingClientRect();
    const shouldOpenUp = rect.bottom > window.innerHeight - 24 && rect.top > window.innerHeight / 2;
    panel.dataset.navigationPosition = shouldOpenUp ? "top" : "bottom";
  };

  const closeSiblingSubmenus = (root, exceptToggle) => {
    for (const candidate of root.querySelectorAll('[data-navigation-submenu-toggle="1"]')) {
      if (!(candidate instanceof HTMLButtonElement) || candidate === exceptToggle) continue;
      const panel = resolveSubmenuPanel(candidate);
      if (!panel) continue;
      candidate.dataset.state = "closed";
      candidate.setAttribute("aria-expanded", "false");
      panel.dataset.state = "closed";
      panel.setAttribute("aria-hidden", "true");
      panel.setAttribute("hidden", "");
    }
  };

  const setSubmenuState = (toggle, open) => {
    const root = toggle.closest('[data-navigation-widget="1"]');
    if (!(root instanceof HTMLElement)) return;
    const panel = resolveSubmenuPanel(toggle);
    if (!panel) return;
    if (open) {
      closeSiblingSubmenus(root, toggle);
      panel.removeAttribute("hidden");
      syncSubmenuPosition(toggle, panel);
    } else {
      panel.setAttribute("hidden", "");
    }
    toggle.dataset.state = open ? "open" : "closed";
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    panel.dataset.state = open ? "open" : "closed";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
  };

  const closeAllSubmenus = (root) => {
    for (const candidate of root.querySelectorAll('[data-navigation-submenu-toggle="1"]')) {
      if (!(candidate instanceof HTMLButtonElement)) continue;
      setSubmenuState(candidate, false);
    }
  };

  const resolveDrawer = (root) => {
    const trigger = root.querySelector('[data-navigation-mobile-toggle]');
    const panel = root.querySelector('[data-navigation-mobile-panel]');
    if (!(trigger instanceof HTMLButtonElement) || !(panel instanceof HTMLElement)) return null;
    return { trigger, panel };
  };

  const syncToggleDecorations = (trigger, open) => {
    trigger.dataset.state = open ? "open" : "closed";
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    trigger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    for (const icon of trigger.querySelectorAll('[data-navigation-mobile-icon]')) {
      if (!(icon instanceof HTMLElement)) continue;
      const iconState = icon.dataset.navigationMobileIcon;
      icon.hidden = open ? iconState !== "close" : iconState !== "menu";
    }
    const label = trigger.querySelector('[data-navigation-mobile-label]');
    if (label instanceof HTMLElement) {
      label.textContent = open ? "Close" : "Menu";
    }
  };

  const clearPanelCloseTimer = (panel) => {
    const timerId = panel.dataset.navigationCloseTimer;
    if (!timerId) return;
    window.clearTimeout(Number(timerId));
    delete panel.dataset.navigationCloseTimer;
  };

  const setPanelOpenState = (panel, open) => {
    clearPanelCloseTimer(panel);
    panel.dataset.state = open ? "open" : "closed";
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    if ("inert" in panel) {
      panel.inert = !open;
    }
    if (open) {
      panel.hidden = false;
      requestAnimationFrame(() => {
        panel.dataset.state = "open";
      });
    } else {
      const timer = window.setTimeout(() => {
        panel.hidden = true;
      }, DRAWER_ANIMATION_MS);
      panel.dataset.navigationCloseTimer = String(timer);
    }
  };

  const focusFirstDrawerTarget = (panel, trigger) => {
    const focusable = getFocusableElements(panel)[0];
    if (focusable instanceof HTMLElement) {
      focusable.focus();
      return;
    }
    if (!panel.hasAttribute("tabindex")) {
      panel.setAttribute("tabindex", "-1");
    }
    panel.focus();
    trigger.blur();
  };

  const setDrawerState = (root, open, focusTriggerOnClose = true) => {
    const drawer = resolveDrawer(root);
    if (!drawer) return;
    const { trigger, panel } = drawer;
    syncToggleDecorations(trigger, open);
    setPanelOpenState(panel, open);
    if (open) {
      focusFirstDrawerTarget(panel, trigger);
      closeAllSubmenus(root);
    } else if (focusTriggerOnClose) {
      trigger.focus();
    }
  };

  const updateCollapseState = () => {
    const currentY = window.scrollY;
    for (const root of getRoots()) {
      if (!(root instanceof HTMLElement)) continue;
      if (root.dataset.collapseOnScroll !== "true") continue;
      const previousY = parseScrollY(root.dataset.navigationLastScrollY, currentY);
      const collapsed = resolveCollapsedState(
        currentY,
        previousY,
        root.dataset.navigationCollapsed === "true"
      );
      syncCollapsedState(root, collapsed);
      if (shouldStoreScrollY(currentY, previousY)) {
        root.dataset.navigationLastScrollY = String(currentY);
      }
    }
  };

  const closeRootsOnOutsideClick = (target) => {
    for (const root of getRoots()) {
      if (!(root instanceof HTMLElement)) continue;
      if (root.contains(target)) continue;
      setDrawerState(root, false, false);
      closeAllSubmenus(root);
    }
  };

  if (!listenersBound) {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const drawerTrigger = target.closest('[data-navigation-mobile-toggle]');
      if (drawerTrigger instanceof HTMLButtonElement) {
        const root = drawerTrigger.closest('[data-navigation-widget="1"]');
        if (!(root instanceof HTMLElement)) return;
        const nextOpen = drawerTrigger.getAttribute("aria-expanded") !== "true";
        setDrawerState(root, nextOpen, true);
        return;
      }

      const submenuTrigger = target.closest('[data-navigation-submenu-toggle="1"]');
      if (submenuTrigger instanceof HTMLButtonElement) {
        const nextOpen = submenuTrigger.getAttribute("aria-expanded") !== "true";
        setSubmenuState(submenuTrigger, nextOpen);
        return;
      }

      closeRootsOnOutsideClick(target);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        for (const root of getRoots()) {
          if (!(root instanceof HTMLElement)) continue;
          const drawer = resolveDrawer(root);
          const drawerOpen = drawer?.trigger.getAttribute("aria-expanded") === "true";
          if (drawerOpen) {
            event.preventDefault();
            setDrawerState(root, false, true);
          }
          for (const toggle of root.querySelectorAll('[data-navigation-submenu-toggle="1"]')) {
            if (!(toggle instanceof HTMLButtonElement)) continue;
            if (toggle.getAttribute("aria-expanded") !== "true") continue;
            event.preventDefault();
            setSubmenuState(toggle, false);
            toggle.focus();
          }
        }
        return;
      }

      if (event.key !== "Tab") return;
      for (const root of getRoots()) {
        const drawer = resolveDrawer(root);
        if (!drawer) continue;
        if (drawer.trigger.getAttribute("aria-expanded") !== "true") continue;
        const focusables = [drawer.trigger, ...getFocusableElements(drawer.panel)];
        const currentIndex = focusables.indexOf(document.activeElement);
        if (currentIndex === -1 || focusables.length === 0) continue;
        if (event.shiftKey && currentIndex === 0) {
          event.preventDefault();
          focusables[focusables.length - 1]?.focus();
        } else if (!event.shiftKey && currentIndex === focusables.length - 1) {
          event.preventDefault();
          focusables[0]?.focus();
        }
      }
    });

    window.addEventListener("scroll", updateCollapseState, { passive: true });
    window.addEventListener("popstate", () => {
      for (const root of getRoots()) {
        updateActiveLinks(root);
      }
    });
    window.addEventListener("hashchange", () => {
      for (const root of getRoots()) {
        updateActiveLinks(root);
      }
    });
  }

  for (const root of getRoots()) {
    if (!(root instanceof HTMLElement)) continue;
    const drawer = resolveDrawer(root);
    if (drawer) {
      syncToggleDecorations(drawer.trigger, false);
      drawer.panel.hidden = true;
      drawer.panel.dataset.state = "closed";
      drawer.panel.setAttribute("aria-hidden", "true");
      if ("inert" in drawer.panel) {
        drawer.panel.inert = true;
      }
    }
    closeAllSubmenus(root);
    updateActiveLinks(root);
    if (root.dataset.collapseOnScroll === "true") {
      const currentY = window.scrollY;
      const previousY = parseScrollY(root.dataset.navigationLastScrollY, 0);
      const collapsed =
        root.dataset.navigationLastScrollY === undefined
          ? currentY > COLLAPSE_THRESHOLD || root.dataset.navigationCollapsed === "true"
          : resolveCollapsedState(
              currentY,
              previousY,
              root.dataset.navigationCollapsed === "true"
            );
      syncCollapsedState(root, collapsed);
    }
    root.dataset.navigationLastScrollY = String(window.scrollY);
  }

  updateCollapseState();
})();
`;
