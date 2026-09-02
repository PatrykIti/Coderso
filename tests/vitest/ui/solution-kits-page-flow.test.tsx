// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { SolutionKitsPage } from "../../../core/admin/ui/kits/SolutionKitsPage";
import type {
  SolutionKitDefinition,
  SolutionKitSummary,
} from "../../../core/admin/services/solutionKitsClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const getSolutionKitCachedMock = vi.fn();
const listSolutionKitsCachedMock = vi.fn();
const getCachedSolutionKitsMock = vi.fn();
const getActiveSolutionKitIdMock = vi.fn();
const setActiveSolutionKitIdMock = vi.fn();
const openAssistantPanelMock = vi.fn();

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: () => getCachedSolutionKitsMock(),
  getSolutionKitCached: (...args: unknown[]) => getSolutionKitCachedMock(...args),
  listSolutionKitsCached: (...args: unknown[]) => listSolutionKitsCachedMock(...args),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: () => getActiveSolutionKitIdMock(),
  setActiveSolutionKitId: (...args: unknown[]) => setActiveSolutionKitIdMock(...args),
}));

vi.mock("@/ui/assistant/assistantPanelEvents", () => ({
  openAssistantPanel: (...args: unknown[]) => openAssistantPanelMock(...args),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));

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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const summary = (overrides: Partial<SolutionKitSummary> = {}): SolutionKitSummary => ({
  id: "automotive-workshop",
  title: "Automotive Workshop",
  shortDescription: "Garage site",
  recommendedModules: ["booking", "forms"],
  features: ["Lead form"],
  ...overrides,
});

const definition = (): SolutionKitDefinition => ({
  ...summary(),
  longDescription: "Long garage description",
  businessTypes: ["automotive_workshop"],
  defaultGoals: ["lead_generation"],
  resourceBlueprint: { pages: [], forms: [], contentTypes: [], menus: [] },
});

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<SolutionKitsPage />);
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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const buttonByText = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(text)
  ) ?? null;

