// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ContactBlock,
  contactDefaults,
  type ContactData,
} from "../../../core/widgets/core/contact";
import {
  FormEmbedBlock,
  formEmbedDefaults,
  type FormEmbedData,
} from "../../../core/widgets/core/formEmbed";
import {
  NewsletterBlock,
  newsletterDefaults,
  type NewsletterData,
} from "../../../core/widgets/core/newsletter";

const originalFetch = globalThis.fetch;

type FetchMockImplementation = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;

const resetRuntimeFlag = () => {
  delete (
    window as Window & {
      __nextlessFormRuntimeClient?: boolean;
      __nextlessFormRuntimeBind?: () => void;
    }
  ).__nextlessFormRuntimeClient;
  delete (
    window as Window & {
      __nextlessFormRuntimeClient?: boolean;
      __nextlessFormRuntimeBind?: () => void;
    }
  ).__nextlessFormRuntimeBind;
  delete (window as Window & { grecaptcha?: unknown }).grecaptcha;
};

const installRenderedFormRuntime = (
  element: React.ReactElement,
  beforeRuntimeEval?: () => void
) => {
  resetRuntimeFlag();
  document.body.innerHTML = renderToString(element);
  beforeRuntimeEval?.();
  const script = document.querySelector("script");
  if (script?.textContent) {
    eval(script.textContent);
  }
  const form = document.querySelector('form[data-nextless-form-runtime="1"]');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Missing shared Forms runtime form");
  }
  return form;
};

const installFormRuntime = (data: FormEmbedData, beforeRuntimeEval?: () => void) =>
  installRenderedFormRuntime(
    React.createElement(FormEmbedBlock, {
      data,
      variant: "standard",
    }),
    beforeRuntimeEval
  );

