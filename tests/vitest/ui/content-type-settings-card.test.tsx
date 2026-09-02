// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ContentTypeSettingsCard } from "../../../core/admin/ui/content-types/ContentTypeSettingsCard";
import type { ContentTypeConfig } from "../../../core/admin/services/contentTypesClient";
import { setInputValue as setInput } from "./contentListWaveTestUtils";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/contentTypesClient", () => ({
  resolveDraftsEnabled: (cfg: { draftsEnabled?: boolean } | undefined) =>
    cfg?.draftsEnabled ?? true,
  resolveVersioning: (cfg: { versioning?: boolean } | undefined) => cfg?.versioning ?? false,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      data-slot="switch"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  container?.remove();
  container = null;
});

function mount(props: {
  slug?: string;
  config?: ContentTypeConfig | undefined;
  disabled?: boolean;
}) {
  const onSlugChange = vi.fn();
  const onConfigChange = vi.fn();
  const root = createRoot(container!);
  const render = (nextProps: typeof props) => {
    React.act(() => {
      root.render(
        <ContentTypeSettingsCard
          slug={nextProps.slug ?? "posts"}
          config={nextProps.config}
          onSlugChange={onSlugChange}
          onConfigChange={onConfigChange}
          disabled={nextProps.disabled}
        />
      );
    });
  };
  render(props);
  return { onSlugChange, onConfigChange, render };
}

function setInputValue(slot: string, value: string) {
  const input = container!.querySelector<HTMLInputElement>(`[aria-label="${slot}"]`);
  setInput(input, value);
  return input;
}

describe("ContentTypeSettingsCard", () => {
  test("renders slug, names and resolved toggle defaults", () => {
    mount({
      slug: "posts",
      config: { singularName: "Post", pluralName: "Posts" },
    });
    expect((container!.querySelector('[aria-label="API ID"]') as HTMLInputElement).value).toBe(
      "posts"
    );
    expect(
      (container!.querySelector('[aria-label="Singular name"]') as HTMLInputElement).value
    ).toBe("Post");
    expect((container!.querySelector('[aria-label="Plural name"]') as HTMLInputElement).value).toBe(
      "Posts"
    );
    const switches = container!.querySelectorAll('[data-slot="switch"]');
    expect((switches[0] as HTMLInputElement).checked).toBe(true); // drafts on
    expect((switches[1] as HTMLInputElement).checked).toBe(false); // versioning off
  });

  test("typing a singular name emits a config copy with the key", () => {
    const { onConfigChange } = mount({});
    setInputValue("Singular name", "Article");
    expect(onConfigChange).toHaveBeenCalledWith({ singularName: "Article" });
  });

  test("typing a plural name emits the plural-name config key", () => {
    const { onConfigChange } = mount({ config: { singularName: "Article" } });
    setInputValue("Plural name", "Articles");
    expect(onConfigChange).toHaveBeenCalledWith({
      singularName: "Article",
      pluralName: "Articles",
    });
  });

  test("clearing a name drops the present-only key", () => {
    const { onConfigChange } = mount({
      config: { singularName: "Post", pluralName: "Posts" },
    });
    setInputValue("Singular name", "   ");
    expect(onConfigChange).toHaveBeenCalledWith({ pluralName: "Posts" });
  });

  test("slug change forwards the raw value", () => {
    const { onSlugChange } = mount({});
    setInputValue("API ID", "articles");
    expect(onSlugChange).toHaveBeenCalledWith("articles");
  });

  test("toggling drafts off persists explicit false and back on drops the key", () => {
    const { render, onConfigChange } = mount({});
    const switchEl = container!.querySelectorAll('[data-slot="switch"]')[0] as HTMLInputElement;
    switchEl.click();
    expect(onConfigChange).toHaveBeenCalledWith({ draftsEnabled: false });
    // Re-render with the persisted config to prove present-only round trip.
    onConfigChange.mockClear();
    render({ config: { draftsEnabled: false } });
    const toggle = container!.querySelectorAll('[data-slot="switch"]')[0] as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    toggle.click();
    expect(onConfigChange).toHaveBeenCalledWith({});
  });

  test("toggling versioning on persists explicit true and off drops the key", () => {
    const { render, onConfigChange } = mount({});
    const switchEl = container!.querySelectorAll('[data-slot="switch"]')[1] as HTMLInputElement;
    switchEl.click();
    expect(onConfigChange).toHaveBeenCalledWith({ versioning: true });
    onConfigChange.mockClear();
    render({ config: { versioning: true } });
    const toggle = container!.querySelectorAll('[data-slot="switch"]')[1] as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    toggle.click();
    expect(onConfigChange).toHaveBeenCalledWith({});
  });

  test("disabled card renders disabled controls and never emits on switch click", () => {
    const { onSlugChange, onConfigChange } = mount({ disabled: true });
    const inputs = container!.querySelectorAll("input");
    inputs.forEach((input) => expect(input.disabled).toBe(true));
    (container!.querySelectorAll('[data-slot="switch"]')[0] as HTMLInputElement).click();
    (container!.querySelectorAll('[data-slot="switch"]')[1] as HTMLInputElement).click();
    expect(onSlugChange).not.toHaveBeenCalled();
    expect(onConfigChange).not.toHaveBeenCalled();
  });
});
