import { deepFreezeExact, invariant } from "./foundation.mjs";

const HOST_REQUIRED_INHERITED_ENV = Object.freeze(["PATH"]);
const HOST_OPTIONAL_INHERITED_ENV = Object.freeze([
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "TMPDIR",
  "TMP",
  "TEMP",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "XDG_CONFIG_HOME",
  "XDG_CACHE_HOME",
  "XDG_DATA_HOME",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
]);
const HOST_REQUIRED_REPO_ENV = Object.freeze([
  "DATABASE_URL",
  "PII_HASH_KEY",
  "PII_ENC_KEY",
  "MEDIA_SECRET_MASTER_KEY",
]);
const HOST_OPTIONAL_REPO_ENV = Object.freeze([
  "CORE_VERSION",
  "DB_POOL_MAX",
  "AUTH_PASSWORD_PEPPER",
  "ANALYTICS_IP_HASH_SECRET",
  "FORM_SUBMIT_NONCE_SECRET",
  "FORM_SUBMIT_NONCE_TTL_MINUTES",
  "ANALYTICS_BEACON_NONCE_SECRET",
  "ANALYTICS_BEACON_NONCE_TTL_MINUTES",
  "MEDIA_BASE_URL",
  "MEDIA_ALLOWED_MIME",
  "MEDIA_MAX_SIZE_BYTES",
  "EMAIL_TRANSPORT",
  "THEMES_DIR",
  "PLUGINS_RUNTIME_DIR",
  "PLUGINS_SAFE_MODE",
  "PLUGIN_UPDATE_MODE",
  "PLUGIN_ERROR_THRESHOLD",
  "PLUGIN_TIMEOUT_MS",
  "PLUGIN_DOWNLOAD_TIMEOUT_MS",
  "PLUGIN_MAX_SIZE_MB",
  "STORE_BASE_URL",
  "STORE_PUBLIC_KEY",
]);
const HOST_FIXED_ENV = deepFreezeExact({
  PORT: "3000",
  PUBLIC_BASE_URL: "http://coderso-a.localhost:3000",
  NODE_ENV: "development",
  COOKIE_SECURE: "false",
  VITE_DEV_SERVER_URL: "http://127.0.0.1:5173",
  VITE_SITE_DEV_SERVER_URL: "http://127.0.0.1:5174",
  VITE_API_ORIGIN: "http://127.0.0.1:3000",
  VITE_ADMIN_STRICT_MODE: "false",
  CODERSO_PUBLIC_VITE_DEV_URL: "http://coderso-a.localhost:5173",
  CI: "true",
});
const BROWSER_OPTIONAL_INHERITED_ENV = Object.freeze([
  "USER",
  "LOGNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "COLORTERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
]);
const BROWSER_FIXED_TIMEOUT_ENV = deepFreezeExact({
  PLAYWRIGHT_MCP_TIMEOUT_ACTION: "90000",
  PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION: "540000",
});

function ownString(source, key, { required = false } = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor) {
    invariant(!required, "required environment value is missing: " + key);
    return null;
  }
  invariant(
    Object.hasOwn(descriptor, "value") &&
      typeof descriptor.value === "string" &&
      (!required || descriptor.value.length > 0),
    "environment value is invalid: " + key
  );
  return descriptor.value;
}

function applyFixedBrowserTimeoutEnvironment(target, repoEnvironment, inheritedEnvironment) {
  invariant(
    target !== null &&
      typeof target === "object" &&
      Object.getPrototypeOf(target) === null &&
      repoEnvironment !== null &&
      typeof repoEnvironment === "object" &&
      inheritedEnvironment !== null &&
      typeof inheritedEnvironment === "object",
    "fixed browser timeout environment input drift"
  );
  for (const [key, value] of Object.entries(BROWSER_FIXED_TIMEOUT_ENV)) {
    const inherited = ownString(inheritedEnvironment, key);
    const repo = ownString(repoEnvironment, key);
    invariant(
      inherited === null || inherited === value,
      "fixed inherited browser timeout environment conflict: " + key
    );
    invariant(
      repo === null || repo === value,
      "fixed repo browser timeout environment conflict: " + key
    );
    invariant(!Object.hasOwn(target, key), "fixed browser timeout environment key was preset");
    target[key] = value;
  }
  return target;
}

function assertStorageFallbackEnvironmentAbsent(repoEnvironment, inheritedEnvironment) {
  invariant(
    repoEnvironment !== null &&
      typeof repoEnvironment === "object" &&
      inheritedEnvironment !== null &&
      typeof inheritedEnvironment === "object" &&
      !Object.hasOwn(repoEnvironment, "MEDIA_STORAGE") &&
      !Object.hasOwn(repoEnvironment, "MEDIA_DIR") &&
      ownString(inheritedEnvironment, "MEDIA_STORAGE") === null &&
      ownString(inheritedEnvironment, "MEDIA_DIR") === null,
    "storage fallback environment must be absent"
  );
}

function buildExactHostEnvironment(repoEnvironment) {
  const result = Object.create(null);
  for (const key of HOST_REQUIRED_INHERITED_ENV)
    result[key] = ownString(process.env, key, { required: true });
  for (const key of HOST_OPTIONAL_INHERITED_ENV) {
    const value = ownString(process.env, key);
    if (value !== null) result[key] = value;
  }
  for (const key of HOST_REQUIRED_REPO_ENV)
    result[key] = ownString(repoEnvironment, key, { required: true });
  for (const key of HOST_OPTIONAL_REPO_ENV) {
    const value = ownString(repoEnvironment, key);
    if (value !== null) result[key] = value;
  }
  for (const [key, value] of Object.entries(HOST_FIXED_ENV)) {
    const inherited = ownString(process.env, key);
    const repo = ownString(repoEnvironment, key);
    invariant(
      inherited === null || inherited === value,
      "fixed inherited host environment conflict: " + key
    );
    invariant(repo === null || repo === value, "fixed repo host environment conflict: " + key);
    result[key] = value;
  }
  return Object.freeze(result);
}

export {
  BROWSER_FIXED_TIMEOUT_ENV,
  BROWSER_OPTIONAL_INHERITED_ENV,
  applyFixedBrowserTimeoutEnvironment,
  assertStorageFallbackEnvironmentAbsent,
  buildExactHostEnvironment,
  ownString,
};