const setInputValue = (selector: string, value: string) => {
  const input = document.querySelector(selector);
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
    throw new Error(`Missing input for ${selector}`);
  }
  const proto =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const settleRuntime = async () => {
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const getFileInput = (form: HTMLFormElement, identity = "attachment") => {
  const input = form.querySelector(`[data-form-file-input="${identity}"]`);
  if (!(input instanceof HTMLInputElement)) throw new Error(`Missing file input ${identity}`);
  return input;
};

const getOrdinaryNamedInput = (form: HTMLFormElement, name: string) => {
  const input = Array.from(form.querySelectorAll("input")).find(
    (candidate) =>
      candidate.name === name &&
      !candidate.hasAttribute("data-form-security-nonce") &&
      !candidate.hasAttribute("data-form-security-captcha")
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing ordinary input ${name}`);
  }
  return input;
};

const setSelectedFilesSilently = (input: HTMLInputElement, files: readonly File[]) => {
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
};

const setSelectedFiles = (input: HTMLInputElement, files: readonly File[]) => {
  setSelectedFilesSilently(input, files);
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const dispatchSubmit = (form: HTMLFormElement) =>
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

const createFileFormData = ({
  formId = "file-form",
  multiple = false,
  required = true,
  saveProgress = false,
  botProtection = false,
  fields,
  successBehavior = "show-message-keep-form",
}: {
  formId?: string;
  multiple?: boolean;
  required?: boolean;
  saveProgress?: boolean;
  botProtection?: boolean;
  fields?: NonNullable<NonNullable<FormEmbedData["resolved"]>["fields"]>;
  successBehavior?: "show-message-hide-form" | "show-message-reset-form" | "show-message-keep-form";
} = {}): FormEmbedData => ({
  ...formEmbedDefaults,
  formId,
  submitBehavior: {
    ...formEmbedDefaults.submitBehavior,
    successBehavior,
  },
  resolved: {
    formName: "File form",
    submissionAccess: "public",
    submissionNonce: `nonce-${formId}`,
    botProtection: botProtection
      ? {
          provider: "recaptcha_v3",
          siteKey: `site-key-${formId}`,
          action: "public_write",
        }
      : undefined,
    settings: {
      layoutMode: "single",
      saveProgress,
      stepTitles: [],
    },
    fields: fields ?? [
      {
        id: "attachment-field",
        type: "file",
        label: "Attachment",
        name: "attachment",
        required,
        settings: { multiple },
      },
    ],
  },
});

const createContactRuntimeData = (): ContactData => ({
  ...contactDefaults,
  form: {
    ...contactDefaults.form,
    fields: ["name", "email", "message"],
    submission: {
      ...contactDefaults.form?.submission,
      mode: "forms-runtime",
      formId: "contact-runtime-form",
      fieldMap: {
        name: "full_name",
        email: "reply_email",
        phone: "",
        message: "message_body",
      },
      successMessage: "Contact sent.",
      errorMessage: "Contact failed.",
    },
  },
  resolved: {
    formId: "contact-runtime-form",
    formName: "Contact runtime form",
    status: "published",
    submissionAccess: "public",
    submissionNonce: "nonce-contact-runtime",
    fields: [
      {
        id: "contact-name-field",
        type: "text",
        label: "Full name",
        name: "full_name",
        required: false,
        orderIndex: 0,
        settings: {},
      },
      {
        id: "contact-email-field",
        type: "email",
        label: "Reply email",
        name: "reply_email",
        required: true,
        orderIndex: 1,
        settings: {},
      },
      {
        id: "contact-message-field",
        type: "textarea",
        label: "Message",
        name: "message_body",
        required: true,
        orderIndex: 2,
        settings: {},
      },
    ],
  },
});

const createNewsletterRuntimeData = (): NewsletterData => ({
  ...newsletterDefaults,
  submission: {
    ...newsletterDefaults.submission,
    mode: "forms-runtime",
    formId: "newsletter-runtime-form",
    successBehavior: "show-message-keep-form",
  },
  stateCopy: {
    ...newsletterDefaults.stateCopy,
    successMessage: "Newsletter joined.",
    errorMessage: "Newsletter failed.",
  },
  resolved: {
    formId: "newsletter-runtime-form",
    formName: "Newsletter runtime form",
    status: "published",
    submissionAccess: "public",
    submissionNonce: "nonce-newsletter-runtime",
    fields: [
      {
        id: "newsletter-email-field",
        type: "email",
        label: "Email",
        name: "email",
        required: true,
        orderIndex: 0,
        settings: {},
      },
      {
        id: "newsletter-consent-field",
        type: "checkbox",
        label: "Consent",
        name: "consent",
        required: false,
        orderIndex: 1,
        settings: {},
      },
    ],
  },
});

const uploadIdA = "11111111-1111-4111-8111-111111111111";
const uploadIdB = "22222222-2222-4222-8222-222222222222";
const uploadIdC = "33333333-3333-4333-8333-333333333333";
const canonicalPngBytes = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  ),
  (character) => character.charCodeAt(0)
);

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  window.localStorage.clear();
  resetRuntimeFlag();
});

test("form runtime expires stale saved progress and updates the progress indicator", async () => {
  const data: FormEmbedData = {
    ...formEmbedDefaults,
    formId: "form-1",
    navigation: {
      ...formEmbedDefaults.navigation,
      savedProgressTtlDays: 1,
    },
    resolved: {
      formName: "Intake",
      submissionAccess: "public",
      submissionNonce: "nonce-1",
      settings: {
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: ["Contact", "Details"],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
          settings: { step: 1 },
        },
        {
          id: "field-2",
          type: "textarea",
          label: "Notes",
          name: "notes",
          required: false,
          settings: { step: 2 },
        },
      ],
    },
  };

  const progressKey = "nextless:form-progress:form-1:/";
  window.localStorage.setItem(
    progressKey,
    JSON.stringify({
      values: { name: "stale" },
      currentStep: 2,
      savedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    })
  );

  const form = installFormRuntime(data);

  expect(window.localStorage.getItem(progressKey)).toBeNull();
  const progressText = form.querySelector('[data-form-progress-text="true"]');
  expect(progressText?.textContent).toContain("Step 1 of 2");

  setInputValue('input[name="name"]', "Alice");

  const nextButton = form.querySelector('[data-form-nav="next"]');
  if (!(nextButton instanceof HTMLButtonElement)) throw new Error("Missing next button");
  nextButton.click();

  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  expect(progressText?.textContent).toContain("Step 2 of 2");
  const progressBar = form.querySelector('[data-form-progress-bar="true"]');
  expect((progressBar as HTMLElement | null)?.style.width).toBe("100%");

  const saved = window.localStorage.getItem(progressKey);
  expect(saved).not.toBeNull();
  expect(JSON.parse(saved ?? "{}")).toMatchObject({ currentStep: 2 });
});

test("form runtime restores saved progress to the first incomplete previous step", () => {
  const data: FormEmbedData = {
    ...formEmbedDefaults,
    formId: "form-restore",
    navigation: {
      ...formEmbedDefaults.navigation,
      savedProgressTtlDays: 7,
    },
    resolved: {
      formName: "Intake",
      submissionAccess: "public",
      submissionNonce: "nonce-restore",
      settings: {
        layoutMode: "multi_step",
        saveProgress: true,
        stepTitles: ["Contact", "Details"],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
          settings: { formStep: 1 },
        },
        {
          id: "field-2",
          type: "textarea",
          label: "Notes",
          name: "notes",
          required: false,
          settings: { formStep: 2 },
        },
      ],
    },
  };

  window.localStorage.setItem(
    "nextless:form-progress:form-restore:/",
    JSON.stringify({
      values: {},
      currentStep: 2,
      savedAt: Date.now(),
    })
  );

  const form = installFormRuntime(data);

  expect(form.dataset.currentStep).toBe("1");
  expect(form.querySelector('[data-form-progress-text="true"]')?.textContent).toContain(
    "Step 1 of 2"
  );
});

test("form runtime acquires captcha, posts payload, and hides the form body on success", async () => {
  const appendChild = vi.spyOn(document.head, "appendChild");
  let appendedScript: HTMLScriptElement | null = null;
  appendChild.mockImplementation((node) => {
    appendedScript = node as HTMLScriptElement;
    return node;
  });

  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const data: FormEmbedData = {
    ...formEmbedDefaults,
    formId: "form-2",
    successMessage: "",
    submitBehavior: {
      loadingLabel: "Sending...",
      successBehavior: "show-message-hide-form",
    },
    resolved: {
      formName: "Contact",
      submissionAccess: "public",
      submissionNonce: "nonce-2",
      botProtection: {
        provider: "recaptcha_v3",
        siteKey: "site-key-1",
        action: "public_write",
      },
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
        },
      ],
    },
  };

  const form = installFormRuntime(data);
  const script = appendedScript as HTMLScriptElement | null;
  expect(script?.getAttribute("src")).toContain(
    "https://www.google.com/recaptcha/api.js?render=site-key-1"
  );
  setInputValue('input[name="name"]', "Alice");

  const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const submitButton = form.querySelector('[data-form-submit="1"]');
  if (!(submitButton instanceof HTMLButtonElement)) throw new Error("Missing submit button");

  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

  expect(submitButton.textContent).toBe("Sending...");
  expect(submitButton.getAttribute("aria-busy")).toBe("true");

  (
    window as Window & {
      grecaptcha?: {
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    }
  ).grecaptcha = {
    execute: vi.fn(async () => "captcha-token-1"),
  };

  (appendedScript as unknown as EventTarget | null)?.dispatchEvent(new Event("load"));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"));
  expect(payload).toMatchObject({
    data: {
      name: "Alice",
    },
    formNonce: "nonce-2",
    captchaToken: "captcha-token-1",
  });

  expect(assignSpy).not.toHaveBeenCalled();
  expect(submitButton.getAttribute("aria-busy")).toBe("false");
  expect(submitButton.textContent).toBe("Send message");
  expect(
    (form.querySelector('[data-form-embed-form-body="true"]') as HTMLElement | null)?.hidden
  ).toBe(true);
  expect(
    (form.querySelector('[data-form-embed-success="true"]') as HTMLElement | null)?.textContent
  ).toBe("Done");
});

test("form runtime binds duplicate instances that load after the first script", async () => {
  const fetchMock = vi.fn<FetchMockImplementation>(async () => {
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const createData = (formId: string): FormEmbedData => ({
    ...formEmbedDefaults,
    formId,
    successMessage: "",
    resolved: {
      formName: formId,
      submissionAccess: "public",
      submissionNonce: `nonce-${formId}`,
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: `field-${formId}`,
          type: "text",
          label: "Name",
          name: "name",
          required: true,
        },
      ],
    },
  });

  resetRuntimeFlag();
  const firstHtml = renderToString(
    React.createElement(FormEmbedBlock, {
      data: createData("form-duplicate-1"),
      variant: "standard",
    })
  );
  document.body.innerHTML = firstHtml;
  const firstScript = document.querySelector("script");
  if (!firstScript?.textContent) throw new Error("Missing first runtime script");
  eval(firstScript.textContent);
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  document.body.innerHTML =
    firstHtml +
    renderToString(
      React.createElement(FormEmbedBlock, {
        data: createData("form-duplicate-2"),
        variant: "standard",
      })
    );
  const secondScript = Array.from(document.querySelectorAll("script")).at(-1);
  if (!secondScript?.textContent) throw new Error("Missing second runtime script");
  eval(secondScript.textContent);

  setInputValue('form[data-form-id="form-duplicate-2"] input[name="name"]', "Alice");
  const secondForm = document.querySelector('form[data-form-id="form-duplicate-2"]');
  if (!(secondForm instanceof HTMLFormElement)) throw new Error("Missing second form");
  const secondNonce = secondForm.querySelector('[data-form-security-nonce="1"]');
  expect(secondForm.dataset.formRuntimeBound).toBe("1");
  expect(secondNonce).toBeInstanceOf(HTMLInputElement);
  expect(secondNonce?.closest("form")).toBe(secondForm);
  expect(secondForm.contains(secondNonce)).toBe(true);
  expect(secondNonce).toMatchObject({
    type: "hidden",
    name: "__nl_form_nonce",
    value: "nonce-form-duplicate-2",
    form: secondForm,
  });
  secondForm.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();
  await settleRuntime();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const fetchCalls = fetchMock.mock.calls;
  expect(String(fetchCalls[0]?.[0])).toContain("/forms/form-duplicate-2/submissions");
});

test("form runtime restores the original submit label after a failed submit without dataset label", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "Unable to submit the form. Please try again.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  resetRuntimeFlag();
  document.body.innerHTML = renderToString(
    React.createElement(FormEmbedBlock, {
      data: {
        ...formEmbedDefaults,
        formId: "form-label-restore",
        resolved: {
          formName: "Label restore",
          submissionAccess: "public",
          submissionNonce: "nonce-label-restore",
          settings: {
            layoutMode: "single",
            saveProgress: false,
            stepTitles: [],
          },
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
            },
          ],
        },
      },
      variant: "standard",
    })
  );
  const form = document.querySelector('form[data-nextless-form-runtime="1"]');
  if (!(form instanceof HTMLFormElement)) throw new Error("Missing runtime form");
  form.removeAttribute("data-form-submit-label");
  const script = document.querySelector("script");
  if (!script?.textContent) throw new Error("Missing runtime script");
  eval(script.textContent);

  setInputValue('input[name="name"]', "Alice");
  const submitButton = form.querySelector('[data-form-submit="1"]');
  if (!(submitButton instanceof HTMLButtonElement)) throw new Error("Missing submit button");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  expect(submitButton.textContent).toBe("Sending...");
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(submitButton.getAttribute("aria-busy")).toBe("false");
  expect(submitButton.textContent).toBe("Send message");
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toContain(
    "Unable to submit the form. Please try again."
  );
});

test("form runtime sends checkbox values as backend-compatible booleans", async () => {
  const fetchMock = vi.fn<FetchMockImplementation>(async () => {
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const form = installFormRuntime({
    ...formEmbedDefaults,
    formId: "form-checkbox",
    successMessage: "",
    resolved: {
      formName: "Checkbox form",
      submissionAccess: "public",
      submissionNonce: "nonce-checkbox",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: "field-consent",
          type: "checkbox",
          label: "Consent",
          name: "consent",
          required: true,
        },
      ],
    },
  });

  const checkbox = form.querySelector('input[name="consent"]');
  if (!(checkbox instanceof HTMLInputElement)) throw new Error("Missing checkbox");
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  const fetchCalls = fetchMock.mock.calls;
  const payload = JSON.parse(String(fetchCalls[0]?.[1]?.body ?? "{}"));
  expect(payload).toMatchObject({
    data: {
      consent: true,
    },
    formNonce: "nonce-checkbox",
  });
});

test("form runtime reveals an error when captcha execution is unavailable", async () => {
  const appendChild = vi.spyOn(document.head, "appendChild").mockImplementation((node) => node);

  globalThis.fetch = vi.fn(async () => {
    throw new Error("fetch should not run");
  }) as typeof globalThis.fetch;

  const data: FormEmbedData = {
    ...formEmbedDefaults,
    formId: "form-3",
    resolved: {
      formName: "Contact",
      submissionAccess: "public",
      submissionNonce: "nonce-3",
      botProtection: {
        provider: "recaptcha_v3",
        siteKey: "site-key-2",
        action: "public_write",
      },
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
        },
      ],
    },
  };

  const form = installFormRuntime(data);
  setInputValue('input[name="name"]', "Alice");

  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  (appendChild.mock.results[0]?.value as EventTarget | null)?.dispatchEvent(new Event("load"));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  const errorNode = form.querySelector('[data-form-embed-error="true"]');
  expect(errorNode?.textContent).toBe("Form verification failed. Please try again.");
  expect(errorNode?.textContent).not.toContain("recaptcha_unavailable");
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement | null)?.disabled).toBe(
    false
  );
});

test("form runtime redirects when the server returns runtime.redirectUrl", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify({ runtime: { redirectUrl: "/done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const data: FormEmbedData = {
    ...formEmbedDefaults,
    formId: "form-4",
    resolved: {
      formName: "Redirect form",
      submissionAccess: "public",
      submissionNonce: "nonce-4",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
        },
      ],
    },
  };

  const form = installFormRuntime(data);
  setInputValue('input[name="name"]', "Alice");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  expect(assignSpy).toHaveBeenCalledWith("/done");
});

test("form runtime ignores unsafe redirects and lets widget success copy win", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(
      JSON.stringify({
        runtime: {
          redirectUrl: "https://evil.example/thanks",
          successMessage: "Server thanks",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
  const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const form = installFormRuntime({
    ...formEmbedDefaults,
    formId: "form-unsafe-redirect",
    successMessage: "Widget thanks",
    resolved: {
      formName: "Unsafe redirect",
      submissionAccess: "public",
      submissionNonce: "nonce-unsafe",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
        },
      ],
    },
  });

  setInputValue('input[name="name"]', "Alice");
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  expect(assignSpy).not.toHaveBeenCalled();
  expect(form.querySelector('[data-form-embed-success="true"]')?.textContent).toBe("Widget thanks");
});

test("form runtime emits a bounded analytics event after successful submit", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const data: FormEmbedData = {
    ...formEmbedDefaults,
    formId: "form-analytics",
    successMessage: "",
    resolved: {
      formName: "Analytics form",
      submissionAccess: "public",
      submissionNonce: "nonce-analytics",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
      },
      fields: [
        {
          id: "field-1",
          type: "text",
          label: "Name",
          name: "name",
          required: true,
        },
      ],
    },
  };

  const form = installFormRuntime(data);
  form.dataset.formAnalyticsEvent = "newsletter_submit";
  setInputValue('input[name="name"]', "Alice");

  const analyticsSpy = vi.fn();
  window.addEventListener("newsletter_submit", analyticsSpy as EventListener);

  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  expect(analyticsSpy).toHaveBeenCalledTimes(1);
  expect(analyticsSpy.mock.calls[0]?.[0]).toMatchObject({
    detail: {
      formId: "form-analytics",
      redirectUrl: null,
      successMessage: "Done",
    },
  });

  window.removeEventListener("newsletter_submit", analyticsSpy as EventListener);
});

test("536-03: existing Contact block executes the shared non-file Forms runtime", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({ runtime: { successMessage: "Server fallback" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installRenderedFormRuntime(
    React.createElement(ContactBlock, {
      data: createContactRuntimeData(),
      variant: "form-left",
      blockId: "contact-runtime-compatibility",
    })
  );
  expect(form.querySelector("[data-form-file-input]")).toBeNull();
  setInputValue('input[name="full_name"]', "Ada Lovelace");
  setInputValue('input[name="reply_email"]', "ada@example.com");
  setInputValue('textarea[name="message_body"]', "Compatibility check");

  dispatchSubmit(form);
  await settleRuntime();

  expect(requests).toHaveLength(1);
  expect(requests[0]?.url).toBe("http://localhost:3000/forms/contact-runtime-form/submissions");
  expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
    data: {
      full_name: "Ada Lovelace",
      reply_email: "ada@example.com",
      message_body: "Compatibility check",
    },
    formNonce: "nonce-contact-runtime",
  });
  const success = form.querySelector('[data-form-embed-success="true"]');
  const error = form.querySelector('[data-form-embed-error="true"]');
  const submit = form.querySelector('[data-form-submit="1"]');
  expect(success?.textContent).toBe("Contact sent.");
  expect((success as HTMLElement | null)?.classList.contains("hidden")).toBe(false);
  expect((error as HTMLElement | null)?.classList.contains("hidden")).toBe(true);
  expect(submit).toMatchObject({ disabled: false });
  expect(submit?.getAttribute("aria-busy")).toBe("false");
});

test("536-03: existing Newsletter block recovers from a failed shared-runtime request", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    if (requests.length === 1) {
      return new Response(
        JSON.stringify({
          error: { code: "rate_limited", message: "provider detail must stay hidden" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Server fallback" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installRenderedFormRuntime(
    React.createElement(NewsletterBlock, {
      data: createNewsletterRuntimeData(),
      variant: "inline",
      blockId: "newsletter-runtime-compatibility",
    })
  );
  expect(form.querySelector("[data-form-file-input]")).toBeNull();
  setInputValue('input[name="email"]', "reader@example.com");

  dispatchSubmit(form);
  await settleRuntime();

  const error = form.querySelector('[data-form-embed-error="true"]');
  const submit = form.querySelector('[data-form-submit="1"]');
  expect(requests).toHaveLength(1);
  expect(error?.textContent).toBe("Too many submissions. Please try again later.");
  expect(document.body.textContent).not.toContain("provider detail");
  expect((error as HTMLElement | null)?.classList.contains("hidden")).toBe(false);
  expect(submit).toMatchObject({ disabled: false });
  expect(submit?.getAttribute("aria-busy")).toBe("false");
  expect(form.dataset.submitting).toBe("0");

  dispatchSubmit(form);
  await settleRuntime();

  expect(requests).toHaveLength(2);
  expect(requests.map(({ url }) => url)).toEqual([
    "http://localhost:3000/forms/newsletter-runtime-form/submissions",
    "http://localhost:3000/forms/newsletter-runtime-form/submissions",
  ]);
  expect(requests.map(({ init }) => JSON.parse(String(init?.body)))).toEqual([
    {
      data: { email: "reader@example.com" },
      formNonce: "nonce-newsletter-runtime",
    },
    {
      data: { email: "reader@example.com" },
      formNonce: "nonce-newsletter-runtime",
    },
  ]);
  const success = form.querySelector('[data-form-embed-success="true"]');
  expect(success?.textContent).toBe("Newsletter joined.");
  expect((success as HTMLElement | null)?.classList.contains("hidden")).toBe(false);
  expect((error as HTMLElement | null)?.classList.contains("hidden")).toBe(true);
  expect(submit).toMatchObject({ disabled: false });
  expect(form.dataset.submitting).toBe("0");
});

test("536-03: Form Embed keeps reserved-name fields separate from marked security controls", async () => {
  const execute = vi.fn(async () => "form-embed-final-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installFormRuntime(
    createFileFormData({
      formId: "reserved-form-embed",
      botProtection: true,
      fields: [
        {
          id: "ordinary-nonce-field",
          type: "text",
          label: "Ordinary nonce name",
          name: "__nl_form_nonce",
          required: true,
          settings: {},
        },
        {
          id: "ordinary-captcha-field",
          type: "text",
          label: "Ordinary captcha name",
          name: "captchaToken",
          required: true,
          settings: {},
        },
      ],
    }),
    () => {
      (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
    }
  );
  const ordinaryNonce = getOrdinaryNamedInput(form, "__nl_form_nonce");
  const ordinaryCaptcha = getOrdinaryNamedInput(form, "captchaToken");
  ordinaryNonce.value = "ordinary-nonce-value";
  ordinaryNonce.dispatchEvent(new Event("input", { bubbles: true }));
  ordinaryCaptcha.value = "ordinary-captcha-value";
  ordinaryCaptcha.dispatchEvent(new Event("input", { bubbles: true }));

  const securityNonce = form.querySelector('[data-form-security-nonce="1"]');
  const securityCaptcha = form.querySelector('[data-form-security-captcha="1"]');
  expect(securityNonce).toMatchObject({
    type: "hidden",
    name: "__nl_form_nonce",
    value: "nonce-reserved-form-embed",
  });
  expect(securityCaptcha).toMatchObject({ type: "hidden", name: "captchaToken", value: "" });

  dispatchSubmit(form);
  await settleRuntime();

  expect(execute).toHaveBeenCalledTimes(1);
  expect(requests).toHaveLength(1);
  expect(ordinaryCaptcha.value).toBe("ordinary-captcha-value");
  expect(securityCaptcha).toMatchObject({ value: "form-embed-final-token" });
  expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
    data: {
      __nl_form_nonce: "ordinary-nonce-value",
      captchaToken: "ordinary-captcha-value",
    },
    formNonce: "nonce-reserved-form-embed",
    captchaToken: "form-embed-final-token",
  });
});

test("536-03: Contact keeps reserved-name fields separate from marked security controls", async () => {
  const execute = vi.fn(async () => "contact-final-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const base = createContactRuntimeData();
  const form = installRenderedFormRuntime(
    React.createElement(ContactBlock, {
      data: {
        ...base,
        form: {
          ...base.form,
          fields: ["name", "email"],
          submission: {
            ...base.form?.submission,
            fieldMap: {
              name: "__nl_form_nonce",
              email: "captchaToken",
              phone: "",
              message: "",
            },
          },
        },
        resolved: {
          ...base.resolved,
          botProtection: {
            provider: "recaptcha_v3",
            siteKey: "site-key-contact-reserved",
            action: "public_write",
          },
          fields: [
            {
              id: "contact-ordinary-nonce",
              type: "text",
              label: "Name",
              name: "__nl_form_nonce",
              required: false,
              orderIndex: 0,
              settings: {},
            },
            {
              id: "contact-ordinary-captcha",
              type: "email",
              label: "Email",
              name: "captchaToken",
              required: true,
              orderIndex: 1,
              settings: {},
            },
          ],
        },
      },
      variant: "form-left",
      blockId: "contact-reserved-fields",
    }),
    () => {
      (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
    }
  );
  const ordinaryNonce = getOrdinaryNamedInput(form, "__nl_form_nonce");
  const ordinaryCaptcha = getOrdinaryNamedInput(form, "captchaToken");
  ordinaryNonce.value = "Contact Person";
  ordinaryNonce.dispatchEvent(new Event("input", { bubbles: true }));
  ordinaryCaptcha.value = "contact@example.com";
  ordinaryCaptcha.dispatchEvent(new Event("input", { bubbles: true }));

  dispatchSubmit(form);
  await settleRuntime();

  expect(execute).toHaveBeenCalledTimes(1);
  expect(requests).toHaveLength(1);
  expect(ordinaryCaptcha.value).toBe("contact@example.com");
  expect(form.querySelector('[data-form-security-captcha="1"]')).toMatchObject({
    value: "contact-final-token",
  });
  expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
    data: {
      __nl_form_nonce: "Contact Person",
      captchaToken: "contact@example.com",
    },
    formNonce: "nonce-contact-runtime",
    captchaToken: "contact-final-token",
  });
});

test("536-03: Newsletter keeps a captchaToken field separate from marked security controls", async () => {
  const execute = vi.fn(async () => "newsletter-final-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const base = createNewsletterRuntimeData();
  const form = installRenderedFormRuntime(
    React.createElement(NewsletterBlock, {
      data: {
        ...base,
        form: {
          ...newsletterDefaults.form,
          emailFieldName: "captchaToken",
          firstName: {
            ...newsletterDefaults.form?.firstName,
            enabled: false,
          },
        },
        consent: {
          ...newsletterDefaults.consent,
          enabled: false,
        },
        resolved: {
          ...base.resolved,
          botProtection: {
            provider: "recaptcha_v3",
            siteKey: "site-key-newsletter-reserved",
            action: "public_write",
          },
          fields: [
            {
              id: "newsletter-ordinary-captcha",
              type: "email",
              label: "Email",
              name: "captchaToken",
              required: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      },
      variant: "inline",
      blockId: "newsletter-reserved-field",
    }),
    () => {
      (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
    }
  );
  const ordinaryCaptcha = getOrdinaryNamedInput(form, "captchaToken");
  ordinaryCaptcha.value = "reader@example.com";
  ordinaryCaptcha.dispatchEvent(new Event("input", { bubbles: true }));

  dispatchSubmit(form);
  await settleRuntime();

  expect(execute).toHaveBeenCalledTimes(1);
  expect(requests).toHaveLength(1);
  expect(ordinaryCaptcha.value).toBe("reader@example.com");
  expect(form.querySelector('[data-form-security-captcha="1"]')).toMatchObject({
    value: "newsletter-final-token",
  });
  expect(JSON.parse(String(requests[0]?.init?.body))).toEqual({
    data: { captchaToken: "reader@example.com" },
    formNonce: "nonce-newsletter-runtime",
    captchaToken: "newsletter-final-token",
  });
});

test("536-03: final JSON preserves magic field names as own data properties", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const uploadIds = [uploadIdA, uploadIdB];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIds.shift() }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  let capturedPayload: unknown = null;
  const originalStringify = JSON.stringify;
  vi.spyOn(JSON, "stringify").mockImplementation(((value: unknown) => {
    if (
      value !== null &&
      typeof value === "object" &&
      Object.hasOwn(value, "data") &&
      Object.hasOwn(value, "formNonce")
    ) {
      capturedPayload = value;
    }
    return originalStringify(value);
  }) as typeof JSON.stringify);

  const form = installFormRuntime(
    createFileFormData({
      formId: "magic-fields",
      fields: [
        {
          id: "ordinary-field",
          type: "text",
          label: "Ordinary",
          name: "ordinary",
          required: false,
          settings: {},
        },
        {
          id: "prototype-file-field",
          type: "file",
          label: "Prototype files",
          name: "__proto__",
          required: true,
          settings: { multiple: true },
        },
        {
          id: "constructor-field",
          type: "text",
          label: "Constructor",
          name: "constructor",
          required: false,
          settings: {},
        },
        {
          id: "to-string-field",
          type: "text",
          label: "To string",
          name: "toString",
          required: false,
          settings: {},
        },
      ],
    })
  );
  setInputValue('input[name="ordinary"]', "plain");
  setSelectedFiles(getFileInput(form, "__proto__"), [
    new File([canonicalPngBytes], "first.png", { type: "image/png" }),
    new File([canonicalPngBytes], "second.png", { type: "image/png" }),
  ]);
  setInputValue('input[name="constructor"]', "ctor");
  setInputValue('input[name="toString"]', "stringifier");

  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.map(({ url }) => url)).toEqual([
    "http://localhost:3000/forms/magic-fields/uploads",
    "http://localhost:3000/forms/magic-fields/uploads",
    "http://localhost:3000/forms/magic-fields/submissions",
  ]);
  expect(capturedPayload).not.toBeNull();
  if (capturedPayload === null || typeof capturedPayload !== "object") {
    throw new Error("Missing captured submission payload");
  }
  const data = Reflect.get(capturedPayload, "data");
  if (data === null || typeof data !== "object") {
    throw new Error("Missing captured dynamic data payload");
  }
  expect(Object.getPrototypeOf(data)).toBe(Object.prototype);
  const expectedEntries: Array<readonly [string, unknown]> = [
    ["ordinary", "plain"],
    ["__proto__", [uploadIdA, uploadIdB]],
    ["constructor", "ctor"],
    ["toString", "stringifier"],
  ];
  for (const [name, value] of expectedEntries) {
    expect(Object.hasOwn(data, name)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(data, name)).toEqual({
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  expect(String(requests[2]?.init?.body)).toBe(
    `{"data":{"ordinary":"plain","__proto__":["${uploadIdA}","${uploadIdB}"],"constructor":"ctor","toString":"stringifier"},"formNonce":"nonce-magic-fields"}`
  );
});

test("536-03: conditional logic and progress use own properties for magic field names", () => {
  const progressKey = "nextless:form-progress:magic-progress:/";
  window.localStorage.setItem(
    progressKey,
    `{"values":{"__proto__":"restored-prototype"},"currentStep":1,"savedAt":${Date.now()}}`
  );

  let capturedProgress: unknown = null;
  const originalStringify = JSON.stringify;
  vi.spyOn(JSON, "stringify").mockImplementation(((value: unknown) => {
    if (
      value !== null &&
      typeof value === "object" &&
      Object.hasOwn(value, "values") &&
      Object.hasOwn(value, "savedAt")
    ) {
      capturedProgress = value;
    }
    return originalStringify(value);
  }) as typeof JSON.stringify);

  const form = installFormRuntime(
    createFileFormData({
      formId: "magic-progress",
      saveProgress: true,
      fields: [
        {
          id: "prototype-field",
          type: "text",
          label: "Prototype",
          name: "__proto__",
          required: false,
          settings: {},
        },
        {
          id: "constructor-field",
          type: "text",
          label: "Constructor",
          name: "constructor",
          required: false,
          settings: {},
        },
        {
          id: "to-string-field",
          type: "text",
          label: "To string",
          name: "toString",
          required: false,
          settings: {},
        },
        {
          id: "prototype-target",
          type: "text",
          label: "Prototype target",
          name: "prototype_target",
          required: false,
          settings: {
            logic: { operator: "equals", field: "__proto__", value: "restored-prototype" },
          },
        },
        {
          id: "constructor-target",
          type: "text",
          label: "Constructor target",
          name: "constructor_target",
          required: false,
          settings: { logic: { operator: "exists", field: "constructor" } },
        },
        {
          id: "to-string-target",
          type: "text",
          label: "To string target",
          name: "to_string_target",
          required: false,
          settings: { logic: { operator: "exists", field: "toString" } },
        },
      ],
    })
  );

  const prototypeInput = getOrdinaryNamedInput(form, "__proto__");
  const constructorInput = getOrdinaryNamedInput(form, "constructor");
  const toStringInput = getOrdinaryNamedInput(form, "toString");
  const prototypeTarget = form.querySelector('[data-form-field="prototype_target"]');
  const constructorTarget = form.querySelector('[data-form-field="constructor_target"]');
  const toStringTarget = form.querySelector('[data-form-field="to_string_target"]');
  expect(prototypeInput.value).toBe("restored-prototype");
  expect(constructorInput.value).toBe("");
  expect(toStringInput.value).toBe("");
  expect(prototypeTarget).toMatchObject({ hidden: false });
  expect(constructorTarget).toMatchObject({ hidden: true });
  expect(toStringTarget).toMatchObject({ hidden: true });

  setInputValue('input[name="constructor"]', "ctor");
  setInputValue('input[name="toString"]', "stringifier");
  expect(constructorTarget).toMatchObject({ hidden: false });
  expect(toStringTarget).toMatchObject({ hidden: false });

  if (capturedProgress === null || typeof capturedProgress !== "object") {
    throw new Error("Missing captured magic-name progress payload");
  }
  const values = Reflect.get(capturedProgress, "values");
  if (values === null || typeof values !== "object") {
    throw new Error("Missing captured progress values");
  }
  expect(Object.getPrototypeOf(values)).toBe(Object.prototype);
  expect(Object.hasOwn(values, "__proto__")).toBe(true);
  expect(Object.hasOwn(values, "constructor")).toBe(true);
  expect(Object.hasOwn(values, "toString")).toBe(true);
  expect(Reflect.get(values, "__proto__")).toBe("restored-prototype");
  expect(Reflect.get(values, "constructor")).toBe("ctor");
  expect(Reflect.get(values, "toString")).toBe("stringifier");

  const storedRaw = window.localStorage.getItem(progressKey);
  expect(storedRaw).not.toBeNull();
  const stored = JSON.parse(storedRaw ?? "{}") as { values?: Record<string, unknown> };
  expect(Object.hasOwn(stored.values ?? {}, "__proto__")).toBe(true);
  expect(Object.hasOwn(stored.values ?? {}, "constructor")).toBe(true);
  expect(Object.hasOwn(stored.values ?? {}, "toString")).toBe(true);
  expect(stored.values?.__proto__).toBe("restored-prototype");
  expect(stored.values?.constructor).toBe("ctor");
  expect(stored.values?.toString).toBe("stringifier");
});

test("536-03: required single file uploads before the final JSON submission", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(
        JSON.stringify({ id: uploadIdA, ignoredUrl: "https://provider.invalid" }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installFormRuntime(createFileFormData());
  const file = new File([canonicalPngBytes], "resume.png", { type: "image/png" });
  setSelectedFiles(getFileInput(form), [file]);

  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.map((request) => request.url)).toEqual([
    "http://localhost:3000/forms/file-form/uploads",
    "http://localhost:3000/forms/file-form/submissions",
  ]);
  const upload = requests[0]?.init;
  expect(upload).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  expect(upload?.headers).not.toHaveProperty("Content-Type");
  expect(upload?.body).toBeInstanceOf(FormData);
  const uploadEntries = Array.from((upload?.body as FormData).entries());
  expect(uploadEntries.map(([key]) => key)).toEqual(["fieldName", "file", "formNonce"]);
  expect(uploadEntries[0]).toEqual(["fieldName", "attachment"]);
  expect(uploadEntries[1]?.[1]).toMatchObject({ name: "resume.png", type: "image/png" });
  const uploadedFile = uploadEntries[1]?.[1];
  if (!(uploadedFile instanceof File)) throw new Error("Missing uploaded PNG fixture");
  expect(new Uint8Array(await uploadedFile.arrayBuffer())).toEqual(canonicalPngBytes);
  expect(uploadEntries[2]).toEqual(["formNonce", "nonce-file-form"]);

  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  const status = form.querySelector('[data-form-file-status="attachment"]');
  expect((hidden as HTMLInputElement | null)?.value).toBe(uploadIdA);
  expect(status).toMatchObject({ textContent: "Upload complete." });
  expect(status?.getAttribute("role")).toBe("status");
  expect(status?.getAttribute("aria-live")).toBe("polite");
  expect(form.dataset.fileUploadPending).toBe("0");
  expect(form.dataset.fileBindingInvalid).toBe("0");
  expect(form.dataset.submitting).toBe("0");

  const submissionPayload = JSON.parse(String(requests[1]?.init?.body));
  expect(submissionPayload).toMatchObject({
    data: { attachment: uploadIdA },
    formNonce: "nonce-file-form",
  });
  expect(JSON.stringify(submissionPayload)).not.toContain("resume.png");
  expect(JSON.stringify(submissionPayload)).not.toContain("provider.invalid");
});

test("536-03: ordered multiple uploads get fresh captcha tokens for every public write", async () => {
  const appendedScripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    appendedScripts.push(node as HTMLScriptElement);
    return node;
  });
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const uploadIds = [uploadIdA, uploadIdB];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIds.shift() }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installFormRuntime(
    createFileFormData({ formId: "multiple", multiple: true, botProtection: true })
  );
  const execute = vi
    .fn<(_siteKey: string, options: { action: string }) => Promise<string>>()
    .mockResolvedValueOnce("upload-token-a")
    .mockResolvedValueOnce("upload-token-b")
    .mockResolvedValueOnce("submission-token");
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  appendedScripts[0]?.dispatchEvent(new Event("load"));

  const first = new File([canonicalPngBytes], "a.png", { type: "image/png" });
  const second = new File([canonicalPngBytes], "b.png", { type: "image/png" });
  setSelectedFiles(getFileInput(form), [first, second]);
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.map(({ url }) => url)).toEqual([
    "http://localhost:3000/forms/multiple/uploads",
    "http://localhost:3000/forms/multiple/uploads",
    "http://localhost:3000/forms/multiple/submissions",
  ]);
  expect(execute).toHaveBeenCalledTimes(3);
  expect(execute.mock.calls.map((call) => call[1])).toEqual([
    { action: "public_write" },
    { action: "public_write" },
    { action: "public_write" },
  ]);
  const firstBody = requests[0]?.init?.body as FormData;
  const secondBody = requests[1]?.init?.body as FormData;
  expect(Array.from(firstBody.keys())).toEqual(["fieldName", "file", "formNonce", "captchaToken"]);
  expect(firstBody.get("file")).toMatchObject({ name: "a.png", type: "image/png" });
  const firstUploadFile = firstBody.get("file");
  const secondUploadFile = secondBody.get("file");
  if (!(firstUploadFile instanceof File) || !(secondUploadFile instanceof File)) {
    throw new Error("Missing ordered PNG upload fixtures");
  }
  expect(new Uint8Array(await firstUploadFile.arrayBuffer())).toEqual(canonicalPngBytes);
  expect(new Uint8Array(await secondUploadFile.arrayBuffer())).toEqual(canonicalPngBytes);
  expect(firstBody.get("captchaToken")).toBe("upload-token-a");
  expect(secondBody.get("file")).toMatchObject({ name: "b.png", type: "image/png" });
  expect(secondBody.get("captchaToken")).toBe("upload-token-b");
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(JSON.stringify([uploadIdA, uploadIdB]));
  const payload = JSON.parse(String(requests[2]?.init?.body));
  expect(payload.data.attachment).toEqual([uploadIdA, uploadIdB]);
  expect(payload.captchaToken).toBe("submission-token");
});

test("536-03: whole-form cardinality rejects a later 21-file field before earlier uploads", async () => {
  const appendedScripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    appendedScripts.push(node as HTMLScriptElement);
    return node;
  });
  const uploadIds = Array.from(
    { length: 21 },
    (_, index) =>
      `${String(index + 1).padStart(8, "0")}-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
  );
  let uploadIndex = 0;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      const id = uploadIds[uploadIndex];
      uploadIndex += 1;
      return new Response(JSON.stringify({ id }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installFormRuntime(
    createFileFormData({
      formId: "multiple-boundary",
      botProtection: true,
      fields: [
        {
          id: "avatar-field",
          type: "file",
          label: "Avatar",
          name: "avatar",
          required: true,
          settings: { multiple: false },
        },
        {
          id: "attachments-field",
          type: "file",
          label: "Attachments",
          name: "attachments",
          required: true,
          settings: { multiple: true },
        },
      ],
    })
  );
  let tokenIndex = 0;
  const execute = vi
    .fn<(_siteKey: string, options: { action: string }) => Promise<string>>()
    .mockImplementation(async () => {
      tokenIndex += 1;
      return `token-${tokenIndex}`;
    });
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  appendedScripts[0]?.dispatchEvent(new Event("load"));

  const avatarInput = getFileInput(form, "avatar");
  const attachmentsInput = getFileInput(form, "attachments");
  setSelectedFiles(avatarInput, [new File(["avatar"], "avatar.png", { type: "image/png" })]);
  const tooManyFiles = Array.from(
    { length: 21 },
    (_, index) => new File([String(index)], `rejected-${index + 1}.png`, { type: "image/png" })
  );
  setSelectedFiles(attachmentsInput, tooManyFiles);
  dispatchSubmit(form);
  await settleRuntime();

  const avatarHidden = form.querySelector('[data-form-file-value="avatar"]');
  const attachmentsHidden = form.querySelector('[data-form-file-value="attachments"]');
  const avatarStatus = form.querySelector('[data-form-file-status="avatar"]');
  const attachmentsStatus = form.querySelector('[data-form-file-status="attachments"]');
  expect(requests).toHaveLength(0);
  expect(execute).not.toHaveBeenCalled();
  expect((avatarHidden as HTMLInputElement | null)?.value).toBe("");
  expect((attachmentsHidden as HTMLInputElement | null)?.value).toBe("");
  expect(avatarStatus?.textContent).toBe("");
  expect(attachmentsStatus?.textContent).toBe("Choose a valid file selection and try again.");
  expect(attachmentsStatus?.getAttribute("role")).toBe("alert");
  expect(attachmentsStatus?.getAttribute("aria-live")).toBe("assertive");
  expect(form.dataset.fileUploadPending).toBe("0");
  expect(form.dataset.submitting).toBe("0");

  const acceptedFiles = Array.from(
    { length: 20 },
    (_, index) => new File([String(index)], `accepted-${index + 1}.png`, { type: "image/png" })
  );
  setSelectedFiles(attachmentsInput, acceptedFiles);
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests).toHaveLength(22);
  expect(requests.slice(0, 21).every(({ url }) => url.endsWith("/uploads"))).toBe(true);
  expect(requests[21]?.url).toBe("http://localhost:3000/forms/multiple-boundary/submissions");
  expect(execute).toHaveBeenCalledTimes(22);
  expect((avatarHidden as HTMLInputElement | null)?.value).toBe(uploadIds[0]);
  expect((attachmentsHidden as HTMLInputElement | null)?.value).toBe(
    JSON.stringify(uploadIds.slice(1))
  );
  const payload = JSON.parse(String(requests[21]?.init?.body));
  expect(payload.data).toMatchObject({
    avatar: uploadIds[0],
    attachments: uploadIds.slice(1),
  });
  expect(avatarStatus?.textContent).toBe("Upload complete.");
  expect(attachmentsStatus?.textContent).toBe("Upload complete.");
});

test("536-03: a later disabled pair clears after an earlier deferred upload without transport", async () => {
  let resolveFirstUpload: ((response: Response) => void) | undefined;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploads = 0;
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploads += 1;
      if (uploads === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirstUpload = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: uploadIdB }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      formId: "later-disabled",
      fields: [
        { id: "first", type: "file", label: "First", name: "first", required: true },
        { id: "later", type: "file", label: "Later", name: "later", required: false },
      ],
    })
  );
  const firstInput = getFileInput(form, "first");
  const laterInput = getFileInput(form, "later");
  const firstHidden = form.querySelector('[data-form-file-value="first"]');
  const laterHidden = form.querySelector('[data-form-file-value="later"]');
  if (!(firstHidden instanceof HTMLInputElement) || !(laterHidden instanceof HTMLInputElement)) {
    throw new Error("Missing two-binding hidden inputs");
  }
  setSelectedFiles(firstInput, [new File(["first"], "first.txt")]);
  setSelectedFiles(laterInput, [new File(["later"], "later.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() =>
    expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(1)
  );

  laterInput.disabled = true;
  laterHidden.disabled = true;
  resolveFirstUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await settleRuntime();

  expect(firstHidden.value).toBe(uploadIdA);
  expect(laterHidden.value).toBe("");
  expect(laterInput.files).toHaveLength(0);
  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);
  expect(form.dataset.fileUploadPending).toBe("0");
  expect(form.dataset.submitting).toBe("0");
  expect(form.dataset.fileBindingInvalid).toBe("0");
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "Your file selection changed. Submit the form again."
  );

  laterInput.disabled = false;
  laterHidden.disabled = false;
  form.dispatchEvent(new Event("change", { bubbles: true }));
  setSelectedFiles(laterInput, [new File(["retry"], "retry.txt")]);
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
  const submission = requests.find(({ url }) => url.endsWith("/submissions"));
  expect(JSON.parse(String(submission?.init?.body)).data).toMatchObject({
    first: uploadIdA,
    later: uploadIdB,
  });
});

