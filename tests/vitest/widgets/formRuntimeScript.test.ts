// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import {
  FormEmbedBlock,
  formEmbedDefaults,
  type FormEmbedData,
} from "../../../core/widgets/core/formEmbed";

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

const installFormRuntime = (data: FormEmbedData) => {
  resetRuntimeFlag();
  document.body.innerHTML = renderToString(
    React.createElement(FormEmbedBlock, {
      data,
      variant: "standard",
    })
  );
  const script = document.querySelector("script");
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }
  const form = document.querySelector('form[data-nextless-form-runtime="1"]');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Missing Form Embed runtime form");
  }
  return form;
};

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

  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
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
  document.body.innerHTML = renderToString(
    React.createElement(FormEmbedBlock, {
      data: createData("form-duplicate-1"),
      variant: "standard",
    })
  );
  const firstScript = document.querySelector("script");
  if (!firstScript?.textContent) throw new Error("Missing first runtime script");
  // eslint-disable-next-line no-eval
  eval(firstScript.textContent);
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

  const second = document.createElement("div");
  second.innerHTML = renderToString(
    React.createElement(FormEmbedBlock, {
      data: createData("form-duplicate-2"),
      variant: "standard",
    })
  );
  document.body.append(...Array.from(second.childNodes));
  const secondScript = Array.from(document.querySelectorAll("script")).at(-1);
  if (!secondScript?.textContent) throw new Error("Missing second runtime script");
  // eslint-disable-next-line no-eval
  eval(secondScript.textContent);

  setInputValue('form[data-form-id="form-duplicate-2"] input[name="name"]', "Alice");
  const secondForm = document.querySelector('form[data-form-id="form-duplicate-2"]');
  if (!(secondForm instanceof HTMLFormElement)) throw new Error("Missing second form");
  secondForm.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  await (
    window as Window & { happyDOM?: { waitUntilComplete?: () => Promise<void> } }
  ).happyDOM?.waitUntilComplete?.();

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
  // eslint-disable-next-line no-eval
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
  expect(errorNode?.textContent).toContain("recaptcha_unavailable");
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
