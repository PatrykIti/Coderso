// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import {
  ThemeRoutesEditor,
  type ThemeRouteDraft,
} from "../../../core/admin/ui/themes/ThemeRoutesEditor";
import { ThemeTokensEditor } from "../../../core/admin/ui/themes/ThemeTokensEditor";
import type { DesignTokens } from "../../../core/services/theme/tokenTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// crypto.randomUUID is used by createRoute; the happy-dom global is present,
// but pin it so route ids are deterministic across runs.
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: () => "route-new" },
  configurable: true,
});

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <button
      type="button"
      data-select-value={value ?? "none"}
      onClick={() => onValueChange?.(value === "none" ? "page-2" : "none")}
    >
      {children}
    </button>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

// Context-backed tabs: only the active panel renders, so switching to the
// Routes tab mounts the REAL ThemeRoutesEditor inside ThemeTokensEditor.
vi.mock("@/components/ui/tabs", async () => {
  const react = await import("react");
  const TabsContext = react.createContext<{
    value: string;
    onValueChange: (next: string) => void;
  }>({ value: "", onValueChange: () => undefined });
  const Tabs = ({
    defaultValue,
    children,
  }: {
    defaultValue?: string;
    children?: React.ReactNode;
  }) => {
    const [value, setValue] = react.useState(defaultValue ?? "");
    return (
      <TabsContext.Provider value={{ value, onValueChange: setValue }}>
        <div data-tabs-value={value}>{children}</div>
      </TabsContext.Provider>
    );
  };
  const TabsTrigger = ({ value, children }: { value?: string; children?: React.ReactNode }) => {
    const { onValueChange } = react.useContext(TabsContext);
    return (
      <button type="button" data-tab-value={value} onClick={() => onValueChange(value ?? "")}>
        {children}
      </button>
    );
  };
  const TabsContent = ({ value, children }: { value?: string; children?: React.ReactNode }) => {
    const { value: activeValue } = react.useContext(TabsContext);
    if (activeValue !== value) return null;
    return <div data-tab-panel={value}>{children}</div>;
  };
  const TabsList = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { Tabs, TabsContent, TabsList, TabsTrigger };
});

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => <textarea value={value} onChange={onChange} data-testid="token-draft" />,
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new Error("Missing input");
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButtonByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error("Missing textarea");
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const resolvedTokens: DesignTokens = {
  colors: { primary: "#111111", secondary: "#222222", accent: "#333333" },
  neutrals: { bg: "#ffffff", surface: "#f8fafc", border: "#e2e8f0", text: "#0f172a" },
  spacing: { xs: "0.25rem", sm: "0.5rem", md: "1rem", lg: "1.5rem", xl: "2rem", "2xl": "3rem" },
  radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px" },
  typography: {
    sans: "Inter",
    display: "Space Grotesk",
    "2xs": "0.625rem",
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("ThemeRoutesEditor edits paths with real inputs, toggles pages both ways, and removes middle routes", () => {
  const changes: ThemeRouteDraft[][] = [];

  const Harness = () => {
    const [routes, setRoutes] = useState<ThemeRouteDraft[]>([
      { id: "route-1", path: "/", pageId: null },
      { id: "route-2", path: "/catalog", pageId: "page-2" },
    ]);
    return (
      <ThemeRoutesEditor
        routes={routes}
        pages={[
          { id: "page-1", title: "Home" },
          { id: "page-2", title: "Catalog" },
        ]}
        onChange={(next) => {
          changes.push(next);
          setRoutes(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    // Two routes render with numbered labels; no error banner without an error.
    expect(view.container.textContent).toContain("Route 1");
    expect(view.container.textContent).toContain("Route 2");
    expect(view.container.textContent).not.toContain("Duplicate route");
    expect(view.container.textContent).not.toContain("No routes configured yet.");

    // Typing into the second route's path input updates only that route.
    const pathInputs = Array.from(view.container.querySelectorAll("input"));
    setInputValue(pathInputs[1], "/shop");
    expect(changes.at(-1)).toEqual([
      { id: "route-1", path: "/", pageId: null },
      { id: "route-2", path: "/shop", pageId: "page-2" },
    ]);

    // First route starts unassigned; selecting a page assigns it.
    clickButtonByText(view.container, "Select page");
    expect(changes.at(-1)?.[0]).toEqual({ id: "route-1", path: "/", pageId: "page-2" });

    // Toggling the SECOND route's select clears its page back to a custom
    // route. The select mock renders its items inside every trigger, so scope
    // the click to the card that owns the "/shop" path input.
    const secondCard = pathInputs[1]?.parentElement?.parentElement;
    const secondSelect = secondCard?.querySelector("button[data-select-value]");
    if (!(secondSelect instanceof HTMLButtonElement)) {
      throw new Error("Missing second route select");
    }
    React.act(() => {
      secondSelect.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(changes.at(-1)?.[1]).toEqual({ id: "route-2", path: "/shop", pageId: null });

    // Removing the MIDDLE route keeps the surrounding routes in order.
    const removeButtons = Array.from(
      view.container.querySelectorAll("button[aria-label='Remove route']")
    );
    React.act(() => {
      removeButtons[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(changes.at(-1)).toEqual([{ id: "route-2", path: "/shop", pageId: null }]);
    expect(view.container.textContent).not.toContain("Route 2");
  } finally {
    view.cleanup();
  }
});

test("ThemeRoutesEditor shows the error banner only when an error is provided", () => {
  const view = mount(
    <ThemeRoutesEditor
      routes={[{ id: "route-1", path: "/", pageId: null }]}
      pages={[{ id: "page-1", title: "Home" }]}
      error="Duplicate route"
      onChange={() => undefined}
    />
  );

  try {
    expect(view.container.textContent).toContain("Duplicate route");
  } finally {
    view.cleanup();
  }

  const cleanView = mount(
    <ThemeRoutesEditor
      routes={[{ id: "route-1", path: "/", pageId: null }]}
      pages={[{ id: "page-1", title: "Home" }]}
      onChange={() => undefined}
    />
  );

  try {
    expect(cleanView.container.textContent).not.toContain("Duplicate route");
  } finally {
    cleanView.cleanup();
  }
});

test("ThemeTokensEditor shows the valid badge, line numbers, and active token swatches", () => {
  const onDraftChange = vi.fn();
  const onRoutesChange = vi.fn();

  const view = mount(
    <ThemeTokensEditor
      draft={'{\n  "colors": {\n    "primary": "#ff0000"\n  }\n}'}
      error={null}
      resolvedTokens={resolvedTokens}
      routes={[{ id: "route-1", path: "/", pageId: "page-1" }]}
      pages={[{ id: "page-1", title: "Home" }]}
      onDraftChange={onDraftChange}
      onRoutesChange={onRoutesChange}
    />
  );

  try {
    // No error => the emerald "Valid JSON" badge (not the rose "Invalid JSON").
    expect(view.container.textContent).toContain("Valid JSON");
    expect(view.container.textContent).not.toContain("Invalid JSON");
    const dot = Array.from(view.container.querySelectorAll("span")).find(
      (element) =>
        element.className.includes("rounded-full") && element.className.includes("bg-emerald-500")
    );
    expect(dot).toBeTruthy();

    // Line numbers mirror the draft's rows.
    const lineNumbers = view.container.querySelector("pre")?.textContent;
    expect(lineNumbers).toBe("1\n2\n3\n4\n5");

    // Active token properties show the resolved values.
    expect(view.container.textContent).toContain("Primary");
    expect(view.container.textContent).toContain("#111111");
    expect(view.container.textContent).toContain("Accent");
    expect(view.container.textContent).toContain("#333333");

    // Typing into the draft textarea forwards the raw draft text.
    setTextareaValue(view.container.querySelector("[data-testid='token-draft']"), "{}");
    expect(onDraftChange).toHaveBeenCalledWith("{}");
  } finally {
    view.cleanup();
  }
});

test("ThemeRoutesEditor falls back to a timestamp id when crypto is unavailable", () => {
  const originalCrypto = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", {
    value: undefined,
    configurable: true,
  });

  const changes: ThemeRouteDraft[][] = [];
  const view = mount(
    <ThemeRoutesEditor
      routes={[]}
      pages={[{ id: "page-1", title: "Home" }]}
      onChange={(next) => changes.push(next)}
    />
  );

  try {
    clickButtonByText(view.container, "Add route");
    expect(changes.at(-1)).toHaveLength(1);
    expect(typeof changes.at(-1)?.[0]?.id).toBe("string");
    expect(changes.at(-1)?.[0]?.path).toBe("");
    expect(changes.at(-1)?.[0]?.pageId).toBeNull();
  } finally {
    Object.defineProperty(globalThis, "crypto", { value: originalCrypto, configurable: true });
    view.cleanup();
  }
});

test("ThemeTokensEditor switches tabs and mounts the real routes editor on the Routes tab", () => {
  const onDraftChange = vi.fn();
  const onRoutesChange = vi.fn();

  const view = mount(
    <ThemeTokensEditor
      draft={'{\n  "colors": {\n    "primary": "#ff0000"\n  }\n}'}
      error="Invalid JSON"
      resolvedTokens={resolvedTokens}
      routes={[{ id: "route-1", path: "/", pageId: "page-1" }]}
      pages={[{ id: "page-1", title: "Home" }]}
      routesError="Duplicate route"
      onDraftChange={onDraftChange}
      onRoutesChange={onRoutesChange}
    />
  );

  try {
    // Default Colors tab shows the JSON editor, not the routes editor.
    expect(view.container.textContent).toContain("theme.config.json");
    expect(view.container.querySelector("[data-tab-panel='colors']")).not.toBeNull();
    expect(view.container.textContent).not.toContain("Route mapping");

    // Switching to the Routes tab unmounts the JSON editor and mounts the REAL
    // ThemeRoutesEditor with the forwarded routes + error.
    clickButtonByText(view.container, "Routes");
    expect(view.container.textContent).toContain("Route mapping");
    expect(view.container.textContent).toContain("Route 1");
    expect(view.container.textContent).toContain("Duplicate route");
    expect(view.container.querySelector("[data-tab-panel='colors']")).toBeNull();

    // The real routes editor forwards a path edit upward.
    const pathInput = Array.from(view.container.querySelectorAll("input")).find(
      (input) => input.getAttribute("placeholder") === "/"
    );
    setInputValue(pathInput, "/about");
    expect(onRoutesChange).toHaveBeenCalledWith([
      { id: "route-1", path: "/about", pageId: "page-1" },
    ]);

    // Switching back to Typography restores the JSON editor.
    clickButtonByText(view.container, "Typography");
    expect(view.container.textContent).toContain("theme.config.json");
    expect(view.container.textContent).not.toContain("Route mapping");
  } finally {
    view.cleanup();
  }
});