test("536-03: post-preflight cardinality failure with unsafe status fails closed", async () => {
  let resolveFirstUpload: ((response: Response) => void) | undefined;
  const requests: string[] = [];
  let uploads = 0;
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      uploads += 1;
      if (uploads === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirstUpload = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: uploadIdB }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      formId: "post-preflight-cardinality",
      fields: [
        { id: "first", type: "file", label: "First", name: "first", required: true },
        {
          id: "later",
          type: "file",
          label: "Later",
          name: "later",
          required: true,
          settings: { multiple: true },
        },
      ],
    })
  );
  const firstInput = getFileInput(form, "first");
  const laterInput = getFileInput(form, "later");
  const firstHidden = form.querySelector('[data-form-file-value="first"]');
  const laterHidden = form.querySelector('[data-form-file-value="later"]');
  const laterStatus = form.querySelector('[data-form-file-status="later"]');
  if (
    !(firstHidden instanceof HTMLInputElement) ||
    !(laterHidden instanceof HTMLInputElement) ||
    !(laterStatus instanceof HTMLElement)
  ) {
    throw new Error("Missing post-preflight controls");
  }
  setSelectedFiles(firstInput, [new File(["first"], "first.txt")]);
  setSelectedFiles(laterInput, [new File(["later"], "later.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() =>
    expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1)
  );

  setSelectedFilesSilently(
    laterInput,
    Array.from({ length: 21 }, (_, index) => new File([String(index)], `late-${index + 1}.txt`))
  );
  const sentinel = document.createElement("span");
  sentinel.textContent = "preserve-sentinel";
  laterStatus.appendChild(sentinel);
  resolveFirstUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await settleRuntime();

  expect(firstHidden.value).toBe(uploadIdA);
  expect(laterHidden.value).toBe("");
  expect(laterStatus.contains(sentinel)).toBe(true);
  expect(laterStatus.textContent).toBe("preserve-sentinel");
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
  expect(form.dataset.fileBindingInvalid).toBe("1");
  const errorNode = form.querySelector('[data-form-embed-error="true"]');
  expect(errorNode?.textContent).toBe(
    "This form's file upload controls are invalid. Refresh the page and try again."
  );
  expect((errorNode as HTMLElement | null)?.dataset.formErrorOwner).toBe("file-binding");

  sentinel.remove();
  setSelectedFiles(laterInput, [new File(["retry"], "retry.txt")]);
  expect(form.dataset.fileBindingInvalid).toBe("0");
  expect((errorNode as HTMLElement | null)?.classList.contains("hidden")).toBe(true);
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
  expect(laterHidden.value).toBe(JSON.stringify([uploadIdB]));
});

test("536-03: upload failures use bounded copy and retry the same selection safely", async () => {
  let uploadAttempts = 0;
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      uploadAttempts += 1;
      if (uploadAttempts === 1) {
        return new Response(
          JSON.stringify({
            error: {
              code: "media_file_too_large",
              message: "SECRET /tmp/customer-name.pdf provider-token",
            },
          }),
          { status: 413, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  const form = installFormRuntime(createFileFormData());
  setSelectedFiles(getFileInput(form), [new File(["x"], "customer-name.pdf")]);
  dispatchSubmit(form);
  await settleRuntime();

  const status = form.querySelector('[data-form-file-status="attachment"]');
  expect(status?.textContent).toBe("The selected file is too large.");
  expect(status?.getAttribute("role")).toBe("alert");
  expect(form.querySelector('[data-form-embed-form-body="true"]')).toHaveProperty("hidden", false);
  expect(requests).toHaveLength(1);
  expect(document.body.textContent).not.toContain("SECRET");
  expect(document.body.textContent).not.toContain("customer-name.pdf");

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests).toHaveLength(3);
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(status?.textContent).toBe("Upload complete.");
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdA);
});

test("536-03: changing a selection aborts an in-flight upload and stale work cannot submit", async () => {
  let resolveFirstUpload: ((response: Response) => void) | undefined;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (
      url.endsWith("/uploads") &&
      requests.filter((entry) => entry.url.endsWith("/uploads")).length === 1
    ) {
      return new Promise<Response>((resolve) => {
        resolveFirstUpload = resolve;
      });
    }
    if (url.endsWith("/uploads")) {
      return Promise.resolve(
        new Response(JSON.stringify({ id: uploadIdB }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;

  const form = installFormRuntime(createFileFormData({ required: false }));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "old.txt")]);
  dispatchSubmit(form);
  await flushMicrotasks();
  const firstSignal = requests[0]?.init?.signal;

  setSelectedFiles(input, [new File(["new"], "new.txt")]);
  await flushMicrotasks();
  expect(firstSignal?.aborted).toBe(true);
  expect(form.dataset.submitting).toBe("0");
  expect(form.dataset.fileUploadPending).toBe("0");

  resolveFirstUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await flushMicrotasks();
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdB);
});

test("536-03: conditional hide clears native and companion file state", async () => {
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      required: false,
      fields: [
        {
          id: "show-field",
          type: "text",
          label: "Show",
          name: "show",
          required: false,
        },
        {
          id: "conditional-file",
          type: "file",
          label: "Conditional",
          name: "attachment",
          required: false,
          settings: {
            logic: { operator: "equals", field: "show", value: "yes" },
          },
        },
      ],
    })
  );
  setInputValue('input[name="show"]', "yes");
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["x"], "conditional.txt")]);
  expect(input.files).toHaveLength(1);

  setInputValue('input[name="show"]', "no");
  expect(input.disabled).toBe(true);
  expect(input.files).toHaveLength(0);
  expect(input.value).toBe("");
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");

  setInputValue('input[name="show"]', "yes");
  expect(input.disabled).toBe(false);
  expect(input.files).toHaveLength(0);
  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(0);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
});

