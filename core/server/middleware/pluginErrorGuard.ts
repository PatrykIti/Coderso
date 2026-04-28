import { recordPluginFailure } from "../../plugins/pluginManager";

function resolveTimeout() {
  const parsed = Number.parseInt(process.env.PLUGIN_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5000;
  return parsed;
}

export async function runWithTimeout<T>(work: Promise<T>, ms: number = resolveTimeout()) {
  return Promise.race([
    work,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("plugin_timeout")), ms)
    ),
  ]);
}

export async function runPluginSafe<T>(input: {
  pluginName: string;
  action: () => Promise<T>;
  timeoutMs?: number;
}) {
  try {
    return await runWithTimeout(input.action(), input.timeoutMs ?? resolveTimeout());
  } catch (error) {
    await recordPluginFailure(input.pluginName, error);
    return null;
  }
}
