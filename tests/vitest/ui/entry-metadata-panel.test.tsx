// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { EntryMetadataPanel } from "../../../core/admin/ui/entries/EntryMetadataPanel";
import type {
  EntryTaxonomyState,
  TaxonomyTermOption,
} from "../../../core/admin/ui/entries/EntryMetadataPanel";

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
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    [key: string]: unknown;
  }) => <textarea value={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-scroll-area="true">{children}</div>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") {
          return String(child);
        }
        if (React.isValidElement(child)) {
          return flattenText(child.props.children);
        }
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/ui/shared/InfoTip", () => ({
  InfoTip: () => <span data-info-tip="true" />,
}));

vi.mock("@/ui/shared/StatusBadge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-status-badge={status} />,
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
    // The panel owns no taxonomy state — the host does — so a test that wants to say "the user
    // acted and the host applied it" has to render the answer back in, exactly like the host.
    rerender: (next: React.ReactNode) => {
      React.act(() => {
        root.render(next);
      });
    },
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const baseProps = {
  status: "draft" as const,
  onStatusChange: () => {},
  scheduledAt: "",
  onScheduledAtChange: () => {},
  title: "Hello world",
  slug: "hello-world",
  seoDescription: "",
  onSeoDescriptionChange: () => {},
};

const findSelectByOption = (container: HTMLElement, optionValue: string) =>
  Array.from(container.querySelectorAll("select")).find((select) =>
    Array.from(select.options).some((option) => option.value === optionValue)
  ) ?? null;

test("visibility select toggles the password input", () => {
  const { container, cleanup } = mount(<EntryMetadataPanel {...baseProps} visibility="public" />);

  // Public → no password input.
  expect(container.querySelector('input[type="password"]')).toBeNull();

  cleanup();

  const { container: pwContainer, cleanup: cleanup2 } = mount(
    <EntryMetadataPanel {...baseProps} visibility="password" hasPassword={false} />
  );
  expect(pwContainer.querySelector('input[type="password"]')).not.toBeNull();
  expect(pwContainer.textContent).toContain("Required to protect this entry.");
  cleanup2();
});

test("onVisibilityChange and onAccessPasswordChange fire on interaction", () => {
  const onVisibilityChange = vi.fn();
  const onAccessPasswordChange = vi.fn();
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      visibility="password"
      hasPassword
      onVisibilityChange={onVisibilityChange}
      onAccessPasswordChange={onAccessPasswordChange}
    />
  );

  const visibilitySelect = findSelectByOption(container, "password");
  React.act(() => {
    setSelectValue(visibilitySelect, "private");
  });
  expect(onVisibilityChange).toHaveBeenCalledWith("private");

  const passwordInput = container.querySelector('input[type="password"]');
  React.act(() => {
    setInputValue(passwordInput, "s3cret");
  });
  expect(onAccessPasswordChange).toHaveBeenCalledWith("s3cret");

  // hasPassword helper copy points to the Visibility-switch remove path.
  expect(container.textContent).toContain("switch Visibility to Public/Private to remove it");
  cleanup();
});

test("no Clear password control in either hasPassword state", () => {
  for (const hasPassword of [true, false]) {
    const { container, cleanup } = mount(
      <EntryMetadataPanel {...baseProps} visibility="password" hasPassword={hasPassword} />
    );
    const hasClearButton = Array.from(container.querySelectorAll("button")).some((button) =>
      /clear password/i.test(button.textContent ?? "")
    );
    expect(hasClearButton).toBe(false);
    cleanup();
  }
});