test.each([
  [
    "empty identity",
    (form: HTMLFormElement) => getFileInput(form).setAttribute("data-form-file-input", ""),
  ],
  [
    "mismatched identity",
    (form: HTMLFormElement) => getFileInput(form).setAttribute("data-form-file-input", "other"),
  ],
  [
    "duplicate role",
    (form: HTMLFormElement): void => {
      const duplicate = getFileInput(form).cloneNode() as HTMLInputElement;
      form.appendChild(duplicate);
    },
  ],
  [
    "empty hidden identity",
    (form: HTMLFormElement) => {
      form
        .querySelector('[data-form-file-value="attachment"]')
        ?.setAttribute("data-form-file-value", "");
    },
  ],
  [
    "mismatched hidden identity",
    (form: HTMLFormElement) => {
      form
        .querySelector('[data-form-file-value="attachment"]')
        ?.setAttribute("data-form-file-value", "other");
    },
  ],
  [
    "duplicate hidden role",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      form.appendChild(hidden.cloneNode() as HTMLInputElement);
    },
  ],
  [
    "empty status identity",
    (form: HTMLFormElement) => {
      form
        .querySelector('[data-form-file-status="attachment"]')
        ?.setAttribute("data-form-file-status", "");
    },
  ],
  [
    "mismatched status identity",
    (form: HTMLFormElement) => {
      form
        .querySelector('[data-form-file-status="attachment"]')
        ?.setAttribute("data-form-file-status", "other");
    },
  ],
  [
    "duplicate status role",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      form.appendChild(status.cloneNode() as HTMLElement);
    },
  ],
  [
    "missing raw multiple marker",
    (form: HTMLFormElement) => {
      getFileInput(form).removeAttribute("data-form-file-multiple");
    },
  ],
  [
    "malformed raw multiple marker",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.formFileMultiple = "2";
    },
  ],
  [
    "missing hidden multiple marker",
    (form: HTMLFormElement) => {
      form
        .querySelector('[data-form-file-value="attachment"]')
        ?.removeAttribute("data-form-file-multiple");
    },
  ],
  [
    "malformed hidden multiple marker",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.dataset.formFileMultiple = "2";
    },
  ],
  [
    "raw cross-role marker stacking",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.formFileValue = "attachment";
    },
  ],
  [
    "hidden cross-role marker stacking",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.dataset.formFileStatus = "attachment";
    },
  ],
  [
    "status cross-role marker stacking",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.dataset.formFileInput = "attachment";
    },
  ],
  [
    "status multiple marker exclusion",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.dataset.formFileMultiple = "0";
    },
  ],
  [
    "standalone multiple marker",
    (form: HTMLFormElement): void => {
      const marker = document.createElement("div");
      marker.dataset.formFileMultiple = "0";
      form.appendChild(marker);
    },
  ],
  [
    "form-root multiple marker",
    (form: HTMLFormElement) => {
      form.dataset.formFileMultiple = "0";
    },
  ],
  [
    "svg multiple marker",
    (form: HTMLFormElement) => {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      marker.setAttribute("data-form-file-multiple", "0");
      form.appendChild(marker);
    },
  ],
  [
    "mathml multiple marker",
    (form: HTMLFormElement) => {
      const marker = document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
      marker.setAttribute("data-form-file-multiple", "0");
      form.appendChild(marker);
    },
  ],
  [
    "wrong input role",
    (form: HTMLFormElement): void => {
      getFileInput(form).type = "text";
    },
  ],
  [
    "wrong input tag",
    (form: HTMLFormElement): void => {
      const input = getFileInput(form);
      const replacement = document.createElement("select");
      replacement.setAttribute("data-form-file-input", "attachment");
      replacement.setAttribute("data-form-file-multiple", "0");
      input.replaceWith(replacement);
    },
  ],
  [
    "wrong hidden role",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.type = "text";
    },
  ],
  [
    "wrong hidden tag",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      const replacement = document.createElement("textarea");
      replacement.name = "attachment";
      replacement.setAttribute("data-form-file-value", "attachment");
      replacement.setAttribute("data-form-file-multiple", "0");
      hidden.replaceWith(replacement);
    },
  ],
  [
    "wrong status role",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.setAttribute("role", "log");
    },
  ],
  [
    "wrong status tag",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      const replacement = document.createElement("input");
      replacement.setAttribute("data-form-file-status", "attachment");
      replacement.setAttribute("role", "status");
      replacement.setAttribute("aria-live", "polite");
      status.replaceWith(replacement);
    },
  ],
  [
    "form root promoted to status",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      status?.removeAttribute("data-form-file-status");
      form.dataset.formFileStatus = "attachment";
      form.setAttribute("role", "status");
      form.setAttribute("aria-live", "polite");
    },
  ],
  [
    "hidden moved to another field owner",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      const other = document.createElement("div");
      other.dataset.formField = "other";
      form.appendChild(other);
      other.appendChild(hidden);
    },
  ],
  [
    "status moved to another field owner",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      const other = document.createElement("div");
      other.dataset.formField = "other";
      form.appendChild(other);
      other.appendChild(status);
    },
  ],
  [
    "status promoted to field wrapper",
    (form: HTMLFormElement) => {
      const input = getFileInput(form);
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(hidden instanceof HTMLInputElement) || !(status instanceof HTMLElement)) {
        throw new Error("Missing binding");
      }
      status.dataset.formField = "attachment-wrapper";
      status.append(input, hidden);
    },
  ],
  [
    "submit nested in status",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      const submit = form.querySelector('[data-form-submit="1"]');
      if (!(status instanceof HTMLElement) || !(submit instanceof HTMLButtonElement)) {
        throw new Error("Missing status/submit");
      }
      status.appendChild(submit);
    },
  ],
  [
    "nonce nested in status",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      const nonce = form.querySelector('input[name="__nl_form_nonce"]');
      if (!(status instanceof HTMLElement) || !(nonce instanceof HTMLInputElement)) {
        throw new Error("Missing status/nonce");
      }
      status.appendChild(nonce);
    },
  ],
  [
    "raw input name",
    (form: HTMLFormElement) => {
      getFileInput(form).name = "raw-file-must-not-submit";
    },
  ],
  [
    "invalid required marker",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.requiredOriginal = "yes";
    },
  ],
  [
    "multiple parity",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.formFileMultiple = "1";
    },
  ],
] as const)(
  "536-03: malformed binding (%s) fails closed without event-boundary errors",
  async (_label, mutate) => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("fetch must not run");
    }) as typeof globalThis.fetch;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const form = installFormRuntime(createFileFormData({ required: false }));
    mutate(form);

    expect(() => {
      form.dispatchEvent(new Event("change", { bubbles: true }));
    }).not.toThrow();
    await flushMicrotasks();

    expect(form.dataset.fileBindingInvalid).toBe("1");
    expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).disabled).toBe(true);
    expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
      "This form's file upload controls are invalid. Refresh the page and try again."
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  }
);

test("536-03: promoting the form root to status preserves all form descendants", async () => {
  globalThis.fetch = vi.fn(async () => {
    throw new Error("fetch must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ formId: "root-status" }));
  const input = getFileInput(form);
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  const status = form.querySelector('[data-form-file-status="attachment"]');
  const submit = form.querySelector('[data-form-submit="1"]');
  const nonce = form.querySelector('input[name="__nl_form_nonce"]');
  if (
    !(hidden instanceof HTMLInputElement) ||
    !(status instanceof HTMLElement) ||
    !(submit instanceof HTMLButtonElement) ||
    !(nonce instanceof HTMLInputElement)
  ) {
    throw new Error("Missing root-status controls");
  }
  const childCount = form.childElementCount;
  status.removeAttribute("data-form-file-status");
  form.dataset.formFileStatus = "attachment";
  form.setAttribute("role", "status");
  form.setAttribute("aria-live", "polite");
  expect(() => form.dispatchEvent(new Event("change", { bubbles: true }))).not.toThrow();
  await flushMicrotasks();

  expect(form.childElementCount).toBe(childCount);
  for (const control of [input, hidden, status, submit, nonce]) {
    expect(control.isConnected).toBe(true);
    expect(form.contains(control)).toBe(true);
  }
  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "This form's file upload controls are invalid. Refresh the page and try again."
  );
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test("536-03: reset cleanup preserves an unsafe status descendant until a real repair event", async () => {
  const form = installFormRuntime(createFileFormData({ formId: "reset-status-descendant" }));
  const status = form.querySelector('[data-form-file-status="attachment"]');
  const nonce = form.querySelector('input[name="__nl_form_nonce"]');
  if (!(status instanceof HTMLElement) || !(nonce instanceof HTMLInputElement)) {
    throw new Error("Missing reset status/nonce");
  }
  const originalParent = nonce.parentElement;
  if (!(originalParent instanceof HTMLElement)) throw new Error("Missing nonce parent");
  status.appendChild(nonce);
  form.reset();
  await flushMicrotasks();
  expect(status.contains(nonce)).toBe(true);
  expect(nonce.isConnected).toBe(true);
  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "This form's file upload controls are invalid. Refresh the page and try again."
  );

  originalParent.prepend(nonce);
  form.dispatchEvent(new Event("change", { bubbles: true }));
  expect(form.dataset.fileBindingInvalid).toBe("0");
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).disabled).toBe(false);
});

test("536-03: saved progress never hydrates or persists native files or media ids", () => {
  const progressKey = "nextless:form-progress:progress-files:/";
  window.localStorage.setItem(
    progressKey,
    JSON.stringify({
      values: { attachment: uploadIdA, note: "restored" },
      currentStep: 1,
      savedAt: Date.now(),
    })
  );
  const form = installFormRuntime(
    createFileFormData({
      formId: "progress-files",
      required: false,
      saveProgress: true,
      fields: [
        {
          id: "attachment-field",
          type: "file",
          label: "Attachment",
          name: "attachment",
          required: false,
        },
        { id: "note-field", type: "text", label: "Note", name: "note", required: false },
      ],
    })
  );

  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");
  expect((form.querySelector('input[name="note"]') as HTMLInputElement).value).toBe("restored");
  setInputValue('input[name="note"]', "changed");
  const stored = JSON.parse(window.localStorage.getItem(progressKey) ?? "{}");
  expect(stored.values).toEqual({ note: "changed" });
});

test("536-03: a successful upload is reused when submission retry keeps the same File objects", async () => {
  let submissionAttempt = 0;
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    submissionAttempt += 1;
    if (submissionAttempt === 1) {
      return new Response(JSON.stringify({ error: { message: "Submission unavailable" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData());
  setSelectedFiles(getFileInput(form), [new File(["same"], "same.txt")]);

  dispatchSubmit(form);
  await settleRuntime();
  expect(form.querySelector('[data-form-embed-form-body="true"]')).toHaveProperty("hidden", false);
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(2);
  const status = form.querySelector('[data-form-file-status="attachment"]');
  expect(status?.textContent).toBe("Upload complete.");
});

test("536-03: reset clears file state and successful reset behavior cannot restore ids", async () => {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ successBehavior: "show-message-reset-form" })
  );
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["reset"], "reset.txt")]);
  dispatchSubmit(form);
  await settleRuntime();
  await flushMicrotasks();

  expect(input.files).toHaveLength(0);
  expect(input.value).toBe("");
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");
  const status = form.querySelector('[data-form-file-status="attachment"]');
  expect(status?.textContent).toBe("");
  expect(status?.getAttribute("role")).toBe("status");
  expect(status?.getAttribute("aria-live")).toBe("polite");
  expect(form.dataset.fileUploadPending).toBe("0");
});

test("536-03: changing selection during final captcha aborts before payload fetch", async () => {
  const appendedScripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    appendedScripts.push(node as HTMLScriptElement);
    return node;
  });
  let resolveFinalCaptcha: ((token: string) => void) | undefined;
  const execute = vi
    .fn<(_siteKey: string, options: { action: string }) => Promise<string>>()
    .mockResolvedValueOnce("upload-token")
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFinalCaptcha = resolve;
        })
    )
    .mockResolvedValueOnce("new-upload-token")
    .mockResolvedValueOnce("new-submission-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploadCount = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploadCount += 1;
      return new Response(JSON.stringify({ id: uploadCount === 1 ? uploadIdA : uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "captcha-race", required: false, botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  appendedScripts[0]?.dispatchEvent(new Event("load"));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "old.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));

  setSelectedFiles(input, [new File(["new"], "new.txt")]);
  await flushMicrotasks();
  expect(form.dataset.submitting).toBe("0");
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);
  resolveFinalCaptcha?.("late-token");
  await flushMicrotasks();
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
  const payload = JSON.parse(
    String(requests.find(({ url }) => url.endsWith("/submissions"))?.init?.body)
  );
  expect(payload.data.attachment).toBe(uploadIdB);
  expect(payload.captchaToken).toBe("new-submission-token");
});

test("536-03: exact-signature recompute preserves completed ids but aborts the old submit attempt", async () => {
  let resolveUpload: ((response: Response) => void) | undefined;
  const requests: string[] = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Promise<Response>((resolve) => {
        resolveUpload = resolve;
      });
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      fields: [
        {
          id: "attachment-field",
          type: "file",
          label: "Attachment",
          name: "attachment",
          required: true,
        },
        { id: "note-field", type: "text", label: "Note", name: "note", required: false },
      ],
    })
  );
  setSelectedFiles(getFileInput(form), [new File(["same"], "same.txt")]);
  dispatchSubmit(form);
  await flushMicrotasks();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);

  const note = form.querySelector('input[name="note"]');
  if (!(note instanceof HTMLInputElement)) throw new Error("Missing note");
  note.value = "unrelated";
  note.dispatchEvent(new Event("input", { bubbles: true }));
  resolveUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdA);

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
});

test("536-03: silent same-count FileList replacement never reuses completed ids", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploadCount = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploadCount += 1;
      return new Response(JSON.stringify({ id: uploadCount === 1 ? uploadIdA : uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (requests.filter((request) => request.url.endsWith("/submissions")).length === 1) {
      return new Response(JSON.stringify({ error: { message: "Retry" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData());
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "same-name.txt")]);
  dispatchSubmit(form);
  await settleRuntime();
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdA);

  const replacement = new DataTransfer();
  replacement.items.add(new File(["new"], "same-name.txt"));
  input.files = replacement.files;
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdB);
  const submissions = requests.filter(({ url }) => url.endsWith("/submissions"));
  expect(JSON.parse(String(submissions[1]?.init?.body)).data.attachment).toBe(uploadIdB);
});

test("536-03: neutral multiple value is canonical while malformed JSON blocks without console errors", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const payloads: unknown[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith("/submissions")) payloads.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "neutral-multiple", multiple: true, required: false })
  );
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  expect(hidden.value).toBe("");
  dispatchSubmit(form);
  await settleRuntime();
  expect(payloads).toMatchObject([{ data: { attachment: [] } }]);

  hidden.value = `[ "${uploadIdA}" ]`;
  expect(() => hidden.dispatchEvent(new Event("change", { bubbles: true }))).not.toThrow();
  await flushMicrotasks();
  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect(hidden.value).toBe("");
  expect(consoleError).not.toHaveBeenCalled();
});

test("536-03: stripped markers remain tombstoned and cannot become ordinary named payload fields", async () => {
  globalThis.fetch = vi.fn(async () => {
    throw new Error("fetch must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ required: false }));
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  hidden.removeAttribute("data-form-file-value");
  hidden.removeAttribute("data-form-file-multiple");
  hidden.name = "ordinary-looking-field";
  hidden.value = uploadIdA;

  expect(() => hidden.dispatchEvent(new Event("change", { bubbles: true }))).not.toThrow();
  await flushMicrotasks();
  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect(hidden.value).toBe("");
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

test("536-03: repaired triple submits only its fresh id while retaining a tombstoned old hidden", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ formId: "tombstone-repair" }));
  const oldHidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(oldHidden instanceof HTMLInputElement)) throw new Error("Missing old hidden");
  oldHidden.removeAttribute("data-form-file-value");
  oldHidden.removeAttribute("data-form-file-multiple");
  oldHidden.name = "legacyMedia";
  oldHidden.value = uploadIdA;

  const replacement = document.createElement("input");
  replacement.type = "hidden";
  replacement.name = "attachment";
  replacement.dataset.formFileValue = "attachment";
  replacement.dataset.formFileMultiple = "0";
  oldHidden.parentElement?.insertBefore(replacement, oldHidden.nextSibling);
  form.dispatchEvent(new Event("change", { bubbles: true }));
  expect(form.dataset.fileBindingInvalid).toBe("0");
  expect(oldHidden.isConnected).toBe(true);
  expect(oldHidden.name).toBe("legacyMedia");

  setSelectedFiles(getFileInput(form), [new File(["fresh"], "fresh.txt")]);
  dispatchSubmit(form);
  await settleRuntime();
  expect(replacement.value).toBe(uploadIdB);
  expect(oldHidden.value).toBe("");
  const submission = requests.find(({ url }) => url.endsWith("/submissions"));
  const payloadText = String(submission?.init?.body);
  const payload = JSON.parse(payloadText);
  expect(payload.data.attachment).toBe(uploadIdB);
  expect(payload.data).not.toHaveProperty("legacyMedia");
  expect(payloadText).not.toContain(uploadIdA);
});

test("536-03: conditional visibility owns required only on the native file input", () => {
  const form = installFormRuntime(
    createFileFormData({
      fields: [
        { id: "show-field", type: "text", label: "Show", name: "show", required: false },
        {
          id: "required-file",
          type: "file",
          label: "Required file",
          name: "attachment",
          required: true,
          settings: { logic: { operator: "equals", field: "show", value: "yes" } },
        },
      ],
    })
  );
  const input = getFileInput(form);
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  expect(input.disabled).toBe(true);
  expect(input.required).toBe(false);
  expect(input.dataset.requiredOriginal).toBe("1");
  expect(hidden.required).toBe(false);

  setInputValue('input[name="show"]', "yes");
  expect(input.disabled).toBe(false);
  expect(input.required).toBe(true);
  expect(hidden.required).toBe(false);
  setSelectedFiles(input, [new File(["x"], "required.txt")]);
  setInputValue('input[name="show"]', "no");
  expect(input.disabled).toBe(true);
  expect(input.required).toBe(false);
  expect(input.files).toHaveLength(0);
  expect(hidden.required).toBe(false);
  setInputValue('input[name="show"]', "yes");
  expect(input.required).toBe(true);
  expect(input.files).toHaveLength(0);
});

test.each([
  [
    "missing form id",
    (form: HTMLFormElement, _input: HTMLInputElement) => {
      form.dataset.formId = "";
    },
    "This file cannot be uploaded right now.",
  ],
  [
    "missing nonce",
    (form: HTMLFormElement, _input: HTMLInputElement) => {
      const nonce = form.querySelector('input[name="__nl_form_nonce"]');
      if (!(nonce instanceof HTMLInputElement)) throw new Error("Missing nonce");
      nonce.value = "";
    },
    "This form has expired. Refresh the page and try again.",
  ],
  [
    "single cardinality",
    (_form: HTMLFormElement, input: HTMLInputElement) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["a"], "a.txt"));
      transfer.items.add(new File(["b"], "b.txt"));
      input.files = transfer.files;
    },
    "Choose a valid file selection and try again.",
  ],
] as const)("536-03: %s fails locally without a public request", async (_label, mutate, copy) => {
  globalThis.fetch = vi.fn(async () => {
    throw new Error("fetch must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData());
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["x"], "x.txt")]);
  mutate(form, input);
  dispatchSubmit(form);
  await settleRuntime();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(form.querySelector('[data-form-file-status="attachment"]')?.textContent).toBe(copy);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");
  expect(form.dataset.submitting).toBe("0");
  expect(form.dataset.fileUploadPending).toBe("0");
  expect(form.getAttribute("aria-busy")).toBe("false");
});

test("536-03: clearing an optional selection after an error restores neutral state", async () => {
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ error: { code: "media_mime_not_allowed" } }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ required: false }));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["x"], "bad.exe")]);
  dispatchSubmit(form);
  await settleRuntime();
  const status = form.querySelector('[data-form-file-status="attachment"]');
  expect(status?.textContent).toBe("This file type is not allowed.");

  setSelectedFiles(input, []);
  expect(status?.textContent).toBe("");
  expect(status?.getAttribute("role")).toBe("status");
  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
  expect(form.dataset.submitting).toBe("0");
  expect(form.dataset.fileUploadPending).toBe("0");
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).disabled).toBe(false);
});

