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

  const FILE_VALUE_INVALID = Symbol("file_value_invalid");
  const SKIP_VALUE = Symbol("skip_value");
  const SAFE_UPLOAD_ERROR_BRAND = Symbol("safe_upload_error");
  const SAFE_SUBMISSION_ERROR_BRAND = Symbol("safe_submission_error");
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const MAX_FILES_PER_FIELD = 20;
  const FILE_BINDING_ERROR =
    "This form's file upload controls are invalid. Refresh the page and try again.";
  const SAFE_UPLOAD_COPY = Object.freeze({
    media_file_too_large: "The selected file is too large.",
    media_mime_not_allowed: "This file type is not allowed.",
    form_field_invalid: "This file cannot be uploaded for this field.",
    form_not_found: "This form is no longer available.",
    form_upload_invalid: "This file cannot be uploaded right now.",
    form_nonce_required: "This form has expired. Refresh the page and try again.",
    form_nonce_invalid: "This form has expired. Refresh the page and try again.",
    form_nonce_expired: "This form has expired. Refresh the page and try again.",
    rate_limited: "Too many uploads. Please try again later.",
    bot_protection_required: "Upload verification failed. Please try again.",
    bot_protection_failed: "Upload verification failed. Please try again.",
    bot_protection_action_mismatch: "Upload verification failed. Please try again.",
    bot_protection_score_low: "Upload verification failed. Please try again.",
    bot_protection_unavailable: "Upload verification failed. Please try again.",
    bot_protection_missing_keys: "Upload verification failed. Please try again.",
    file_selection_changed: "Your file selection changed. Submit the form again.",
    file_selection_invalid: "Choose a valid file selection and try again.",
  });
  const DEFAULT_UPLOAD_COPY = "Unable to upload this file. Please try again.";
  const SAFE_SUBMISSION_COPY = Object.freeze({
    form_not_found: "This form is no longer available.",
    form_nonce_required: "This form has expired. Refresh the page and try again.",
    form_nonce_invalid: "This form has expired. Refresh the page and try again.",
    form_nonce_expired: "This form has expired. Refresh the page and try again.",
    rate_limited: "Too many submissions. Please try again later.",
    bot_protection_required: "Form verification failed. Please try again.",
    bot_protection_failed: "Form verification failed. Please try again.",
    bot_protection_action_mismatch: "Form verification failed. Please try again.",
    bot_protection_score_low: "Form verification failed. Please try again.",
    bot_protection_unavailable: "Form verification failed. Please try again.",
    bot_protection_missing_keys: "Form verification failed. Please try again.",
    file_selection_changed: "Your file selection changed. Submit the form again.",
  });
  const DEFAULT_SUBMISSION_COPY = "Unable to submit the form. Please try again.";
  const FORM_SECURITY_MARKER_SELECTOR =
    "[data-form-security-nonce], [data-form-security-captcha]";
  const fileBindingRegistryByForm = new WeakMap();
  const fileFieldStateByInput = new WeakMap();
  const fileMarkerTombstones = new WeakSet();
  const formSecurityMarkerTombstones = new WeakSet();
  const formFileUiStateByForm = new WeakMap();

  const getFormFileUiState = (form) => {
    const existing = formFileUiStateByForm.get(form);
    if (existing) return existing;
    const created = {
      submitting: false,
      bindingInvalid: false,
      pendingUploads: new Set(),
      submissionController: null,
    };
    formFileUiStateByForm.set(form, created);
    return created;
  };

  const syncFormActionState = (form) => {
    const ui = getFormFileUiState(form);
    const uploadPending = ui.pendingUploads.size > 0;
    const busy = ui.submitting || uploadPending;
    const disabled = busy || ui.bindingInvalid;
    form.dataset.submitting = ui.submitting ? "1" : "0";
    form.dataset.fileBindingInvalid = ui.bindingInvalid ? "1" : "0";
    form.dataset.fileUploadPending = uploadPending ? "1" : "0";
    form.setAttribute("aria-busy", busy ? "true" : "false");

    const submitButton = form.querySelector('[data-form-submit="1"]');
    const backButton = form.querySelector('[data-form-nav="back"]');
    const nextButton = form.querySelector('[data-form-nav="next"]');
    const loadingLabel = (form.dataset.formLoadingLabel || "Sending...").trim();
    const submitLabel = (form.dataset.formSubmitLabel || submitButton?.textContent || "").trim();

    [submitButton, backButton, nextButton].forEach((node) => {
      if (!(node instanceof HTMLButtonElement)) return;
      node.disabled = disabled;
      node.setAttribute("aria-busy", busy ? "true" : "false");
    });
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.textContent = ui.submitting ? loadingLabel : submitLabel;
    }
  };

  const abortActiveSubmission = (form) => {
    const ui = formFileUiStateByForm.get(form);
    if (ui && ui.submissionController) ui.submissionController.abort();
  };

  const resolveCapturedFileFieldOwner = (bindingOrSignature) => {
    const form = bindingOrSignature.form;
    const input = bindingOrSignature.input;
    const hidden = bindingOrSignature.hidden;
    const status = bindingOrSignature.status;
    if (
      !(form instanceof HTMLFormElement) ||
      !(input instanceof HTMLInputElement) ||
      !(hidden instanceof HTMLInputElement) ||
      !(status instanceof HTMLElement)
    ) {
      return null;
    }
    const owner = input.closest("[data-form-field]");
    if (
      !(owner instanceof HTMLElement) ||
      owner === form ||
      owner === input ||
      owner === hidden ||
      owner === status ||
      hidden.closest("[data-form-field]") !== owner ||
      status.closest("[data-form-field]") !== owner ||
      input.form !== form ||
      hidden.form !== form ||
      input.closest("form") !== form ||
      hidden.closest("form") !== form ||
      status.closest("form") !== form ||
      owner.closest("form") !== form ||
      !form.contains(owner) ||
      !form.contains(input) ||
      !form.contains(hidden) ||
      !form.contains(status) ||
      !owner.contains(input) ||
      !owner.contains(hidden) ||
      !owner.contains(status) ||
      status === form ||
      status === input ||
      status === hidden
    ) {
      return null;
    }
    return owner;
  };

  const resolveSafeFileStatusTarget = (bindingOrSignature) => {
    const status = bindingOrSignature.status;
    const owner = resolveCapturedFileFieldOwner(bindingOrSignature);
    if (!owner || !(status instanceof HTMLElement) || status.childElementCount !== 0) {
      return null;
    }
    return status;
  };

  const setFileStatus = (bindingOrSignature, phase, safeText) => {
    const status = resolveSafeFileStatusTarget(bindingOrSignature);
    if (!status) return false;
    status.textContent = typeof safeText === "string" ? safeText : "";
    if (phase === "error") {
      status.setAttribute("role", "alert");
      status.setAttribute("aria-live", "assertive");
      return true;
    }
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    return true;
  };

  const failUnsafeFileStatusTarget = (form, binding) => {
    const ownerForm = binding.form;
    const state = binding.state;
    abortActiveSubmission(ownerForm);
    if (state.abortController) state.abortController.abort();
    state.generation += 1;
    const currentFiles = Array.from(binding.input.files || []);
    state.phase = currentFiles.length > 0 ? "selected" : "idle";
    state.files = [];
    state.ids = [];
    state.error = null;
    state.promise = null;
    state.abortController = null;
    binding.hidden.value = "";
    const ui = getFormFileUiState(ownerForm);
    ui.bindingInvalid = true;
    const errorNode = ownerForm.querySelector("[data-form-embed-error]");
    if (errorNode instanceof HTMLElement) {
      errorNode.textContent = FILE_BINDING_ERROR;
      errorNode.dataset.formErrorOwner = "file-binding";
      errorNode.classList.remove("hidden");
    }
    syncFormActionState(ownerForm);
    throw createSafeUploadError("file_selection_changed");
  };

  const createSafeUploadError = (code) => {
    const known =
      typeof code === "string" && Object.prototype.hasOwnProperty.call(SAFE_UPLOAD_COPY, code);
    const normalizedCode = known ? code : "upload_failed";
    const error = new Error(known ? SAFE_UPLOAD_COPY[normalizedCode] : DEFAULT_UPLOAD_COPY);
    error[SAFE_UPLOAD_ERROR_BRAND] = true;
    error.fileUploadCode = normalizedCode;
    return error;
  };

  const toSafeUploadError = (candidate) => {
    const code =
      typeof candidate === "string" && candidate.length <= 64
        ? candidate
        : candidate &&
            typeof candidate === "object" &&
            candidate[SAFE_UPLOAD_ERROR_BRAND] === true &&
            typeof candidate.fileUploadCode === "string"
          ? candidate.fileUploadCode
          : "upload_failed";
    return createSafeUploadError(code);
  };

  const createSafeSubmissionError = (code) => {
    const known =
      typeof code === "string" && Object.prototype.hasOwnProperty.call(SAFE_SUBMISSION_COPY, code);
    const normalizedCode = known ? code : "submission_failed";
    const error = new Error(known ? SAFE_SUBMISSION_COPY[normalizedCode] : DEFAULT_SUBMISSION_COPY);
    error[SAFE_SUBMISSION_ERROR_BRAND] = true;
    error.formSubmissionCode = normalizedCode;
    return error;
  };

  const toSafeSubmissionError = (candidate) => {
    let code = "submission_failed";
    if (candidate && typeof candidate === "object") {
      if (
        candidate[SAFE_SUBMISSION_ERROR_BRAND] === true &&
        typeof candidate.formSubmissionCode === "string"
      ) {
        code = candidate.formSubmissionCode;
      } else if (
        candidate[SAFE_UPLOAD_ERROR_BRAND] === true &&
        typeof candidate.fileUploadCode === "string"
      ) {
        code = candidate.fileUploadCode;
      } else if (
        candidate.error &&
        typeof candidate.error === "object" &&
        typeof candidate.error.code === "string" &&
        candidate.error.code.length <= 64
      ) {
        code = candidate.error.code;
      }
    } else if (typeof candidate === "string" && candidate.length <= 64) {
      code = candidate;
    }
    return createSafeSubmissionError(code);
  };

  const collectFormSecurityMarkerElements = (form) => {
    const elements = [];
    if (form.matches(FORM_SECURITY_MARKER_SELECTOR)) elements.push(form);
    elements.push(...Array.from(form.querySelectorAll(FORM_SECURITY_MARKER_SELECTOR)));
    elements.forEach((element) => formSecurityMarkerTombstones.add(element));
    return elements;
  };

  const isExactFormSecurityControl = (form, element, role) => {
    if (
      !(element instanceof HTMLInputElement) ||
      element.type !== "hidden" ||
      element.form !== form ||
      element.closest("form") !== form ||
      !form.contains(element)
    ) {
      return false;
    }
    if (role === "nonce") {
      return (
        element.name === "__nl_form_nonce" &&
        element.getAttribute("data-form-security-nonce") === "1" &&
        !element.hasAttribute("data-form-security-captcha")
      );
    }
    return (
      element.name === "captchaToken" &&
      element.getAttribute("data-form-security-captcha") === "1" &&
      !element.hasAttribute("data-form-security-nonce")
    );
  };

  const readExactNonceSecurityControl = (form) => {
    const nonceElements = collectFormSecurityMarkerElements(form).filter((element) =>
      element.hasAttribute("data-form-security-nonce")
    );
    if (
      nonceElements.length !== 1 ||
      !isExactFormSecurityControl(form, nonceElements[0], "nonce")
    ) {
      return null;
    }
    return nonceElements[0];
  };

  const readFormSecurityControls = (form, captchaSiteKey) => {
    const markerElements = collectFormSecurityMarkerElements(form);
    const nonceElements = markerElements.filter((element) =>
      element.hasAttribute("data-form-security-nonce")
    );
    const captchaElements = markerElements.filter((element) =>
      element.hasAttribute("data-form-security-captcha")
    );
    const captchaConfigured = captchaSiteKey.length > 0;
    if (
      nonceElements.length !== 1 ||
      captchaElements.length !== (captchaConfigured ? 1 : 0) ||
      markerElements.length !== nonceElements.length + captchaElements.length ||
      !isExactFormSecurityControl(form, nonceElements[0], "nonce") ||
      (captchaConfigured && !isExactFormSecurityControl(form, captchaElements[0], "captcha"))
    ) {
      return null;
    }
    return Object.freeze({
      nonceInput: nonceElements[0],
      captchaInput: captchaConfigured ? captchaElements[0] : null,
    });
  };

  const normalizeCaptchaAction = (form) => {
    const action = form.getAttribute("data-form-captcha-action") || "";
    if (action === "" || action === "public_write") return "public_write";
    return null;
  };

  const isCanonicalNonEmptyText = (value) => value.length > 0 && value === value.trim();

  const isCanonicalOptionalText = (value) => value === "" || value === value.trim();

  const normalizeFormAction = (form) => {
    try {
      const actionUrl = new URL(form.action, window.location.origin);
      if (
        actionUrl.origin !== window.location.origin ||
        actionUrl.search !== "" ||
        actionUrl.hash !== ""
      ) {
        return null;
      }
      return actionUrl.toString();
    } catch {
      return null;
    }
  };

  const buildExactPublicUrl = (expectedPath) => {
    try {
      const url = new URL(expectedPath, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        url.pathname !== expectedPath ||
        url.search !== "" ||
        url.hash !== ""
      ) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  };

  const capturePublicWriteContext = (form) => {
    const formId = form.dataset.formId || "";
    const captchaSiteKey = form.dataset.formCaptchaSiteKey || "";
    const captchaAction = normalizeCaptchaAction(form);
    const securityControls = readFormSecurityControls(form, captchaSiteKey);
    const formNonce = securityControls ? securityControls.nonceInput.value : "";
    if (
      !isCanonicalNonEmptyText(formId) ||
      formId === "." ||
      formId === ".." ||
      !isCanonicalNonEmptyText(formNonce) ||
      !isCanonicalOptionalText(captchaSiteKey) ||
      !captchaAction ||
      !securityControls
    ) {
      return null;
    }
    let encodedFormId;
    try {
      encodedFormId = encodeURIComponent(formId);
    } catch {
      return null;
    }
    const uploadPath = "/forms/" + encodedFormId + "/uploads";
    const submissionPath = "/forms/" + encodedFormId + "/submissions";
    const uploadUrl = buildExactPublicUrl(uploadPath);
    const submissionUrl = buildExactPublicUrl(submissionPath);
    if (!uploadUrl || !submissionUrl || normalizeFormAction(form) !== submissionUrl) return null;
    return Object.freeze({
      formId,
      formNonce,
      uploadUrl,
      submissionUrl,
      captchaSiteKey,
      captchaAction,
      securityControls,
    });
  };

  const assertPublicWriteContextStillCurrent = (form, context) => {
    const securityControls = readFormSecurityControls(form, context.captchaSiteKey);
    if (
      (form.dataset.formId || "") !== context.formId ||
      !securityControls ||
      securityControls.nonceInput !== context.securityControls.nonceInput ||
      securityControls.captchaInput !== context.securityControls.captchaInput ||
      securityControls.nonceInput.value !== context.formNonce ||
      normalizeFormAction(form) !== context.submissionUrl ||
      (form.dataset.formCaptchaSiteKey || "") !== context.captchaSiteKey ||
      normalizeCaptchaAction(form) !== context.captchaAction
    ) {
      throw createSafeSubmissionError("file_selection_changed");
    }
  };

  const awaitWithAbort = (promise, signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(createSafeUploadError("file_selection_changed"));
        return;
      }
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        callback(value);
      };
      const onAbort = () => finish(reject, createSafeUploadError("file_selection_changed"));
      signal.addEventListener("abort", onAbort, { once: true });
      Promise.resolve(promise).then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error)
      );
    });

  const resetStateValues = (state) => {
    state.phase = "idle";
    state.files = [];
    state.ids = [];
    state.error = null;
    state.promise = null;
    state.abortController = null;
  };

  const clearSignatureDom = (signature) => {
    signature.hidden.value = "";
    setFileStatus(signature, "neutral", "");
  };

  const resetFileStateToNeutral = (binding, options) => {
    const state = binding.state;
    if (state.abortController) state.abortController.abort();
    state.generation += 1;
    if (options && options.clearNative) binding.input.value = "";
    resetStateValues(state);
    binding.hidden.value = "";
    setFileStatus(binding, "neutral", "");
  };

  const failFileStateLocally = (binding, safeCode) => {
    const state = binding.state;
    if (state.abortController) state.abortController.abort();
    state.generation += 1;
    state.phase = "error";
    state.files = Array.from(binding.input.files || []);
    state.ids = [];
    state.error = safeCode;
    state.promise = null;
    state.abortController = null;
    binding.hidden.value = "";
    const error = createSafeUploadError(safeCode);
    if (!setFileStatus(binding, "error", error.message)) {
      failUnsafeFileStatusTarget(binding.form, binding);
    }
    return error;
  };

  const signaturesMatch = (left, right) =>
    left.form === right.form &&
    left.input === right.input &&
    left.identity === right.identity &&
    left.hidden === right.hidden &&
    left.status === right.status &&
    left.multiple === right.multiple;

  const getOrCreateFileFieldState = (input, signature) => {
    const owner = fileFieldStateByInput.get(input);
    if (owner && signaturesMatch(owner.signature, signature)) return owner.state;
    if (owner) {
      abortActiveSubmission(owner.signature.form);
      if (owner.state.abortController) owner.state.abortController.abort();
      owner.state.generation += 1;
      resetStateValues(owner.state);
      clearSignatureDom(owner.signature);
    }
    const state = {
      generation: 0,
      phase: "idle",
      files: [],
      ids: [],
      error: null,
      promise: null,
      abortController: null,
    };
    clearSignatureDom(signature);
    fileFieldStateByInput.set(input, { signature, state });
    return state;
  };

  const invalidateAndDeleteFileFieldState = (input, expectedForm) => {
    const owner = fileFieldStateByInput.get(input);
    if (!owner || owner.signature.form !== expectedForm) return;
    abortActiveSubmission(expectedForm);
    if (owner.state.abortController) owner.state.abortController.abort();
    owner.state.generation += 1;
    resetStateValues(owner.state);
    clearSignatureDom(owner.signature);
    fileFieldStateByInput.delete(input);
  };

  const sameOrderedFiles = (left, right) =>
    left.length === right.length && left.every((file, index) => file === right[index]);

  const serializeFileIds = (binding, ids) => {
    if (
      ids.length !== Array.from(binding.input.files || []).length ||
      ids.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id)) ||
      (!binding.multiple && ids.length > 1)
    ) {
      throw createSafeUploadError("form_upload_invalid");
    }
    return binding.multiple ? JSON.stringify(ids) : ids[0] || "";
  };

  const decodeFileHiddenValue = (binding) => {
    const raw = binding.hidden.value;
    if (raw === "") return binding.multiple ? [] : "";
    if (!binding.multiple) return UUID_PATTERN.test(raw) ? raw : FILE_VALUE_INVALID;
    try {
      const parsed = JSON.parse(raw);
      if (
        !Array.isArray(parsed) ||
        parsed.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id)) ||
        JSON.stringify(parsed) !== raw
      ) {
        return FILE_VALUE_INVALID;
      }
      return parsed;
    } catch {
      return FILE_VALUE_INVALID;
    }
  };

  const synchronizeSilentSelectionChange = (binding) => {
    const state = binding.state;
    const currentFiles = Array.from(binding.input.files || []);
    if (
      (state.phase === "uploading" || state.phase === "complete") &&
      !sameOrderedFiles(currentFiles, state.files)
    ) {
      if (state.abortController) state.abortController.abort();
      state.generation += 1;
      state.phase = currentFiles.length > 0 ? "selected" : "idle";
      state.files = [];
      state.ids = [];
      state.error = null;
      state.promise = null;
      state.abortController = null;
      binding.hidden.value = "";
      setFileStatus(binding, "neutral", "");
    }
  };

  const hasCanonicalStateValue = (binding) => {
    const state = binding.state;
    let expected = "";
    if (state.phase === "complete") {
      if (!sameOrderedFiles(Array.from(binding.input.files || []), state.files)) return false;
      try {
        expected = serializeFileIds(binding, state.ids);
      } catch {
        return false;
      }
    }
    return binding.hidden.value === expected && decodeFileHiddenValue(binding) !== FILE_VALUE_INVALID;
  };

  const FILE_MARKER_SELECTOR =
    "[data-form-file-input], [data-form-file-value], [data-form-file-status], [data-form-file-multiple]";

  const collectFileMarkerElements = (form) => {
    const elements = [];
    if (form.matches(FILE_MARKER_SELECTOR)) elements.push(form);
    elements.push(...Array.from(form.querySelectorAll(FILE_MARKER_SELECTOR)));
    return elements;
  };

  const hasExactFileMarkerRoles = (element, expectedNames) => {
    const actualNames = Array.from(element.attributes)
      .map((attribute) => attribute.name)
      .filter((name) => name.startsWith("data-form-file-"))
      .sort();
    const normalizedExpected = expectedNames.slice().sort();
    return (
      actualNames.length === normalizedExpected.length &&
      actualNames.every((name, index) => name === normalizedExpected[index])
    );
  };

  const pushInvalid = (invalidIdentities) => {
    if (invalidIdentities.length < 32) invalidIdentities.push("invalid");
  };

  const recomputeFileBindingRegistry = (form) => {
    const previousRegistry = fileBindingRegistryByForm.get(form);
    const markerElements = collectFileMarkerElements(form);
    const groups = new Map();
    const invalidIdentities = [];

    markerElements.forEach((element) => {
      fileMarkerTombstones.add(element);
      const roles = [];
      if (element.hasAttribute("data-form-file-input")) {
        roles.push(["inputs", element.getAttribute("data-form-file-input") || ""]);
      }
      if (element.hasAttribute("data-form-file-value")) {
        roles.push(["hidden", element.getAttribute("data-form-file-value") || ""]);
      }
      if (element.hasAttribute("data-form-file-status")) {
        roles.push(["statuses", element.getAttribute("data-form-file-status") || ""]);
      }
      if (roles.length === 0 || roles.some((entry) => !entry[1])) pushInvalid(invalidIdentities);
      roles.forEach(([role, identity]) => {
        if (!identity) return;
        const group = groups.get(identity) || { inputs: [], hidden: [], statuses: [] };
        group[role].push(element);
        groups.set(identity, group);
      });
      if (element.hasAttribute("data-form-file-multiple") && roles.length === 0) {
        pushInvalid(invalidIdentities);
      }
    });

    const valid = [];
    const bindingByHidden = new WeakMap();
    const bindingByInput = new WeakMap();
    const validInputs = new Set();

    groups.forEach((group, identity) => {
      if (group.inputs.length !== 1 || group.hidden.length !== 1 || group.statuses.length !== 1) {
        pushInvalid(invalidIdentities);
        return;
      }
      const input = group.inputs[0];
      const hidden = group.hidden[0];
      const status = group.statuses[0];
      const statusPairValid =
        (status.getAttribute("role") === "status" && status.getAttribute("aria-live") === "polite") ||
        (status.getAttribute("role") === "alert" &&
          status.getAttribute("aria-live") === "assertive");
      const inputMultiple = input.getAttribute("data-form-file-multiple");
      const hiddenMultiple = hidden.getAttribute("data-form-file-multiple");
      const expectedMultiple = input instanceof HTMLInputElement && input.multiple ? "1" : "0";
      const inputContainer = input.closest("[data-form-field]");
      const inputVisible = !(
        input.disabled ||
        (inputContainer instanceof HTMLElement &&
          (inputContainer.hidden || inputContainer.dataset.logicVisible === "0"))
      );
      const requiredOriginal = input.getAttribute("data-required-original");
      const fieldOwner = input.closest("[data-form-field]");
      const validRoles =
        input instanceof HTMLInputElement &&
        input.type === "file" &&
        hidden instanceof HTMLInputElement &&
        hidden.type === "hidden" &&
        status instanceof HTMLElement &&
        !(status instanceof HTMLInputElement) &&
        input !== hidden &&
        input !== status &&
        hidden !== status;
      const validFieldOwner =
        fieldOwner instanceof HTMLElement &&
        fieldOwner !== form &&
        fieldOwner !== input &&
        fieldOwner !== hidden &&
        fieldOwner !== status &&
        hidden.closest("[data-form-field]") === fieldOwner &&
        status.closest("[data-form-field]") === fieldOwner &&
        fieldOwner.contains(input) &&
        fieldOwner.contains(hidden) &&
        fieldOwner.contains(status) &&
        status instanceof HTMLElement &&
        status.childElementCount === 0;
      const validMarkers =
        inputMultiple !== null &&
        hiddenMultiple !== null &&
        (inputMultiple === "0" || inputMultiple === "1") &&
        inputMultiple === hiddenMultiple &&
        inputMultiple === expectedMultiple &&
        !status.hasAttribute("data-form-file-multiple") &&
        hasExactFileMarkerRoles(input, ["data-form-file-input", "data-form-file-multiple"]) &&
        hasExactFileMarkerRoles(hidden, ["data-form-file-value", "data-form-file-multiple"]) &&
        hasExactFileMarkerRoles(status, ["data-form-file-status"]);
      const validOwnership =
        input.closest("form") === form &&
        hidden.closest("form") === form &&
        status.closest("form") === form &&
        input.form === form &&
        hidden.form === form &&
        input.name === "" &&
        hidden.name === identity &&
        (requiredOriginal === "0" || requiredOriginal === "1") &&
        input.required === (inputVisible && requiredOriginal === "1") &&
        input.getAttribute("aria-required") === (requiredOriginal === "1" ? "true" : null) &&
        !hidden.required &&
        !hidden.hasAttribute("aria-required") &&
        !hidden.hasAttribute("data-required-original") &&
        hidden.disabled === input.disabled;
      if (
        !validRoles ||
        !validFieldOwner ||
        !validMarkers ||
        !validOwnership ||
        !statusPairValid
      ) {
        pushInvalid(invalidIdentities);
        return;
      }

      const multiple = inputMultiple === "1";
      const signature = { form, input, identity, hidden, status, multiple };
      const state = getOrCreateFileFieldState(input, signature);
      const binding = Object.freeze({ form, identity, input, hidden, status, multiple, state });
      synchronizeSilentSelectionChange(binding);
      if (!hasCanonicalStateValue(binding)) {
        pushInvalid(invalidIdentities);
        return;
      }
      valid.push(binding);
      validInputs.add(input);
      bindingByHidden.set(hidden, binding);
      bindingByInput.set(input, binding);
    });

    if (previousRegistry) {
      previousRegistry.valid.forEach((binding) => {
        if (!validInputs.has(binding.input)) invalidateAndDeleteFileFieldState(binding.input, form);
      });
    }

    const registry = Object.freeze({
      valid: Object.freeze(valid.slice()),
      bindingByHidden,
      bindingByInput,
      invalidIdentities: Object.freeze(invalidIdentities.slice()),
      markerElements: Object.freeze(markerElements.slice()),
    });
    fileBindingRegistryByForm.set(form, registry);
    return registry;
  };

  const hideNode = (node) => {
    if (!(node instanceof HTMLElement)) return;
    node.classList.add("hidden");
  };

  const showNode = (node) => {
    if (!(node instanceof HTMLElement)) return;
    node.classList.remove("hidden");
  };

  const failWriteContextLocally = (form, registry, safeCode) => {
    let hasSelectedFile = false;
    registry.valid.forEach((binding) => {
      if (
        !isFileBindingStructurallyVisible(binding) ||
        !binding.input.files ||
        binding.input.files.length === 0
      ) {
        return;
      }
      hasSelectedFile = true;
      failFileStateLocally(
        binding,
        safeCode === "form_nonce_required" ? "form_nonce_required" : "form_upload_invalid"
      );
    });
    if (!hasSelectedFile) {
      const errorNode = form.querySelector("[data-form-embed-error]");
      if (errorNode instanceof HTMLElement) {
        errorNode.textContent = toSafeSubmissionError(safeCode).message;
        errorNode.dataset.formErrorOwner = "submission";
        showNode(errorNode);
      }
    }
    syncFormActionState(form);
  };

  const applyFileBindingRegistry = (form, registry) => {
    const ui = getFormFileUiState(form);
    const errorNode = form.querySelector("[data-form-embed-error]");
    if (registry.invalidIdentities.length > 0) {
      abortActiveSubmission(form);
      registry.valid.forEach((binding) => {
        invalidateAndDeleteFileFieldState(binding.input, form);
      });
      ui.bindingInvalid = true;
      if (errorNode instanceof HTMLElement) {
        errorNode.textContent = FILE_BINDING_ERROR;
        errorNode.dataset.formErrorOwner = "file-binding";
        showNode(errorNode);
      }
      syncFormActionState(form);
      return null;
    }
    ui.bindingInvalid = false;
    if (errorNode instanceof HTMLElement && errorNode.dataset.formErrorOwner === "file-binding") {
      delete errorNode.dataset.formErrorOwner;
      hideNode(errorNode);
    }
    syncFormActionState(form);
    return true;
  };

  const requireValidFileBindings = (form) => {
    const registry = recomputeFileBindingRegistry(form);
    return applyFileBindingRegistry(form, registry) ? registry : null;
  };

  const carriesFileMarker = (element) =>
    element.hasAttribute("data-form-file-input") ||
    element.hasAttribute("data-form-file-value") ||
    element.hasAttribute("data-form-file-status") ||
    element.hasAttribute("data-form-file-multiple");

  const readNamedValue = (input, registry) => {
    const binding = registry ? registry.bindingByHidden.get(input) : undefined;
    if (carriesFileMarker(input) && !binding) return SKIP_VALUE;
    if (binding) {
      if (input !== binding.hidden || input.name !== binding.identity) return SKIP_VALUE;
      const decoded = decodeFileHiddenValue(binding);
      return decoded === FILE_VALUE_INVALID ? SKIP_VALUE : decoded;
    }
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

  const setOwnDynamicValue = (target, key, value) => {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  };

  const getFormFields = (form, registry, securityControls) => {
    const validatedSecurityControls =
      securityControls === undefined
        ? readFormSecurityControls(form, form.dataset.formCaptchaSiteKey || "")
        : securityControls;
    const nonceInput = validatedSecurityControls?.nonceInput;
    const captchaInput = validatedSecurityControls?.captchaInput;
    return Array.from(form.elements).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (
        !(element instanceof HTMLInputElement) &&
        !(element instanceof HTMLTextAreaElement) &&
        !(element instanceof HTMLSelectElement)
      ) {
        return false;
      }
      if (element instanceof HTMLInputElement && element.type === "file") return false;
      if (registry && registry.bindingByHidden.get(element)) {
        return Boolean(element.name);
      }
      if (fileMarkerTombstones.has(element) || carriesFileMarker(element)) return false;
      if (
        element === nonceInput ||
        element === captchaInput ||
        formSecurityMarkerTombstones.has(element) ||
        element.hasAttribute("data-form-security-nonce") ||
        element.hasAttribute("data-form-security-captcha")
      ) {
        return false;
      }
      if (!element.name) return false;
      return true;
    });
  };

  const getFieldContainers = (form) =>
    Array.from(form.querySelectorAll("[data-form-field]")).filter(
      (element) => element instanceof HTMLElement
    );

  const collectValues = (form, registry) => {
    const values = {};
    getFormFields(form, registry).forEach((field) => {
      const value = readNamedValue(field, registry);
      if (value === null || value === SKIP_VALUE) return;
      setOwnDynamicValue(values, field.name, value);
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
    const actualRaw = Object.hasOwn(values, fieldName) ? values[fieldName] : undefined;
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

  const resolveFileBindingVisibility = (binding) => {
    const container = resolveCapturedFileFieldOwner(binding);
    if (!container) {
      return { valid: false, visible: false };
    }
    const logicVisible = container.getAttribute("data-logic-visible");
    if (logicVisible !== "0" && logicVisible !== "1") {
      return { valid: false, visible: false };
    }
    const visible = logicVisible === "1";
    return { valid: container.hidden === !visible, visible };
  };

  const isFileBindingStructurallyVisible = (binding) => {
    const visibility = resolveFileBindingVisibility(binding);
    return visibility.valid && visibility.visible;
  };

  const isFileBindingUploadable = (binding) =>
    isFileBindingStructurallyVisible(binding) &&
    !binding.input.disabled &&
    !binding.hidden.disabled;

  const invalidateFileSelection = (form, binding, registry) => {
    abortActiveSubmission(form);
    const state = binding.state;
    if (state.abortController) state.abortController.abort();
    state.generation += 1;
    state.phase = binding.input.files && binding.input.files.length > 0 ? "selected" : "idle";
    state.files = [];
    state.ids = [];
    state.error = null;
    state.promise = null;
    state.abortController = null;
    binding.hidden.value = "";
    setFileStatus(binding, "neutral", "");
    persistProgress(form, registry);
  };

  const clearFileBindingForInvisibility = (form, binding, registry) => {
    const state = binding.state;
    const needsReset =
      (binding.input.files && binding.input.files.length > 0) ||
      binding.input.value !== "" ||
      binding.hidden.value !== "" ||
      state.phase !== "idle" ||
      binding.status.textContent !== "";
    if (!needsReset) return;
    abortActiveSubmission(form);
    resetFileStateToNeutral(binding, { clearNative: true });
    persistProgress(form, registry);
  };

  const resetFileBinding = (binding) => {
    resetFileStateToNeutral(binding, { clearNative: true });
  };

  const refreshConditionalFields = (form, registry) => {
    const values = collectValues(form, registry);
    const containers = getFieldContainers(form);
    containers.forEach((container) => {
      const visible = evaluateFieldLogic(container, values);
      setFieldVisibility(container, visible);
    });
    registry.valid.forEach((binding) => {
      if (!isFileBindingStructurallyVisible(binding)) {
        clearFileBindingForInvisibility(form, binding, registry);
      }
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

  const persistProgress = (form, registry) => {
    if (form.dataset.formSaveProgress !== "1") return;
    const key = getProgressKey(form);
    if (!key) return;

    const values = {};
    getFormFields(form, registry).forEach((field) => {
      if (registry && registry.bindingByHidden.get(field)) return;
      const value = readNamedValue(field, registry);
      if (value === null || value === SKIP_VALUE) return;
      setOwnDynamicValue(values, field.name, value);
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

  const hydrateProgress = (form, registry) => {
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

    getFormFields(form, registry).forEach((field) => {
      if (registry && registry.bindingByHidden.get(field)) return;
      if (!Object.hasOwn(values, field.name)) return;
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

  const validateCurrentStep = (form, registry) => {
    collectValues(form, registry);
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

  const validateStepsThroughCurrent = (form, registry) => {
    collectValues(form, registry);
    const steps = getStepElements(form);
    if (steps.length <= 1) return validateCurrentStep(form, registry);
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

  const isCurrentFileGeneration = (binding, state, generation, files) =>
    state.generation === generation &&
    sameOrderedFiles(state.files, files) &&
    sameOrderedFiles(Array.from(binding.input.files || []), files);

  const uploadCurrentSelection = async (form, binding, registry, writeContext) => {
    const state = binding.state;
    const ui = getFormFileUiState(form);
    if (!isFileBindingUploadable(binding)) {
      clearFileBindingForInvisibility(form, binding, registry);
      return [];
    }

    const files = Array.from(binding.input.files || []);
    if (!binding.multiple && files.length > 1) {
      throw failFileStateLocally(binding, "file_selection_invalid");
    }
    if (files.length > MAX_FILES_PER_FIELD) {
      throw failFileStateLocally(binding, "file_selection_invalid");
    }
    if (files.length === 0) {
      if (binding.input.required) {
        binding.input.reportValidity();
        throw failFileStateLocally(binding, "file_selection_invalid");
      }
      resetFileStateToNeutral(binding, { clearNative: false });
      return [];
    }

    if (state.phase === "uploading" && sameOrderedFiles(files, state.files)) {
      return state.promise;
    }
    if (state.phase === "complete" && sameOrderedFiles(files, state.files)) {
      const serialized = serializeFileIds(binding, state.ids);
      if (binding.hidden.value !== serialized) {
        throw failFileStateLocally(binding, "form_upload_invalid");
      }
      return state.ids.slice();
    }
    if (state.phase === "uploading" || state.phase === "complete") {
      if (state.abortController) state.abortController.abort();
      state.generation += 1;
      state.phase = "selected";
      state.files = [];
      state.ids = [];
      state.error = null;
      state.promise = null;
      state.abortController = null;
      binding.hidden.value = "";
      if (!setFileStatus(binding, "neutral", "")) {
        failUnsafeFileStatusTarget(form, binding);
      }
    }

    const generation = state.generation;
    if (
      !setFileStatus(
        binding,
        "progress",
        files.length > 1 ? "Uploading files..." : "Uploading file..."
      )
    ) {
      failUnsafeFileStatusTarget(form, binding);
    }
    state.phase = "uploading";
    state.files = files.slice();
    state.ids = [];
    state.error = null;
    binding.hidden.value = "";
    const controller = new AbortController();
    state.abortController = controller;

    const capturedPromise = (async () => {
      const ids = [];
      try {
        for (const file of files) {
          let captchaToken = "";
          if (writeContext.captchaSiteKey) {
            try {
              const token = await awaitWithAbort(
                executeRecaptcha(writeContext.captchaSiteKey, writeContext.captchaAction),
                controller.signal
              );
              captchaToken = typeof token === "string" ? token.trim() : "";
              if (!captchaToken) throw createSafeUploadError("bot_protection_failed");
            } catch (error) {
              if (
                error &&
                error[SAFE_UPLOAD_ERROR_BRAND] === true &&
                error.fileUploadCode === "file_selection_changed"
              ) {
                throw error;
              }
              throw createSafeUploadError("bot_protection_failed");
            }
          }
          if (!isCurrentFileGeneration(binding, state, generation, files)) {
            throw createSafeUploadError("file_selection_changed");
          }

          const body = new FormData();
          body.append("fieldName", binding.identity);
          body.append("file", file, file.name);
          body.append("formNonce", writeContext.formNonce);
          if (captchaToken) body.append("captchaToken", captchaToken);

          let response;
          try {
            response = await awaitWithAbort(
              fetch(writeContext.uploadUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: { Accept: "application/json" },
                signal: controller.signal,
                body,
              }),
              controller.signal
            );
          } catch (error) {
            throw toSafeUploadError(error);
          }
          const result = await awaitWithAbort(
            response.json().catch(() => null),
            controller.signal
          );
          if (!response.ok) {
            const code =
              result &&
              typeof result === "object" &&
              result.error &&
              typeof result.error === "object" &&
              typeof result.error.code === "string"
                ? result.error.code
                : "upload_failed";
            throw toSafeUploadError(code);
          }
          if (!isCurrentFileGeneration(binding, state, generation, files)) {
            throw createSafeUploadError("file_selection_changed");
          }
          const id = result && typeof result === "object" ? result.id : null;
          if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
            throw createSafeUploadError("upload_failed");
          }
          ids.push(id);
        }

        if (!isCurrentFileGeneration(binding, state, generation, files)) {
          throw createSafeUploadError("file_selection_changed");
        }
        const serialized = serializeFileIds(binding, ids);
        if (!setFileStatus(binding, "complete", "Upload complete.")) {
          failUnsafeFileStatusTarget(form, binding);
        }
        state.ids = ids.slice();
        state.error = null;
        binding.hidden.value = serialized;
        state.phase = "complete";
        return ids.slice();
      } catch (error) {
        const safeError = toSafeUploadError(error);
        if (!isCurrentFileGeneration(binding, state, generation, files)) {
          throw createSafeUploadError("file_selection_changed");
        }
        if (!setFileStatus(binding, "error", safeError.message || DEFAULT_UPLOAD_COPY)) {
          failUnsafeFileStatusTarget(form, binding);
        }
        state.phase = "error";
        state.files = files.slice();
        state.ids = [];
        state.error = safeError.fileUploadCode;
        binding.hidden.value = "";
        throw safeError;
      }
    })();

    state.promise = capturedPromise;
    ui.pendingUploads.add(capturedPromise);
    syncFormActionState(form);
    try {
      return await capturedPromise;
    } finally {
      ui.pendingUploads.delete(capturedPromise);
      if (state.promise === capturedPromise) state.promise = null;
      if (state.abortController === controller) state.abortController = null;
      syncFormActionState(form);
    }
  };

  const preflightFileCardinality = (form, registry) => {
    for (const binding of registry.valid) {
      if (!isFileBindingUploadable(binding)) continue;
      const files = Array.from(binding.input.files || []);
      if ((!binding.multiple && files.length > 1) || files.length > MAX_FILES_PER_FIELD) {
        throw failFileStateLocally(binding, "file_selection_invalid");
      }
    }
  };

  const prepareFilesBeforeSubmission = async (form, registry, writeContext) => {
    preflightFileCardinality(form, registry);
    for (const binding of registry.valid) {
      await uploadCurrentSelection(form, binding, registry, writeContext);
    }
    const snapshots = [];
    for (const binding of registry.valid) {
      const visible = isFileBindingStructurallyVisible(binding);
      const files = Array.from(binding.input.files || []);
      if (visible && files.length > 0) {
        if (
          binding.state.phase !== "complete" ||
          !sameOrderedFiles(files, binding.state.files) ||
          binding.state.ids.length !== files.length
        ) {
          throw createSafeUploadError("file_selection_changed");
        }
      }
      if (visible && binding.input.required && binding.state.phase !== "complete") {
        throw createSafeUploadError("file_selection_invalid");
      }
      snapshots.push(
        Object.freeze({
          binding,
          generation: binding.state.generation,
          visible,
          files: Object.freeze(files.slice()),
          ids: Object.freeze(binding.state.ids.slice()),
        })
      );
    }
    return Object.freeze(snapshots);
  };

  const sameElementSet = (left, right) =>
    left.length === right.length && left.every((element) => right.includes(element));

  const validateLiveFileRegistry = (form, registry) => {
    if (fileBindingRegistryByForm.get(form) !== registry) return false;
    const markerElements = collectFileMarkerElements(form);
    if (!sameElementSet(markerElements, registry.markerElements)) return false;
    if (registry.invalidIdentities.length > 0) return false;

    for (const binding of registry.valid) {
      const owner = fileFieldStateByInput.get(binding.input);
      const visibility = resolveFileBindingVisibility(binding);
      const visible = visibility.visible;
      const requiredOriginal = binding.input.getAttribute("data-required-original");
      const expectedMultiple = binding.multiple ? "1" : "0";
      const statusPairValid =
        (binding.status.getAttribute("role") === "status" &&
          binding.status.getAttribute("aria-live") === "polite") ||
        (binding.status.getAttribute("role") === "alert" &&
          binding.status.getAttribute("aria-live") === "assertive");
      if (
        !owner ||
        owner.state !== binding.state ||
        !signaturesMatch(owner.signature, {
          form,
          input: binding.input,
          identity: binding.identity,
          hidden: binding.hidden,
          status: binding.status,
          multiple: binding.multiple,
        }) ||
        !binding.input.isConnected ||
        !binding.hidden.isConnected ||
        !binding.status.isConnected ||
        binding.input.closest("form") !== form ||
        binding.hidden.closest("form") !== form ||
        binding.status.closest("form") !== form ||
        binding.input.form !== form ||
        binding.hidden.form !== form ||
        binding.input.type !== "file" ||
        binding.hidden.type !== "hidden" ||
        binding.input.name !== "" ||
        binding.hidden.name !== binding.identity ||
        binding.input.getAttribute("data-form-file-input") !== binding.identity ||
        binding.hidden.getAttribute("data-form-file-value") !== binding.identity ||
        binding.status.getAttribute("data-form-file-status") !== binding.identity ||
        binding.input.getAttribute("data-form-file-multiple") !== expectedMultiple ||
        binding.hidden.getAttribute("data-form-file-multiple") !== expectedMultiple ||
        binding.status.hasAttribute("data-form-file-multiple") ||
        !hasExactFileMarkerRoles(binding.input, [
          "data-form-file-input",
          "data-form-file-multiple",
        ]) ||
        !hasExactFileMarkerRoles(binding.hidden, [
          "data-form-file-value",
          "data-form-file-multiple",
        ]) ||
        !hasExactFileMarkerRoles(binding.status, ["data-form-file-status"]) ||
        resolveSafeFileStatusTarget(binding) !== binding.status ||
        binding.input.multiple !== binding.multiple ||
        !visibility.valid ||
        (requiredOriginal !== "0" && requiredOriginal !== "1") ||
        binding.input.required !== (visible && requiredOriginal === "1") ||
        binding.input.getAttribute("aria-required") !==
          (requiredOriginal === "1" ? "true" : null) ||
        binding.input.disabled !== !visible ||
        binding.hidden.disabled !== !visible ||
        binding.hidden.required ||
        binding.hidden.hasAttribute("aria-required") ||
        binding.hidden.hasAttribute("data-required-original") ||
        !statusPairValid ||
        !hasCanonicalStateValue(binding)
      ) {
        return false;
      }
    }
    return true;
  };

  const assertPreparedFilesStillCurrent = (form, registry, snapshots) => {
    if (!validateLiveFileRegistry(form, registry) || snapshots.length !== registry.valid.length) {
      throw createSafeUploadError("file_selection_changed");
    }
    snapshots.forEach((snapshot, index) => {
      const binding = registry.valid[index];
      const state = binding.state;
      if (
        snapshot.binding !== binding ||
        snapshot.visible !== isFileBindingStructurallyVisible(binding) ||
        snapshot.generation !== state.generation ||
        !sameOrderedFiles(snapshot.files, Array.from(binding.input.files || [])) ||
        !sameOrderedFiles(snapshot.files, state.files) ||
        snapshot.ids.length !== state.ids.length ||
        snapshot.ids.some((id, idIndex) => id !== state.ids[idIndex])
      ) {
        throw createSafeUploadError("file_selection_changed");
      }
      if (snapshot.visible && snapshot.files.length > 0 && state.phase !== "complete") {
        throw createSafeUploadError("file_selection_changed");
      }
      if (snapshot.visible && binding.input.required && state.phase !== "complete") {
        throw createSafeUploadError("file_selection_invalid");
      }
    });
  };

  const toPayload = (form, registry, writeContext, finalCaptchaToken) => {
    const data = {};

    getFormFields(form, registry, writeContext.securityControls).forEach((field) => {
      if (field.disabled) return;
      const value = readNamedValue(field, registry);
      if (value === null || value === SKIP_VALUE) return;
      setOwnDynamicValue(data, field.name, value);
    });

    return {
      data,
      formNonce: writeContext.formNonce,
      captchaToken:
        typeof finalCaptchaToken === "string" && finalCaptchaToken.length > 0
          ? finalCaptchaToken
          : undefined,
    };
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

    const initialRegistry = recomputeFileBindingRegistry(form);
    const initialRegistryValid = applyFileBindingRegistry(form, initialRegistry);
    hydrateProgress(form, initialRegistry);
    if (initialRegistryValid) refreshConditionalFields(form, initialRegistry);
    clampRestoredStep(form);
    refreshStepUi(form);
    syncFormActionState(form);

    const successNode = form.querySelector("[data-form-embed-success]");
    const errorNode = form.querySelector("[data-form-embed-error]");

    const handleFieldEvent = (event) => {
      const ui = getFormFileUiState(form);
      if (ui.submissionController) abortActiveSubmission(form);
      const registry = requireValidFileBindings(form);
      if (!registry) return;
      const target = event.target;
      const fileBinding =
        target instanceof HTMLInputElement ? registry.bindingByInput.get(target) : undefined;
      if (fileBinding) invalidateFileSelection(form, fileBinding, registry);
      refreshConditionalFields(form, registry);
      persistProgress(form, registry);
    };

    form.addEventListener("input", handleFieldEvent);
    form.addEventListener("change", handleFieldEvent);

    form.addEventListener("reset", () => {
      abortActiveSubmission(form);
      const finishReset = () => {
        const registry = recomputeFileBindingRegistry(form);
        registry.valid.forEach((binding) => resetFileBinding(binding));
        const valid = applyFileBindingRegistry(form, registry);
        setCurrentStep(form, 1);
        if (valid) {
          refreshConditionalFields(form, registry);
          if (errorNode instanceof HTMLElement) {
            delete errorNode.dataset.formErrorOwner;
            hideNode(errorNode);
          }
        }
        refreshStepUi(form);
        syncFormActionState(form);
      };
      if (typeof window.queueMicrotask === "function") {
        window.queueMicrotask(finishReset);
      } else {
        window.setTimeout(finishReset, 0);
      }
    });

    const nextButton = form.querySelector('[data-form-nav="next"]');
    if (nextButton instanceof HTMLElement) {
      nextButton.addEventListener("click", () => {
        const ui = getFormFileUiState(form);
        if (ui.submitting || ui.pendingUploads.size > 0) return;
        const registry = requireValidFileBindings(form);
        if (!registry) return;
        refreshConditionalFields(form, registry);
        if (!validateCurrentStep(form, registry)) return;
        persistProgress(form, registry);
        const nextStep = getCurrentStep(form) + 1;
        setCurrentStep(form, nextStep);
        refreshStepUi(form);
        persistProgress(form, registry);
      });
    }

    const backButton = form.querySelector('[data-form-nav="back"]');
    if (backButton instanceof HTMLElement) {
      backButton.addEventListener("click", () => {
        const ui = getFormFileUiState(form);
        if (ui.submitting || ui.pendingUploads.size > 0) return;
        const registry = requireValidFileBindings(form);
        if (!registry) return;
        refreshConditionalFields(form, registry);
        persistProgress(form, registry);
        const nextStep = getCurrentStep(form) - 1;
        setCurrentStep(form, nextStep);
        refreshStepUi(form);
        persistProgress(form, registry);
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const ui = getFormFileUiState(form);
      if (ui.submitting) return;
      const registry = requireValidFileBindings(form);
      if (!registry) return;
      refreshConditionalFields(form, registry);
      if (!validateStepsThroughCurrent(form, registry)) return;

      const writeContext = capturePublicWriteContext(form);
      if (!writeContext) {
        const formId = form.dataset.formId || "";
        const nonceInput = readExactNonceSecurityControl(form);
        const nonceFailure =
          isCanonicalNonEmptyText(formId) && (!nonceInput || nonceInput.value.length === 0);
        failWriteContextLocally(
          form,
          registry,
          nonceFailure ? "form_nonce_required" : "submission_failed"
        );
        return;
      }

      const attemptController = new AbortController();
      ui.submissionController = attemptController;
      ui.submitting = true;
      syncFormActionState(form);
      hideNode(errorNode);
      hideNode(successNode);
      if (errorNode instanceof HTMLElement) delete errorNode.dataset.formErrorOwner;
      const compatibilityCaptchaInput = writeContext.securityControls.captchaInput;
      if (compatibilityCaptchaInput instanceof HTMLInputElement) {
        compatibilityCaptchaInput.value = "";
      }

      try {
        const preparedFiles = await prepareFilesBeforeSubmission(form, registry, writeContext);
        if (attemptController.signal.aborted) {
          throw createSafeSubmissionError("file_selection_changed");
        }
        let finalCaptchaToken = "";
        if (writeContext.captchaSiteKey) {
          try {
            const token = await awaitWithAbort(
              executeRecaptcha(writeContext.captchaSiteKey, writeContext.captchaAction),
              attemptController.signal
            );
            finalCaptchaToken = typeof token === "string" ? token.trim() : "";
            if (!finalCaptchaToken) {
              throw createSafeSubmissionError("bot_protection_failed");
            }
          } catch (error) {
            if (
              error &&
              error[SAFE_UPLOAD_ERROR_BRAND] === true &&
              error.fileUploadCode === "file_selection_changed"
            ) {
              throw error;
            }
            if (
              error &&
              error[SAFE_SUBMISSION_ERROR_BRAND] === true &&
              error.formSubmissionCode === "file_selection_changed"
            ) {
              throw error;
            }
            throw createSafeSubmissionError("bot_protection_failed");
          }
          if (compatibilityCaptchaInput instanceof HTMLInputElement) {
            compatibilityCaptchaInput.value = finalCaptchaToken;
          }
        }

        if (attemptController.signal.aborted) {
          throw createSafeSubmissionError("file_selection_changed");
        }
        assertPublicWriteContextStillCurrent(form, writeContext);
        assertPreparedFilesStillCurrent(form, registry, preparedFiles);
        const payload = toPayload(form, registry, writeContext, finalCaptchaToken);
        const responseRequest = fetch(writeContext.submissionUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: attemptController.signal,
          body: JSON.stringify(payload),
        });
        const response = await awaitWithAbort(responseRequest, attemptController.signal);

        const result = await awaitWithAbort(
          response.json().catch(() => null),
          attemptController.signal
        );
        if (!response.ok) {
          throw toSafeSubmissionError(result);
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
          refreshStepUi(form);
        } else if (successBehavior === "show-message-keep-form") {
          showFormBody(form);
        } else {
          hideFormBody(form);
        }
      } catch (error) {
        const ownsFileBindingError =
          errorNode instanceof HTMLElement &&
          ui.bindingInvalid &&
          errorNode.dataset.formErrorOwner === "file-binding";
        if (errorNode instanceof HTMLElement && !ownsFileBindingError) {
          errorNode.textContent = toSafeSubmissionError(error).message;
          errorNode.dataset.formErrorOwner = "submission";
          showNode(errorNode);
        }
      } finally {
        if (ui.submissionController === attemptController) {
          ui.submissionController = null;
          ui.submitting = false;
        }
        syncFormActionState(form);
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
