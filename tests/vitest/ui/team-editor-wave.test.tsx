// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { listMediaCached } from "@/services/mediaClient";
import { teamDefaults, type TeamData } from "../../../core/widgets/core/team";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/mediaClient", () => ({
  listMediaCached: vi.fn(),
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "careers-page",
      title: "Careers",
      slug: "careers",
      status: "published",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
    {
      id: "draft-page",
      title: "Draft careers",
      slug: "draft-careers",
      status: "draft",
      updatedAt: "2026-05-24T00:00:00.000Z",
      author: null,
    },
  ]),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: ({ value, onChange }: { value: unknown; onChange?: (value: unknown) => void }) => (
    <div>
      <button type="button" onClick={() => onChange?.("media-1")}>
        Browse media
      </button>
      {value ? (
        <button type="button" onClick={() => onChange?.(null)}>
          Clear selected media
        </button>
      ) : null}
      <p>{value ? `Selected: ${String(value)}` : "No media selected yet."}</p>
    </div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    children,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description?: string;
    children?: React.ReactNode;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-confirm-dialog="true">
        <p>{title}</p>
        {description ? <p>{description}</p> : null}
        <div>{children}</div>
        <button type="button" onClick={onConfirm}>
          confirm-action
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    type,
    ...props
  }: {
    value?: string | number;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    [key: string]: unknown;
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} {...props} />
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (
    value: React.ReactNode
  ): Array<{ value: string; label: string; disabled: boolean }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
            disabled: Boolean(child.props.disabled),
          },
        ];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
      disabled,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: ({
      children,
      placeholder,
    }: {
      children?: React.ReactNode;
      placeholder?: string;
    }) => <>{children ?? placeholder ?? null}</>,
  };
});

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    placeholder,
    rows,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
    [key: string]: unknown;
  }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} {...props} />
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
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
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickElement = (element: Element | null | undefined) => {
  if (!element) return;
  React.act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const flushAsyncUpdates = async () => {
  await React.act(async () => {
    await flushPromises();
    await flushPromises();
  });
};

const clickButtonByText = (container: ParentNode, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  clickElement(button);
};

const findInputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findInputsByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).filter(
    (element) =>
      element instanceof HTMLInputElement && element.getAttribute("placeholder") === placeholder
  );

const findSelectByOptions = (container: ParentNode, values: string[]) =>
  Array.from(container.querySelectorAll("select")).find((element) => {
    if (!(element instanceof HTMLSelectElement)) return false;
    const optionValues = Array.from(element.options).map((option) => option.value);
    return values.every((value) => optionValues.includes(value));
  });