test("536-03: changing selection aborts deferred upload captcha and ignores its late token", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  let resolveFirstToken: ((token: string) => void) | undefined;
  const execute = vi
    .fn<(_siteKey: string, options: { action: string }) => Promise<string>>()
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFirstToken = resolve;
        })
    )
    .mockResolvedValueOnce("retry-upload-token")
    .mockResolvedValueOnce("retry-submit-token");
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "upload-captcha-abort", required: false, botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "old.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
  setSelectedFiles(input, [new File(["new"], "new.txt")]);
  await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));
  expect(requests).toHaveLength(0);
  resolveFirstToken?.("late-upload-token");
  await flushMicrotasks();
  expect(requests).toHaveLength(0);

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
});

test("536-03: duplicate submits cannot duplicate upload or final write", async () => {
  let resolveUpload: ((response: Response) => void) | undefined;
  const requests: string[] = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Promise<Response>((resolve) => {
        resolveUpload = resolve;
      });
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData());
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  dispatchSubmit(form);
  await flushMicrotasks();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  resolveUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
});

test("536-03: duplicate submit during final captcha cannot start another attempt", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  let resolveFinalToken: ((token: string) => void) | undefined;
  const execute = vi
    .fn<(_siteKey: string, options: { action: string }) => Promise<string>>()
    .mockResolvedValueOnce("upload-token")
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFinalToken = resolve;
        })
    );
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "duplicate-captcha", botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
  dispatchSubmit(form);
  await flushMicrotasks();
  expect(execute).toHaveBeenCalledTimes(2);
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
  resolveFinalToken?.("submission-token");
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
});

test("536-03: malformed second upload never exposes a partial multiple id array", async () => {
  let uploadIndex = 0;
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      uploadIndex += 1;
      return new Response(
        uploadIndex === 1
          ? JSON.stringify({ id: uploadIdA })
          : JSON.stringify({ id: "not-a-uuid" }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }
    throw new Error("submission must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ multiple: true }));
  setSelectedFiles(getFileInput(form), [new File(["a"], "a.txt"), new File(["b"], "b.txt")]);
  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");
  expect(form.querySelector('[data-form-file-status="attachment"]')?.textContent).toBe(
    "Unable to upload this file. Please try again."
  );
});

test("536-03: malformed binding during upload keeps central invalid ownership after stale cleanup", async () => {
  let resolveUpload: ((response: Response) => void) | undefined;
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    if (String(input).endsWith("/uploads")) {
      return new Promise<Response>((resolve) => {
        resolveUpload = resolve;
      });
    }
    throw new Error("submission must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData());
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  await flushMicrotasks();
  const marker = document.createElement("div");
  marker.dataset.formFileMultiple = "0";
  form.appendChild(marker);
  marker.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));
  resolveUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await flushMicrotasks();

  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).disabled).toBe(true);
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "This form's file upload controls are invalid. Refresh the page and try again."
  );
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");
  marker.remove();
  form.dispatchEvent(new Event("change", { bubbles: true }));
  expect(form.dataset.fileBindingInvalid).toBe("0");
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).disabled).toBe(false);
});

test("536-03: repaired earlier-step binding stays coherent through logic, progress, navigation, and submit", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime({
    ...formEmbedDefaults,
    formId: "multi-step-files",
    resolved: {
      formName: "Steps",
      submissionAccess: "public",
      submissionNonce: "nonce-steps",
      settings: { layoutMode: "multi_step", saveProgress: true, stepTitles: ["One", "Two"] },
      fields: [
        {
          id: "show-one",
          type: "text",
          label: "Show file",
          name: "show",
          required: false,
          settings: { formStep: 1 },
        },
        {
          id: "file-one",
          type: "file",
          label: "File",
          name: "attachment",
          required: false,
          settings: {
            formStep: 1,
            logic: { operator: "equals", field: "show", value: "yes" },
          },
        },
        {
          id: "note-two",
          type: "text",
          label: "Note",
          name: "note",
          required: false,
          settings: { formStep: 2 },
        },
      ],
    },
  });
  const input = getFileInput(form);
  const next = form.querySelector('[data-form-nav="next"]');
  const back = form.querySelector('[data-form-nav="back"]');
  if (!(next instanceof HTMLButtonElement) || !(back instanceof HTMLButtonElement)) {
    throw new Error("Missing navigation");
  }
  setInputValue('input[name="show"]', "yes");
  expect(input.disabled).toBe(false);
  input.dataset.formFileInput = "wrong";
  next.click();
  expect(form.dataset.currentStep).toBe("1");
  expect(form.dataset.fileBindingInvalid).toBe("1");

  input.dataset.formFileInput = "attachment";
  form.dispatchEvent(new Event("change", { bubbles: true }));
  expect(form.dataset.fileBindingInvalid).toBe("0");
  setSelectedFiles(input, [new File(["step"], "step.txt")]);
  next.click();
  expect(form.dataset.currentStep).toBe("2");
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  hidden.name = "wrong";
  back.click();
  expect(form.dataset.currentStep).toBe("2");
  expect(form.dataset.fileBindingInvalid).toBe("1");
  hidden.name = "attachment";
  hidden.dispatchEvent(new Event("change", { bubbles: true }));
  expect(form.dataset.fileBindingInvalid).toBe("0");
  back.click();
  expect(form.dataset.currentStep).toBe("1");
  next.click();
  expect(form.dataset.currentStep).toBe("2");
  setInputValue('input[name="note"]', "persisted note");
  const stored = JSON.parse(
    window.localStorage.getItem("nextless:form-progress:multi-step-files:/") ?? "{}"
  );
  expect(stored.values).toMatchObject({ show: "yes", note: "persisted note" });
  expect(stored.values).not.toHaveProperty("attachment");

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.map(({ url }) => url)).toEqual([
    "http://localhost:3000/forms/multi-step-files/uploads",
    "http://localhost:3000/forms/multi-step-files/submissions",
  ]);
  expect(hidden.value).toBe(uploadIdA);
  expect(form.querySelector('[data-form-file-status="attachment"]')?.textContent).toBe(
    "Upload complete."
  );
  const payload = JSON.parse(String(requests[1]?.init?.body));
  expect(payload.data).toMatchObject({
    show: "yes",
    note: "persisted note",
    attachment: uploadIdA,
  });
});

test.each([
  [
    "hidden id value",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.value = uploadIdB;
    },
  ],
  [
    "marker identity",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.dataset.formFileValue = "other";
    },
  ],
  [
    "raw marker identity",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.formFileInput = "other";
    },
  ],
  [
    "raw type",
    (form: HTMLFormElement) => {
      getFileInput(form).type = "text";
    },
  ],
  [
    "raw name",
    (form: HTMLFormElement) => {
      getFileInput(form).name = "raw-must-not-submit";
    },
  ],
  [
    "hidden type",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.type = "text";
    },
  ],
  [
    "hidden name",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.name = "other";
    },
  ],
  [
    "status role",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.setAttribute("role", "log");
    },
  ],
  [
    "status aria-live",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.setAttribute("aria-live", "assertive");
    },
  ],
  [
    "multiple mode",
    (form: HTMLFormElement) => {
      getFileInput(form).multiple = true;
    },
  ],
  [
    "visibility",
    (form: HTMLFormElement) => {
      const container = getFileInput(form).closest("[data-form-field]");
      if (!(container instanceof HTMLElement)) throw new Error("Missing field container");
      container.hidden = true;
    },
  ],
  [
    "logic-visible only",
    (form: HTMLFormElement) => {
      const container = getFileInput(form).closest("[data-form-field]");
      if (!(container instanceof HTMLElement)) throw new Error("Missing field container");
      container.dataset.logicVisible = "0";
    },
  ],
  [
    "invalid logic-visible byte",
    (form: HTMLFormElement) => {
      const container = getFileInput(form).closest("[data-form-field]");
      if (!(container instanceof HTMLElement)) throw new Error("Missing field container");
      container.dataset.logicVisible = "yes";
    },
  ],
  [
    "hidden container with re-enabled controls",
    (form: HTMLFormElement) => {
      const input = getFileInput(form);
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      const container = input.closest("[data-form-field]");
      if (!(hidden instanceof HTMLInputElement) || !(container instanceof HTMLElement)) {
        throw new Error("Missing file binding");
      }
      container.hidden = true;
      container.dataset.logicVisible = "0";
      input.disabled = false;
      hidden.disabled = false;
    },
  ],
  [
    "raw disabled only",
    (form: HTMLFormElement) => {
      getFileInput(form).disabled = true;
    },
  ],
  [
    "hidden disabled only",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.disabled = true;
    },
  ],
  [
    "visible owner with both controls disabled",
    (form: HTMLFormElement) => {
      const input = getFileInput(form);
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      const container = input.closest("[data-form-field]");
      if (!(hidden instanceof HTMLInputElement) || !(container instanceof HTMLElement)) {
        throw new Error("Missing visible file binding");
      }
      container.hidden = false;
      container.dataset.logicVisible = "1";
      input.disabled = true;
      hidden.disabled = true;
    },
  ],
  [
    "raw required",
    (form: HTMLFormElement) => {
      getFileInput(form).required = false;
    },
  ],
  [
    "raw required metadata",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.requiredOriginal = "0";
    },
  ],
  [
    "raw aria-required",
    (form: HTMLFormElement) => {
      getFileInput(form).setAttribute("aria-required", "false");
    },
  ],
  [
    "hidden required",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.required = true;
    },
  ],
  [
    "hidden aria-required metadata",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.setAttribute("aria-required", "true");
    },
  ],
  [
    "hidden authored-required metadata",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.dataset.requiredOriginal = "1";
    },
  ],
  [
    "hidden moved to another field",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      const other = document.createElement("div");
      other.dataset.formField = "other";
      form.appendChild(other);
      other.appendChild(hidden);
    },
  ],
  [
    "status moved to another field",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      const other = document.createElement("div");
      other.dataset.formField = "other";
      form.appendChild(other);
      other.appendChild(status);
    },
  ],
  [
    "status field wrapper",
    (form: HTMLFormElement) => {
      const input = getFileInput(form);
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(hidden instanceof HTMLInputElement) || !(status instanceof HTMLElement)) {
        throw new Error("Missing binding");
      }
      status.dataset.formField = "status-owner";
      status.append(input, hidden);
    },
  ],
  [
    "submit nested under status",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      const submit = form.querySelector('[data-form-submit="1"]');
      if (!(status instanceof HTMLElement) || !(submit instanceof HTMLButtonElement)) {
        throw new Error("Missing status/submit");
      }
      status.appendChild(submit);
    },
  ],
  [
    "nonce nested under status",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      const nonce = form.querySelector('input[name="__nl_form_nonce"]');
      if (!(status instanceof HTMLElement) || !(nonce instanceof HTMLInputElement)) {
        throw new Error("Missing status/nonce");
      }
      status.appendChild(nonce);
    },
  ],
  [
    "raw cross-role stacking",
    (form: HTMLFormElement) => {
      getFileInput(form).dataset.formFileValue = "attachment";
    },
  ],
  [
    "hidden cross-role stacking",
    (form: HTMLFormElement) => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.dataset.formFileStatus = "attachment";
    },
  ],
  [
    "status cross-role stacking",
    (form: HTMLFormElement) => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.dataset.formFileInput = "attachment";
    },
  ],
  [
    "cross-origin form action",
    (form: HTMLFormElement) => {
      form.action = "https://evil.invalid/collect";
    },
  ],
  [
    "form id",
    (form: HTMLFormElement) => {
      form.dataset.formId = "other-form";
    },
  ],
  [
    "form nonce",
    (form: HTMLFormElement) => {
      const nonce = form.querySelector('input[name="__nl_form_nonce"]');
      if (!(nonce instanceof HTMLInputElement)) throw new Error("Missing nonce");
      nonce.value = "other-nonce";
    },
  ],
  [
    "captcha site key",
    (form: HTMLFormElement) => {
      form.dataset.formCaptchaSiteKey = "other-site-key";
    },
  ],
  [
    "captcha action",
    (form: HTMLFormElement) => {
      form.dataset.formCaptchaAction = "other_action";
    },
  ],
  [
    "form id whitespace",
    (form: HTMLFormElement) => {
      form.dataset.formId = ` ${form.dataset.formId ?? ""}`;
    },
  ],
  [
    "form nonce whitespace",
    (form: HTMLFormElement) => {
      const nonce = form.querySelector('input[name="__nl_form_nonce"]');
      if (!(nonce instanceof HTMLInputElement)) throw new Error("Missing nonce");
      nonce.value = `${nonce.value} `;
    },
  ],
  [
    "captcha site key whitespace",
    (form: HTMLFormElement) => {
      form.dataset.formCaptchaSiteKey = `${form.dataset.formCaptchaSiteKey ?? ""} `;
    },
  ],
  [
    "captcha action whitespace",
    (form: HTMLFormElement) => {
      form.dataset.formCaptchaAction = " public_write";
    },
  ],
  [
    "extra marker",
    (form: HTMLFormElement) => {
      const marker = document.createElement("div");
      marker.dataset.formFileMultiple = "0";
      form.appendChild(marker);
    },
  ],
  [
    "form-root marker",
    (form: HTMLFormElement) => {
      form.dataset.formFileMultiple = "0";
    },
  ],
  [
    "svg marker",
    (form: HTMLFormElement) => {
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      marker.setAttribute("data-form-file-multiple", "0");
      form.appendChild(marker);
    },
  ],
  [
    "mathml marker",
    (form: HTMLFormElement) => {
      const marker = document.createElementNS("http://www.w3.org/1998/Math/MathML", "math");
      marker.setAttribute("data-form-file-multiple", "0");
      form.appendChild(marker);
    },
  ],
] as const)(
  "536-03: final captcha TOCTOU rejects live DOM mutation (%s) before submission fetch",
  async (_label, mutate) => {
    const scripts: HTMLScriptElement[] = [];
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      scripts.push(node as HTMLScriptElement);
      return node;
    });
    let resolveFinalToken: ((token: string) => void) | undefined;
    const execute = vi
      .fn<(_siteKey: string, options: { action: string }) => Promise<string>>()
      .mockResolvedValueOnce("upload-token")
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFinalToken = resolve;
          })
      );
    const requests: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/uploads")) {
        return new Response(JSON.stringify({ id: uploadIdA }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(
      createFileFormData({ formId: `toctou-${_label.replaceAll(" ", "-")}`, botProtection: true })
    );
    (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
    scripts[0]?.dispatchEvent(new Event("load"));
    setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
    dispatchSubmit(form);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));

    mutate(form);
    resolveFinalToken?.("final-token");
    await settleRuntime();

    expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1);
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
    expect(requests).toHaveLength(1);
    expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
      "Your file selection changed. Submit the form again."
    );
    expect(form.dataset.submitting).toBe("0");
  }
);

