const runtimeClientScript = String.raw`(() => {
  if (typeof window === "undefined") return;
  if ((window).__nextlessListingRuntimeClient) return;
  (window).__nextlessListingRuntimeClient = true;

  const LISTING_FORM_SELECTOR = "form[data-listing-runtime-form]";
  const GLOBAL_SEARCH_FORM_SELECTOR = "form[data-global-search-form]";

  const escapeCss = (value) => {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  };

  const toParamName = (queryId, token) => "lq." + queryId + "." + token;

  const clearQueryPrefix = (searchParams, prefix) => {
    const keys = Array.from(searchParams.keys());
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        searchParams.delete(key);
      }
    });
  };

  const readControlValues = (control) => {
    if (!(control instanceof HTMLElement)) return [];
    if (control instanceof HTMLInputElement) {
      if (control.type === "checkbox") {
        return control.checked ? [control.value] : [];
      }
      if (control.type === "radio") {
        return control.checked ? [control.value] : [];
      }
      const value = control.value.trim();
      return value ? [value] : [];
    }
    if (control instanceof HTMLSelectElement) {
      if (control.multiple) {
        return Array.from(control.selectedOptions)
          .map((option) => option.value.trim())
          .filter(Boolean);
      }
      const value = control.value.trim();
      return value ? [value] : [];
    }
    if (control instanceof HTMLTextAreaElement) {
      const value = control.value.trim();
      return value ? [value] : [];
    }
    return [];
  };

  const syncListingFormToUrl = (form, url) => {
    const queryId = (form.dataset.listingQueryId || "").trim();
    if (!queryId) return;

    const prefix = "lq." + queryId + ".";
    clearQueryPrefix(url.searchParams, prefix);

    const controls = Array.from(form.querySelectorAll("[data-listing-token]"));
    const valueMap = new Map();

    controls.forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      const token = (control.dataset.listingToken || "").trim();
      if (!token) return;
      const values = readControlValues(control);
      if (values.length === 0) return;
      const current = valueMap.get(token) || [];
      valueMap.set(token, current.concat(values));
    });

    valueMap.forEach((values, token) => {
      if (!Array.isArray(values) || values.length === 0) return;
      const deduped = Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
      if (deduped.length === 0) return;
      url.searchParams.set(toParamName(queryId, token), deduped.join(","));
    });
  };

  const replaceListingBlocksFromHtml = (queryId, html) => {
    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(html, "text/html");
    const selector =
      '[data-listing-query-id="' + escapeCss(queryId) + '"]';
    const currentBlocks = Array.from(document.querySelectorAll(selector));

    currentBlocks.forEach((current) => {
      const blockId = (current.getAttribute("data-listing-block-id") || "").trim();
      if (!blockId) return;
      const next = nextDoc.querySelector(
        '[data-listing-block-id="' + escapeCss(blockId) + '"]'
      );
      if (next) {
        current.replaceWith(next);
      }
    });
  };

  const runListingRefresh = async (queryId, targetUrl, pushHistory) => {
    try {
      const response = await fetch(targetUrl.toString(), {
        headers: {
          "x-nextless-runtime": "listing",
        },
      });
      if (!response.ok) {
        window.location.assign(targetUrl.toString());
        return;
      }
      const html = await response.text();
      replaceListingBlocksFromHtml(queryId, html);
      if (pushHistory) {
        window.history.pushState({}, "", targetUrl.toString());
      }
      bindListingForms();
      bindGlobalSearchForms();
    } catch {
      window.location.assign(targetUrl.toString());
    }
  };

  const submitListingForm = (form, pushHistory) => {
    const queryId = (form.dataset.listingQueryId || "").trim();
    if (!queryId) return;
    const nextUrl = new URL(window.location.href);
    syncListingFormToUrl(form, nextUrl);
    void runListingRefresh(queryId, nextUrl, pushHistory);
  };

  const bindListingForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.listingRuntimeBound === "1") return;
    form.dataset.listingRuntimeBound = "1";

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitListingForm(form, true);
    });

    form.addEventListener("change", (event) => {
      const autoApply = form.dataset.listingAutoApply !== "0";
      if (!autoApply) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.hasAttribute("data-listing-token")) return;
      submitListingForm(form, true);
    });
  };

  const bindListingForms = () => {
    const forms = Array.from(document.querySelectorAll(LISTING_FORM_SELECTOR));
    forms.forEach((form) => bindListingForm(form));
  };

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderGlobalResults = (form, payload) => {
    const boxId = (form.dataset.searchBoxId || "").trim();
    if (!boxId) return;
    const container = document.querySelector(
      '[data-global-search-results="' + escapeCss(boxId) + '"]'
    );
    if (!(container instanceof HTMLElement)) return;

    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length === 0) {
      container.innerHTML =
        '<p class="text-sm text-[var(--color-text)]/70">No results found.</p>';
      return;
    }

    const html = items
      .map((item) => {
        const title = escapeHtml(item?.title || "Untitled");
        const href = escapeHtml(item?.href || "#");
        const source = escapeHtml(item?.source || "result");
        return '<a class="block rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-surface)]/40" href="' +
          href +
          '"><span class="block font-medium">' +
          title +
          '</span><span class="mt-1 inline-block rounded-full border border-[var(--color-border)]/80 px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--color-text)]/65">' +
          source +
          "</span></a>";
      })
      .join("");

    container.innerHTML = '<div class="space-y-2">' + html + "</div>";
  };

  const runGlobalSearch = async (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    const endpoint = (form.dataset.searchEndpoint || "/api/search").trim();
    const qInput = form.querySelector('input[name="q"]');
    if (!(qInput instanceof HTMLInputElement)) return;
    const query = qInput.value.trim();
    if (query.length < 2) {
      renderGlobalResults(form, { items: [] });
      return;
    }

    const selectedSources = Array.from(
      form.querySelectorAll('input[name="sources"]')
    )
      .filter((input) => input instanceof HTMLInputElement && input.checked)
      .map((input) => input.value)
      .filter(Boolean);

    const targetUrl = new URL(endpoint, window.location.origin);
    targetUrl.searchParams.set("q", query);
    if (selectedSources.length > 0) {
      targetUrl.searchParams.set("sources", selectedSources.join(","));
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      renderGlobalResults(form, { items: [] });
      return;
    }
    const payload = await response.json();
    renderGlobalResults(form, payload);
  };

  const bindGlobalSearchForm = (form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.globalSearchBound === "1") return;
    form.dataset.globalSearchBound = "1";

    let debounceTimer = null;
    const schedule = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void runGlobalSearch(form);
      }, 220);
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void runGlobalSearch(form);
    });

    form.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "q") return;
      schedule();
    });

    form.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.name !== "sources") return;
      void runGlobalSearch(form);
    });
  };

  const bindGlobalSearchForms = () => {
    const forms = Array.from(document.querySelectorAll(GLOBAL_SEARCH_FORM_SELECTOR));
    forms.forEach((form) => bindGlobalSearchForm(form));
  };

  window.addEventListener("popstate", () => {
    const queryIds = Array.from(
      new Set(
        Array.from(document.querySelectorAll("[data-listing-query-id]"))
          .map((node) => (node.getAttribute("data-listing-query-id") || "").trim())
          .filter(Boolean)
      )
    );

    const targetUrl = new URL(window.location.href);
    queryIds.forEach((queryId) => {
      void runListingRefresh(queryId, targetUrl, false);
    });
  });

  bindListingForms();
  bindGlobalSearchForms();
})();`;

export function getListingRuntimeClientScript() {
  return runtimeClientScript;
}
