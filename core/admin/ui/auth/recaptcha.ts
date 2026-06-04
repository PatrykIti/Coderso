let scriptPromise: Promise<void> | null = null;
let scriptSiteKey: string | null = null;

const loadScript = (siteKey: string) => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha?.execute) return Promise.resolve();
  if (scriptPromise && scriptSiteKey === siteKey) return scriptPromise;

  scriptSiteKey = siteKey;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      scriptSiteKey = null;
      reject(new Error("recaptcha_load_failed"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
};

const waitUntilReady = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (!window.grecaptcha?.execute) {
      reject(new Error("recaptcha_unavailable"));
      return;
    }
    if (typeof window.grecaptcha.ready !== "function") {
      resolve();
      return;
    }
    window.grecaptcha.ready(() => resolve());
  });

export async function preloadRecaptcha(siteKey: string) {
  const normalizedSiteKey = siteKey.trim();
  if (!normalizedSiteKey) throw new Error("recaptcha_site_key_missing");
  await loadScript(normalizedSiteKey);
  await waitUntilReady();
}

export async function executeRecaptcha(siteKey: string, action: string) {
  const normalizedSiteKey = siteKey.trim();
  await preloadRecaptcha(normalizedSiteKey);
  if (!window.grecaptcha?.execute) {
    throw new Error("recaptcha_unavailable");
  }
  return window.grecaptcha.execute(normalizedSiteKey, { action });
}

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
