let scriptPromise: Promise<void> | null = null;

const loadScript = (siteKey: string) => {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("recaptcha_load_failed"));
    document.head.appendChild(script);
  });

  return scriptPromise;
};

export async function executeRecaptcha(siteKey: string, action: string) {
  await loadScript(siteKey);
  if (!window.grecaptcha?.execute) {
    throw new Error("recaptcha_unavailable");
  }
  return window.grecaptcha.execute(siteKey, { action });
}

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