test("Metadata card renders values and author appears exactly once (no avatar footer)", () => {
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      author={{ name: "Maria Nowak", email: "maria@example.com" }}
      createdAt="2026-06-18T10:00:00.000Z"
      updatedAt="2026-06-27T10:00:00.000Z"
      entryId="ent_8f21a0"
    />
  );

  expect(container.textContent).toContain("Metadata");
  expect(container.textContent).toContain("ent_8f21a0");
  expect(container.textContent).toContain("Jun 18, 2026");

  // Author renders exactly once (Metadata card only — no legacy avatar footer).
  const authorCount = (container.textContent?.match(/Maria Nowak/g) ?? []).length;
  expect(authorCount).toBe(1);
  // The removed footer rendered the author email in an uppercase footer line.
  const emailCount = (container.textContent?.match(/maria@example\.com/g) ?? []).length;
  expect(emailCount).toBe(0);
  cleanup();
});

test("scrollable gates the ScrollArea wrapper", () => {
  const scrollingMount = mount(<EntryMetadataPanel {...baseProps} scrollable />);
  expect(scrollingMount.container.querySelector('[data-scroll-area="true"]')).not.toBeNull();
  scrollingMount.cleanup();

  const plainMount = mount(<EntryMetadataPanel {...baseProps} scrollable={false} />);
  expect(plainMount.container.querySelector('[data-scroll-area="true"]')).toBeNull();
  plainMount.cleanup();
});

test("chrome uses SectionCard headers with prototype titles and StatusBadge action", () => {
  const { container, cleanup } = mount(<EntryMetadataPanel {...baseProps} status="published" />);

  expect(container.textContent).toContain("Publish");
  expect(container.textContent).not.toContain("Publishing");
  expect(container.textContent).toContain("Taxonomy");
  expect(container.textContent).toContain("Metadata");
  // StatusBadge lives in the Publish header (action slot).
  expect(container.querySelector('[data-status-badge="published"]')).not.toBeNull();
  cleanup();
});

test("regression: checklist, SEO description, tag add, save metadata remain wired", () => {
  const onSave = vi.fn();
  const onSeoDescriptionChange = vi.fn();
  const onTagIdsChange = vi.fn();
  const onCreateTag = vi.fn();
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      onSeoDescriptionChange={onSeoDescriptionChange}
      onSave={onSave}
      checklist={{
        items: [{ id: "c1", label: "Add a title", status: "complete" }],
        missingRequiredFields: [],
        blockingIssues: [],
      }}
      taxonomy={{
        categoryEnabled: false,
        tagEnabled: true,
        selectedCategoryId: null,
        selectedTagIds: [],
        categories: [],
        tags: [{ id: "t1", name: "News", slug: "news" }],
      }}
      onTagIdsChange={onTagIdsChange}
      onCreateTag={onCreateTag}
    />
  );

  // Checklist badge text present.
  expect(container.textContent).toContain("1/1 ready");
  expect(container.textContent).toContain("Add a title");

  // SEO description textarea wired.
  const textarea = container.querySelector("textarea");
  React.act(() => {
    if (textarea instanceof HTMLTextAreaElement) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      descriptor?.set?.call(textarea, "A summary");
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  expect(onSeoDescriptionChange).toHaveBeenCalledWith("A summary");

  // Tag add-on-Enter wired.
  const tagInput = Array.from(container.querySelectorAll("input")).find(
    (input) => input.getAttribute("placeholder") === "Add tag..."
  );
  React.act(() => {
    setInputValue(tagInput, "News");
  });
  React.act(() => {
    tagInput?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
  });
  expect(onTagIdsChange).toHaveBeenCalledWith(["t1"]);

  // Save metadata button wired.
  const saveButton = Array.from(container.querySelectorAll("button")).find((button) =>
    /save metadata/i.test(button.textContent ?? "")
  );
  React.act(() => {
    saveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onSave).toHaveBeenCalled();
  cleanup();
});

// ---------------------------------------------------------------------------
// Taxonomy decisions that outlive the action that formed them.
//
// "Add category" and "Add tag" ask the host to create a term, wait for the server, and only
// then commit a selection. Nothing freezes in between: the user can pick another category,
// clear it, drop a tag, and the host can hydrate a different selection over the top. Every
// test below is about the same question — when the request lands, whose decision applies —
// and the answer is always the newer one.
// ---------------------------------------------------------------------------

const deferred = <T,>() => {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, resolve: (value: T) => settle(value) };
};

const categoryTaxonomy = (selectedCategoryId: string | null): EntryTaxonomyState => ({
  categoryEnabled: true,
  tagEnabled: false,
  selectedCategoryId,
  selectedTagIds: [],
  categories: [
    { id: "cat-guides", name: "Guides", slug: "guides" },
    { id: "cat-news", name: "News", slug: "news" },
  ],
  tags: [],
});

const tagTaxonomy = (selectedTagIds: string[]): EntryTaxonomyState => ({
  categoryEnabled: false,
  tagEnabled: true,
  selectedCategoryId: null,
  selectedTagIds,
  categories: [],
  tags: [
    { id: "tag-draft", name: "Draft", slug: "draft" },
    { id: "tag-other", name: "Other", slug: "other" },
  ],
});

const findInputByPlaceholder = (container: HTMLElement, placeholder: string) =>
  Array.from(container.querySelectorAll("input")).find(
    (input) => input.getAttribute("placeholder") === placeholder
  ) ?? null;

const clickButton = (container: HTMLElement, pattern: RegExp) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    pattern.test(candidate.textContent?.trim() ?? "")
  );
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const pressEnter = (element: Element | null | undefined) => {
  React.act(() => {
    element?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    );
  });
};

