import React from "react";
import { createRoot } from "react-dom/client";
import { expect } from "vitest";

import type { EntryVisibility } from "../../../../core/admin/services/entriesClient";
import type { EntryStatus } from "../../../../core/admin/ui/entries/EntryMetadataPanel";

/**
 * The component stubs, request-payload shapes and DOM plumbing for the entry-editor
 * integration lanes. They live outside the lane file because that file's value is its
 * service mocks and its scenarios, and all of it together does not fit under the 1000-line
 * limit.
 *
 * The real metadata panel renders outside the editor's isLoading gate and disables only its
 * own Save button, so every control below is live while a read OR a save is in flight. The
 * stub keeps exactly that surface: each control calls the same prop the real Select /
 * Input / Textarea calls, its Save carries the same `canSave` gate, and every resolved value
 * is ALSO mirrored as text, so an assertion reads React state rather than the uncontrolled
 * DOM value of an input the editor never rewrites.
 */

/** What the lanes' `updateEntry` / `updateEntryMetadata` mocks record and assert against. */
export type UpdateEntryPayload = {
  title: string;
  slug: string;
  data: Record<string, string>;
};

export type UpdateEntryMetadataPayload = {
  status: EntryStatus;
  visibility: EntryVisibility;
  accessPassword: string | null | undefined;
  scheduledAt: string | null;
  taxonomy: { categoryId: string | null; tagIds: string[] } | undefined;
  seo: { description: string };
};

type ChildrenProps = { children: React.ReactNode };

/**
 * The shadcn primitives the editor renders, stubbed and exported as ready-made module
 * objects so a lane registers each one in a single `vi.mock` line. They carry no lane
 * fixture: `Button` keeps `disabled` because a disabled Save is the point of several
 * assertions, `Input`/`Textarea` stay uncontrolled because the editor rewrites their value
 * through React state and a test must read the state, not the DOM.
 */
export const alertModule = {
  Alert: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertTitle: ({ children }: ChildrenProps) => <p>{children}</p>,
};

export const badgeModule = {
  Badge: ({ children }: ChildrenProps) => <span>{children}</span>,
};

