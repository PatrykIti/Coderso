import { expect, test } from "bun:test";

import {
  getPageLayoutSettingsFromData,
  normalizePageDataLayout,
  normalizePageLayoutSettings,
} from "../../../core/services/pages/layoutSettings";

test("normalizePageLayoutSettings applies deterministic defaults", () => {
  const settings = normalizePageLayoutSettings(undefined);

  expect(settings.wrapper.container).toBe("full");
  expect(settings.wrapper.padding.top).toBe("none");
  expect(settings.wrapper.background.color).toBe("transparent");
  expect(settings.wrapper.background.image).toBeNull();
  expect(settings.wrapper.background.media.type).toBe("none");
  expect(settings.wrapper.background.media.source).toBe("external");
  expect(settings.wrapper.background.media.src).toBeNull();
  expect(settings.sections.gap).toBe("none");
  expect(settings.sections.defaults.container).toBe("default");
  expect(settings.applyDefaultsToNewBlocks).toBe(false);
});

test("normalizePageDataLayout preserves existing settings keys", () => {
  const normalized = normalizePageDataLayout({
    blocks: [],
    settings: {
      template: "landing",
      showInNav: true,
    },
  });

  const settings = normalized.settings as Record<string, unknown>;
  expect(settings.template).toBe("landing");
  expect(settings.showInNav).toBe(true);
  expect(settings.layout).toBeObject();
});

test("getPageLayoutSettingsFromData normalizes invalid tokens", () => {
  const settings = getPageLayoutSettingsFromData({
    settings: {
      layout: {
        wrapper: {
          container: "invalid",
          maxWidth: "9xl",
          padding: { top: "abc", bottom: "def" },
        },
        sections: {
          gap: "giant",
          defaults: {
            container: "invalid",
            padding: { top: "giant", bottom: "tiny" },
            margin: { top: "unknown", bottom: "unknown" },
          },
        },
      },
    },
  });

  expect(settings.wrapper.container).toBe("full");
  expect(settings.wrapper.maxWidth).toBeUndefined();
  expect(settings.wrapper.padding.top).toBe("none");
  expect(settings.sections.gap).toBe("none");
  expect(settings.sections.defaults.container).toBe("default");
  expect(settings.sections.defaults.padding.top).toBe("xl");
});

test("normalizePageLayoutSettings maps legacy background image to media image", () => {
  const settings = normalizePageLayoutSettings({
    wrapper: {
      background: {
        color: "#ffffff",
        image: "https://cdn.example.com/background.jpg",
      },
    },
  });

  expect(settings.wrapper.background.media.type).toBe("image");
  expect(settings.wrapper.background.media.src).toBe(
    "https://cdn.example.com/background.jpg"
  );
  expect(settings.wrapper.background.image).toBe(
    "https://cdn.example.com/background.jpg"
  );
});

test("normalizePageLayoutSettings keeps image null for video background", () => {
  const settings = normalizePageLayoutSettings({
    wrapper: {
      background: {
        color: "#ffffff",
        image: "https://cdn.example.com/legacy-image.jpg",
        media: {
          type: "video",
          source: "external",
          src: "https://cdn.example.com/background.mp4",
        },
      },
    },
  });

  expect(settings.wrapper.background.media.type).toBe("video");
  expect(settings.wrapper.background.media.src).toBe(
    "https://cdn.example.com/background.mp4"
  );
  expect(settings.wrapper.background.image).toBeNull();
});
