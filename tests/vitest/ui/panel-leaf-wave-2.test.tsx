// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { BookingResourcesTab } from "../../../core/admin/ui/booking/components/ResourcesTab";
import { CommerceCollectionsPanel } from "../../../core/admin/ui/commerce/components/CommerceCollectionsPanel";
import { CommerceEditorSections } from "../../../core/admin/ui/commerce/components/CommerceEditorSections";
import { PostEditorSettingsDialog } from "../../../core/admin/ui/posts/editor/settings/PostEditorSettingsDialog";
import { ApiKeysTable } from "../../../core/admin/ui/settings/ApiKeysTable";
import { StorageProviderCard } from "../../../core/admin/ui/settings/StorageProviderCard";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    asChild,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    asChild?: boolean;
    [key: string]: unknown;
  }) =>
    asChild ? (
      <span>{children}</span>
    ) : (
      <button type="button" onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
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
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-dialog-open={String(Boolean(open))}>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  }) => <input defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
        return [
          {
            value: child.props.value,
            label: flattenText(child.props.children),
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
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: () => null,
  };
});

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    colSpan,
    className,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
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
  }) => <textarea defaultValue={value} onChange={onChange} {...props} />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | boolean | null | undefined>) => values.filter(Boolean).join(" "),
}));

vi.mock("../../../core/admin/ui/booking/bookingHelpers", () => ({
  formatResourceType: (value: string) => `type:${value}`,
}));

vi.mock("../../../core/admin/ui/settings/apiKeyScopes", () => ({
  getScopeLabel: (scope: string) => `scope:${scope}`,
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
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

test("PostEditorSettingsDialog forwards preference changes, reset, and close", () => {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const onOpenChange = vi.fn();
  const view = mount(
    <PostEditorSettingsDialog
      open
      onOpenChange={onOpenChange}
      preferences={{
        focusModeOnOpen: false,
        compactSidePanels: false,
        showOutlineHints: true,
        editorDensity: "comfortable",
        showKeyboardHints: true,
        defaultInspectorTab: "post",
        restoreLastSidebarsState: true,
      }}
      onChange={onChange}
      onReset={onReset}
    />
  );

  try {
    expect(view.container.textContent).toContain("Editor settings");
    expect(view.container.textContent).toContain("Startup");

    const checkboxes = Array.from(
      view.container.querySelectorAll("input[type='checkbox']")
    ) as HTMLInputElement[];
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      checkboxes[0]?.click();
      checkboxes[1]?.click();
      setSelectValue(selects[0], "block");
      checkboxes[2]?.click();
      checkboxes[3]?.click();
      checkboxes[4]?.click();
      setSelectValue(selects[1], "compact");
      buttons.find((button) => button.textContent?.includes("Reset defaults"))?.click();
      buttons.find((button) => button.textContent === "Done")?.click();
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ focusModeOnOpen: true }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ restoreLastSidebarsState: false })
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultInspectorTab: "block" })
    );
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ compactSidePanels: true }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showOutlineHints: false }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showKeyboardHints: false }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ editorDensity: "compact" }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  } finally {
    view.cleanup();
  }
});

test("BookingResourcesTab forwards resource list and form actions", () => {
  const onSelectResource = vi.fn();
  const onResourceFormChange = vi.fn();
  const onSubmitResource = vi.fn();
  const onEditResource = vi.fn();
  const onDeleteResource = vi.fn();
  const onCancelEdit = vi.fn();

  const resources = [
    {
      id: "resource-1",
      name: "Bay A",
      slug: "bay-a",
      type: "bay",
      status: "active",
      timezone: "UTC",
      capacity: 2,
      settings: {},
      createdAt: "2026-03-06",
      updatedAt: "2026-03-06",
    },
  ];

  const view = mount(
    <>
      <BookingResourcesTab
        resources={[]}
        resourcesLoading
        selectedResourceId=""
        editingResourceId={null}
        resourceForm={{
          name: "",
          slug: "",
          type: "staff",
          status: "active",
          timezone: "UTC",
          capacity: "1",
        }}
        saving={false}
        onSelectResource={onSelectResource}
        onResourceFormChange={onResourceFormChange}
        onSubmitResource={onSubmitResource}
        onEditResource={onEditResource}
        onDeleteResource={onDeleteResource}
        onCancelEdit={onCancelEdit}
      />
      <BookingResourcesTab
        resources={resources as never}
        resourcesLoading={false}
        selectedResourceId="resource-1"
        editingResourceId="resource-1"
        resourceForm={{
          name: "Bay A",
          slug: "bay-a",
          type: "bay",
          status: "active",
          timezone: "UTC",
          capacity: "2",
        }}
        saving={false}
        onSelectResource={onSelectResource}
        onResourceFormChange={onResourceFormChange}
        onSubmitResource={onSubmitResource}
        onEditResource={onEditResource}
        onDeleteResource={onDeleteResource}
        onCancelEdit={onCancelEdit}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Loading resources...");
    expect(view.container.textContent).toContain("Bay A");

    const inputs = Array.from(view.container.querySelectorAll("input"));
    const selects = Array.from(view.container.querySelectorAll("select"));
    const buttons = Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons.find((button) => button.textContent === "Edit")?.click();
      buttons.find((button) => button.textContent === "Delete")?.click();
      setInputValue(inputs[0], "Bay B");
      setInputValue(inputs[1], "bay-b");
      setSelectValue(selects[0], "tool");
      setSelectValue(selects[1], "inactive");
      setInputValue(inputs[2], "Europe/Warsaw");
      setInputValue(inputs[3], "5");
      buttons.find((button) => button.textContent?.includes("Save resource"))?.click();
      buttons.find((button) => button.textContent?.includes("Cancel edit"))?.click();
    });

    expect(onSelectResource).toHaveBeenCalledWith("resource-1");
    expect(onEditResource).toHaveBeenCalledWith(resources[0]);
    expect(onDeleteResource).toHaveBeenCalledWith("resource-1");
    expect(onResourceFormChange).toHaveBeenCalledWith({ name: "Bay B" });
    expect(onResourceFormChange).toHaveBeenCalledWith({ slug: "bay-b" });
    expect(onResourceFormChange).toHaveBeenCalledWith({ type: "tool" });
    expect(onResourceFormChange).toHaveBeenCalledWith({ status: "inactive" });
    expect(onResourceFormChange).toHaveBeenCalledWith({
      timezone: "Europe/Warsaw",
    });
    expect(onResourceFormChange).toHaveBeenCalledWith({ capacity: "5" });
    expect(onSubmitResource).toHaveBeenCalledOnce();
    expect(onCancelEdit).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});