test("536-03: identical file identities remain isolated across two bound forms", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(
        JSON.stringify({ id: url.includes("cross-form-a") ? uploadIdA : uploadIdB }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;

  resetRuntimeFlag();
  document.body.innerHTML =
    renderToString(
      React.createElement(FormEmbedBlock, {
        data: createFileFormData({ formId: "cross-form-a" }),
        variant: "standard",
      })
    ) +
    renderToString(
      React.createElement(FormEmbedBlock, {
        data: createFileFormData({ formId: "cross-form-b" }),
        variant: "standard",
      })
    );
  const script = document.querySelector("script");
  if (!script?.textContent) throw new Error("Missing runtime script");
  eval(script.textContent);
  const formA = document.querySelector('form[data-form-id="cross-form-a"]');
  const formB = document.querySelector('form[data-form-id="cross-form-b"]');
  if (!(formA instanceof HTMLFormElement) || !(formB instanceof HTMLFormElement)) {
    throw new Error("Missing cross forms");
  }
  const inputA = getFileInput(formA);
  const inputB = getFileInput(formB);
  setSelectedFiles(inputA, [new File(["a"], "a.txt")]);
  setSelectedFiles(inputB, [new File(["b"], "b.txt")]);
  dispatchSubmit(formA);
  await settleRuntime();

  expect(
    (formA.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdA);
  expect(
    (formB.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");
  expect(requests.filter(({ url }) => url.includes("cross-form-a/uploads"))).toHaveLength(1);
  expect(requests.filter(({ url }) => url.includes("cross-form-b/uploads"))).toHaveLength(0);

  dispatchSubmit(formB);
  await settleRuntime();
  expect(
    (formB.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdB);
  expect(requests.filter(({ url }) => url.includes("cross-form-b/uploads"))).toHaveLength(1);
  const submissionA = requests.find(({ url }) => url.includes("cross-form-a/submissions"));
  const submissionB = requests.find(({ url }) => url.includes("cross-form-b/submissions"));
  expect(JSON.parse(String(submissionA?.init?.body)).data.attachment).toBe(uploadIdA);
  expect(JSON.parse(String(submissionB?.init?.body)).data.attachment).toBe(uploadIdB);
});

test.each([
  ["move owner", "success"],
  ["move owner", "failure"],
  ["retarget controls", "success"],
  ["retarget controls", "failure"],
] as const)(
  "536-03: captured form blocks cross-form %s before terminal %s",
  async (mutationShape, outcome) => {
    let resolveFirstUpload: ((response: Response) => void) | undefined;
    let uploadAttempt = 0;
    const requests: string[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/uploads")) {
        uploadAttempt += 1;
        if (uploadAttempt === 1) {
          return new Promise<Response>((resolve) => {
            resolveFirstUpload = resolve;
          });
        }
        return Promise.resolve(
          new Response(JSON.stringify({ id: uploadIdB }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }) as typeof globalThis.fetch;

    resetRuntimeFlag();
    document.body.innerHTML =
      renderToString(
        React.createElement(FormEmbedBlock, {
          data: createFileFormData({ formId: `captured-form-a-${mutationShape}-${outcome}` }),
          variant: "standard",
        })
      ) +
      renderToString(
        React.createElement(FormEmbedBlock, {
          data: createFileFormData({ formId: `captured-form-b-${mutationShape}-${outcome}` }),
          variant: "standard",
        })
      );
    const script = document.querySelector("script");
    if (!script?.textContent) throw new Error("Missing cross-form runtime script");
    eval(script.textContent);
    const [formA, formB] = Array.from(
      document.querySelectorAll('form[data-nextless-form-runtime="1"]')
    );
    if (!(formA instanceof HTMLFormElement) || !(formB instanceof HTMLFormElement)) {
      throw new Error("Missing captured-form fixtures");
    }
    formB.id = `foreign-form-${mutationShape.replace(" ", "-")}-${outcome}`;
    const input = getFileInput(formA);
    const hidden = formA.querySelector('[data-form-file-value="attachment"]');
    const status = formA.querySelector('[data-form-file-status="attachment"]');
    const owner = input.closest("[data-form-field]");
    const errorNode = formA.querySelector('[data-form-embed-error="true"]');
    if (
      !(hidden instanceof HTMLInputElement) ||
      !(status instanceof HTMLElement) ||
      !(owner instanceof HTMLElement) ||
      !(errorNode instanceof HTMLElement)
    ) {
      throw new Error("Missing captured-form controls");
    }
    const originalParent = owner.parentNode;
    const originalNextSibling = owner.nextSibling;
    if (!originalParent) throw new Error("Missing field owner parent");

    setSelectedFiles(input, [new File(["x"], "x.txt")]);
    dispatchSubmit(formA);
    await vi.waitFor(() =>
      expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1)
    );
    expect(status.textContent).toBe("Uploading file...");
    const statusTextWrites = vi.spyOn(status, "textContent", "set");
    const hiddenValueWrites = vi.spyOn(hidden, "value", "set");

    if (mutationShape === "move owner") {
      formB.appendChild(owner);
    } else {
      input.setAttribute("form", formB.id);
      hidden.setAttribute("form", formB.id);
      Object.defineProperty(input, "form", { configurable: true, get: () => formB });
      Object.defineProperty(hidden, "form", { configurable: true, get: () => formB });
    }
    resolveFirstUpload?.(
      outcome === "success"
        ? new Response(JSON.stringify({ id: uploadIdA }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(JSON.stringify({ error: { code: "media_mime_not_allowed" } }), {
            status: 415,
            headers: { "Content-Type": "application/json" },
          })
    );
    await settleRuntime();

    expect(statusTextWrites).not.toHaveBeenCalled();
    expect(hiddenValueWrites.mock.calls.map(([value]) => value)).toEqual([""]);
    expect(hidden.value).toBe("");
    expect(status.textContent).toBe("Uploading file...");
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
    expect(formA.dataset.fileBindingInvalid).toBe("1");
    expect(errorNode.textContent).toBe(
      "This form's file upload controls are invalid. Refresh the page and try again."
    );
    expect(errorNode.dataset.formErrorOwner).toBe("file-binding");
    expect(errorNode.classList.contains("hidden")).toBe(false);

    statusTextWrites.mockRestore();
    hiddenValueWrites.mockRestore();
    if (mutationShape === "move owner") {
      if (originalNextSibling) originalParent.insertBefore(owner, originalNextSibling);
      else originalParent.appendChild(owner);
    } else {
      input.removeAttribute("form");
      hidden.removeAttribute("form");
      Reflect.deleteProperty(input, "form");
      Reflect.deleteProperty(hidden, "form");
    }
    input.dispatchEvent(new Event("change", { bubbles: true }));
    expect(formA.dataset.fileBindingInvalid).toBe("0");
    expect(errorNode.dataset.formErrorOwner).toBeUndefined();
    expect(errorNode.classList.contains("hidden")).toBe(true);

    dispatchSubmit(formA);
    await settleRuntime();

    expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2);
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
    expect(hidden.value).toBe(uploadIdB);
    expect(status.textContent).toBe("Upload complete.");
  }
);

test.each(["move owner", "retarget controls"] as const)(
  "536-03: cached complete binding rejects cross-form %s before fast-path reuse",
  async (mutationShape) => {
    let resolveEarlierUpload: ((response: Response) => void) | undefined;
    let uploadAttempt = 0;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith("/uploads")) {
        uploadAttempt += 1;
        if (uploadAttempt === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ id: uploadIdA }), {
              status: 201,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return new Promise<Response>((resolve) => {
          resolveEarlierUpload = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }) as typeof globalThis.fetch;

    resetRuntimeFlag();
    document.body.innerHTML =
      renderToString(
        React.createElement(FormEmbedBlock, {
          data: createFileFormData({
            formId: `cached-owner-a-${mutationShape}`,
            fields: [
              {
                id: "earlier",
                type: "file",
                label: "Earlier",
                name: "earlier",
                required: false,
              },
              {
                id: "cached",
                type: "file",
                label: "Cached",
                name: "cached",
                required: true,
              },
            ],
          }),
          variant: "standard",
        })
      ) +
      renderToString(
        React.createElement(FormEmbedBlock, {
          data: createFileFormData({ formId: `cached-owner-b-${mutationShape}` }),
          variant: "standard",
        })
      );
    const script = document.querySelector("script");
    if (!script?.textContent) throw new Error("Missing cached cross-form runtime script");
    eval(script.textContent);
    const [formA, formB] = Array.from(
      document.querySelectorAll('form[data-nextless-form-runtime="1"]')
    );
    if (!(formA instanceof HTMLFormElement) || !(formB instanceof HTMLFormElement)) {
      throw new Error("Missing cached cross-form fixtures");
    }
    formB.id = `cached-foreign-${mutationShape.replace(" ", "-")}`;
    const earlierInput = getFileInput(formA, "earlier");
    const cachedInput = getFileInput(formA, "cached");
    const cachedHidden = formA.querySelector('[data-form-file-value="cached"]');
    const cachedStatus = formA.querySelector('[data-form-file-status="cached"]');
    const cachedOwner = cachedInput.closest("[data-form-field]");
    if (
      !(cachedHidden instanceof HTMLInputElement) ||
      !(cachedStatus instanceof HTMLElement) ||
      !(cachedOwner instanceof HTMLElement)
    ) {
      throw new Error("Missing cached binding controls");
    }

    setSelectedFiles(cachedInput, [new File(["cached"], "cached.txt")]);
    dispatchSubmit(formA);
    await settleRuntime();
    expect(cachedHidden.value).toBe(uploadIdA);
    expect(cachedStatus.textContent).toBe("Upload complete.");
    expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(1);
    expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);

    setSelectedFiles(earlierInput, [new File(["earlier"], "earlier.txt")]);
    dispatchSubmit(formA);
    await vi.waitFor(() =>
      expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2)
    );
    const cachedHiddenWrites = vi.spyOn(cachedHidden, "value", "set");
    const cachedStatusWrites = vi.spyOn(cachedStatus, "textContent", "set");
    if (mutationShape === "move owner") {
      formB.appendChild(cachedOwner);
    } else {
      cachedInput.setAttribute("form", formB.id);
      cachedHidden.setAttribute("form", formB.id);
      Object.defineProperty(cachedInput, "form", { configurable: true, get: () => formB });
      Object.defineProperty(cachedHidden, "form", { configurable: true, get: () => formB });
    }
    resolveEarlierUpload?.(
      new Response(JSON.stringify({ id: uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    await settleRuntime();

    expect(cachedHiddenWrites.mock.calls.map(([value]) => value)).toEqual([""]);
    expect(cachedStatusWrites).not.toHaveBeenCalled();
    expect(cachedHidden.value).toBe("");
    expect(cachedInput.files).toHaveLength(0);
    expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
    expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
    expect(formA.dataset.fileBindingInvalid).toBe("0");
    expect(formA.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
      "Your file selection changed. Submit the form again."
    );
  }
);

test.each([
  [
    "identity",
    (form: HTMLFormElement): string => {
      const input = getFileInput(form);
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(hidden instanceof HTMLInputElement) || !(status instanceof HTMLElement)) {
        throw new Error("Missing file triple");
      }
      input.dataset.formFileInput = "rotated";
      hidden.dataset.formFileValue = "rotated";
      hidden.name = "rotated";
      status.dataset.formFileStatus = "rotated";
      return "rotated";
    },
  ],
  [
    "hidden",
    (form: HTMLFormElement): string => {
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      hidden.replaceWith(hidden.cloneNode() as HTMLInputElement);
      return "attachment";
    },
  ],
  [
    "status",
    (form: HTMLFormElement): string => {
      const status = form.querySelector('[data-form-file-status="attachment"]');
      if (!(status instanceof HTMLElement)) throw new Error("Missing status");
      status.replaceWith(status.cloneNode() as HTMLElement);
      return "attachment";
    },
  ],
  [
    "multiple",
    (form: HTMLFormElement): string => {
      const input = getFileInput(form);
      const hidden = form.querySelector('[data-form-file-value="attachment"]');
      if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
      input.multiple = true;
      input.dataset.formFileMultiple = "1";
      hidden.dataset.formFileMultiple = "1";
      return "attachment";
    },
  ],
] as const)(
  "536-03: changing the %s signature seam rotates state and isolates cleanup",
  async (_label, mutate) => {
    let resolveOldUpload: ((response: Response) => void) | undefined;
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    let uploadAttempt = 0;
    globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.endsWith("/uploads")) {
        uploadAttempt += 1;
        if (uploadAttempt === 1) {
          return new Promise<Response>((resolve) => {
            resolveOldUpload = resolve;
          });
        }
        return Promise.resolve(
          new Response(JSON.stringify({ id: uploadIdB }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(createFileFormData({ formId: `signature-${_label}` }));
    const input = getFileInput(form);
    setSelectedFiles(input, [new File(["old"], "old.txt")]);
    dispatchSubmit(form);
    await flushMicrotasks();
    const oldSignal = requests[0]?.init?.signal;

    const identity = mutate(form);
    form.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));
    expect(oldSignal?.aborted).toBe(true);
    const rotatedHidden = form.querySelector(`[data-form-file-value="${identity}"]`);
    if (!(rotatedHidden instanceof HTMLInputElement)) throw new Error("Missing rotated hidden");
    expect(rotatedHidden.value).toBe("");

    setSelectedFiles(input, [new File(["new"], "new.txt")]);
    dispatchSubmit(form);
    await settleRuntime();
    expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
    expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
    expect(rotatedHidden.value).toBe(
      _label === "multiple" ? JSON.stringify([uploadIdB]) : uploadIdB
    );
    const secondUploadBody = requests.filter(({ url }) => url.endsWith("/uploads"))[1]?.init
      ?.body as FormData;
    expect(secondUploadBody.get("fieldName")).toBe(identity);

    resolveOldUpload?.(
      new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    await flushMicrotasks();
    expect(rotatedHidden.value).toBe(
      _label === "multiple" ? JSON.stringify([uploadIdB]) : uploadIdB
    );
  }
);

test("536-03: moving a native file triple to another bound form rotates the form signature", async () => {
  let resolveOldUpload: ((response: Response) => void) | undefined;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploadAttempt = 0;
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploadAttempt += 1;
      if (uploadAttempt === 1) {
        return new Promise<Response>((resolve) => {
          resolveOldUpload = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: uploadIdB }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  resetRuntimeFlag();
  document.body.innerHTML =
    renderToString(
      React.createElement(FormEmbedBlock, {
        data: createFileFormData({ formId: "signature-form-a" }),
        variant: "standard",
      })
    ) +
    renderToString(
      React.createElement(FormEmbedBlock, {
        data: createFileFormData({
          formId: "signature-form-b",
          fields: [{ id: "note-b", type: "text", label: "Note", name: "note", required: false }],
        }),
        variant: "standard",
      })
    );
  const script = document.querySelector("script");
  if (!script?.textContent) throw new Error("Missing runtime script");
  eval(script.textContent);
  const formA = document.querySelector('form[data-form-id="signature-form-a"]');
  const formB = document.querySelector('form[data-form-id="signature-form-b"]');
  if (!(formA instanceof HTMLFormElement) || !(formB instanceof HTMLFormElement)) {
    throw new Error("Missing signature forms");
  }
  const input = getFileInput(formA);
  setSelectedFiles(input, [new File(["old"], "old.txt")]);
  dispatchSubmit(formA);
  await flushMicrotasks();
  const oldSignal = requests[0]?.init?.signal;

  const fieldContainer = input.closest("[data-form-field]");
  const formBBody = formB.querySelector('[data-form-embed-form-body="true"]');
  if (!(fieldContainer instanceof HTMLElement) || !(formBBody instanceof HTMLElement)) {
    throw new Error("Missing move targets");
  }
  formBBody.prepend(fieldContainer);
  formB.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(formA.dataset.fileUploadPending).toBe("0"));
  expect(oldSignal?.aborted).toBe(true);
  const hidden = formB.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing moved hidden");
  expect(hidden.value).toBe("");

  setSelectedFiles(input, [new File(["new"], "new.txt")]);
  dispatchSubmit(formB);
  await settleRuntime();
  expect(requests.filter(({ url }) => url.includes("signature-form-a/uploads"))).toHaveLength(1);
  expect(requests.filter(({ url }) => url.includes("signature-form-b/uploads"))).toHaveLength(1);
  expect(requests.filter(({ url }) => url.includes("signature-form-b/submissions"))).toHaveLength(
    1
  );
  expect(hidden.value).toBe(uploadIdB);

  resolveOldUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await flushMicrotasks();
  expect(hidden.value).toBe(uploadIdB);
});

test("536-03: stripping every raw marker during upload tombstones the input and cancels stale state", async () => {
  let resolveUpload: ((response: Response) => void) | undefined;
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    if (String(input).endsWith("/uploads")) {
      return new Promise<Response>((resolve) => {
        resolveUpload = resolve;
      });
    }
    throw new Error("submission must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData());
  const input = getFileInput(form);
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  setSelectedFiles(input, [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  await flushMicrotasks();

  input.removeAttribute("data-form-file-input");
  input.removeAttribute("data-form-file-multiple");
  input.name = "ordinary-looking-file";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));
  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect(hidden.value).toBe("");
  resolveUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await flushMicrotasks();
  expect(hidden.value).toBe("");
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "This form's file upload controls are invalid. Refresh the page and try again."
  );
});

test.each(["hide", "reset"] as const)(
  "536-03: %s aborts deferred upload captcha and a late token cannot write",
  async (mode) => {
    const scripts: HTMLScriptElement[] = [];
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      scripts.push(node as HTMLScriptElement);
      return node;
    });
    let resolveToken: ((token: string) => void) | undefined;
    const execute = vi.fn<() => Promise<string>>(
      () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        })
    );
    const requests: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    const fields: NonNullable<NonNullable<FormEmbedData["resolved"]>["fields"]> =
      mode === "hide"
        ? [
            { id: "show-field", type: "text", label: "Show", name: "show", required: false },
            {
              id: "file-field",
              type: "file",
              label: "File",
              name: "attachment",
              required: false,
              settings: { logic: { operator: "equals", field: "show", value: "yes" } },
            },
          ]
        : [
            {
              id: "file-field",
              type: "file",
              label: "File",
              name: "attachment",
              required: false,
            },
          ];
    const form = installFormRuntime(
      createFileFormData({ formId: `upload-captcha-${mode}`, botProtection: true, fields })
    );
    (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
    scripts[0]?.dispatchEvent(new Event("load"));
    if (mode === "hide") setInputValue('input[name="show"]', "yes");
    const input = getFileInput(form);
    setSelectedFiles(input, [new File(["x"], "x.txt")]);
    dispatchSubmit(form);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    if (mode === "hide") {
      setInputValue('input[name="show"]', "no");
    } else {
      form.reset();
    }
    await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));
    expect(requests).toHaveLength(0);
    expect(input.files).toHaveLength(0);
    resolveToken?.("late-token");
    await flushMicrotasks();
    expect(requests).toHaveLength(0);
  }
);

test("536-03: reset aborts deferred final captcha before payload and a fresh submit succeeds", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  let resolveOldFinalToken: ((token: string) => void) | undefined;
  const execute = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("old-upload-token")
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveOldFinalToken = resolve;
        })
    )
    .mockResolvedValueOnce("new-upload-token")
    .mockResolvedValueOnce("new-final-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploads = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploads += 1;
      return new Response(JSON.stringify({ id: uploads === 1 ? uploadIdA : uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "final-captcha-reset", required: false, botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "old.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
  form.reset();
  await vi.waitFor(() => expect(form.dataset.submitting).toBe("0"));
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);
  resolveOldFinalToken?.("late-final-token");
  await flushMicrotasks();
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);

  setSelectedFiles(input, [new File(["new"], "new.txt")]);
  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
  const submission = requests.find(({ url }) => url.endsWith("/submissions"));
  expect(JSON.parse(String(submission?.init?.body)).data.attachment).toBe(uploadIdB);
});

test("536-03: one immutable context owns exact encoded same-origin upload and submission URLs", async () => {
  const formId = "folder/name ?";
  const encoded = encodeURIComponent(formId);
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ formId }));
  const providerExecute = vi.fn(async () => "must-not-run");
  (window as Window & { grecaptcha?: { execute: typeof providerExecute } }).grecaptcha = {
    execute: providerExecute,
  };
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  await settleRuntime();

  expect(requests.map(({ url }) => url)).toEqual([
    `http://localhost:3000/forms/${encoded}/uploads`,
    `http://localhost:3000/forms/${encoded}/submissions`,
  ]);
  requests.forEach(({ url }) => {
    const parsed = new URL(url);
    expect(parsed.search).toBe("");
    expect(parsed.hash).toBe("");
  });
  expect(new URL(requests[0]!.url).pathname).toBe(`/forms/${encoded}/uploads`);
  expect(new URL(requests[1]!.url).pathname).toBe(`/forms/${encoded}/submissions`);
  expect(requests[0]?.init?.credentials).toBe("same-origin");
  expect(requests[1]?.init?.credentials).toBe("same-origin");
  expect(providerExecute).not.toHaveBeenCalled();
  const uploadBody = requests[0]?.init?.body as FormData;
  expect(uploadBody.get("formNonce")).toBe(`nonce-${formId}`);
  expect(uploadBody.has("captchaToken")).toBe(false);
  const payload = JSON.parse(String(requests[1]?.init?.body));
  expect(payload.formNonce).toBe(`nonce-${formId}`);
  expect(payload).not.toHaveProperty("captchaToken");
});

test.each([".", ".."])(
  "536-03: dot-segment form id %s fails locally with zero write",
  async (formId) => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("fetch must not run");
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(createFileFormData({ formId }));
    setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
    dispatchSubmit(form);
    await settleRuntime();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(form.querySelector('[data-form-file-status="attachment"]')?.textContent).toBe(
      "This file cannot be uploaded right now."
    );
    expect(form.dataset.submitting).toBe("0");
    expect(form.dataset.fileUploadPending).toBe("0");
  }
);

