// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { AssistantModelMetadataResponse } from "../../../core/admin/services/assistantClient";
import { AssistantSettingsPage } from "../../../core/admin/ui/settings/AssistantSettingsPage";
import {
  ASSISTANT_SETTINGS_DEFAULT_VALUES,
  type AssistantSettingsValues,
} from "../../../core/admin/ui/settings/settingsValues";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const apiError = (message: string) => Object.assign(new Error(message), { isApiError: true });

const assistantState = vi.hoisted(() => {
  const metadata: AssistantModelMetadataResponse = {
    model: "openai/gpt-5.4-nano",
    maxInputTokens: 160000,
    maxOutputTokens: 4096,
    supportedParameters: ["max_tokens"],
    source: "provider",
  };
  const state = {
    metadata,
    reindexResult: {
      retrievalBackend: "db",
      builtAt: "2026-03-20T15:40:00.000Z",
      buildDurationMs: 120,
      docCount: 40,
      chunkCount: 220,
      totalTokens: 4400,
      actorId: "user-1",
    },
    getAssistantModelMetadata: vi.fn(),
    reindexAssistantDocs: vi.fn(),
    reset() {
      state.getAssistantModelMetadata.mockReset();
      state.reindexAssistantDocs.mockReset();
      state.getAssistantModelMetadata.mockResolvedValue(state.metadata);
      state.reindexAssistantDocs.mockResolvedValue(state.reindexResult);
    },
  };
  return state;
});

vi.mock("@/services/assistantClient", () => ({
  getAssistantModelMetadata: assistantState.getAssistantModelMetadata,
  reindexAssistantDocs: assistantState.reindexAssistantDocs,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "isApiError" in error),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="select"
      value={value}
      onChange={(event) => onValueChange(event.currentTarget.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
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
      document.body.innerHTML = "";
    },
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitForAutoSaveDelay = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  });
};

const clickButton = async (label: string, options: { last?: boolean } = {}) => {
  const matches = Array.from(document.body.querySelectorAll("button")).filter((button) =>
    button.textContent?.includes(label)
  );
  const button = options.last ? matches.at(-1) : matches[0];
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
  });
};

const setInputValue = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const inputByLabel = (labelText: string) => {
  const label = Array.from(document.body.querySelectorAll("label")).find(
    (item) => item.textContent?.trim() === labelText
  );
  if (!label) throw new Error(`missing label: ${labelText}`);
  const container = label.parentElement;
  const input = container?.querySelector("input");
  if (!(input instanceof HTMLInputElement)) throw new Error(`missing input: ${labelText}`);
  return input;
};

const selectByLabel = (labelText: string) => {
  const label = Array.from(document.body.querySelectorAll("label")).find(
    (item) => item.textContent?.trim() === labelText
  );
  if (!label) throw new Error(`missing label: ${labelText}`);
  const select = label.parentElement?.querySelector('[data-testid="select"]');
  if (!(select instanceof HTMLSelectElement)) throw new Error(`missing select: ${labelText}`);
  return select;
};

const typeInto = async (labelText: string, value: string) => {
  await React.act(async () => {
    setInputValue(inputByLabel(labelText), value);
    await Promise.resolve();
  });
};