const typeInto = (element: Element | null | undefined, value: string) => {
  React.act(() => {
    setInputValue(element, value);
  });
};

const startCategoryCreation = (container: HTMLElement, name: string) => {
  typeInto(findInputByPlaceholder(container, "Add category..."), name);
  clickButton(container, /^add$/i);
};

const chooseCategory = (container: HTMLElement, value: string) => {
  React.act(() => {
    setSelectValue(findSelectByOption(container, "__none__"), value);
  });
};

test("a category created in the background never overwrites one picked while it was pending", async () => {
  const onCategoryChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const onCreateCategory = vi.fn(() => creation.promise);
  const view = (selectedCategoryId: string | null) => (
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={categoryTaxonomy(selectedCategoryId)}
      onCategoryChange={onCategoryChange}
      onCreateCategory={onCreateCategory}
    />
  );
  const { container, rerender, cleanup } = mount(view(null));

  startCategoryCreation(container, "Releases");
  expect(onCreateCategory).toHaveBeenCalledWith("Releases");

  // The select stays live while the term is created, and the host applies the new choice.
  chooseCategory(container, "cat-news");
  expect(onCategoryChange).toHaveBeenLastCalledWith("cat-news");
  rerender(view("cat-news"));

  await React.act(async () => {
    creation.resolve({ id: "cat-releases", name: "Releases", slug: "releases" });
  });

  expect(onCategoryChange).not.toHaveBeenCalledWith("cat-releases");
  expect(onCategoryChange).toHaveBeenLastCalledWith("cat-news");
  cleanup();
});

test("a category picked away and back while a creation is pending still wins", async () => {
  // The user's last pick equals the value the creation started from. Nothing about the
  // selection LOOKS changed, but the user decided after the request left, so they decided last.
  const onCategoryChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const view = (selectedCategoryId: string | null) => (
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={categoryTaxonomy(selectedCategoryId)}
      onCategoryChange={onCategoryChange}
      onCreateCategory={() => creation.promise}
    />
  );
  const { container, rerender, cleanup } = mount(view("cat-guides"));

  startCategoryCreation(container, "Releases");

  chooseCategory(container, "cat-news");
  rerender(view("cat-news"));
  chooseCategory(container, "cat-guides");
  rerender(view("cat-guides"));

  await React.act(async () => {
    creation.resolve({ id: "cat-releases", name: "Releases", slug: "releases" });
  });

  expect(onCategoryChange).not.toHaveBeenCalledWith("cat-releases");
  expect(onCategoryChange).toHaveBeenLastCalledWith("cat-guides");
  cleanup();
});