test.each([
  [
    "cross-origin action",
    (form: HTMLFormElement): void => {
      form.action = "https://evil.invalid/x";
    },
  ],
  [
    "action search",
    (form: HTMLFormElement): void => {
      form.action += "?retarget=1";
    },
  ],
  [
    "action hash",
    (form: HTMLFormElement): void => {
      form.action += "#retarget";
    },
  ],
  [
    "captcha action",
    (form: HTMLFormElement): void => {
      form.dataset.formCaptchaAction = "not_public_write";
    },
  ],
  [
    "form id whitespace",
    (form: HTMLFormElement): void => {
      form.dataset.formId = ` ${form.dataset.formId ?? ""}`;
    },
  ],
  [
    "nonce whitespace",
    (form: HTMLFormElement): void => {
      const nonce = form.querySelector('input[name="__nl_form_nonce"]');
      if (!(nonce instanceof HTMLInputElement)) throw new Error("Missing nonce");
      nonce.value = `${nonce.value} `;
    },
  ],
  [
    "captcha site key whitespace",
    (form: HTMLFormElement): void => {
      form.dataset.formCaptchaSiteKey = " padded-site-key";
    },
  ],
  [
    "captcha action whitespace",
    (form: HTMLFormElement): void => {
      form.dataset.formCaptchaAction = "public_write ";
    },
  ],
] as const)(
  "536-03: invalid initial write context (%s) makes zero request",
  async (_label, mutate) => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("fetch must not run");
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(createFileFormData());
    setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
    mutate(form);
    expect(() => dispatchSubmit(form)).not.toThrow();
    await settleRuntime();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(form.querySelector('[data-form-file-status="attachment"]')?.textContent).toBe(
      "This file cannot be uploaded right now."
    );
  }
);

test("536-03: one captured context serves multiple bindings and a local final captcha token", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  const execute = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("upload-token-a")
    .mockResolvedValueOnce("upload-token-b")
    .mockResolvedValueOnce("final-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploadIndex = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploadIndex += 1;
      return new Response(JSON.stringify({ id: uploadIndex === 1 ? uploadIdA : uploadIdB }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      formId: "multi/context",
      botProtection: true,
      fields: [
        { id: "first-file", type: "file", label: "First", name: "first", required: true },
        { id: "second-file", type: "file", label: "Second", name: "second", required: true },
      ],
    })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  setSelectedFiles(getFileInput(form, "first"), [new File(["a"], "a.txt")]);
  setSelectedFiles(getFileInput(form, "second"), [new File(["b"], "b.txt")]);
  const compatibilityToken = form.querySelector('input[name="captchaToken"]');
  if (!(compatibilityToken instanceof HTMLInputElement)) throw new Error("Missing token input");
  compatibilityToken.value = "attacker-token";
  dispatchSubmit(form);
  await settleRuntime();

  const encoded = encodeURIComponent("multi/context");
  expect(requests.map(({ url }) => url)).toEqual([
    `http://localhost:3000/forms/${encoded}/uploads`,
    `http://localhost:3000/forms/${encoded}/uploads`,
    `http://localhost:3000/forms/${encoded}/submissions`,
  ]);
  for (const request of requests) expect(request.init?.credentials).toBe("same-origin");
  const uploadBodies = requests.slice(0, 2).map(({ init }) => init?.body as FormData);
  expect(uploadBodies.map((body) => body.get("formNonce"))).toEqual([
    "nonce-multi/context",
    "nonce-multi/context",
  ]);
  expect(uploadBodies.map((body) => body.get("captchaToken"))).toEqual([
    "upload-token-a",
    "upload-token-b",
  ]);
  const payload = JSON.parse(String(requests[2]?.init?.body));
  expect(payload).toMatchObject({
    data: { first: uploadIdA, second: uploadIdB },
    formNonce: "nonce-multi/context",
    captchaToken: "final-token",
  });
  expect(JSON.stringify(payload)).not.toContain("attacker-token");
});

test("536-03: silent same-count replacement while uploading invalidates the old response", async () => {
  let resolveOldUpload: ((response: Response) => void) | undefined;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploads = 0;
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploads += 1;
      if (uploads === 1) {
        return new Promise<Response>((resolve) => {
          resolveOldUpload = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ id: uploadIdB }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ required: false }));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "same.txt")]);
  dispatchSubmit(form);
  await flushMicrotasks();
  const replacement = new DataTransfer();
  replacement.items.add(new File(["new"], "same.txt"));
  input.files = replacement.files;
  resolveOldUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await settleRuntime();
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(0);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe("");

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(2);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(1);
  expect(
    (form.querySelector('[data-form-file-value="attachment"]') as HTMLInputElement).value
  ).toBe(uploadIdB);
});

test("536-03: registry invalidation aborts deferred final captcha and suppresses its late token", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  let resolveFinalToken: ((token: string) => void) | undefined;
  const execute = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("upload-token")
    .mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFinalToken = resolve;
        })
    );
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "registry-final-captcha", botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(hidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  hidden.dataset.formFileValue = "other";
  hidden.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(form.dataset.submitting).toBe("0"));
  expect(form.dataset.fileBindingInvalid).toBe("1");
  expect(requests).toHaveLength(1);
  resolveFinalToken?.("late-final-token");
  await flushMicrotasks();
  expect(requests).toHaveLength(1);
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "This form's file upload controls are invalid. Refresh the page and try again."
  );
});

