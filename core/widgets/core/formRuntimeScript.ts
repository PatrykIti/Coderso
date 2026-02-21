const runtimeClientScript = String.raw`(() => {
  if (typeof window === "undefined") return;
  if ((window).__nextlessFormRuntimeClient) return;
  (window).__nextlessFormRuntimeClient = true;

  const FORM_SELECTOR = 'form[data-nextless-form-runtime="1"]';

  const readNamedValue = (input) => {
    if (input instanceof HTMLInputElement) {
      if (input.type === "checkbox") {
        return input.checked ? input.value : null;
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
  };

  const toPayload = (form) => {
    const formData = new FormData(form);
    const data = {};
    let formNonce = null;

    for (const [key, value] of formData.entries()) {
      if (key === "__nl_form_nonce") {
        formNonce = String(value);
        continue;
      }
      if (value instanceof File) continue;
      data[key] = String(value);
    }

    return {
      data,
      formNonce,
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

  const bindForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.formRuntimeBound === "1") return;
    form.dataset.formRuntimeBound = "1";
    if (!form.dataset.currentStep) {
      form.dataset.currentStep = "1";
    }

    hydrateProgress(form);
    refreshFieldLogic(form);
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

      if (!validateCurrentStep(form)) return;

      if (form.dataset.submitting === "1") return;
      form.dataset.submitting = "1";

      hideNode(errorNode);

      try {
        const payload = toPayload(form);
        const response = await fetch(form.action, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("form_submit_failed");
        }

        const result = await response.json();
        const runtime = result && typeof result === "object" ? result.runtime || {} : {};
        const redirectUrl =
          runtime && typeof runtime.redirectUrl === "string"
            ? runtime.redirectUrl.trim()
            : "";
        if (redirectUrl) {
          clearProgress(form);
          window.location.assign(redirectUrl);
          return;
        }

        const successMessageFromRuntime =
          runtime && typeof runtime.successMessage === "string"
            ? runtime.successMessage.trim()
            : "";
        const successMessage =
          successMessageFromRuntime || (form.dataset.formSuccessMessage || "").trim();

        if (successNode instanceof HTMLElement) {
          if (successMessage) {
            successNode.textContent = successMessage;
            showNode(successNode);
          } else {
            hideNode(successNode);
          }
        }

        clearProgress(form);
        form.reset();
        setCurrentStep(form, 1);
        refreshFieldLogic(form);
        refreshStepUi(form);
      } catch {
        if (errorNode instanceof HTMLElement) {
          showNode(errorNode);
        }
      } finally {
        form.dataset.submitting = "0";
      }
    });
  };

  const bindForms = () => {
    const forms = Array.from(document.querySelectorAll(FORM_SELECTOR));
    forms.forEach((form) => bindForm(form));
  };

  bindForms();
})();`;

export function getFormRuntimeClientScript() {
  return runtimeClientScript;
}