test("clearing the category while a creation is pending is not undone by the creation", async () => {
  const onCategoryChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const view = (selectedCategoryId: string | null) => (
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={categoryTaxonomy(selectedCategoryId)}
      onCategoryChange={onCategoryChange}
      onCreateCategory={() => creation.promise}
    />
  );
  const { container, rerender, cleanup } = mount(view("cat-guides"));

  startCategoryCreation(container, "Releases");

  chooseCategory(container, "__none__");
  expect(onCategoryChange).toHaveBeenLastCalledWith(null);
  rerender(view(null));

  await React.act(async () => {
    creation.resolve({ id: "cat-releases", name: "Releases", slug: "releases" });
  });

  expect(onCategoryChange).not.toHaveBeenCalledWith("cat-releases");
  expect(onCategoryChange).toHaveBeenLastCalledWith(null);
  cleanup();
});

test("a tag created in the background does not put back a tag removed while it was pending", async () => {
  const onTagIdsChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const view = (selectedTagIds: string[]) => (
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={tagTaxonomy(selectedTagIds)}
      onTagIdsChange={onTagIdsChange}
      onCreateTag={() => creation.promise}
    />
  );
  const { container, rerender, cleanup } = mount(view(["tag-draft"]));

  const tagInput = findInputByPlaceholder(container, "Add tag...");
  typeInto(tagInput, "Launch");
  pressEnter(tagInput);

  // The chip's remove control is not disabled by the pending creation, and the host applies it.
  React.act(() => {
    container
      .querySelector('[aria-label="Remove Draft"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onTagIdsChange).toHaveBeenLastCalledWith([]);
  rerender(view([]));

  await React.act(async () => {
    creation.resolve({ id: "tag-launch", name: "Launch", slug: "launch" });
  });

  expect(onTagIdsChange).toHaveBeenLastCalledWith(["tag-launch"]);
  cleanup();
});

test("a tag creation lands on the selection the host replaced while it was pending", async () => {
  // Nobody touched the panel here: a hydration or a mutation body changed the selection under
  // it. The created tag is still what the user asked for, so it is added — to the new set.
  const onTagIdsChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const view = (selectedTagIds: string[]) => (
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={tagTaxonomy(selectedTagIds)}
      onTagIdsChange={onTagIdsChange}
      onCreateTag={() => creation.promise}
    />
  );
  const { container, rerender, cleanup } = mount(view(["tag-draft"]));

  const tagInput = findInputByPlaceholder(container, "Add tag...");
  typeInto(tagInput, "Launch");
  pressEnter(tagInput);

  rerender(view(["tag-other"]));

  await React.act(async () => {
    creation.resolve({ id: "tag-launch", name: "Launch", slug: "launch" });
  });

  expect(onTagIdsChange).toHaveBeenLastCalledWith(["tag-other", "tag-launch"]);
  cleanup();
});

test("a tag change while a category creation is pending does not cancel the creation", async () => {
  // The guard is scoped to the field it protects. Deciding about tags is not deciding about
  // the category, so the created category is still selected.
  const onCategoryChange = vi.fn();
  const onTagIdsChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const taxonomy = (selectedTagIds: string[]): EntryTaxonomyState => ({
    ...categoryTaxonomy(null),
    tagEnabled: true,
    selectedTagIds,
    tags: [{ id: "tag-draft", name: "Draft", slug: "draft" }],
  });
  const view = (selectedTagIds: string[]) => (
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={taxonomy(selectedTagIds)}
      onCategoryChange={onCategoryChange}
      onTagIdsChange={onTagIdsChange}
      onCreateCategory={() => creation.promise}
    />
  );
  const { container, rerender, cleanup } = mount(view(["tag-draft"]));

  startCategoryCreation(container, "Releases");

  React.act(() => {
    container
      .querySelector('[aria-label="Remove Draft"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  rerender(view([]));

  await React.act(async () => {
    creation.resolve({ id: "cat-releases", name: "Releases", slug: "releases" });
  });

  expect(onCategoryChange).toHaveBeenLastCalledWith("cat-releases");
  cleanup();
});

// ---------------------------------------------------------------------------
// The panel's OWN record of what it decided, versus the selection its props carry.
//
// Every case above renders the host's answer back in before the pending request resolves, so
// the two agree and either could be read. They cannot always agree: a React commit and the
// passive effect that copies props into the panel's record are two separate steps, and a
// promise continuation runs between them — and a host is free to apply a taxonomy change
// later still (`onTagIdsChange` is optional, and applying it inside a transition is not a
// synchronous flush). The two cases below hold the panel to its own record by never rendering
// the host's answer in at all, which is that window at its widest, and are the only cases
// here that can tell the record from the props.
// ---------------------------------------------------------------------------

test("a tag creation lands on a removal the host has not applied yet", async () => {
  const onTagIdsChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={tagTaxonomy(["tag-draft"])}
      onTagIdsChange={onTagIdsChange}
      onCreateTag={() => creation.promise}
    />
  );

  const tagInput = findInputByPlaceholder(container, "Add tag...");
  typeInto(tagInput, "Launch");
  pressEnter(tagInput);

  React.act(() => {
    container
      .querySelector('[aria-label="Remove Draft"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(onTagIdsChange).toHaveBeenLastCalledWith([]);

  await React.act(async () => {
    creation.resolve({ id: "tag-launch", name: "Launch", slug: "launch" });
  });

  // Reading the props instead would read the selection they still carry — ["tag-draft"] — and
  // put back the tag the user removed.
  expect(onTagIdsChange).toHaveBeenLastCalledWith(["tag-launch"]);
  cleanup();
});

test("a second tag creation adds to the first one the host has not applied yet", async () => {
  const onTagIdsChange = vi.fn();
  const creations = [deferred<TaxonomyTermOption | null>(), deferred<TaxonomyTermOption | null>()];
  let started = 0;
  const onCreateTag = () => {
    const creation = creations[started];
    started += 1;
    if (!creation) throw new Error("a third tag creation was started");
    return creation.promise;
  };
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={tagTaxonomy(["tag-draft"])}
      onTagIdsChange={onTagIdsChange}
      onCreateTag={onCreateTag}
    />
  );

  const tagInput = findInputByPlaceholder(container, "Add tag...");
  typeInto(tagInput, "Launch");
  pressEnter(tagInput);
  await React.act(async () => {
    creations[0]?.resolve({ id: "tag-launch", name: "Launch", slug: "launch" });
  });
  expect(onTagIdsChange).toHaveBeenLastCalledWith(["tag-draft", "tag-launch"]);

  // The input is live again and the host still has not applied the first tag.
  typeInto(tagInput, "Ship");
  pressEnter(tagInput);
  await React.act(async () => {
    creations[1]?.resolve({ id: "tag-ship", name: "Ship", slug: "ship" });
  });

  // Both additions are deltas on the same selection, so the second cannot drop the first.
  expect(onTagIdsChange).toHaveBeenLastCalledWith(["tag-draft", "tag-launch", "tag-ship"]);
  cleanup();
});

test("an uncontested category creation still selects the new category", async () => {
  const onCategoryChange = vi.fn();
  const creation = deferred<TaxonomyTermOption | null>();
  const { container, cleanup } = mount(
    <EntryMetadataPanel
      {...baseProps}
      taxonomy={categoryTaxonomy(null)}
      onCategoryChange={onCategoryChange}
      onCreateCategory={() => creation.promise}
    />
  );

  startCategoryCreation(container, "Releases");
  await React.act(async () => {
    creation.resolve({ id: "cat-releases", name: "Releases", slug: "releases" });
  });

  expect(onCategoryChange).toHaveBeenLastCalledWith("cat-releases");
  expect(findInputByPlaceholder(container, "Add category...")?.value).toBe("");
  cleanup();
});