const normalizeText = (value: string | null | undefined) =>
  (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

const findSectionByTitle = (container: ParentNode, title: string) =>
  Array.from(container.querySelectorAll("section")).find((section) =>
    Array.from(section.querySelectorAll("h3, p")).some(
      (candidate) => normalizeText(candidate.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

test("Team wizard editor covers variant fallback and leaves member count to Visual", async () => {
  const { TeamWizardEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: TeamData = {
    members: [{ name: "Lead", role: "Owner", bio: "Keeps delivery moving.", socialLinks: [] }],
  } as TeamData;

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);
    const [variant, setVariant] = useState("unexpected");

    return (
      <TeamWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => {
          onVariantChangeSpy(next);
          setVariant(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Team layout");
    expect(view.container.textContent).toContain("Members count");
    expect(view.container.textContent).toContain("Use Visual to change member count");

    const variantSelect = findSelectByOptions(view.container, [
      "cards",
      "compact-list",
      "spotlight",
    ]);
    expect(variantSelect).toBeInstanceOf(HTMLSelectElement);
    expect((variantSelect as HTMLSelectElement).value).toBe("cards");

    setSelectValue(variantSelect, "spotlight");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("spotlight");
    expect(findSelectByOptions(view.container, ["1", "12"])).toBeUndefined();
    expect(latestValue.members).toHaveLength(1);
    expect(findInputsByPlaceholder(view.container, "Member 1 name")).toHaveLength(0);
    expect(findInputsByPlaceholder(view.container, "Member 1 role")).toHaveLength(0);
    expect(onChangeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Team visual editor integrates social links into member panels and confirms destructive actions", async () => {
  const { TeamVisualEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  let latestValue: TeamData = {
    header: {
      title: "Leadership",
      description: "",
    },
    members: [
      {
        id: "member-1",
        name: "Ada",
        role: "CTO",
        bio: "Builds release systems.",
        photo: "",
        socialLinks: [],
      },
    ],
    style: {},
  };

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);
    const [variant, setVariant] = useState("cards");

    return (
      <TeamVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => setVariant(next)}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Header copy and CTA");
    expect(view.container.textContent).toContain("Members content and order");
    expect(view.container.textContent).toContain("Section and card style");
    expect(view.container.textContent).toContain("Social links");
    expect(view.container.textContent).not.toContain(
      "No social links configured.No social links configured."
    );

    const membersSection = findSectionByTitle(view.container, "Members content and order");
    expect(membersSection).toBeTruthy();
    expect(
      Array.from((membersSection as ParentNode).querySelectorAll("button")).filter((button) =>
        button.textContent?.includes("Add member")
      )
    ).toHaveLength(2);

    clickButtonByText(membersSection as ParentNode, "Add link");
    expect(latestValue.members[0]?.socialLinks).toHaveLength(1);
    expect(latestValue.members[0]?.socialLinks?.[0]?.url).toBeUndefined();

    setSelectValue(
      findSelectByOptions(view.container, [
        "linkedin",
        "x",
        "github",
        "instagram",
        "facebook",
        "youtube",
      ]),
      "github"
    );
    setInputValue(findInputsByPlaceholder(view.container, "ada-lovelace")[0], "ada");
    expect(latestValue.members[0]?.socialLinks?.[0]).toEqual(
      expect.objectContaining({
        label: "GitHub",
        url: "https://github.com/ada",
      })
    );
    expect(findInputsByPlaceholder(view.container, "https://...")).toHaveLength(0);

    const socialProfileInput = findInputsByPlaceholder(view.container, "ada-lovelace")[0];
    const socialRow = socialProfileInput?.closest("[data-team-social-link]");
    clickButtonByText(socialRow as ParentNode, "Remove");
    expect(view.container.textContent).toContain("Remove this social link from Ada?");
    clickButtonByText(socialRow as ParentNode, "Cancel");
    expect(latestValue.members[0]?.socialLinks).toHaveLength(1);
    clickButtonByText(socialRow as ParentNode, "Remove");
    clickButtonByText(socialRow as ParentNode, "Confirm remove");
    expect(latestValue.members[0]?.socialLinks).toHaveLength(0);
    expect(view.container.textContent).toContain("No social links configured.");

    clickButtonByText(membersSection as ParentNode, "Add member");
    expect(latestValue.members).toHaveLength(2);
    setInputValue(findInputsByPlaceholder(view.container, "Anna Kowalska")[1], "Grace");

    const memberRemoveButtons = Array.from(
      (membersSection as ParentNode).querySelectorAll("button")
    ).filter((button) => button.textContent === "Remove");
    clickElement(memberRemoveButtons[1]);
    expect(view.container.textContent).toContain("Remove this member profile");
    clickButtonByText(membersSection as ParentNode, "Cancel");
    expect(latestValue.members).toHaveLength(2);

    clickElement(
      Array.from((membersSection as ParentNode).querySelectorAll("button")).filter(
        (button) => button.textContent === "Remove"
      )[1]
    );
    clickButtonByText(membersSection as ParentNode, "Confirm remove");
    expect(latestValue.members).toHaveLength(1);
    expect(latestValue.members[0]?.name).toBe("Ada");
  } finally {
    view.cleanup();
  }
});

test("Team visual editor covers spotlight lead, media picker, CTA feedback, and style controls", async () => {
  const { TeamVisualEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");
  vi.mocked(listMediaCached).mockResolvedValue([
    {
      id: "media-1",
      url: "https://cdn.example.com/ada-picked.jpg",
      alt: "Ada portrait",
      title: "Ada portrait",
      caption: "",
      originalName: "ada.jpg",
      mimeType: "image/jpeg",
    } as never,
  ]);

  let latestValue: TeamData = {
    header: teamDefaults.header,
    members: [
      {
        id: "member-1",
        name: "Ada",
        role: "CTO",
        bio: "Builds release systems.",
        photo: "",
        socialLinks: [],
      },
      {
        id: "member-2",
        name: "Grace",
        role: "COO",
        bio: "Keeps delivery aligned.",
        photo: "",
        socialLinks: [],
      },
    ],
    style: {},
  };

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);
    const [variant, setVariant] = useState("spotlight");

    return (
      <TeamVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => setVariant(next)}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    clickButtonByText(view.container, "Set as spotlight lead");
    expect(latestValue.spotlightLeadId).toBe("member-2");
    expect(view.container.textContent).toContain("Spotlight Lead");

    const browseButtons = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      button.textContent?.includes("Browse media")
    );
    expect(
      findInputByPlaceholder(view.container, "https://images.unsplash.com/...")
    ).toBeUndefined();
    clickElement(browseButtons[0]);
    expect(listMediaCached).toHaveBeenCalled();
    await flushAsyncUpdates();
    expect(latestValue.members[0]?.photo).toBe("https://cdn.example.com/ada-picked.jpg");

    clickButtonByText(view.container, "Clear photo");
    await flushAsyncUpdates();
    expect(latestValue.members[0]?.photo).toBeUndefined();

    setInputValue(findInputByPlaceholder(view.container, "Our team"), "Leadership");
    setInputValue(findInputByPlaceholder(view.container, "Meet the team"), "Meet leadership");
    setInputValue(findInputByPlaceholder(view.container, "See all positions"), "Join us");
    await flushAsyncUpdates();
    setSelectValue(
      findSelectByOptions(view.container, ["__coderso_link_empty__", "careers-page"]),
      "careers-page"
    );
    expect(findInputByPlaceholder(view.container, "/careers")).toBeUndefined();
    expect(view.container.textContent).toContain("Links to selected site page: Careers.");

    const styleSection = findSectionByTitle(view.container, "Section and card style");
    const sectionBackgroundSwatch = (styleSection as ParentNode).querySelector(
      'input[aria-label="Section background swatch"]'
    );
    const cardBackgroundSwatch = (styleSection as ParentNode).querySelector(
      'input[aria-label="Card background swatch"]'
    );
    const cardBorderSwatch = (styleSection as ParentNode).querySelector(
      'input[aria-label="Card border swatch"]'
    );
    expect(sectionBackgroundSwatch).toBeInstanceOf(HTMLInputElement);
    expect(cardBackgroundSwatch).toBeInstanceOf(HTMLInputElement);
    expect(cardBorderSwatch).toBeInstanceOf(HTMLInputElement);
    expect(
      (styleSection as ParentNode).querySelector('input[aria-label="Section background value"]')
    ).toBeNull();
    expect(
      (styleSection as ParentNode).querySelector('input[aria-label="Card background value"]')
    ).toBeNull();
    expect(
      (styleSection as ParentNode).querySelector('input[aria-label="Card border value"]')
    ).toBeNull();
    setInputValue(sectionBackgroundSwatch, "#111827");
    setInputValue(cardBackgroundSwatch, "#f8fafc");
    setInputValue(cardBorderSwatch, "#cbd5e1");
    setSelectValue(findSelectByOptions(styleSection as ParentNode, ["0", "1", "2", "3"]), "3");
    setSelectValue(findSelectByOptions(styleSection as ParentNode, ["show", "hide"]), "hide");

    expect(latestValue.header?.eyebrow).toBe("Leadership");
    expect(latestValue.header?.title).toBe("Meet leadership");
    expect(latestValue.cta?.label).toBe("Join us");
    expect(latestValue.cta?.url).toBe("/careers");
    expect(latestValue.style?.sectionBackground).toBe("#111827");
    expect(latestValue.style?.cardSurface).toBe("#f8fafc");
    expect(latestValue.style?.cardBorder).toBe("#cbd5e1");
    expect(latestValue.style?.cardBorderWidth).toBe("3");
    expect(latestValue.style?.compactMobileBio).toBe("hide");
    expect(view.container.textContent).toContain("Configured colors may be hard to read together.");

    const clearButtons = Array.from((styleSection as ParentNode).querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("Clear")
    );
    clickElement(clearButtons[0]);
    clickElement(clearButtons[1]);
    clickElement(clearButtons[2]);
    expect(latestValue.style?.sectionBackground).toBe("");
    expect(latestValue.style?.cardSurface).toBe("");
    expect(latestValue.style?.cardBorder).toBe("");
  } finally {
    view.cleanup();
  }
});

test("Team visual editor clears stale picked-media state when media resolution fails", async () => {
  const { TeamVisualEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");
  vi.mocked(listMediaCached).mockRejectedValueOnce(new Error("network_error"));

  let latestValue: TeamData = {
    header: teamDefaults.header,
    members: [
      {
        id: "member-1",
        name: "Ada",
        role: "CTO",
        bio: "Builds release systems.",
        photo: "https://cdn.example.com/direct-ada.jpg",
        socialLinks: [],
      },
    ],
    style: {},
  };

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);
    const [variant, setVariant] = useState("cards");

    return (
      <TeamVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant={variant}
        onVariantChange={(next) => setVariant(next)}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    clickButtonByText(view.container, "Browse media");
    await flushAsyncUpdates();

    expect(listMediaCached).toHaveBeenCalled();
    expect(latestValue.members[0]?.photo).toBe("https://cdn.example.com/direct-ada.jpg");
    expect(view.container.textContent).toContain("Failed to resolve selected media.");
    expect(view.container.textContent).toContain(
      "A saved photo is configured. Browse media to replace it or clear the photo."
    );
    expect(view.container.textContent).not.toContain("Selected: media-1");
  } finally {
    view.cleanup();
  }
});

test("Team advanced editor keeps support actions confirm-gated and diagnostics read-only", async () => {
  const { TeamAdvancedEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  const onChangeSpy = vi.fn();
  let latestValue: TeamData = {
    members: [
      {
        id: "same-member",
        name: " ",
        role: "",
        bio: "",
        socialLinks: [
          { id: "same-social", label: "", url: "" },
          { id: "same-social", label: " ", url: " " },
        ],
      },
      {
        id: "same-member",
        name: "",
        role: "",
        bio: "",
        socialLinks: [],
      },
    ],
    style: {
      columns: "9" as never,
      gap: "wide" as never,
      radius: "round" as never,
      cardBorderWidth: "9" as never,
      compactMobileBio: "other" as never,
    },
  } as TeamData;

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);
    return (
      <TeamAdvancedEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          onChangeSpy(next);
          setValue(next);
        }}
        variant="cards"
        onVariantChange={() => undefined}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Layout summary");
    expect(view.container.textContent).toContain("Surface summary");
    expect(view.container.textContent).toContain("Content summary");
    expect(view.container.textContent).toContain("Support actions");
    expect(view.container.textContent).toContain("Read-only layout state");
    expect(view.container.textContent).not.toContain("Raw payload snapshot");
    expect(view.container.querySelector("pre")).toBeNull();
    expect(view.container.querySelector("select")).toBeNull();
    expect(view.container.querySelector('input[placeholder="var(--color-bg)"]')).toBeNull();
    expect(view.container.querySelector('input[placeholder="var(--color-border)"]')).toBeNull();
    expect(
      view.container.querySelectorAll(
        '[data-widget-control-path]:not([data-widget-control-readonly="true"])'
      )
    ).toHaveLength(0);

    clickButtonByText(view.container, "Normalize now");
    expect(view.container.textContent).toContain("Normalize Team widget?");
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(latestValue.header).toBeUndefined();
    clickButtonByText(view.container, "confirm-action");
    expect(latestValue.header?.title).toBe(teamDefaults.header?.title);
    expect(latestValue.style?.cardBorderWidth).toBe("1");
    expect(latestValue.style?.compactMobileBio).toBe("show");
    expect(latestValue.members?.[1]?.id).toBe("member-2");

    clickButtonByText(view.container, "Reset to defaults");
    expect(view.container.textContent).toContain("Reset Team widget?");
    expect(latestValue).not.toEqual(teamDefaults);
    clickButtonByText(view.container, "confirm-action");
    expect(latestValue).toEqual(teamDefaults);
  } finally {
    view.cleanup();
  }
});