test("commerce leaf panels render states and forward changes", () => {
  // TASK-479-19-L02: the editor was restructured — the settings sidebar
  // (CommerceCollectionsPanel) now owns Status + Organization + Price summary, and
  // Media moved into CommerceEditorSections (Details/Media/Pricing/Inventory). This
  // updates the queries to the new control placement; the intent (every control
  // forwards its change) is unchanged.
  const onToggleCollection = vi.fn();
  const onStatusChange = vi.fn();
  const onPublish = vi.fn();
  const onCreateCollection = vi.fn();
  const onChange = vi.fn();
  const html = renderToString(
    <CommerceCollectionsPanel
      collections={[]}
      selectedIds={[]}
      status="draft"
      pricingAmount="0"
      pricingCompareAtAmount=""
      pricingCurrency="USD"
      publishButtonLabel="Publish"
      isSaving={false}
      onToggleCollection={onToggleCollection}
      onStatusChange={onStatusChange}
      onPublish={onPublish}
      onCreateCollection={onCreateCollection}
    />
  );

  // TASK-488-02-L02: the dead "Commerce API/UI flow" hint was replaced with a
  // working create-collection affordance that navigates to the collections
  // manager.
  expect(html).toContain("Create your first collection");

  const view = mount(
    <>
      <CommerceCollectionsPanel
        collections={[
          {
            id: "collection-1",
            name: "Featured",
            slug: "featured",
            description: null,
            createdAt: "2026-03-06",
            updatedAt: "2026-03-06",
          },
        ]}
        selectedIds={["collection-1"]}
        status="draft"
        pricingAmount="450000"
        pricingCompareAtAmount="470000"
        pricingCurrency="USD"
        publishButtonLabel="Publish"
        isSaving={false}
        onToggleCollection={onToggleCollection}
        onStatusChange={onStatusChange}
        onPublish={onPublish}
        onCreateCollection={onCreateCollection}
      />
      <CommerceEditorSections
        draft={{
          title: "Oak Residence",
          slug: "oak-residence",
          status: "draft",
          excerpt: "",
          description: "",
          pricingAmount: "450000",
          pricingCurrency: "USD",
          pricingCompareAtAmount: "",
          stockState: "in_stock",
          stockQuantity: "10",
          mediaIdsText: "",
          collectionIds: [],
          variants: [],
          metadata: {},
          data: {},
        }}
        onChange={onChange}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("Featured");
    expect(view.container.textContent).toContain("Details"); // was "Identity"
    expect(view.container.textContent).toContain("Price summary"); // sidebar
    expect(view.container.textContent).toContain("Inventory"); // was "Stock"

    const selects = Array.from(view.container.querySelectorAll("select"));
    const checkboxes = Array.from(view.container.querySelectorAll("input[type='checkbox']"));
    const collectionCheckbox = checkboxes[0]; // Organization checkbox row
    const trackInventorySwitch = checkboxes[1]; // Inventory "Track inventory" switch

    React.act(() => {
      (collectionCheckbox as HTMLInputElement | null)?.click();
      setSelectValue(selects[0], "published"); // sidebar Status select
      setInputValue(view.container.querySelector("#commerce-title"), "Villa Nova");
      setInputValue(view.container.querySelector("#commerce-slug"), "villa-nova");
      setTextareaValue(view.container.querySelector("#commerce-excerpt"), "Short summary");
      setTextareaValue(view.container.querySelector("#commerce-description"), "Long description");
      setInputValue(view.container.querySelector("#commerce-media-ids"), "media-1, media-2");
      setInputValue(view.container.querySelector("#commerce-pricing-amount"), "520000");
      setInputValue(view.container.querySelector("#commerce-pricing-currency"), "EUR");
      setInputValue(view.container.querySelector("#commerce-pricing-compare"), "540000");
      setSelectValue(selects[1], "backorder"); // Inventory state select
      setInputValue(view.container.querySelector("#commerce-stock-quantity"), "3");
      (trackInventorySwitch as HTMLInputElement | null)?.click();
      view.container.querySelector("button")?.click(); // sidebar Publish button
    });

    expect(onToggleCollection).toHaveBeenCalledWith("collection-1", false);
    expect(onStatusChange).toHaveBeenCalledWith("published");
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ title: "Villa Nova" });
    expect(onChange).toHaveBeenCalledWith({ slug: "villa-nova" });
    expect(onChange).toHaveBeenCalledWith({ excerpt: "Short summary" });
    expect(onChange).toHaveBeenCalledWith({ description: "Long description" });
    expect(onChange).toHaveBeenCalledWith({ mediaIdsText: "media-1, media-2" });
    expect(onChange).toHaveBeenCalledWith({ pricingAmount: "520000" });
    expect(onChange).toHaveBeenCalledWith({ pricingCurrency: "EUR" });
    expect(onChange).toHaveBeenCalledWith({
      pricingCompareAtAmount: "540000",
    });
    expect(onChange).toHaveBeenCalledWith({ stockState: "backorder" });
    expect(onChange).toHaveBeenCalledWith({ stockQuantity: "3" });
    // derived "Track inventory" switch toggles the SAME stockState field
    expect(onChange).toHaveBeenCalledWith({ stockState: "out_of_stock" });
  } finally {
    view.cleanup();
  }
});