beforeEach(() => {
  getSolutionKitCachedMock.mockReset();
  listSolutionKitsCachedMock.mockReset();
  getCachedSolutionKitsMock.mockReset();
  getActiveSolutionKitIdMock.mockReset();
  setActiveSolutionKitIdMock.mockReset();
  openAssistantPanelMock.mockReset();
  getCachedSolutionKitsMock.mockReturnValue(null);
  getActiveSolutionKitIdMock.mockReturnValue(null);
  listSolutionKitsCachedMock.mockResolvedValue([summary()]);
  getSolutionKitCachedMock.mockResolvedValue(definition());
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("SolutionKitsPage renders full manifest details and business-type formatting", async () => {
  const richSummary = summary({
    recommendedModules: ["engine", "entries", "widgets", "custom-screens", "forms", "seo"],
    manifest: {
      id: "auto-manifest",
      title: "Auto manifest",
      vertical: "automotive_workshop",
      includes: {
        contentTypes: ["vehicle"],
        entries: ["vehicle-1"],
        widgets: ["vehicle-listing"],
        templates: ["vehicle-detail"],
        forms: ["lead-form"],
        menus: ["primary"],
      },
      requiredModules: ["engine", "booking"],
      optionalModules: ["analytics", "reviews"],
      postInstallTasks: ["Install the booking form", "Connect the calendar"],
    },
  });
  getCachedSolutionKitsMock.mockReturnValue([richSummary]);
  listSolutionKitsCachedMock.mockResolvedValue([richSummary]);
  getSolutionKitCachedMock.mockResolvedValue({
    ...definition(),
    ...richSummary,
    businessTypes: ["automotive_workshop", "custom"],
  });

  const view = mount();
  await flush();

  try {
    const text = view.container.textContent ?? "";
    // formatBusinessType renders "_"-separated tokens capitalized.
    expect(text).toContain("Automotive Workshop, Custom");
    // formatIncludeLabel renders the manifest vertical + include counts.
    expect(text).toContain("Automotive Workshop");
    expect(text).toContain("ContentTypes: 1");
    expect(text).toContain("Required modules");
    expect(text).toContain("engine");
    expect(text).toContain("booking");
    expect(text).toContain("Recommended modules");
    expect(text).toContain("custom-screens");
    expect(text).toContain("Optional modules");
    expect(text).toContain("analytics");
    expect(text).toContain("Post-install checklist");
    expect(text).toContain("Connect the calendar");
  } finally {
    view.cleanup();
  }
});

test("SolutionKitsPage selecting a kit persists the active id and re-fetches details", async () => {
  const second = summary({
    id: "medical-clinic",
    title: "Medical Clinic",
    recommendedModules: [],
  });
  listSolutionKitsCachedMock.mockResolvedValue([summary(), second]);
  const secondDetail = { ...definition(), id: "medical-clinic", title: "Medical Clinic" };
  getSolutionKitCachedMock.mockImplementation((id: string) =>
    id === "medical-clinic" ? Promise.resolve(secondDetail) : Promise.resolve(definition())
  );

  const view = mount();
  await flush();

  try {
    const select = buttonByText(view.container, "Select kit");
    expect(select).not.toBeNull();
    React.act(() => select?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();

    expect(setActiveSolutionKitIdMock).toHaveBeenCalledWith("medical-clinic");
    expect(getSolutionKitCachedMock).toHaveBeenCalledWith("medical-clinic");
    expect(view.container.textContent).toContain("Medical Clinic");
    expect(view.container.textContent).toContain("Selected kit details");
  } finally {
    view.cleanup();
  }
});

test("SolutionKitsPage selects the sixth supported kit and keeps its details visible", async () => {
  const kits = [
    summary(),
    summary({ id: "medical-clinic", title: "Medical Clinic" }),
    summary({ id: "beauty-salon", title: "Beauty Salon" }),
    summary({ id: "local-service-business", title: "Local Service Business" }),
    summary({ id: "services-directory", title: "Local Services Directory" }),
    summary({ id: "small-ecommerce", title: "Small Ecommerce" }),
  ];
  listSolutionKitsCachedMock.mockResolvedValue(kits);
  getSolutionKitCachedMock.mockImplementation((id: string) =>
    id === "small-ecommerce"
      ? Promise.resolve({ ...definition(), id: "small-ecommerce", title: "Small Ecommerce" })
      : Promise.resolve(definition())
  );

  const view = mount();
  await flush();

  try {
    const selectButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      button.textContent?.includes("Select kit")
    );
    expect(selectButtons).toHaveLength(5);
    React.act(() => selectButtons[4]?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await flush();

    expect(setActiveSolutionKitIdMock).toHaveBeenCalledWith("small-ecommerce");
    expect(getSolutionKitCachedMock).toHaveBeenCalledWith("small-ecommerce");
    expect(view.container.textContent).toContain("Small Ecommerce");
  } finally {
    view.cleanup();
  }
});

test("SolutionKitsPage open LLM guide dispatches the reviewed site builder prompt", async () => {
  const view = mount();
  await flush();

  try {
    const guide = buttonByText(view.container, "Open LLM Guide");
    expect(guide).not.toBeNull();
    React.act(() => guide?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(openAssistantPanelMock).toHaveBeenCalledWith({
      mode: "llm-guide",
      message:
        "Create a complete website for my business. Guide me through the reviewed site-builder intake.",
      reset: true,
    });
  } finally {
    view.cleanup();
  }
});

test("SolutionKitsPage shows the error alert when the kits list fails to load", async () => {
  listSolutionKitsCachedMock.mockRejectedValueOnce(new Error("kits unavailable"));
  const view = mount();
  await flush();

  try {
    expect(view.container.textContent).toContain("Unable to load kits");
    expect(view.container.textContent).toContain("kits unavailable");
  } finally {
    view.cleanup();
  }
});

test("SolutionKitsPage falls back to summary manifest and detail-less description", async () => {
  const onlySummary = summary({
    recommendedModules: ["forms"],
    manifest: {
      id: "m",
      title: "M",
      vertical: "small_ecommerce",
      includes: {
        contentTypes: [],
        entries: [],
        widgets: [],
        templates: [],
        forms: [],
        menus: [],
      },
      requiredModules: ["engine"],
    },
  });
  getCachedSolutionKitsMock.mockReturnValue([onlySummary]);
  listSolutionKitsCachedMock.mockResolvedValue([onlySummary]);
  // Detail fetch fails: the summary manifest still drives the details card.
  getSolutionKitCachedMock.mockRejectedValueOnce(new Error("detail unavailable"));

  const view = mount();
  await flush();

  try {
    const text = view.container.textContent ?? "";
    // No detail, so business fit is absent but the manifest section renders.
    expect(text).toContain("Small Ecommerce");
    expect(text).not.toContain("Business fit:");
    expect(text).toContain("Manifest vertical:");
    expect(text).toContain("Required modules");
  } finally {
    view.cleanup();
  }
});
