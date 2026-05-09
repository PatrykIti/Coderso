// @vitest-environment happy-dom

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { teamDefaults, type TeamData } from "../../../core/widgets/core/team";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
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

const findTextareaByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll("textarea")).find(
    (element) =>
      element instanceof HTMLTextAreaElement && element.getAttribute("placeholder") === placeholder
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
    Array.from(section.querySelectorAll("p")).some(
      (paragraph) => normalizeText(paragraph.textContent) === normalizeText(title)
    )
  );

afterEach(() => {
  vi.restoreAllMocks();
});

test("Team wizard editor covers variant fallback, count changes, and primary member normalization", async () => {
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
    expect(view.container.textContent).toContain("Primary member names");

    const variantSelect = findSelectByOptions(view.container, [
      "cards",
      "compact-list",
      "spotlight",
    ]);
    expect(variantSelect).toBeInstanceOf(HTMLSelectElement);
    expect((variantSelect as HTMLSelectElement).value).toBe("cards");

    setSelectValue(variantSelect, "spotlight");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("spotlight");
    expect(
      (
        findSelectByOptions(view.container, [
          "cards",
          "compact-list",
          "spotlight",
        ]) as HTMLSelectElement
      ).value
    ).toBe("spotlight");

    const memberCountSelect = findSelectByOptions(view.container, ["1", "12"]);
    setSelectValue(memberCountSelect, "4");

    expect(latestValue.members).toHaveLength(4);
    expect(latestValue.header?.title).toBe(teamDefaults.header?.title);
    expect(latestValue.style?.columns).toBe("3");
    expect(findInputsByPlaceholder(view.container, "Member 1 name")).toHaveLength(1);
    expect(findInputsByPlaceholder(view.container, "Member 2 name")).toHaveLength(1);
    expect(findInputsByPlaceholder(view.container, "Member 3 name")).toHaveLength(1);
    expect(view.container.querySelectorAll("input")).toHaveLength(3);

    setInputValue(findInputByPlaceholder(view.container, "Member 1 name"), " Alice ");
    setInputValue(findInputByPlaceholder(view.container, "Member 2 name"), "");
    setInputValue(findInputByPlaceholder(view.container, "Member 3 name"), "Cara");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.members[0]?.name).toBe("Alice");
    expect(latestValue.members[1]?.name).toBe("Team Member 2");
    expect(latestValue.members[2]?.name).toBe("Cara");
    expect(latestValue.members[3]?.name).toBe("Team Member 4");
  } finally {
    view.cleanup();
  }
});