const setSelectValue = async (labelText: string, value: string) => {
  await React.act(async () => {
    const select = selectByLabel(labelText);
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
};

const toggleSwitch = async (index: number) => {
  const switches = Array.from(document.body.querySelectorAll('[role="switch"]'));
  const target = switches[index];
  if (!target) throw new Error(`missing switch: ${index}`);
  await React.act(async () => {
    (target as HTMLElement).click();
    await Promise.resolve();
  });
};

const baseValues = (overrides: Partial<AssistantSettingsValues> = {}): AssistantSettingsValues => ({
  ...ASSISTANT_SETTINGS_DEFAULT_VALUES,
  ...overrides,
});

beforeEach(() => {
  assistantState.reset();
  window.localStorage.clear();
});

test("AssistantSettingsPage normalizes legacy modes and unknown providers", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={{
          assistantDefaultMode:
            "llm-rag" as unknown as AssistantSettingsValues["assistantDefaultMode"],
          assistantLlmProvider:
            "bogus" as unknown as AssistantSettingsValues["assistantLlmProvider"],
          assistantLlmModel: 123 as unknown as string,
        }}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(selectByLabel("Default mode").value).toBe("llm-guide");
    expect(selectByLabel("LLM provider").value).toBe("none");
    expect(inputByLabel("LLM model").value).toBe(
      ASSISTANT_SETTINGS_DEFAULT_VALUES.assistantLlmModel
    );
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage keeps docs-only mode and openai provider", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({ assistantDefaultMode: "docs-only", assistantLlmProvider: "openai" })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(selectByLabel("Default mode").value).toBe("docs-only");
    expect(selectByLabel("LLM provider").value).toBe("openai");
    expect(document.body.textContent).toContain("Configure OpenAI API key");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage blocks llm-guide without an enabled provider", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantDefaultMode: "llm-guide",
          assistantLlmEnabled: false,
          assistantLlmProvider: "none",
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("Validation error");
    expect(document.body.textContent).toContain(
      "LLM Guide requires enabled LLM and a provider different than 'none'."
    );
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Save changes")
    );
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage saves values and shows success", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues()} onSave={onSave} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await toggleSwitch(1);
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ assistantLauncherAvatarEnabled: true });
    expect(document.body.textContent).toContain("Assistant settings updated.");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage surfaces api and generic save errors", async () => {
  const onSave = vi.fn().mockRejectedValueOnce(apiError("provider quota exceeded"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues()} onSave={onSave} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await toggleSwitch(0);
    await flushEffects();
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Save failed");
    expect(document.body.textContent).toContain("provider quota exceeded");

    onSave.mockRejectedValueOnce(new Error("network down"));
    await clickButton("Save changes");
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to save assistant settings.");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage applies OpenRouter model limits automatically", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
          assistantLlmMaxInputTokens: 128000,
          assistantLlmMaxOutputTokens: 8192,
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(assistantState.getAssistantModelMetadata).toHaveBeenCalledWith({
      provider: "openrouter",
      model: "openai/gpt-5.4-nano",
    });
    expect(document.body.textContent).toContain("OpenRouter limits loaded");
    expect(document.body.textContent).toContain("Input 160,000 / output 4,096 tokens");
    await clickButton("Advanced");
    expect(inputByLabel("Max input tokens").value).toBe("160000");
    expect(inputByLabel("Max output tokens").value).toBe("4096");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage surfaces model metadata errors", async () => {
  assistantState.getAssistantModelMetadata.mockRejectedValueOnce(apiError("limit fetch failed"));
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("limit fetch failed");
    expect(document.body.textContent).not.toContain("OpenRouter limits loaded");

    assistantState.getAssistantModelMetadata.mockRejectedValueOnce(new Error("boom"));
    await toggleSwitch(2);
    await flushEffects();
    await toggleSwitch(2);
    await flushEffects();
    expect(document.body.textContent).toContain("Could not read OpenRouter model limits.");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage clears model metadata when openrouter is disabled", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    expect(document.body.textContent).toContain("OpenRouter limits loaded");
    await toggleSwitch(2);
    await flushEffects();
    expect(document.body.textContent).not.toContain("OpenRouter limits loaded");
    expect(document.body.textContent).not.toContain("Input 160,000");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage refreshes model limits on demand", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    const callsAfterLoad = assistantState.getAssistantModelMetadata.mock.calls.length;
    await clickButton("Read model limits");
    await flushEffects();
    expect(assistantState.getAssistantModelMetadata.mock.calls.length).toBe(callsAfterLoad + 1);
    expect(document.body.textContent).toContain("OpenRouter limits loaded");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage keeps reindex disabled until assistant is saved enabled", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues({ assistantEnabled: false })} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    const reindexButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Run support reindex")
    );
    if (!reindexButton) throw new Error("missing reindex button");
    expect((reindexButton as HTMLButtonElement).disabled).toBe(true);
    await React.act(async () => {
      (reindexButton as HTMLButtonElement).dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
      await Promise.resolve();
    });
    await flushEffects();
    expect(document.body.textContent).not.toContain("Run assistant reindex?");
    expect(assistantState.reindexAssistantDocs).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage surfaces reindex api and generic errors", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues({ assistantEnabled: true })} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    assistantState.reindexAssistantDocs.mockRejectedValueOnce(apiError("index busy"));
    await clickButton("Advanced");
    await clickButton("Run support reindex");
    await clickButton("Run reindex", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("Reindex failed");
    expect(document.body.textContent).toContain("index busy");

    assistantState.reindexAssistantDocs.mockRejectedValueOnce(new Error("boom"));
    await clickButton("Run support reindex");
    await clickButton("Run reindex", { last: true });
    await flushEffects();
    expect(document.body.textContent).toContain("Failed to run assistant reindex.");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage reports reindex success counts", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues({ assistantEnabled: true })} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    await clickButton("Run support reindex");
    await clickButton("Run reindex", { last: true });
    await flushEffects();
    expect(assistantState.reindexAssistantDocs).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("Assistant docs reindexed: 40 docs, 220 chunks.");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage cancels the reindex review", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues({ assistantEnabled: true })} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    await clickButton("Run support reindex");
    await clickButton("Cancel");
    await flushEffects();
    expect(assistantState.reindexAssistantDocs).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain("Run assistant reindex?");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage autosaves non-error changes", async () => {
  window.localStorage.setItem("coderso.settings.autosave", "true");
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues()} onSave={onSave} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await toggleSwitch(0);
    await flushEffects();
    await waitForAutoSaveDelay();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ assistantEnabled: true });
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage blocks autosave for validation errors", async () => {
  window.localStorage.setItem("coderso.settings.autosave", "true");
  const onSave = vi.fn().mockResolvedValue(undefined);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantDefaultMode: "llm-guide",
          assistantLlmEnabled: false,
          assistantLlmProvider: "none",
        })}
        onSave={onSave}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await toggleSwitch(0);
    await flushEffects();
    await waitForAutoSaveDelay();
    expect(onSave).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsCard parses positive token values defensively", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
          assistantLlmMaxInputTokens: 128000,
          assistantLlmMaxOutputTokens: 8192,
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    const tokensInput = inputByLabel("Max input tokens");
    expect(tokensInput.value).toBe("160000");

    await typeInto("Max input tokens", "abc");
    await flushEffects();
    expect(tokensInput.value).toBe("160000");

    await typeInto("Max input tokens", "0");
    await flushEffects();
    expect(tokensInput.value).toBe("160000");

    await typeInto("Max input tokens", "250");
    await flushEffects();
    expect(tokensInput.value).toBe("250");

    await typeInto("LLM timeout (ms)", "abc");
    await flushEffects();
    expect(inputByLabel("LLM timeout (ms)").value).toBe("20000");
    await typeInto("LLM timeout (ms)", "15000");
    await flushEffects();
    expect(inputByLabel("LLM timeout (ms)").value).toBe("15000");

    await typeInto("Requests per minute", "0");
    await flushEffects();
    expect(inputByLabel("Requests per minute").value).toBe("20");
    await typeInto("Requests per minute", "30");
    await flushEffects();
    expect(inputByLabel("Requests per minute").value).toBe("30");

    await typeInto("Requests per day", "abc");
    await flushEffects();
    expect(inputByLabel("Requests per day").value).toBe("1000");
    await typeInto("Requests per day", "5000");
    await flushEffects();
    expect(inputByLabel("Requests per day").value).toBe("5000");

    await toggleSwitch(3);
    await flushEffects();
    expect(document.body.textContent).toContain("Reindex on boot");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsCard propagates mode, provider, model, avatar, and output tokens", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
          assistantLlmMaxOutputTokens: 8192,
          assistantLauncherAvatarEnabled: true,
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await setSelectValue("Default mode", "docs-only");
    expect(selectByLabel("Default mode").value).toBe("docs-only");

    await setSelectValue("LLM provider", "openai");
    await flushEffects();
    expect(document.body.textContent).toContain("Configure OpenAI API key");

    await typeInto("LLM model", "openai/gpt-4o");
    await flushEffects();
    expect(inputByLabel("LLM model").value).toBe("openai/gpt-4o");

    const avatarInput = document.body.querySelector<HTMLInputElement>(
      'input[placeholder="https://cdn.example.com/assistant-avatar.png"]'
    );
    if (!avatarInput) throw new Error("missing avatar input");
    await React.act(async () => {
      setInputValue(avatarInput, "https://cdn.example.com/new-avatar.png");
      await Promise.resolve();
    });
    expect(avatarInput.value).toBe("https://cdn.example.com/new-avatar.png");

    await clickButton("Advanced");
    const outputInput = inputByLabel("Max output tokens");
    const initialOutput = outputInput.value;
    await typeInto("Max output tokens", "abc");
    await flushEffects();
    expect(outputInput.value).toBe(initialOutput);
    await typeInto("Max output tokens", "3000");
    await flushEffects();
    expect(outputInput.value).toBe("3000");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsCard disables limit refresh without a model", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "",
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    const refreshButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Read model limits")
    );
    if (!refreshButton) throw new Error("missing refresh button");
    expect((refreshButton as HTMLButtonElement).disabled).toBe(true);
    expect(assistantState.getAssistantModelMetadata).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage toggles the autosave checkbox", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage values={baseValues()} />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    const checkbox = document.body.querySelector<HTMLElement>('[data-slot="checkbox"]');
    if (!checkbox) throw new Error("missing autosave checkbox");
    await React.act(async () => {
      checkbox.click();
      await Promise.resolve();
    });
    expect(checkbox.getAttribute("data-state")).toBe("checked");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage ignores stale metadata when the model changes mid-fetch", async () => {
  let resolveFetch: (value: AssistantModelMetadataResponse) => void = () => undefined;
  const pending = new Promise<AssistantModelMetadataResponse>((resolve) => {
    resolveFetch = resolve;
  });
  assistantState.getAssistantModelMetadata.mockReturnValueOnce(pending);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
          assistantLlmMaxInputTokens: 128000,
          assistantLlmMaxOutputTokens: 8192,
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    await typeInto("LLM model", "openai/gpt-4o");
    await React.act(async () => {
      resolveFetch(assistantState.metadata);
      await Promise.resolve();
    });
    await flushEffects();
    expect(inputByLabel("Max input tokens").value).toBe("160000");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage surfaces refresh model metadata errors", async () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    assistantState.getAssistantModelMetadata.mockRejectedValueOnce(apiError("refresh blocked"));
    await clickButton("Read model limits");
    await flushEffects();
    expect(document.body.textContent).toContain("refresh blocked");
  } finally {
    view.cleanup();
  }
});

test("AssistantSettingsPage skips applying limits changed during the fetch", async () => {
  let resolveFetch: (value: AssistantModelMetadataResponse) => void = () => undefined;
  const pending = new Promise<AssistantModelMetadataResponse>((resolve) => {
    resolveFetch = resolve;
  });
  assistantState.getAssistantModelMetadata.mockReturnValueOnce(pending);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/assistant">
      <AssistantSettingsPage
        values={baseValues({
          assistantLlmEnabled: true,
          assistantLlmProvider: "openrouter",
          assistantLlmModel: "openai/gpt-5.4-nano",
          assistantLlmMaxInputTokens: 128000,
          assistantLlmMaxOutputTokens: 8192,
        })}
      />
    </AdminRouterProvider>
  );
  try {
    await flushEffects();
    await clickButton("Advanced");
    await typeInto("Max input tokens", "200000");
    await React.act(async () => {
      resolveFetch(assistantState.metadata);
      await Promise.resolve();
    });
    await flushEffects();
    expect(inputByLabel("Max input tokens").value).toBe("200000");
    expect(document.body.textContent).toContain("OpenRouter limits loaded");
  } finally {
    view.cleanup();
  }
});