export const buttonModule = {
  Button: ({
    children,
    onClick,
    disabled,
  }: ChildrenProps & { onClick?: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
};

export const cardModule = {
  Card: ({ children }: ChildrenProps) => <div>{children}</div>,
  CardContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  CardDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  CardHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  CardTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
};

export const inputModule = {
  Input: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input data-slug-input="true" defaultValue={value} onChange={onChange} />,
};

export const scrollAreaModule = {
  ScrollArea: ({ children }: ChildrenProps) => <div>{children}</div>,
};

export const sheetModule = {
  Sheet: ({ children }: ChildrenProps) => <div>{children}</div>,
  SheetContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  SheetDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  SheetTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
};

export const tabsModule = {
  Tabs: ({ children }: ChildrenProps) => <div>{children}</div>,
  TabsContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  TabsList: ({ children }: ChildrenProps) => <div>{children}</div>,
  TabsTrigger: ({ children }: ChildrenProps) => <button type="button">{children}</button>,
};

export const textareaModule = {
  Textarea: React.forwardRef(function MockTextarea(
    {
      value,
      onChange,
      placeholder,
    }: {
      value?: string;
      onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
      placeholder?: string;
    },
    ref: React.Ref<HTMLTextAreaElement>
  ) {
    return (
      <textarea ref={ref} defaultValue={value} onChange={onChange} placeholder={placeholder} />
    );
  }),
};

// Only the props the stub exercises; the editor passes more.
type MetadataPanelStubProps = {
  status: EntryStatus;
  onStatusChange: (status: EntryStatus) => void;
  visibility: EntryVisibility;
  onVisibilityChange: (visibility: EntryVisibility) => void;
  accessPassword: string;
  onAccessPasswordChange: (value: string) => void;
  title: string;
  slug: string;
  seoDescription: string;
  onSeoDescriptionChange: (value: string) => void;
  taxonomy: { selectedCategoryId: string | null } | null;
  onCategoryChange: (categoryId: string | null) => void;
  onSave: () => void;
  isSaving: boolean;
  // The real panel disables its Save while the editor holds no loaded entry, because the
  // panel PATCHes status, visibility, schedule, SEO and taxonomy TOGETHER: submitting its
  // pristine mount defaults would push them over whatever the server holds.
  canSave?: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  // Same gate on the real panel's Delete, for a reason of its own: the confirm dialog names
  // the entry from the editor's title, which is empty until hydration.
  canDelete?: boolean;
};

export const EntryMetadataPanelStub = ({
  status,
  onStatusChange,
  visibility,
  onVisibilityChange,
  accessPassword,
  onAccessPasswordChange,
  title,
  slug,
  seoDescription,
  onSeoDescriptionChange,
  taxonomy,
  onCategoryChange,
  onSave,
  isSaving,
  canSave,
  onDelete,
  isDeleting,
  canDelete,
}: MetadataPanelStubProps) => (
  <div data-metadata-panel="true">
    <span data-metadata-status-value="true">{status}</span>
    <span data-metadata-seo-value="true">{seoDescription}</span>
    <span data-metadata-title-value="true">{title}</span>
    <span data-metadata-slug-value="true">{slug}</span>
    <span data-metadata-visibility-value="true">{visibility}</span>
    <span data-metadata-password-value="true">{accessPassword}</span>
    <span data-metadata-category-value="true">{taxonomy?.selectedCategoryId ?? ""}</span>
    <button type="button" data-metadata-publish="true" onClick={() => onStatusChange("published")}>
      Set published
    </button>
    <button
      type="button"
      data-metadata-private="true"
      onClick={() => onVisibilityChange("private")}
    >
      Make private
    </button>
    <button
      type="button"
      data-metadata-password-mode="true"
      onClick={() => onVisibilityChange("password")}
    >
      Require a password
    </button>
    <button type="button" data-metadata-category="true" onClick={() => onCategoryChange("cat-2")}>
      Pick the second category
    </button>
    <input
      data-metadata-password-input="true"
      defaultValue={accessPassword}
      onChange={(event) => onAccessPasswordChange(event.target.value)}
    />
    <textarea
      data-metadata-seo-input="true"
      defaultValue={seoDescription}
      onChange={(event) => onSeoDescriptionChange(event.target.value)}
    />
    <button
      type="button"
      data-metadata-save="true"
      disabled={isSaving || canSave === false}
      onClick={onSave}
    >
      Save metadata
    </button>
    {/* No counterpart in the real panel: it calls the SAME `onSave` prop with no gate of its
        own, so an assertion can tell "the button was disabled" from "the editor refused the
        call". A disabled button is a UI detail; the request leaving is the harm. */}
    <button type="button" data-metadata-save-ungated="true" onClick={onSave}>
      Save metadata (ungated probe)
    </button>
    <button
      type="button"
      data-metadata-delete="true"
      disabled={isDeleting || canDelete === false}
      onClick={onDelete}
    >
      Delete entry
    </button>
    {/* The delete counterpart of the save probe: it only OPENS the confirm dialog, which is
        all the real button does, so a lane can reach the confirm the gated button refuses to
        offer and observe what the DELETE handler itself does. */}
    <button type="button" data-metadata-delete-ungated="true" onClick={onDelete}>
      Delete entry (ungated probe)
    </button>
  </div>
);

/**
 * The confirm dialog, stubbed to the shape that matters: it renders only while the editor has
 * it OPEN, and while open its confirm is live. That is the entire path to `handleDeleteEntry`,
 * so a lane can only observe the delete refusal through it — and the description is asserted
 * too, because the fallback text ("Delete this entry?") is the harm: an unhydrated editor asks
 * the user to confirm destroying a row it cannot name.
 */
export const EntryDeleteDialogStub = ({
  open,
  description,
  isDeleting,
  onConfirm,
}: {
  open: boolean;
  description: string;
  isDeleting?: boolean;
  onConfirm: () => void;
}) =>
  open ? (
    <div data-delete-dialog="true">
      <span data-delete-dialog-description="true">{description}</span>
      <button type="button" data-delete-confirm="true" disabled={isDeleting} onClick={onConfirm}>
        Confirm delete
      </button>
    </div>
  ) : null;

/**
 * The two props the header probes drive. Structural on purpose: the wrapper below takes the
 * REAL `EntryEditorHeaderActions` and only adds to it, so it must not restate the header's
 * whole prop list.
 */
type HeaderActionsProbeProps = {
  onSaveDraft: () => void;
  onPublish: () => void;
};

/**
 * The real header plus one ungated probe per destructive channel. The gated buttons stay
 * REAL — same labels, same `disabled` wiring — because a lane asserts both facts and they are
 * different facts: React's own event system refuses to call `onClick` on an element whose
 * props say `disabled`, so clicking the real Save draft can never observe what the HANDLER
 * does. Without a probe a lane proves only the button attribute, and the data-loss path
 * reopens the moment a `disabled` prop is dropped for an unrelated reason. Same trade as the
 * metadata panel stub's `data-metadata-save-ungated`: a disabled button is a UI detail, the
 * request leaving is the harm.
 */
export const withUngatedHeaderProbes = <P extends HeaderActionsProbeProps>(
  HeaderActions: React.ComponentType<P>
) => {
  const EntryEditorHeaderActionsWithProbes = (props: P) => (
    <>
      <HeaderActions {...props} />
      <button type="button" data-header-save-draft-ungated="true" onClick={props.onSaveDraft}>
        Save draft (ungated probe)
      </button>
      <button type="button" data-header-publish-ungated="true" onClick={props.onPublish}>
        Publish (ungated probe)
      </button>
    </>
  );
  return EntryEditorHeaderActionsWithProbes;
};

export const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  return {
    container,
    // Re-renders into the SAME root, which is the only way to ask what React does with the
    // element it already has: a second `mount` would prove nothing about reuse.
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

export const flushMicrotasks = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

// The unsaved-changes banner is only a hint; the `beforeunload` handler is what actually
// stops a typed value from being lost on navigation, so the lanes assert the guard.
export const beforeUnloadIsGuarded = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

// React's input-value tracker suppresses a change event when the assigned value equals
// the one it last saw, so a test that clears a field has to type something first.
const typeIntoElement = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const requireTextarea = (container: HTMLElement, selector: string) => {
  const area = container.querySelector(selector);
  if (!(area instanceof HTMLTextAreaElement)) throw new Error(`${selector} textarea is absent`);
  return area;
};

const requireInput = (container: HTMLElement, selector: string) => {
  const input = container.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) throw new Error(`${selector} input is absent`);
  return input;
};

// The title composer is the first textarea the editor renders (Content card, above the
// metadata panel in both DOM order and the grid).
export const typeTitle = (container: HTMLElement, value: string) =>
  typeIntoElement(requireTextarea(container, "textarea"), value);

export const typeSlug = (container: HTMLElement, value: string) =>
  typeIntoElement(requireInput(container, '[data-slug-input="true"]'), value);

export const typeSeoDescription = (container: HTMLElement, value: string) =>
  typeIntoElement(requireTextarea(container, 'textarea[data-metadata-seo-input="true"]'), value);

export const typeAccessPassword = (container: HTMLElement, value: string) =>
  typeIntoElement(requireInput(container, '[data-metadata-password-input="true"]'), value);

const panels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-metadata-panel="true"]'));

// The editor renders the metadata panel twice (sidebar + details sheet); both are fed
// from the same state, so every copy must agree and either one can be driven.
export const readPanelValue = (container: HTMLElement, marker: string): string => {
  const values = panels(container).map(
    (panel) => panel.querySelector(`[${marker}="true"]`)?.textContent ?? ""
  );
  const first = values[0];
  if (first === undefined) throw new Error("metadata panel is absent");
  values.forEach((value) => expect(value).toBe(first));
  return first;
};

export const readMetadataState = (
  container: HTMLElement
): { status: string; seoDescription: string } => ({
  status: readPanelValue(container, "data-metadata-status-value"),
  seoDescription: readPanelValue(container, "data-metadata-seo-value"),
});

export const clickMetadataAction = (container: HTMLElement, marker: string) => {
  const action = container.querySelector(`button[${marker}="true"]`);
  if (!(action instanceof HTMLButtonElement)) throw new Error(`${marker} button is absent`);
  expect(action.disabled).toBe(false);
  action.click();
};

// The editor renders the panel twice, so a marker query returns one button per copy; both
// are fed the same props, and driving either drives the same handler.
export const findMetadataButton = (container: HTMLElement, marker: string) => {
  const buttons = Array.from(container.querySelectorAll(`button[${marker}="true"]`));
  const first = buttons[0];
  if (!(first instanceof HTMLButtonElement)) throw new Error(`${marker} button is absent`);
  buttons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error(`${marker} is not a button`);
    expect(button.disabled).toBe(first.disabled);
  });
  return first;
};