test("Team visual editor covers member structure, social link branching, and style updates", async () => {
  const { TeamVisualEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  const onChangeSpy = vi.fn();
  const onVariantChangeSpy = vi.fn();
  let latestValue: TeamData = {
    header: {
      title: "",
      description: "",
    },
    members: [
      {
        name: " ",
        role: "Owner",
        bio: "Keeps delivery moving.",
        photo: "",
        socialLinks: [],
      },
    ],
    style: {
      columns: "9" as never,
      gap: "wide" as never,
      radius: "round" as never,
      cardSurface: "var(--surface)",
      cardBorder: "not-a-color",
    },
  } as TeamData;

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);
    const [variant, setVariant] = useState("cards");

    return (
      <TeamVisualEditor
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
    expect(view.container.textContent).toContain("Variant and member structure");
    expect(view.container.textContent).toContain("Members content and order");
    expect(view.container.textContent).toContain("Social links");
    expect(view.container.textContent).toContain("Card and layout style");

    const socialLinksSection = findSectionByTitle(view.container, "Social links");
    expect(socialLinksSection?.textContent).toContain("No social links configured.");
    expect(socialLinksSection?.textContent).toContain("Member 1");

    const colorInputs = Array.from(
      view.container.querySelectorAll("input[type='color']")
    ) as HTMLInputElement[];
    expect(colorInputs[0]?.value).toBe("#ffffff");
    expect(colorInputs[1]?.value).toBe("#e2e8f0");

    clickButtonByText(view.container, "Compact List");
    expect(onVariantChangeSpy).toHaveBeenLastCalledWith("compact-list");

    setInputValue(findInputByPlaceholder(view.container, "Meet the team"), "Leadership");
    setTextareaValue(
      findTextareaByPlaceholder(
        view.container,
        "Introduce key people behind delivery, support, and strategy."
      ),
      "Who ships the product."
    );
    setInputValue(findInputsByPlaceholder(view.container, "Anna Kowalska")[0], "Ada");
    setInputValue(findInputsByPlaceholder(view.container, "Head of Product")[0], "CTO");
    setTextareaValue(
      findTextareaByPlaceholder(view.container, "Short bio describing responsibilities and value."),
      "Builds release systems."
    );
    setInputValue(
      findInputByPlaceholder(view.container, "https://images.unsplash.com/..."),
      "https://cdn.example.com/ada.jpg"
    );

    expect(latestValue.header?.title).toBe("Leadership");
    expect(latestValue.header?.description).toBe("Who ships the product.");
    expect(latestValue.members[0]?.name).toBe("Ada");
    expect(latestValue.members[0]?.role).toBe("CTO");
    expect(latestValue.members[0]?.bio).toBe("Builds release systems.");
    expect(latestValue.members[0]?.photo).toBe("https://cdn.example.com/ada.jpg");

    clickButtonByText(socialLinksSection as ParentNode, "Add link");
    expect(latestValue.members[0]?.socialLinks).toHaveLength(1);
    expect(latestValue.members[0]?.socialLinks?.[0]?.label).toBe("LinkedIn");
    expect(latestValue.members[0]?.socialLinks?.[0]?.url).toBe("#");

    setInputValue(findInputsByPlaceholder(view.container, "LinkedIn")[0], "GitHub");
    setInputValue(
      findInputsByPlaceholder(view.container, "https://...")[0],
      "https://github.com/ada"
    );

    expect(latestValue.members[0]?.socialLinks?.[0]).toEqual(
      expect.objectContaining({
        label: "GitHub",
        url: "https://github.com/ada",
      })
    );

    clickButtonByText(findSectionByTitle(view.container, "Social links") as ParentNode, "Remove");
    expect(latestValue.members[0]?.socialLinks).toHaveLength(0);
    expect(findSectionByTitle(view.container, "Social links")?.textContent).toContain(
      "No social links configured."
    );

    const membersSection = findSectionByTitle(view.container, "Members content and order");
    clickButtonByText(membersSection as ParentNode, "Add member");
    expect(latestValue.members).toHaveLength(2);
    setInputValue(findInputsByPlaceholder(view.container, "Anna Kowalska")[1], "Grace");

    clickButtonByText(membersSection as ParentNode, "Move down");
    expect(latestValue.members[0]?.name).toBe("Grace");
    expect(latestValue.members[1]?.name).toBe("Ada");

    clickButtonByText(membersSection as ParentNode, "Remove");
    expect(latestValue.members).toHaveLength(1);
    expect(latestValue.members[0]?.name).toBe("Ada");

    const styleSection = findSectionByTitle(view.container, "Card and layout style");
    expect(
      (
        findSelectByOptions(styleSection as ParentNode, ["1", "2", "3", "4"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("3");
    setSelectValue(findSelectByOptions(styleSection as ParentNode, ["1", "2", "3", "4"]), "4");
    setSelectValue(
      findSelectByOptions(styleSection as ParentNode, ["none", "sm", "md", "lg"]),
      "lg"
    );
    setSelectValue(
      findSelectByOptions(styleSection as ParentNode, ["none", "md", "lg", "xl"]),
      "xl"
    );
    setInputValue(colorInputs[0], "#123456");
    setInputValue(colorInputs[1], "#abcdef");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        columns: "4",
        gap: "lg",
        radius: "xl",
        cardSurface: "#123456",
        cardBorder: "#abcdef",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("Team advanced editor covers normalization safeguards, token updates, and reset", async () => {
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
    expect(view.container.textContent).toContain("Technical layout tokens");
    expect(view.container.textContent).toContain("Normalization and safeguards");
    expect(view.container.textContent).toContain("Raw payload snapshot");

    const initialSnapshot = view.container.querySelector("pre")?.textContent ?? "";
    expect(initialSnapshot).toContain('"columns": "3"');
    expect(initialSnapshot).toContain('"gap": "md"');
    expect(initialSnapshot).toContain('"radius": "lg"');
    expect(initialSnapshot).toContain('"id": "member-2"');
    expect(initialSnapshot).toContain('"id": "social-2"');
    expect(initialSnapshot).toContain('"label": "LinkedIn"');

    clickButtonByText(view.container, "Normalize now");

    expect(onChangeSpy).toHaveBeenCalled();
    expect(latestValue.header?.title).toBe(teamDefaults.header?.title);
    expect(latestValue.style).toEqual(
      expect.objectContaining({
        columns: "3",
        gap: "md",
        radius: "lg",
        cardSurface: undefined,
        cardBorder: undefined,
      })
    );
    expect(latestValue.members[1]?.id).toBe("member-2");
    expect(latestValue.members[0]?.socialLinks?.[0]?.label).toBe("LinkedIn");
    expect(latestValue.members[0]?.socialLinks?.[1]?.id).toBe("social-2");

    setSelectValue(findSelectByOptions(view.container, ["1", "2", "3", "4"]), "2");
    setSelectValue(findSelectByOptions(view.container, ["none", "sm", "md", "lg"]), "lg");
    setSelectValue(findSelectByOptions(view.container, ["none", "md", "lg", "xl"]), "xl");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-bg)"), "var(--panel)");
    setInputValue(findInputByPlaceholder(view.container, "var(--color-border)"), "var(--edge)");

    expect(latestValue.style).toEqual(
      expect.objectContaining({
        columns: "2",
        gap: "lg",
        radius: "xl",
        cardSurface: "var(--panel)",
        cardBorder: "var(--edge)",
      })
    );

    clickButtonByText(view.container, "Reset to defaults");
    expect(latestValue).toEqual(teamDefaults);
    expect(view.container.querySelector("pre")?.textContent).toContain('"title": "Meet the team"');
  } finally {
    view.cleanup();
  }
});

test("Team visual editor covers member-count expansion, social add-link, and raw card token inputs", async () => {
  const { TeamVisualEditor } = await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  let latestValue: TeamData = {
    members: [
      {
        name: "Ada",
        role: "CTO",
        bio: "Builds delivery systems.",
        socialLinks: [],
      },
    ],
    style: {},
  };

  const Harness = () => {
    const [value, setValue] = useState<TeamData>(latestValue);

    return (
      <TeamVisualEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="cards"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    const structureSection = findSectionByTitle(view.container, "Variant and member structure");
    setSelectValue(findSelectByOptions(structureSection as ParentNode, ["1", "12"]), "2");
    expect(latestValue.members).toHaveLength(2);

    const membersSection = findSectionByTitle(view.container, "Members content and order");
    setInputValue(findInputsByPlaceholder(view.container, "Anna Kowalska")[1], "Grace");
    const moveUpButtons = Array.from(
      (membersSection ?? view.container).querySelectorAll("button")
    ).filter((button) => button.textContent?.includes("Move up"));
    clickElement(moveUpButtons[1]);
    expect(latestValue.members.map((member) => member.name)).toEqual(["Grace", "Ada"]);

    const socialLinksSection = findSectionByTitle(view.container, "Social links");
    clickButtonByText(socialLinksSection as ParentNode, "Add link");
    expect(latestValue.members[0]?.socialLinks).toHaveLength(1);
    expect(latestValue.members[0]?.socialLinks?.[0]).toEqual(
      expect.objectContaining({
        label: "LinkedIn",
        url: "#",
      })
    );

    const styleSection = findSectionByTitle(view.container, "Card and layout style");
    setInputValue(
      findInputByPlaceholder(styleSection as ParentNode, "var(--color-bg)"),
      "var(--team-surface)"
    );
    setInputValue(
      findInputByPlaceholder(styleSection as ParentNode, "var(--color-border)"),
      "var(--team-border)"
    );

    expect(latestValue.style).toEqual(
      expect.objectContaining({
        cardSurface: "var(--team-surface)",
        cardBorder: "var(--team-border)",
      })
    );
  } finally {
    view.cleanup();
  }
});

test("Team editors render sparse defaults and ignore variant changes without a handler", async () => {
  const { TeamAdvancedEditor, TeamVisualEditor, TeamWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  const sparseValue: TeamData = {
    header: {},
    members: [{} as never],
    style: {},
  };

  const wizardView = mount(
    <TeamWizardEditor value={sparseValue} onChange={() => undefined} variant="legacy-team" />
  );

  try {
    expect(
      (
        findSelectByOptions(wizardView.container, ["cards", "compact-list", "spotlight"]) as
          | HTMLSelectElement
          | undefined
      )?.value
    ).toBe("cards");
    expect(
      (
        findSelectByOptions(wizardView.container, ["1", "12"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("1");
    expect(
      (
        findInputByPlaceholder(wizardView.container, "Member 1 name") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("Team Member 1");
  } finally {
    wizardView.cleanup();
  }

  const visualView = mount(
    <TeamVisualEditor value={sparseValue} onChange={() => undefined} variant="legacy-team" />
  );

  try {
    const structureSection = findSectionByTitle(
      visualView.container,
      "Variant and member structure"
    );
    clickButtonByText(structureSection as ParentNode, "Compact List");

    expect(
      (
        findInputByPlaceholder(visualView.container, "Meet the team") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe(teamDefaults.header?.title);
    expect(
      (
        findTextareaByPlaceholder(
          visualView.container,
          "Introduce key people behind delivery, support, and strategy."
        ) as HTMLTextAreaElement | null | undefined
      )?.value
    ).toBe(teamDefaults.header?.description);
    expect(
      (
        findInputByPlaceholder(visualView.container, "Anna Kowalska") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("Team Member 1");
    expect(
      (
        findInputByPlaceholder(visualView.container, "Head of Product") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("Role");
    expect(
      (
        findTextareaByPlaceholder(
          visualView.container,
          "Short bio describing responsibilities and value."
        ) as HTMLTextAreaElement | null | undefined
      )?.value
    ).toBe("Short bio describing responsibilities and value.");
    expect(findSectionByTitle(visualView.container, "Social links")?.textContent).toContain(
      "No social links configured."
    );
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <TeamAdvancedEditor value={sparseValue} onChange={() => undefined} variant="cards" />
  );

  try {
    expect(
      (
        findSelectByOptions(advancedView.container, ["1", "2", "3", "4"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("3");
    expect(
      (
        findSelectByOptions(advancedView.container, ["none", "sm", "md", "lg"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("md");
    expect(
      (
        findSelectByOptions(advancedView.container, ["none", "md", "lg", "xl"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("lg");
    expect(
      (
        findInputByPlaceholder(advancedView.container, "var(--color-bg)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
    expect(
      (
        findInputByPlaceholder(advancedView.container, "var(--color-border)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe("");
  } finally {
    advancedView.cleanup();
  }
});

test("Team editors fall back when normalized style is missing and social labels are sparse", async () => {
  vi.resetModules();
  vi.doMock("../../../core/widgets/core/team", async () => {
    const actual = await vi.importActual<typeof import("../../../core/widgets/core/team")>(
      "../../../core/widgets/core/team"
    );

    return {
      ...actual,
      normalizeTeamData: (value: TeamData) => ({
        ...actual.normalizeTeamData(value),
        style: undefined,
      }),
    };
  });

  const { TeamAdvancedEditor, TeamVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/TeamEditors");

  const value: TeamData = {
    members: [
      {
        name: "",
        role: "",
        bio: "",
        socialLinks: [{ label: "", url: "" }],
      },
    ],
  };

  const visualView = mount(
    <TeamVisualEditor value={value} onChange={() => undefined} variant="cards" />
  );

  try {
    expect(findSectionByTitle(visualView.container, "Social links")?.textContent).toContain(
      "Member 1"
    );
    expect(
      (
        findInputByPlaceholder(visualView.container, "var(--color-bg)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe(teamDefaults.style?.cardSurface);
    expect(
      (
        findInputByPlaceholder(visualView.container, "var(--color-border)") as
          | HTMLInputElement
          | null
          | undefined
      )?.value
    ).toBe(teamDefaults.style?.cardBorder);
  } finally {
    visualView.cleanup();
  }

  const advancedView = mount(
    <TeamAdvancedEditor value={value} onChange={() => undefined} variant="cards" />
  );

  try {
    expect(
      (
        findSelectByOptions(advancedView.container, ["1", "2", "3", "4"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("3");
    expect(
      (
        findSelectByOptions(advancedView.container, ["none", "sm", "md", "lg"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("md");
    expect(
      (
        findSelectByOptions(advancedView.container, ["none", "md", "lg", "xl"]) as
          | HTMLSelectElement
          | null
          | undefined
      )?.value
    ).toBe("lg");
  } finally {
    advancedView.cleanup();
    vi.doUnmock("../../../core/widgets/core/team");
    vi.resetModules();
  }
});
