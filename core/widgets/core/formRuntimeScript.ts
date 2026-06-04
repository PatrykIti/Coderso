const runtimeClientScript = String.raw`(() => {
  if (typeof window === "undefined") return;
  if (window.__nextlessFormRuntimeClient) {
    if (typeof window.__nextlessFormRuntimeBind === "function") {
      window.__nextlessFormRuntimeBind();
    }
    return;
  }
  window.__nextlessFormRuntimeClient = true;

  const FORM_SELECTOR = 'form[data-nextless-form-runtime="1"]';
  let recaptchaScriptPromise = null;
  let recaptchaScriptSiteKey = null;

  const loadRecaptcha = (siteKey) => {
    if (!siteKey) return Promise.reject(new Error("recaptcha_site_key_missing"));
    if (window.grecaptcha && typeof window.grecaptcha.execute === "function") {
      return Promise.resolve();
    }
    if (recaptchaScriptPromise && recaptchaScriptSiteKey === siteKey) return recaptchaScriptPromise;

    recaptchaScriptSiteKey = siteKey;
    recaptchaScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=" + encodeURIComponent(siteKey);
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        recaptchaScriptPromise = null;
        recaptchaScriptSiteKey = null;
        reject(new Error("recaptcha_load_failed"));
      };
      document.head.appendChild(script);
    });

    return recaptchaScriptPromise;
  };

  const waitForRecaptchaReady = () =>
    new Promise((resolve, reject) => {
      if (!window.grecaptcha || typeof window.grecaptcha.execute !== "function") {
        reject(new Error("recaptcha_unavailable"));
        return;
      }
      if (typeof window.grecaptcha.ready !== "function") {
        resolve();
        return;
      }
      window.grecaptcha.ready(() => resolve());
    });

  const preloadRecaptcha = (siteKey) => {
    const normalizedSiteKey = (siteKey || "").trim();
    if (!normalizedSiteKey) return;
    void loadRecaptcha(normalizedSiteKey).then(waitForRecaptchaReady).catch(() => undefined);
  };

  const executeRecaptcha = async (siteKey, action) => {
    const normalizedSiteKey = (siteKey || "").trim();
    await loadRecaptcha(normalizedSiteKey);
    await waitForRecaptchaReady();
    if (!window.grecaptcha || typeof window.grecaptcha.execute !== "function") {
      throw new Error("recaptcha_unavailable");
    }
    return window.grecaptcha.execute(normalizedSiteKey, { action: action || "public_write" });
  };

  const readNamedValue = (input) => {
    if (input instanceof HTMLInputElement) {
      if (input.type === "checkbox") {
        return input.checked ? true : null;
      }
      if (input.type === "radio") {
        return input.checked ? input.value : null;
      }
      return input.value;
    }
    if (input instanceof HTMLTextAreaElement) {
      return input.value;
    }
    if (input instanceof HTMLSelectElement) {
      return input.value;
    }
    return null;
  };

  const getFormFields = (form) =>
    Array.from(form.elements).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLTextAreaElement) &&
        !(element instanceof HTMLSelectElement)
      ) {
        return false;
      }
      if (!element.name) return false;
      if (element.name === "__nl_form_nonce") return false;
      if (element.name === "captchaToken") return false;
      return true;
    });

  const getFieldContainers = (form) =>
    Array.from(form.querySelectorAll("[data-form-field]")).filter(
      (element) => element instanceof HTMLElement
    );

  const collectValues = (form) => {
    const values = {};
    getFormFields(form).forEach((field) => {
      const value = readNamedValue(field);
      if (value === null) return;
      values[field.name] = value;
    });
    return values;
  };

  const toComparable = (value) => {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  };

  const evaluateFieldLogic = (container, values) => {
    if (!(container instanceof HTMLElement)) return true;
    const operator = (container.dataset.logicOperator || "").trim();
    if (!operator || operator === "always") return true;
    const fieldName = (container.dataset.logicField || "").trim();
    if (!fieldName) return true;
    const expected = (container.dataset.logicValue || "").trim().toLowerCase();
    const actualRaw = values[fieldName];
    const actual = (toComparable(actualRaw) || "").toLowerCase();
    const exists = actual.length > 0;

    switch (operator) {
      case "exists":
        return exists;
      case "not_exists":
        return !exists;
      case "equals":
        return actual === expected;
      case "not_equals":
        return actual !== expected;
      case "contains":
        return actual.includes(expected);
      case "not_contains":
        return !actual.includes(expected);
      default:
        return true;
    }
  };

  const setFieldVisibility = (container, visible) => {
    if (!(container instanceof HTMLElement)) return;
    container.hidden = !visible;
    container.dataset.logicVisible = visible ? "1" : "0";

    const controls = Array.from(
      container.querySelectorAll("input, textarea, select")
    );
    controls.forEach((control) => {
      if (
        !(control instanceof HTMLInputElement) &&
        !(control instanceof HTMLTextAreaElement) &&
        !(control instanceof HTMLSelectElement)
      ) {
        return;
      }
      control.disabled = !visible;
      const requiredOriginal = control.dataset.requiredOriginal === "1";
      control.required = visible ? requiredOriginal : false;
    });
  };

  const refreshFieldLogic = (form) => {
    const values = collectValues(form);
    const containers = getFieldContainers(form);
    containers.forEach((container) => {
      const visible = evaluateFieldLogic(container, values);
      setFieldVisibility(container, visible);
    });
  };

  const getProgressKey = (form) => {
    const formId = (form.dataset.formId || "").trim();
    if (!formId) return null;
    return "nextless:form-progress:" + formId + ":" + window.location.pathname;
  };

  const getProgressTtlDays = (form) => {
    const parsed = Number.parseInt(form.dataset.formProgressTtlDays || "7", 10);
    if (!Number.isFinite(parsed)) return 7;
    return Math.min(30, Math.max(1, parsed));
  };

  const persistProgress = (form) => {
    if (form.dataset.formSaveProgress !== "1") return;
    const key = getProgressKey(form);
    if (!key) return;

    const values = {};
    getFormFields(form).forEach((field) => {
      const value = readNamedValue(field);
      if (value === null) return;
      values[field.name] = value;
    });

    const payload = {
      values,
      currentStep: Number.parseInt(form.dataset.currentStep || "1", 10) || 1,
      savedAt: Date.now(),
    };

    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Ignore storage errors in private mode.
    }
  };

  const clearProgress = (form) => {
    const key = getProgressKey(form);
    if (!key) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage errors.
    }
  };

  const hydrateProgress = (form) => {
    if (form.dataset.formSaveProgress !== "1") return;
    const key = getProgressKey(form);
    if (!key) return;

    let payload = null;
    try {
      const raw = window.localStorage.getItem(key);
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }

    if (!payload || typeof payload !== "object") return;
    const savedAt = Number(payload.savedAt);
    const ttlMs = getProgressTtlDays(form) * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > ttlMs) {
      clearProgress(form);
      return;
    }
    const values = payload.values;
    if (!values || typeof values !== "object") return;

    getFormFields(form).forEach((field) => {
      if (!(field.name in values)) return;
      const incoming = values[field.name];
      if (incoming === null || incoming === undefined) return;
      if (field instanceof HTMLInputElement) {
        if (field.type === "checkbox") {
          field.checked = String(incoming) === String(field.value);
          return;
        }
        if (field.type === "radio") {
          field.checked = String(incoming) === String(field.value);
          return;
        }
        field.value = String(incoming);
        return;
      }
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
        field.value = String(incoming);
      }
    });

    const savedStep = Number.parseInt(String(payload.currentStep || "1"), 10);
    if (Number.isFinite(savedStep)) {
      form.dataset.currentStep = String(Math.max(1, savedStep));
    }
  };

  const getStepElements = (form) =>
    Array.from(form.querySelectorAll("[data-nextless-form-step]"));

  const getCurrentStep = (form) => {
    const value = Number.parseInt(form.dataset.currentStep || "1", 10);
    return Number.isFinite(value) ? Math.max(1, value) : 1;
  };

  const setCurrentStep = (form, step) => {
    form.dataset.currentStep = String(Math.max(1, step));
  };

  const validateCurrentStep = (form) => {
    const steps = getStepElements(form);
    if (steps.length <= 1) return true;
    const currentStep = getCurrentStep(form);
    const active = steps[currentStep - 1];
    if (!(active instanceof HTMLElement)) return true;

    const controls = Array.from(
      active.querySelectorAll("input, textarea, select")
    ).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element instanceof HTMLInputElement && element.type === "hidden") {
        return false;
      }
      return true;
    });

    for (const control of controls) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement
      ) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return false;
        }
      }
    }

    return true;
  };

  const getStepControls = (step) =>
    Array.from(step.querySelectorAll("input, textarea, select")).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLTextAreaElement) &&
        !(element instanceof HTMLSelectElement)
      ) {
        return false;
      }
      if (element.disabled) return false;
      if (element instanceof HTMLInputElement && element.type === "hidden") {
        return false;
      }
      const container = element.closest("[data-form-field]");
      if (container instanceof HTMLElement && container.dataset.logicVisible === "0") {
        return false;
      }
      return true;
    });

  const findFirstInvalidStepIndex = (form, maxStepIndex) => {
    const steps = getStepElements(form);
    const limit = Math.min(Math.max(0, maxStepIndex), steps.length - 1);
    for (let index = 0; index <= limit; index += 1) {
      const step = steps[index];
      if (!(step instanceof HTMLElement)) continue;
      const controls = getStepControls(step);
      for (const control of controls) {
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement
        ) {
          if (!control.checkValidity()) return index;
        }
      }
    }
    return -1;
  };

  const reportFirstInvalidControl = (form, stepIndex) => {
    const steps = getStepElements(form);
    const step = steps[stepIndex];
    if (!(step instanceof HTMLElement)) return;
    const controls = getStepControls(step);
    for (const control of controls) {
      if (
        control instanceof HTMLInputElement ||
        control instanceof HTMLTextAreaElement ||
        control instanceof HTMLSelectElement
      ) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }
  };

  const clampRestoredStep = (form) => {
    const steps = getStepElements(form);
    if (steps.length <= 1) return;
    const currentStep = Math.min(getCurrentStep(form), steps.length);
    const invalidIndex = findFirstInvalidStepIndex(form, currentStep - 2);
    if (invalidIndex >= 0) {
      setCurrentStep(form, invalidIndex + 1);
    }
  };

  const validateStepsThroughCurrent = (form) => {
    const steps = getStepElements(form);
    if (steps.length <= 1) return validateCurrentStep(form);
    const currentStep = Math.min(getCurrentStep(form), steps.length);
    const invalidIndex = findFirstInvalidStepIndex(form, currentStep - 1);
    if (invalidIndex >= 0) {
      setCurrentStep(form, invalidIndex + 1);
      refreshStepUi(form);
      reportFirstInvalidControl(form, invalidIndex);
      return false;
    }
    return true;
  };

  const refreshStepUi = (form) => {
    const steps = getStepElements(form);
    const hasSteps = steps.length > 1;
    const currentStep = Math.min(getCurrentStep(form), Math.max(1, steps.length));
    setCurrentStep(form, currentStep);

    steps.forEach((step, index) => {
      const isActive = index + 1 === currentStep;
      if (!(step instanceof HTMLElement)) return;
      if (isActive) {
        step.classList.remove("hidden");
      } else {
        step.classList.add("hidden");
      }
    });

    const backButton = form.querySelector('[data-form-nav="back"]');
    const nextButton = form.querySelector('[data-form-nav="next"]');
    const submitButton = form.querySelector('[data-form-submit="1"]');

    if (backButton instanceof HTMLElement) {
      backButton.hidden = !hasSteps || currentStep <= 1;
    }

    if (nextButton instanceof HTMLElement) {
      nextButton.hidden = !hasSteps || currentStep >= steps.length;
    }

    if (submitButton instanceof HTMLElement) {
      submitButton.hidden = hasSteps && currentStep < steps.length;
    }

    const progressText = form.querySelector('[data-form-progress-text="true"]');
    if (progressText instanceof HTMLElement && hasSteps) {
      progressText.textContent = "Step " + currentStep + " of " + steps.length;
    }

    const progressBar = form.querySelector('[data-form-progress-bar="true"]');
    if (progressBar instanceof HTMLElement && hasSteps) {
      progressBar.style.width = Math.round((currentStep / steps.length) * 100) + "%";
    }
  };

  const toPayload = (form) => {
    const data = {};
    let formNonce = null;
    let captchaToken = null;

    getFormFields(form).forEach((field) => {
      if (field.disabled) return;
      const value = readNamedValue(field);
      if (value === null) return;
      data[field.name] = value;
    });

    const nonceInput = form.querySelector('input[name="__nl_form_nonce"]');
    if (nonceInput instanceof HTMLInputElement) {
      formNonce = nonceInput.value.trim() || null;
    }

    const captchaInput = form.querySelector('input[name="captchaToken"]');
    if (captchaInput instanceof HTMLInputElement) {
      captchaToken = captchaInput.value.trim() || null;
    }

    return {
      data,
      formNonce,
      captchaToken: captchaToken || undefined,
    };
  };

  const hideNode = (node) => {
    if (!(node instanceof HTMLElement)) return;
    node.classList.add("hidden");
  };

  const showNode = (node) => {
    if (!(node instanceof HTMLElement)) return;
    node.classList.remove("hidden");
  };

  const setSubmitting = (form, submitting) => {
    form.dataset.submitting = submitting ? "1" : "0";
    form.setAttribute("aria-busy", submitting ? "true" : "false");

    const submitButton = form.querySelector('[data-form-submit="1"]');
    const backButton = form.querySelector('[data-form-nav="back"]');
    const nextButton = form.querySelector('[data-form-nav="next"]');
    const loadingLabel = (form.dataset.formLoadingLabel || "Sending...").trim();
    const submitLabel = (form.dataset.formSubmitLabel || submitButton?.textContent || "").trim();

    [submitButton, backButton, nextButton].forEach((node) => {
      if (!(node instanceof HTMLButtonElement)) return;
      node.disabled = submitting;
    });

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.setAttribute("aria-busy", submitting ? "true" : "false");
      submitButton.textContent = submitting ? loadingLabel : submitLabel;
    }
  };

  const emitSuccessAnalyticsEvent = (form, detail) => {
    const eventName = (form.dataset.formAnalyticsEvent || "").trim();
    if (!eventName) return;
    const payload = {
      formId: (form.dataset.formId || "").trim() || null,
      redirectUrl: typeof detail.redirectUrl === "string" ? detail.redirectUrl : null,
      successMessage: typeof detail.successMessage === "string" ? detail.successMessage : null,
    };
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  };

  const hideFormBody = (form) => {
    const body = form.querySelector("[data-form-embed-form-body='true']");
    if (body instanceof HTMLElement) {
      body.hidden = true;
    }
  };

  const showFormBody = (form) => {
    const body = form.querySelector("[data-form-embed-form-body='true']");
    if (body instanceof HTMLElement) {
      body.hidden = false;
    }
  };

  const bindForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.formRuntimeBound === "1") return;
    form.dataset.formRuntimeBound = "1";
    const submitButton = form.querySelector('[data-form-submit="1"]');
    if (
      submitButton instanceof HTMLButtonElement &&
      !(form.dataset.formSubmitLabel || "").trim()
    ) {
      const submitLabel = (submitButton.textContent || "").trim();
      if (submitLabel) {
        form.dataset.formSubmitLabel = submitLabel;
      }
    }
    if (!form.dataset.currentStep) {
      form.dataset.currentStep = "1";
    }
    preloadRecaptcha(form.dataset.formCaptchaSiteKey);

    hydrateProgress(form);
    refreshFieldLogic(form);
    clampRestoredStep(form);
    refreshStepUi(form);

    const successNode = form.querySelector("[data-form-embed-success]");
    const errorNode = form.querySelector("[data-form-embed-error]");

    form.addEventListener("input", () => {
      refreshFieldLogic(form);
      persistProgress(form);
    });

    form.addEventListener("change", () => {
      refreshFieldLogic(form);
      persistProgress(form);
    });

    const nextButton = form.querySelector('[data-form-nav="next"]');
    if (nextButton instanceof HTMLElement) {
      nextButton.addEventListener("click", () => {
        if (!validateCurrentStep(form)) return;
        const nextStep = getCurrentStep(form) + 1;
        setCurrentStep(form, nextStep);
        refreshStepUi(form);
        persistProgress(form);
      });
    }

    const backButton = form.querySelector('[data-form-nav="back"]');
    if (backButton instanceof HTMLElement) {
      backButton.addEventListener("click", () => {
        const nextStep = getCurrentStep(form) - 1;
        setCurrentStep(form, nextStep);
        refreshStepUi(form);
        persistProgress(form);
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!validateStepsThroughCurrent(form)) return;

      if (form.dataset.submitting === "1") return;
      setSubmitting(form, true);
      hideNode(errorNode);
      hideNode(successNode);

      try {
        const siteKey = (form.dataset.formCaptchaSiteKey || "").trim();
        const action = (form.dataset.formCaptchaAction || "public_write").trim();
        if (siteKey) {
          const token = await executeRecaptcha(siteKey, action);
          const tokenInput = form.querySelector('input[name="captchaToken"]');
          if (tokenInput instanceof HTMLInputElement) {
            tokenInput.value = token;
          }
        }

        const payload = toPayload(form);
        const response = await fetch(form.action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            result.error &&
            typeof result.error.message === "string"
              ? result.error.message
              : "Unable to submit the form. Please try again.";
          throw new Error(message);
        }

        const runtime = result && typeof result === "object" ? result.runtime || {} : {};
        const resolveSafeRedirectUrl = (value) => {
          const candidate = typeof value === "string" ? value.trim() : "";
          if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) return "";
          try {
            const url = new URL(candidate, window.location.origin);
            if (url.origin !== window.location.origin) return "";
            return url.pathname + url.search + url.hash;
          } catch {
            return "";
          }
        };
        const redirectUrl =
          runtime && typeof runtime.redirectUrl === "string"
            ? resolveSafeRedirectUrl(runtime.redirectUrl)
            : "";
        const successMessageFromRuntime =
          runtime && typeof runtime.successMessage === "string"
            ? runtime.successMessage.trim()
            : "";
        const successMessage =
          (form.dataset.formSuccessMessage || "").trim() || successMessageFromRuntime;
        emitSuccessAnalyticsEvent(form, {
          redirectUrl: redirectUrl || null,
          successMessage: successMessage || null,
        });
        if (redirectUrl) {
          clearProgress(form);
          window.location.assign(redirectUrl);
          return;
        }

        if (successNode instanceof HTMLElement) {
          if (successMessage) {
            successNode.textContent = successMessage;
            showNode(successNode);
          } else {
            hideNode(successNode);
          }
        }

        clearProgress(form);
        const successBehavior = form.dataset.formSuccessBehavior || "show-message-hide-form";
        if (successBehavior === "show-message-reset-form") {
          form.reset();
          showFormBody(form);
          setCurrentStep(form, 1);
          refreshFieldLogic(form);
          refreshStepUi(form);
        } else if (successBehavior === "show-message-keep-form") {
          showFormBody(form);
        } else {
          hideFormBody(form);
        }
      } catch (error) {
        if (errorNode instanceof HTMLElement) {
          errorNode.textContent =
            error instanceof Error ? error.message : "Unable to submit the form. Please try again.";
          showNode(errorNode);
        }
      } finally {
        setSubmitting(form, false);
      }
    });
  };

  const bindForms = () => {
    const forms = Array.from(document.querySelectorAll(FORM_SELECTOR));
    forms.forEach((form) => bindForm(form));
  };

  window.__nextlessFormRuntimeBind = bindForms;
  bindForms();
  if (typeof window.queueMicrotask === "function") {
    window.queueMicrotask(bindForms);
  } else {
    window.setTimeout(bindForms, 0);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindForms, { once: true });
  }
})();`;

export function getFormRuntimeClientScript() {
  return runtimeClientScript;
}
