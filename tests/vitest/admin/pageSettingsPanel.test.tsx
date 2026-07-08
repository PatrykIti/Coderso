// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { PageSettingsSubpanel } from "../../../core/admin/ui/pages/PageEditor";
import { getPageEditorColorPalette } from "../../../core/services/pages/pageEditorControlUiModel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const palette = getPageEditorColorPalette();
const firstSwatch = palette[0]!;

// Minimal settings shape the panel + the present-only background reducer operate on.
type Settings = { template: string; showInNav: boolean; background?: string };

/**
 * Harness that mirrors the PageEditor `updateBackground` live-draft reducer
 * (present-only: clearing drops the key ⇒ byte-identical settings). It exposes
 * the current settings via a ref-like callback so tests assert the draft, not a
 * side-state.
 */
const Harness = ({ onSettings }: { onSettings: (settings: Settings) => void }) => {
  const [settings, setSettings] = useState<Settings>({
    template: "page-v2",
    showInNav: true,
  });
  onSettings(settings);
  const onBackgroundChange = (value: string | null | undefined) => {
    setSettings((prev) => {
      if (!value) {
        const { background: _dropped, ...rest } = prev;
        return rest;
      }
      return { ...prev, background: value };
    });
  };
  return (
    <PageSettingsSubpanel
      onClose={() => {}}
      title="Home"
      slug="/"
      showInNav={settings.showInNav}
      revisionRetention={10}
      isSaving={false}
      onTitleChange={() => {}}
      onSlugChange={() => {}}
      onShowInNavChange={() => {}}
      onRevisionRetentionChange={() => {}}
      onSave={() => {}}
      template={settings.template}
      effects={undefined}
      onEffectsChange={() => {}}
      background={settings.background}
      onBackgroundChange={onBackgroundChange}
      palette={palette}
    />
  );
};

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
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

const backgroundSection = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-page-editor-design-section="true"]');

test("Page background control edits settings.background on the live draft (not a side-state)", () => {
  let latest: Settings = { template: "page-v2", showInNav: true };
  const { container, cleanup } = mount(<Harness onSettings={(s) => (latest = s)} />);

  const section = backgroundSection(container);
  expect(section).not.toBeNull();
  const swatch = section!.querySelector<HTMLButtonElement>(
    `[data-page-editor-color-swatch="${firstSwatch.id}"]`
  );
  expect(swatch).not.toBeNull();

  React.act(() => {
    swatch!.click();
  });

  expect(latest.background).toBe(firstSwatch.value);
  cleanup();
});

test("clearing Page background drops settings.background (present-only)", () => {
  let latest: Settings = { template: "page-v2", showInNav: true };
  const { container, cleanup } = mount(<Harness onSettings={(s) => (latest = s)} />);
  const section = backgroundSection(container)!;

  React.act(() => {
    section
      .querySelector<HTMLButtonElement>(`[data-page-editor-color-swatch="${firstSwatch.id}"]`)!
      .click();
  });
  expect(latest.background).toBe(firstSwatch.value);

  // Transparent swatch clears the value ⇒ present-only omit.
  React.act(() => {
    backgroundSection(container)!
      .querySelector<HTMLButtonElement>('[data-page-editor-color-swatch="transparent"]')!
      .click();
  });
  expect("background" in latest).toBe(false);
  cleanup();
});

test("Page background persists on the live draft (the same settings object every save/publish serializes)", () => {
  let latest: Settings = { template: "page-v2", showInNav: true };
  const { container, cleanup } = mount(<Harness onSettings={(s) => (latest = s)} />);

  React.act(() => {
    backgroundSection(container)!
      .querySelector<HTMLButtonElement>(`[data-page-editor-color-swatch="${firstSwatch.id}"]`)!
      .click();
  });

  // The value lives on the document settings draft (what every save/publish
  // serializes) — NOT a separate handleSettingsSave-only payload.
  expect(latest).toMatchObject({
    template: "page-v2",
    showInNav: true,
    background: firstSwatch.value,
  });
  cleanup();
});

test("reload rehydrates the Page background control from settings.background", () => {
  // Render the panel directly with a background already set (simulating a reload
  // that rehydrates pageDocument.settings.background) — the matching swatch reads
  // as active (aria-pressed).
  const { container, cleanup } = mount(
    <PageSettingsSubpanel
      onClose={() => {}}
      title="Home"
      slug="/"
      showInNav
      revisionRetention={10}
      isSaving={false}
      onTitleChange={() => {}}
      onSlugChange={() => {}}
      onShowInNavChange={() => {}}
      onRevisionRetentionChange={() => {}}
      onSave={() => {}}
      template="page-v2"
      effects={undefined}
      onEffectsChange={() => {}}
      background={firstSwatch.value}
      onBackgroundChange={() => {}}
      palette={palette}
    />
  );

  const swatch = backgroundSection(container)!.querySelector<HTMLButtonElement>(
    `[data-page-editor-color-swatch="${firstSwatch.id}"]`
  );
  expect(swatch!.getAttribute("aria-pressed")).toBe("true");
  cleanup();
});
