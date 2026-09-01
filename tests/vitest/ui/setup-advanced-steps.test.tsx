// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const starterState = vi.hoisted(() => ({
  previewResult: {
    label: "Blog kit",
    summary: "5 pages, 1 menu",
    items: [{ type: "page", label: "Home" }],
  } as unknown,
  applyResult: { createdCount: 6 } as unknown,
  previewStarterContent: vi.fn(async () => {
    if (starterState.previewResult instanceof Error) throw starterState.previewResult;
    return starterState.previewResult;
  }),
  applyStarterContent: vi.fn(async () => {
    if (starterState.applyResult instanceof Error) throw starterState.applyResult;
    return starterState.applyResult;
  }),
  reset() {
    starterState.previewResult = {
      label: "Blog kit",
      summary: "5 pages, 1 menu",
      items: [{ type: "page", label: "Home" }],
    };
    starterState.applyResult = { createdCount: 6 };
    starterState.previewStarterContent.mockClear();
    starterState.applyStarterContent.mockClear();
  },
}));

vi.mock("@/services/starterContentClient", () => ({
  previewStarterContent: starterState.previewStarterContent,
  applyStarterContent: starterState.applyStarterContent,
}));

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");
  const OPTIONS = ["blog-starter", "business-starter", "portfolio-starter"];
  return {
    Select: ({
      onValueChange,
      value,
    }: {
      children?: React.ReactNode;
      onValueChange: (value: string) => void;
      value: string;
    }) => (
      <select
        data-testid="kit-select"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        <option value="">Choose a kit (optional)</option>
        {OPTIONS.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
    ),
    SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>,
    SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/ui/shared/SettingsSection", () => ({
  SettingsField: ({
    label,
    hint,
    children,
  }: {
    label: string;
    hint?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <span data-testid="settings-field-label">{label}</span>
      {hint ? <p>{hint}</p> : null}
      {children}
    </div>
  ),
}));

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { StarterContentStep } from "../../../core/admin/ui/setup/steps/StarterContentStep";
import {
  stripUnchangedSecret,
  useAdapterForm,
  useSaveAction,
} from "../../../core/admin/ui/setup/steps/advanced/advancedStepUtils";

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    unmount: () =>
      React.act(() => {
        root.unmount();
      }),
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const clickButtonWithText = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button ${label}`);
  React.act(() => {
    button.click();
  });
};

const chooseKit = (container: HTMLElement, value: string) => {
  const select = container.querySelector<HTMLSelectElement>("select[data-testid='kit-select']");
  if (!select) throw new Error("missing kit select");
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  if (setter) setter.call(select, value);
  React.act(() => {
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

afterEach(() => {
  starterState.reset();
  document.body.innerHTML = "";
});

describe("StarterContentStep", () => {
  it("keeps preview and apply disabled until a kit is selected", () => {
    const view = mount(
      <StarterContentStep disabled={false} values={{} as never} onPatch={() => undefined} />
    );
    const buttons = Array.from(view.container.querySelectorAll("button"));
    const preview = buttons.find((candidate) => candidate.textContent?.includes("Preview"))!;
    const apply = buttons.find((candidate) => candidate.textContent?.includes("Apply kit"))!;
    expect(preview.disabled).toBe(true);
    expect(apply.disabled).toBe(true);
    expect(starterState.previewStarterContent).not.toHaveBeenCalled();
    view.unmount();
  });

  it("disables all controls when the wizard is busy", () => {
    const view = mount(
      <StarterContentStep disabled values={{} as never} onPatch={() => undefined} />
    );
    for (const control of Array.from(view.container.querySelectorAll("button"))) {
      expect(control.disabled).toBe(true);
    }
    view.unmount();
  });

  it("previews the selected kit and renders the item list", async () => {
    const view = mount(
      <StarterContentStep disabled={false} values={{} as never} onPatch={() => undefined} />
    );
    chooseKit(view.container, "blog-starter");
    clickButtonWithText(view.container, "Preview");
    await flushEffects();

    expect(starterState.previewStarterContent).toHaveBeenCalledWith({ kitId: "blog-starter" });
    expect(view.container.textContent).toContain("Blog kit");
    expect(view.container.textContent).toContain("5 pages, 1 menu");
    expect(view.container.textContent).toContain("Home");
    view.unmount();
  });

  it("applies the selected kit and reports the created count", async () => {
    const view = mount(
      <StarterContentStep disabled={false} values={{} as never} onPatch={() => undefined} />
    );
    chooseKit(view.container, "portfolio-starter");
    clickButtonWithText(view.container, "Apply kit");
    await flushEffects();

    expect(starterState.applyStarterContent).toHaveBeenCalledWith({
      kitId: "portfolio-starter",
    });
    expect(view.container.querySelector("[role='status']")!.textContent).toContain(
      "Applied 6 items"
    );
    view.unmount();
  });

  it("surfaces client error messages for failed preview and apply calls", async () => {
    starterState.previewResult = new ApiClientError("preview_failed", "nope", 400);
    const view = mount(
      <StarterContentStep disabled={false} values={{} as never} onPatch={() => undefined} />
    );
    chooseKit(view.container, "blog-starter");
    clickButtonWithText(view.container, "Preview");
    await flushEffects();
    expect(view.container.querySelector("[role='alert']")!.textContent).toContain("nope");

    // reset local error state by reselecting the same kit
    chooseKit(view.container, "business-starter");
    expect(view.container.querySelector("[role='alert']")).toBeNull();

    starterState.applyResult = new ApiClientError("apply_failed", "apply blew up", 400);
    clickButtonWithText(view.container, "Apply kit");
    await flushEffects();
    expect(view.container.querySelector("[role='alert']")!.textContent).toContain("apply blew up");
    view.unmount();
  });

  it("falls back to generic copy for non-client failures", async () => {
    starterState.previewResult = new Error("offline");
    const view = mount(
      <StarterContentStep disabled={false} values={{} as never} onPatch={() => undefined} />
    );
    chooseKit(view.container, "blog-starter");
    clickButtonWithText(view.container, "Preview");
    await flushEffects();
    expect(view.container.querySelector("[role='alert']")!.textContent).toContain(
      "Could not preview starter content."
    );
    view.unmount();
  });
});

describe("useAdapterForm / useSaveAction harness", () => {
  type FormData = { host: string };

  function Harness(props: {
    load: () => Promise<FormData>;
    failLoad?: boolean;
    saveError?: boolean;
  }) {
    const toForm = React.useCallback((data: FormData) => ({ ...data }), []);
    const { form, setForm, loading, loadError } = useAdapterForm(
      props.load,
      toForm,
      "Could not load settings."
    );
    const { saving, saveError, saved, run, setSaved } = useSaveAction();

    return (
      <div>
        <div data-testid="loading">{String(loading)}</div>
        <div data-testid="form">{form ? form.host : "none"}</div>
        <div data-testid="load-error">{loadError ?? ""}</div>
        <div data-testid="saving">{String(saving)}</div>
        <div data-testid="saved">{String(saved)}</div>
        <div data-testid="save-error">{saveError ?? ""}</div>
        <button
          type="button"
          onClick={() =>
            void run(async () => {
              if (props.saveError) {
                throw new ApiClientError("settings_value_invalid", "invalid host", 422);
              }
              setForm({ host: "smtp.example.com" });
            }, "Could not save settings.")
          }
        >
          save
        </button>
        <button type="button" onClick={() => setSaved(false)}>
          clear-saved
        </button>
      </div>
    );
  }

  it("seeds the form from the loaded config and reports loading completion", async () => {
    const load = vi.fn(async (): Promise<FormData> => ({ host: "mail.example.com" }));
    const view = mount(<Harness load={load} />);
    await flushEffects();

    expect(load).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector("[data-testid='loading']")!.textContent).toBe("false");
    expect(view.container.querySelector("[data-testid='form']")!.textContent).toBe(
      "mail.example.com"
    );
    expect(view.container.querySelector("[data-testid='load-error']")!.textContent).toBe("");
    view.unmount();
  });

  it("surfaces api messages and fallback copy when loading fails", async () => {
    const load = vi.fn(() => Promise.reject(new ApiClientError("forbidden", "denied", 403)));
    const view = mount(<Harness load={load} />);
    await flushEffects();

    expect(view.container.querySelector("[data-testid='load-error']")!.textContent).toBe("denied");

    const plainLoad = vi.fn(() => Promise.reject(new Error("offline")));
    document.body.innerHTML = "";
    const second = mount(<Harness load={plainLoad} />);
    await flushEffects();
    expect(second.container.querySelector("[data-testid='load-error']")!.textContent).toBe(
      "Could not load settings."
    );
    view.unmount();
    second.unmount();
  });

  it("tracks saving/saved/save-error transitions through run()", async () => {
    const load = vi.fn(async (): Promise<FormData> => ({ host: "" }));
    const view = mount(<Harness load={load} />);
    await flushEffects();

    React.act(() => {
      (
        Array.from(view.container.querySelectorAll("button")).find(
          (candidate) => candidate.textContent === "save"
        ) as HTMLButtonElement
      ).click();
    });
    await flushEffects();

    expect(view.container.querySelector("[data-testid='saved']")!.textContent).toBe("true");
    expect(view.container.querySelector("[data-testid='saving']")!.textContent).toBe("false");
    expect(view.container.querySelector("[data-testid='form']")!.textContent).toBe(
      "smtp.example.com"
    );

    // failing save surfaces the domain message and clears the saved flag
    document.body.innerHTML = "";
    const failing = mount(<Harness load={load} saveError />);
    await flushEffects();
    clickButtonWithText(failing.container, "save");
    await flushEffects();
    expect(failing.container.querySelector("[data-testid='save-error']")!.textContent).toBe(
      "invalid host"
    );
    expect(failing.container.querySelector("[data-testid='saved']")!.textContent).toBe("false");

    // setSaved(false) resets the confirmation
    React.act(() => {
      (
        Array.from(view.container.querySelectorAll("button")).find(
          (candidate) => candidate.textContent === "clear-saved"
        ) as HTMLButtonElement
      ).click();
    });
    expect(view.container.querySelector("[data-testid='saved']")!.textContent).toBe("false");

    view.unmount();
    failing.unmount();
  });

  it("stripUnchangedSecret keeps the secret write-back rule honest", () => {
    expect(stripUnchangedSecret("\t\n ")).toBeUndefined();
    expect(stripUnchangedSecret(" keep-me ")).toBe("keep-me");
  });
});