test("ApiKeysTable and StorageProviderCard handle actions and keyboard selection", () => {
  const onCopy = vi.fn();
  const onRotate = vi.fn();
  const onRevoke = vi.fn();
  const onSelect = vi.fn();
  const Icon = React.forwardRef<SVGSVGElement, React.ComponentProps<"svg">>((props, ref) => (
    <svg ref={ref} {...props} />
  ));

  const emptyHtml = renderToString(<ApiKeysTable items={[]} isLoading />);
  expect(emptyHtml).toContain("Loading API keys...");

  const view = mount(
    <>
      <ApiKeysTable
        items={[
          {
            id: "key-1",
            name: "Primary",
            scopes: ["settings.read"],
            prefix: "sk_live",
            createdAt: "2026-03-06T12:00:00.000Z",
            lastUsedAt: "2026-03-06T12:00:00.000Z",
            revokedAt: null,
          },
          {
            id: "key-2",
            name: "Revoked",
            scopes: ["settings.write"],
            prefix: "sk_old",
            createdAt: "2026-03-06T12:00:00.000Z",
            lastUsedAt: null,
            revokedAt: "2026-03-06T12:00:00.000Z",
          },
        ]}
        copyableIds={new Set(["key-1"])}
        onCopy={onCopy}
        onRotate={onRotate}
        onRevoke={onRevoke}
      />
      <StorageProviderCard
        id="s3"
        title="Amazon S3"
        description="Object storage"
        icon={Icon}
        badge="Recommended"
        isActive
        onSelect={onSelect}
      />
    </>
  );

  try {
    expect(view.container.textContent).toContain("scope:settings.read");
    expect(view.container.textContent).toContain("Recommended");

    const buttons = Array.from(view.container.querySelectorAll("button"));
    const radio = view.container.querySelector("[role='radio']");

    React.act(() => {
      buttons
        .find((button) => button.getAttribute("aria-label") === "Actions for Primary")
        ?.click();
      buttons.find((button) => button.textContent?.includes("Copy key"))?.click();
      buttons.find((button) => button.textContent?.includes("Rotate key"))?.click();
      buttons.find((button) => button.textContent?.includes("Revoke key"))?.click();
      (radio as HTMLDivElement | null)?.click();
      radio?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      radio?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    });

    expect(onCopy).toHaveBeenCalledWith(expect.objectContaining({ id: "key-1" }));
    expect(onRotate).toHaveBeenCalledWith(expect.objectContaining({ id: "key-1" }));
    expect(onRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: "key-1" }));
    expect(onSelect).toHaveBeenNthCalledWith(1, "s3");
    expect(onSelect).toHaveBeenNthCalledWith(2, "s3");
    expect(onSelect).toHaveBeenNthCalledWith(3, "s3");
  } finally {
    view.cleanup();
  }
});
