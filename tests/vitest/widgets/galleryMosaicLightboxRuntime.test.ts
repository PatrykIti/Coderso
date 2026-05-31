// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import {
  GalleryMosaicBlock,
  galleryMosaicDefaults,
} from "../../../core/widgets/core/galleryMosaic";

const renderGalleryLightboxDom = () => {
  document.body.innerHTML = renderToString(
    React.createElement(GalleryMosaicBlock, {
      data: {
        ...galleryMosaicDefaults,
        items: [
          {
            id: "gallery-1",
            image: "https://cdn.example.com/one.jpg",
            caption: "Lead frame",
          },
          {
            id: "gallery-2",
            image: "https://cdn.example.com/two.jpg",
            caption: "Linked frame",
            href: "/details",
          },
          {
            id: "gallery-3",
            video: "https://cdn.example.com/three.mp4",
            caption: "Video frame",
          },
        ],
        interaction: {
          mode: "lightbox",
          zoom: "fill",
        },
      },
      variant: "mosaic",
      blockId: "gallery-lightbox-runtime",
    })
  );

  const script = document.querySelector("script");
  expect(script?.textContent).toBeTruthy();
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("gallery mosaic lightbox runtime opens, closes, stays idempotent, and preserves link precedence", () => {
  renderGalleryLightboxDom();

  const root = document.querySelector('[data-gallery-lightbox-root="1"]');
  expect(root).toBeInstanceOf(HTMLElement);

  const triggers = Array.from(
    document.querySelectorAll<HTMLElement>("[data-gallery-lightbox-trigger]")
  );
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>("[data-gallery-lightbox-dialog]")
  );
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="/details"]'));

  expect(triggers).toHaveLength(2);
  expect(dialogs).toHaveLength(2);
  expect(links).toHaveLength(1);
  expect(links[0]?.querySelector("[data-gallery-lightbox-trigger]")).toBeNull();
  expect(new Set(dialogs.map((dialog) => dialog.id)).size).toBe(dialogs.length);

  const script = document.querySelector("script");
  const firstTrigger = triggers[0] as HTMLButtonElement;
  const firstDialog = dialogs[0]!;
  const firstCloseButton = firstDialog.querySelector(
    "[data-gallery-lightbox-close]"
  ) as HTMLButtonElement;
  const firstCloseFocusSpy = vi.spyOn(firstCloseButton, "focus");
  const firstTriggerFocusSpy = vi.spyOn(firstTrigger, "focus");

  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }

  firstTrigger.click();
  expect(firstDialog.hasAttribute("hidden")).toBe(false);
  expect(firstDialog.getAttribute("data-state")).toBe("active");
  expect(firstCloseFocusSpy).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(firstCloseButton);

  firstCloseButton.click();
  expect(firstDialog.hasAttribute("hidden")).toBe(true);
  expect(firstDialog.getAttribute("data-state")).toBe("inactive");
  expect(firstTriggerFocusSpy).toHaveBeenCalledTimes(1);
  expect(document.activeElement).toBe(firstTrigger);

  firstTrigger.click();
  const firstBackdrop = firstDialog.querySelector(
    "[data-gallery-lightbox-backdrop]"
  ) as HTMLElement;
  firstBackdrop.click();
  expect(firstDialog.hasAttribute("hidden")).toBe(true);

  const secondTrigger = triggers[1] as HTMLButtonElement;
  const secondDialog = dialogs[1]!;
  const secondCloseButton = secondDialog.querySelector(
    "[data-gallery-lightbox-close]"
  ) as HTMLButtonElement;

  secondTrigger.click();
  expect(secondDialog.hasAttribute("hidden")).toBe(false);
  secondCloseButton.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(secondDialog.hasAttribute("hidden")).toBe(true);
  expect(document.activeElement).toBe(secondTrigger);
});