// The one button carrying this exact label, wherever it renders. Labels are state: "Save draft"
// reads "Saving..." while its own request is open, and the field area's retry only exists while
// the editor holds no entry.
export const findButtonByLabel = (container: HTMLElement, label: string) => {
  const matches = Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent === label
  );
  expect(matches).toHaveLength(1);
  const action = matches[0];
  if (!(action instanceof HTMLButtonElement)) throw new Error(`${label} button is absent`);
  return action;
};

// The PageHeader actions cluster is identified the same way; the alias says where to look.
export const findHeaderButton = (container: HTMLElement, label: string) =>
  findButtonByLabel(container, label);

export const findSaveDraft = (container: HTMLElement) => findHeaderButton(container, "Save draft");

// The confirm dialog is rendered once, outside both panel copies, and only while it is open.
export const findDeleteConfirm = (container: HTMLElement) => {
  const confirm = container.querySelector('button[data-delete-confirm="true"]');
  if (!(confirm instanceof HTMLButtonElement)) throw new Error("delete confirm button is absent");
  return confirm;
};

export const readDeleteDialog = (
  container: HTMLElement
): { open: boolean; description: string } => {
  const dialog = container.querySelector('[data-delete-dialog="true"]');
  return {
    open: dialog !== null,
    description:
      dialog?.querySelector('[data-delete-dialog-description="true"]')?.textContent ?? "",
  };
};

// The PageHeader actions cluster renders once, so a probe marker matches exactly one button.
// The `disabled` assertion is the point of a probe: if it were gated too, a click that changed
// nothing would prove nothing.
export const findHeaderProbe = (container: HTMLElement, marker: string) => {
  const probe = container.querySelector(`button[${marker}="true"]`);
  if (!(probe instanceof HTMLButtonElement)) throw new Error(`${marker} button is absent`);
  expect(probe.disabled).toBe(false);
  return probe;
};