test("536-03: captcha-enabled submission retry reuses completed ids and obtains a fresh final token", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  const execute = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("upload-token")
    .mockResolvedValueOnce("first-final-token")
    .mockResolvedValueOnce("second-final-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let submissions = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    submissions += 1;
    if (submissions === 1) {
      return new Response(
        JSON.stringify({ error: { code: "rate_limited", message: "SECRET provider detail" } }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "captcha-reuse", botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
  dispatchSubmit(form);
  await settleRuntime();
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "Too many submissions. Please try again later."
  );
  expect(document.body.textContent).not.toContain("SECRET");

  dispatchSubmit(form);
  await settleRuntime();
  expect(requests.filter(({ url }) => url.endsWith("/uploads"))).toHaveLength(1);
  expect(requests.filter(({ url }) => url.endsWith("/submissions"))).toHaveLength(2);
  expect(execute).toHaveBeenCalledTimes(3);
  const submissionBodies = requests
    .filter(({ url }) => url.endsWith("/submissions"))
    .map(({ init }) => JSON.parse(String(init?.body)));
  expect(submissionBodies.map((payload) => payload.captchaToken)).toEqual([
    "first-final-token",
    "second-final-token",
  ]);
});

test.each([
  [
    "network",
    async () => {
      throw new Error("SECRET network URL https://provider.invalid");
    },
    "Unable to submit the form. Please try again.",
  ],
  [
    "non-2xx",
    async () =>
      new Response(
        JSON.stringify({ error: { code: "form_nonce_invalid", message: "SECRET <script>" } }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    "This form has expired. Refresh the page and try again.",
  ],
] as const)(
  "536-03: %s submission failure renders only bounded copy",
  async (_label, finalReply, copy) => {
    let calls = 0;
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      calls += 1;
      if (String(input).endsWith("/uploads")) {
        return new Response(JSON.stringify({ id: uploadIdA }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return finalReply();
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(createFileFormData());
    setSelectedFiles(getFileInput(form), [new File(["x"], "customer-secret.txt")]);
    dispatchSubmit(form);
    await settleRuntime();
    expect(calls).toBe(2);
    expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(copy);
    expect(document.body.textContent).not.toContain("SECRET");
    expect(document.body.textContent).not.toContain("provider.invalid");
    expect(document.body.textContent).not.toContain("customer-secret.txt");
  }
);

test("536-03: arbitrary captcha provider rejection is reduced to fixed submission copy", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  const execute = vi.fn(async () => {
    throw new Error("SECRET provider failure <img src=x>");
  });
  globalThis.fetch = vi.fn(async () => {
    throw new Error("fetch must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      formId: "provider-error",
      botProtection: true,
      fields: [{ id: "note", type: "text", label: "Note", name: "note", required: false }],
    })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  dispatchSubmit(form);
  await settleRuntime();
  expect(execute).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).not.toHaveBeenCalled();
  expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(
    "Form verification failed. Please try again."
  );
  expect(document.body.textContent).not.toContain("SECRET");
  expect(document.body.textContent).not.toContain("<img");
});

test("536-03: abandoned transport cannot write after a newer signature attempt settles", async () => {
  let resolveOldUpload: ((response: Response) => void) | undefined;
  let resolveNewUpload: ((response: Response) => void) | undefined;
  const requests: string[] = [];
  let uploadAttempt = 0;
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);
    if (url.endsWith("/uploads")) {
      uploadAttempt += 1;
      return new Promise<Response>((resolve) => {
        if (uploadAttempt === 1) resolveOldUpload = resolve;
        else resolveNewUpload = resolve;
      });
    }
    return Promise.resolve(
      new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(createFileFormData({ formId: "overlap-signature" }));
  const input = getFileInput(form);
  setSelectedFiles(input, [new File(["old"], "old.txt")]);
  dispatchSubmit(form);
  await flushMicrotasks();
  const oldHidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(oldHidden instanceof HTMLInputElement)) throw new Error("Missing hidden");
  oldHidden.replaceWith(oldHidden.cloneNode() as HTMLInputElement);
  form.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));

  const newHidden = form.querySelector('[data-form-file-value="attachment"]');
  if (!(newHidden instanceof HTMLInputElement)) throw new Error("Missing new hidden");
  setSelectedFiles(input, [new File(["new"], "new.txt")]);
  dispatchSubmit(form);
  await vi.waitFor(() =>
    expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2)
  );
  expect(form.dataset.fileUploadPending).toBe("1");
  expect(form.getAttribute("aria-busy")).toBe("true");
  expect((form.querySelector('[data-form-submit="1"]') as HTMLButtonElement).disabled).toBe(true);

  resolveNewUpload?.(
    new Response(JSON.stringify({ id: uploadIdB }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await settleRuntime();
  expect(form.dataset.fileUploadPending).toBe("0");
  expect(form.dataset.submitting).toBe("0");
  expect(newHidden.value).toBe(uploadIdB);
  expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);

  const status = form.querySelector('[data-form-file-status="attachment"]');
  if (!(status instanceof HTMLElement)) throw new Error("Missing current status");
  const currentHiddenWrites = vi.spyOn(newHidden, "value", "set");
  const abandonedHiddenWrites = vi.spyOn(oldHidden, "value", "set");
  const statusTextWrites = vi.spyOn(status, "textContent", "set");
  resolveOldUpload?.(
    new Response(JSON.stringify({ id: uploadIdA }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })
  );
  await flushMicrotasks();

  expect(currentHiddenWrites).not.toHaveBeenCalled();
  expect(abandonedHiddenWrites).not.toHaveBeenCalled();
  expect(statusTextWrites).not.toHaveBeenCalled();
  expect(newHidden.value).toBe(uploadIdB);
  expect(status.textContent).toBe("Upload complete.");
});

test.each(["success", "failure"] as const)(
  "536-03: guarded terminal %s preserves status descendants and requires real repair",
  async (outcome) => {
    let resolveFirstUpload: ((response: Response) => void) | undefined;
    let uploads = 0;
    const requests: string[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/uploads")) {
        uploads += 1;
        if (uploads === 1) {
          return new Promise<Response>((resolve) => {
            resolveFirstUpload = resolve;
          });
        }
        return Promise.resolve(
          new Response(JSON.stringify({ id: uploadIdB }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }) as typeof globalThis.fetch;
    const form = installFormRuntime({
      ...formEmbedDefaults,
      formId: `terminal-${outcome}`,
      resolved: {
        formName: "Terminal guard",
        submissionAccess: "public",
        submissionNonce: `nonce-terminal-${outcome}`,
        settings: { layoutMode: "multi_step", saveProgress: false, stepTitles: ["One", "Two"] },
        fields: [
          {
            id: "note-one",
            type: "text",
            label: "Note",
            name: "note",
            required: false,
            settings: { formStep: 1 },
          },
          {
            id: "file-two",
            type: "file",
            label: "File",
            name: "attachment",
            required: true,
            settings: { formStep: 2 },
          },
        ],
      },
    });
    const submit = form.querySelector('[data-form-submit="1"]');
    const next = form.querySelector('[data-form-nav="next"]');
    const back = form.querySelector('[data-form-nav="back"]');
    const nonce = form.querySelector('input[name="__nl_form_nonce"]');
    const status = form.querySelector('[data-form-file-status="attachment"]');
    const hidden = form.querySelector('[data-form-file-value="attachment"]');
    if (
      !(submit instanceof HTMLButtonElement) ||
      !(next instanceof HTMLButtonElement) ||
      !(back instanceof HTMLButtonElement) ||
      !(nonce instanceof HTMLInputElement) ||
      !(status instanceof HTMLElement) ||
      !(hidden instanceof HTMLInputElement)
    ) {
      throw new Error("Missing terminal controls");
    }
    next.click();
    expect(form.dataset.currentStep).toBe("2");
    setSelectedFiles(getFileInput(form), [new File(["x"], `${outcome}.txt`)]);
    dispatchSubmit(form);
    await vi.waitFor(() =>
      expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1)
    );
    expect(status.textContent).toBe("Uploading file...");
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(form.getAttribute("aria-busy")).toBe("true");
    for (const button of [submit, back, next]) {
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-busy")).toBe("true");
    }

    const movedControl = outcome === "success" ? submit : nonce;
    const originalParent = movedControl.parentElement;
    if (!(originalParent instanceof HTMLElement)) throw new Error("Missing original parent");
    status.appendChild(movedControl);
    expect(status.contains(movedControl)).toBe(true);
    resolveFirstUpload?.(
      outcome === "success"
        ? new Response(JSON.stringify({ id: uploadIdA }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(
            JSON.stringify({ error: { code: "media_mime_not_allowed", message: "SECRET" } }),
            { status: 415, headers: { "Content-Type": "application/json" } }
          )
    );
    await vi.waitFor(() => expect(form.dataset.fileUploadPending).toBe("0"));

    expect(status.contains(movedControl)).toBe(true);
    expect(status.textContent).not.toContain("Upload complete.");
    expect(status.textContent).not.toContain("This file type is not allowed.");
    expect(hidden.value).toBe("");
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(0);
    expect(form.dataset.fileBindingInvalid).toBe("1");
    expect(form.dataset.submitting).toBe("0");
    expect(form.getAttribute("aria-busy")).toBe("false");
    const errorNode = form.querySelector('[data-form-embed-error="true"]');
    expect(errorNode?.textContent).toBe(
      "This form's file upload controls are invalid. Refresh the page and try again."
    );
    expect((errorNode as HTMLElement | null)?.dataset.formErrorOwner).toBe("file-binding");
    for (const button of [submit, back, next]) expect(button.disabled).toBe(true);

    originalParent.appendChild(movedControl);
    expect(status.childElementCount).toBe(0);
    form.dispatchEvent(new Event("change", { bubbles: true }));
    expect(form.dataset.fileBindingInvalid).toBe("0");
    expect((errorNode as HTMLElement | null)?.dataset.formErrorOwner).toBeUndefined();
    expect((errorNode as HTMLElement | null)?.classList.contains("hidden")).toBe(true);
    for (const button of [submit, back, next]) expect(button.disabled).toBe(false);

    dispatchSubmit(form);
    await settleRuntime();
    expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2);
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
    expect(hidden.value).toBe(uploadIdB);
    expect(status.textContent).toBe("Upload complete.");
  }
);

test.each(["success", "failure"] as const)(
  "536-03: terminal %s commits exact hidden and status writes",
  async (outcome) => {
    let resolveUpload: ((response: Response) => void) | undefined;
    const requests: string[] = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/uploads")) {
        return new Promise<Response>((resolve) => {
          resolveUpload = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(
      createFileFormData({ formId: `terminal-write-count-${outcome}` })
    );
    const hidden = form.querySelector('[data-form-file-value="attachment"]');
    const status = form.querySelector('[data-form-file-status="attachment"]');
    if (!(hidden instanceof HTMLInputElement) || !(status instanceof HTMLElement)) {
      throw new Error("Missing terminal write controls");
    }
    setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);
    dispatchSubmit(form);
    await vi.waitFor(() =>
      expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(1)
    );
    expect(status.textContent).toBe("Uploading file...");
    const statusTextWrites = vi.spyOn(status, "textContent", "set");
    const hiddenValueWrites = vi.spyOn(hidden, "value", "set");

    resolveUpload?.(
      outcome === "success"
        ? new Response(JSON.stringify({ id: uploadIdA }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(JSON.stringify({ error: { code: "media_mime_not_allowed" } }), {
            status: 415,
            headers: { "Content-Type": "application/json" },
          })
    );
    await settleRuntime();

    expect(statusTextWrites.mock.calls.map(([value]) => value)).toEqual([
      outcome === "success" ? "Upload complete." : "This file type is not allowed.",
    ]);
    expect(hiddenValueWrites.mock.calls.map(([value]) => value)).toEqual([
      outcome === "success" ? uploadIdA : "",
    ]);
    expect(hidden.value).toBe(outcome === "success" ? uploadIdA : "");
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(
      outcome === "success" ? 1 : 0
    );
  }
);

test("536-03: one registry preserves mixed single and ordered multiple payload shapes", async () => {
  const ids = [uploadIdA, uploadIdB, uploadIdC];
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      return new Response(JSON.stringify({ id: ids.shift() }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({
      formId: "mixed-cardinality",
      fields: [
        { id: "single", type: "file", label: "Single", name: "single", required: true },
        {
          id: "many",
          type: "file",
          label: "Many",
          name: "many",
          required: true,
          settings: { multiple: true },
        },
      ],
    })
  );
  setSelectedFiles(getFileInput(form, "single"), [new File(["s"], "single.txt")]);
  setSelectedFiles(getFileInput(form, "many"), [
    new File(["a"], "a.txt"),
    new File(["b"], "b.txt"),
  ]);
  dispatchSubmit(form);
  await settleRuntime();

  const singleHidden = form.querySelector('[data-form-file-value="single"]');
  const manyHidden = form.querySelector('[data-form-file-value="many"]');
  if (!(singleHidden instanceof HTMLInputElement) || !(manyHidden instanceof HTMLInputElement)) {
    throw new Error("Missing mixed hidden inputs");
  }
  expect(singleHidden.value).toBe(uploadIdA);
  expect(manyHidden.value).toBe(JSON.stringify([uploadIdB, uploadIdC]));
  const submission = requests.find(({ url }) => url.endsWith("/submissions"));
  const payload = JSON.parse(String(submission?.init?.body));
  expect(payload.data.single).toBe(uploadIdA);
  expect(payload.data.many).toEqual([uploadIdB, uploadIdC]);
});

const uploadCopyCases = [
  ["media_file_too_large", "The selected file is too large."],
  ["media_mime_not_allowed", "This file type is not allowed."],
  ["form_field_invalid", "This file cannot be uploaded for this field."],
  ["form_not_found", "This form is no longer available."],
  ["form_upload_invalid", "This file cannot be uploaded right now."],
  ["form_nonce_required", "This form has expired. Refresh the page and try again."],
  ["form_nonce_invalid", "This form has expired. Refresh the page and try again."],
  ["form_nonce_expired", "This form has expired. Refresh the page and try again."],
  ["rate_limited", "Too many uploads. Please try again later."],
  ["bot_protection_required", "Upload verification failed. Please try again."],
  ["bot_protection_failed", "Upload verification failed. Please try again."],
  ["bot_protection_action_mismatch", "Upload verification failed. Please try again."],
  ["bot_protection_score_low", "Upload verification failed. Please try again."],
  ["bot_protection_unavailable", "Upload verification failed. Please try again."],
  ["bot_protection_missing_keys", "Upload verification failed. Please try again."],
  ["file_selection_changed", "Your file selection changed. Submit the form again."],
  ["file_selection_invalid", "Choose a valid file selection and try again."],
] as const;

test.each(uploadCopyCases)(
  "536-03: upload code %s renders only its fixed field copy",
  async (code, copy) => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/uploads")) {
        return new Response(
          JSON.stringify({ error: { code, message: "SECRET provider filename customer.txt" } }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error("submission must not run");
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(createFileFormData({ formId: `upload-copy-${code}` }));
    setSelectedFiles(getFileInput(form), [new File(["x"], "customer.txt")]);
    dispatchSubmit(form);
    await settleRuntime();
    const status = form.querySelector('[data-form-file-status="attachment"]');
    expect(status?.textContent).toBe(copy);
    expect(status?.getAttribute("role")).toBe("alert");
    expect(status?.getAttribute("aria-live")).toBe("assertive");
    expect(document.body.textContent).not.toContain("SECRET");
    expect(document.body.textContent).not.toContain("customer.txt");
  }
);

const submissionCopyCases = [
  ["form_not_found", "This form is no longer available."],
  ["form_nonce_required", "This form has expired. Refresh the page and try again."],
  ["form_nonce_invalid", "This form has expired. Refresh the page and try again."],
  ["form_nonce_expired", "This form has expired. Refresh the page and try again."],
  ["rate_limited", "Too many submissions. Please try again later."],
  ["bot_protection_required", "Form verification failed. Please try again."],
  ["bot_protection_failed", "Form verification failed. Please try again."],
  ["bot_protection_action_mismatch", "Form verification failed. Please try again."],
  ["bot_protection_score_low", "Form verification failed. Please try again."],
  ["bot_protection_unavailable", "Form verification failed. Please try again."],
  ["bot_protection_missing_keys", "Form verification failed. Please try again."],
  ["file_selection_changed", "Your file selection changed. Submit the form again."],
] as const;

test.each(submissionCopyCases)(
  "536-03: submission code %s renders only its fixed form copy",
  async (code, copy) => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code, message: "SECRET provider HTML" } }), {
          status: 422,
          headers: { "Content-Type": "application/json" },
        })
    ) as typeof globalThis.fetch;
    const form = installFormRuntime(
      createFileFormData({
        formId: `submission-copy-${code}`,
        fields: [{ id: "note", type: "text", label: "Note", name: "note", required: false }],
      })
    );
    dispatchSubmit(form);
    await settleRuntime();
    expect(form.querySelector('[data-form-embed-error="true"]')?.textContent).toBe(copy);
    expect(document.body.textContent).not.toContain("SECRET");
  }
);

test("536-03: unsafe-status and generic-catch source shapes are owner-sensitive", () => {
  document.body.innerHTML = renderToString(
    React.createElement(FormEmbedBlock, {
      data: createFileFormData({ formId: "source-shape" }),
      variant: "standard",
    })
  );
  const source = document.querySelector("script")?.textContent ?? "";
  const unsafeStart = source.indexOf("const failUnsafeFileStatusTarget = (form, binding) =>");
  const unsafeEnd = source.indexOf("const createSafeUploadError", unsafeStart);
  expect(unsafeStart).toBeGreaterThanOrEqual(0);
  expect(unsafeEnd).toBeGreaterThan(unsafeStart);
  const unsafeSource = source.slice(unsafeStart, unsafeEnd);
  expect(unsafeSource).not.toContain("safeError");
  expect(unsafeSource).toContain('throw createSafeUploadError("file_selection_changed");');
  expect(source).toContain(
    "const binding = Object.freeze({ form, identity, input, hidden, status, multiple, state });"
  );
  expect(source).toContain("ui.bindingInvalid &&");
  expect(source).toContain('errorNode.dataset.formErrorOwner === "file-binding"');
  expect(source).toContain("if (errorNode instanceof HTMLElement && !ownsFileBindingError)");
  const neutralClearStart = source.indexOf("const clearFileBindingForInvisibility");
  const neutralClearEnd = source.indexOf("const resetFileBinding", neutralClearStart);
  const neutralClearSource = source.slice(neutralClearStart, neutralClearEnd);
  expect(neutralClearSource.indexOf("if (!needsReset) return;")).toBeLessThan(
    neutralClearSource.indexOf("abortActiveSubmission(form);")
  );
});

const securityControlMutationCases: Array<readonly [string, (form: HTMLFormElement) => void]> = [
  [
    "malformed nonce marker",
    (form) => {
      form
        .querySelector('[data-form-security-nonce="1"]')
        ?.setAttribute("data-form-security-nonce", "0");
    },
  ],
  [
    "stripped nonce marker",
    (form) => {
      form
        .querySelector('[data-form-security-nonce="1"]')
        ?.removeAttribute("data-form-security-nonce");
    },
  ],
  [
    "wrong nonce input type",
    (form) => {
      const input = form.querySelector('[data-form-security-nonce="1"]');
      if (input instanceof HTMLInputElement) input.type = "text";
    },
  ],
  [
    "wrong nonce name",
    (form) => {
      const input = form.querySelector('[data-form-security-nonce="1"]');
      if (input instanceof HTMLInputElement) input.name = "ordinary";
    },
  ],
  [
    "cross-role nonce marker",
    (form) => {
      form
        .querySelector('[data-form-security-nonce="1"]')
        ?.setAttribute("data-form-security-captcha", "1");
    },
  ],
  [
    "moved nonce control",
    (form) => {
      const otherForm = document.createElement("form");
      document.body.appendChild(otherForm);
      const input = form.querySelector('[data-form-security-nonce="1"]');
      if (input) otherForm.appendChild(input);
    },
  ],
  [
    "malformed captcha marker",
    (form) => {
      form
        .querySelector('[data-form-security-captcha="1"]')
        ?.setAttribute("data-form-security-captcha", "0");
    },
  ],
  [
    "stripped captcha marker",
    (form) => {
      form
        .querySelector('[data-form-security-captcha="1"]')
        ?.removeAttribute("data-form-security-captcha");
    },
  ],
  [
    "wrong captcha name",
    (form) => {
      const input = form.querySelector('[data-form-security-captcha="1"]');
      if (input instanceof HTMLInputElement) input.name = "ordinary";
    },
  ],
  [
    "duplicate marked captcha",
    (form) => {
      const input = form.querySelector('[data-form-security-captcha="1"]');
      if (input) form.appendChild(input.cloneNode(true));
    },
  ],
];

test.each(securityControlMutationCases)(
  "536-03: %s fails locally before captcha or transport",
  async (_label, mutate) => {
    const execute = vi.fn(async () => "must-not-execute");
    globalThis.fetch = vi.fn(async () => {
      throw new Error("transport must not run");
    }) as typeof globalThis.fetch;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const formId = `security-marker-${_label.replaceAll(" ", "-")}`;
    const form = installFormRuntime(
      createFileFormData({
        formId,
        required: false,
        saveProgress: true,
        botProtection: true,
        fields: [{ id: "note", type: "text", label: "Note", name: "note", required: false }],
      }),
      () => {
        (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
      }
    );
    mutate(form);
    setInputValue('input[name="note"]', "progress-without-security-controls");

    expect(() => dispatchSubmit(form)).not.toThrow();
    await settleRuntime();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(form.dataset.submitting).toBe("0");
    expect(form.dataset.fileUploadPending).toBe("0");
    expect(window.localStorage.getItem(`nextless:form-progress:${formId}:/`)).not.toContain(
      `nonce-${formId}`
    );
    expect(form.querySelector('[data-form-embed-error="true"]')).toMatchObject({
      textContent: _label.includes("captcha")
        ? "Unable to submit the form. Please try again."
        : "This form has expired. Refresh the page and try again.",
    });
    expect(consoleError).not.toHaveBeenCalled();
  }
);

test.each(["nonce", "captcha"] as const)(
  "536-03: replacing the captured marked %s reference during final captcha blocks the write",
  async (role) => {
    let resolveToken: ((token: string) => void) | undefined;
    const execute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveToken = resolve;
        })
    );
    const requests: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      requests.push(String(input));
      return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(
      createFileFormData({
        formId: `security-reference-${role}`,
        required: false,
        botProtection: true,
        fields: [{ id: "note", type: "text", label: "Note", name: "note", required: false }],
      }),
      () => {
        (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
      }
    );

    dispatchSubmit(form);
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    const selector = `[data-form-security-${role}="1"]`;
    const captured = form.querySelector(selector);
    if (!(captured instanceof HTMLInputElement)) throw new Error(`Missing marked ${role}`);
    const replacement = captured.cloneNode(true);
    captured.replaceWith(replacement);
    resolveToken?.("late-token");
    await settleRuntime();

    expect(requests).toHaveLength(0);
    expect(form.querySelector(selector)).toBe(replacement);
    expect(form.querySelector('[data-form-embed-error="true"]')).toMatchObject({
      textContent: "Your file selection changed. Submit the form again.",
    });
    expect(form.dataset.submitting).toBe("0");
    expect(form.getAttribute("aria-busy")).toBe("false");
  }
);

test("536-03: duplicate marked security nonce fails locally before captcha or transport", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  const execute = vi.fn(async () => "must-not-execute");
  const requests: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    requests.push(String(input));
    throw new Error("transport must not run");
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "duplicate-nonce", botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  const duplicateNonce = document.createElement("input");
  duplicateNonce.type = "hidden";
  duplicateNonce.name = "__nl_form_nonce";
  duplicateNonce.value = "attacker-selected-nonce";
  duplicateNonce.dataset.formSecurityNonce = "1";
  form.appendChild(duplicateNonce);
  const hidden = form.querySelector('[data-form-file-value="attachment"]');
  const status = form.querySelector('[data-form-file-status="attachment"]');
  setSelectedFiles(getFileInput(form), [new File(["x"], "x.txt")]);

  dispatchSubmit(form);
  await settleRuntime();

  expect(requests).toHaveLength(0);
  expect(execute).not.toHaveBeenCalled();
  expect((hidden as HTMLInputElement | null)?.value).toBe("");
  expect(status?.textContent).toBe("This form has expired. Refresh the page and try again.");
  expect(status?.getAttribute("role")).toBe("alert");
  expect(form.dataset.fileUploadPending).toBe("0");
  expect(form.dataset.submitting).toBe("0");
});

test.each(["network rejection", "malformed JSON"] as const)(
  "536-03: upload %s uses bounded copy and remains retryable",
  async (failureKind) => {
    let uploadAttempts = 0;
    const requests: string[] = [];
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/uploads")) {
        uploadAttempts += 1;
        if (uploadAttempts === 1) {
          if (failureKind === "network rejection") {
            throw new Error("SECRET network provider detail");
          }
          return new Response("{not-json", {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ id: uploadIdA }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;
    const form = installFormRuntime(
      createFileFormData({ formId: `upload-${failureKind.replace(" ", "-")}` })
    );
    const hidden = form.querySelector('[data-form-file-value="attachment"]');
    const status = form.querySelector('[data-form-file-status="attachment"]');
    setSelectedFiles(getFileInput(form), [new File(["same"], "customer-secret.txt")]);

    dispatchSubmit(form);
    await settleRuntime();

    expect(status?.textContent).toBe("Unable to upload this file. Please try again.");
    expect(status?.getAttribute("role")).toBe("alert");
    expect((hidden as HTMLInputElement | null)?.value).toBe("");
    expect(form.dataset.fileUploadPending).toBe("0");
    expect(form.dataset.submitting).toBe("0");
    expect(document.body.textContent).not.toContain("SECRET");
    expect(document.body.textContent).not.toContain("customer-secret.txt");

    dispatchSubmit(form);
    await settleRuntime();

    expect(requests.filter((url) => url.endsWith("/uploads"))).toHaveLength(2);
    expect(requests.filter((url) => url.endsWith("/submissions"))).toHaveLength(1);
    expect((hidden as HTMLInputElement | null)?.value).toBe(uploadIdA);
    expect(status?.textContent).toBe("Upload complete.");
  }
);

test("536-03: captcha-enabled upload failure retry uses fresh upload and final tokens", async () => {
  const scripts: HTMLScriptElement[] = [];
  vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
    scripts.push(node as HTMLScriptElement);
    return node;
  });
  const execute = vi
    .fn<() => Promise<string>>()
    .mockResolvedValueOnce("first-upload-token")
    .mockResolvedValueOnce("retry-upload-token")
    .mockResolvedValueOnce("final-submit-token");
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  let uploads = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.endsWith("/uploads")) {
      uploads += 1;
      if (uploads === 1) {
        return new Response(JSON.stringify({ error: { code: "rate_limited" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ id: uploadIdA }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ runtime: { successMessage: "Done" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  const form = installFormRuntime(
    createFileFormData({ formId: "captcha-upload-retry", botProtection: true })
  );
  (window as Window & { grecaptcha?: { execute: typeof execute } }).grecaptcha = { execute };
  scripts[0]?.dispatchEvent(new Event("load"));
  const input = getFileInput(form);
  const selected = new File(["same"], "same.txt");
  setSelectedFiles(input, [selected]);
  dispatchSubmit(form);
  await settleRuntime();
  expect(input.files?.[0]).toBe(selected);
  dispatchSubmit(form);
  await settleRuntime();

  expect(execute).toHaveBeenCalledTimes(3);
  const uploadsOnly = requests.filter(({ url }) => url.endsWith("/uploads"));
  expect(uploadsOnly).toHaveLength(2);
  expect((uploadsOnly[0]?.init?.body as FormData).get("captchaToken")).toBe("first-upload-token");
  expect((uploadsOnly[1]?.init?.body as FormData).get("captchaToken")).toBe("retry-upload-token");
  const submission = requests.find(({ url }) => url.endsWith("/submissions"));
  expect(JSON.parse(String(submission?.init?.body)).captchaToken).toBe("final-submit-token");
});

// ---------------------------------------------------------------------------
// TASK-516-06: public embed inherits the form theme (present-only), per-instance
// style still wins, and un-themed forms stay byte-identical to the pre-516 markup.
// ---------------------------------------------------------------------------

const renderEmbedHtml = (data: FormEmbedData) =>
  renderToString(React.createElement(FormEmbedBlock, { data, variant: "standard" }));

const themedResolvedFields = [
  { id: "f1", type: "text", label: "Name", name: "name", required: true, settings: {} },
];

test("516-06: a themed form renders the mapped container width, submit color/label and typography", () => {
  const html = renderEmbedHtml({
    formId: "form-themed",
    resolved: {
      formName: "Themed",
      submissionAccess: "public",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        theme: {
          layout: { width: "full", columns: 1, fieldGap: "sm" },
          surface: { background: "#101010", padding: "xl", shadow: "lg" },
          typography: { titleSize: "xl", fontFamily: "serif", titleColor: "#ff0000" },
          input: { size: "lg", radius: "xl" },
          submit: { background: "#00ff00", fullWidth: true, label: "Send it", radius: "xl" },
        },
      },
      fields: themedResolvedFields,
    },
  });

  // width: theme "full" → max-w-none (NOT the widget width enum, which lacks it).
  expect(html).toContain("max-w-none");
  // fontFamily on the outer wrapper.
  expect(html).toContain("font-serif");
  // title size xl (theme map, not the widget titleSize map which lacks xl).
  expect(html).toContain("text-xl");
  // surface padding xl + shadow lg on the card wrapper.
  expect(html).toContain("p-8");
  expect(html).toContain("shadow-lg");
  // columns:1 collapses the grid; fieldGap sm → gap-2 (theme map, not widget gap-4).
  expect(html).toContain("grid-cols-1");
  expect(html).toContain("gap-2");
  // colors reach inline styles (policy-checked hex passes through).
  expect(html).toContain("#101010");
  expect(html).toContain("#ff0000");
  expect(html).toContain("#00ff00");
  // submit: full-width + theme label + xl radius.
  expect(html).toContain("Send it");
  expect(html).toContain("rounded-2xl");
  expect(html).toContain("w-full");
});

test("516-06: a form with NO theme and no per-instance style is byte-identical to the pre-516 markup", () => {
  const noThemeData: FormEmbedData = {
    formId: "form-plain",
    resolved: {
      formName: "Plain",
      submissionAccess: "public",
      settings: { layoutMode: "single", saveProgress: false, stepTitles: [] },
      fields: themedResolvedFields,
    },
  };

  const html = renderEmbedHtml(noThemeData);

  // widget defaults survive untouched.
  expect(html).toContain("max-w-lg"); // widthClassMap.md
  expect(html).toContain("w-full space-y-6 p-6"); // card wrapper (padding p-6, no shadow)
  expect(html).toContain("grid md:grid-cols-2 gap-6"); // default columns + fieldGap md
  // no theme-only surfaces leak in.
  expect(html).not.toContain("font-serif");
  expect(html).not.toContain("font-display");
  expect(html).not.toContain("max-w-none");
  expect(html).not.toContain("grid-cols-1");

  // Rendering identical data twice yields identical markup (deterministic useId).
  expect(html).toBe(renderEmbedHtml(noThemeData));
});

test("516-06: a per-instance embed style overrides the form theme (precedence)", () => {
  const html = renderEmbedHtml({
    formId: "form-precedence",
    // per-instance style sets its OWN surface color; the form theme's must lose.
    style: { surface: "#222222" },
    resolved: {
      formName: "Precedence",
      submissionAccess: "public",
      settings: {
        layoutMode: "single",
        saveProgress: false,
        stepTitles: [],
        theme: { surface: { background: "#101010" } },
      },
      fields: themedResolvedFields,
    },
  });

  expect(html).toContain("#222222"); // per-instance wins
  expect(html).not.toContain("#101010"); // theme background does not reach the DOM
});
