import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { SsoButtons } from "@/ui/auth/SsoButtons";
import { isApiClientError } from "@/services/apiClient";
import {
  getAuthBotProtection,
  login,
  toFieldErrors,
  type BotProtectionConfig,
} from "@/services/authClient";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";
import { executeRecaptcha, preloadRecaptcha } from "@/ui/auth/recaptcha";

type LoginPageProps = {
  initialEmail?: string;
  initialError?: string;
};

export function LoginPage({ initialEmail = "", initialError = "" }: LoginPageProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [botConfig, setBotConfig] = useState<BotProtectionConfig | null>(null);

  useEffect(() => {
    let active = true;
    getAuthBotProtection()
      .then((config) => {
        if (!active) return;
        setBotConfig(config);
        if (config.enabled && config.siteKey) {
          void preloadRecaptcha(config.siteKey).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!active) return;
        setBotConfig({
          enabled: false,
          provider: "recaptcha_v3",
          siteKey: null,
          enforceOnLocalhost: true,
        });
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setLoading(true);

    try {
      let captchaToken: string | undefined = undefined;
      if (botConfig?.enabled) {
        if (!botConfig.siteKey) {
          setError("reCAPTCHA is enabled but missing the site key.");
          return;
        }
        captchaToken = await executeRecaptcha(botConfig.siteKey, "login");
      }

      await login({ email, password, captchaToken });
      if (typeof window !== "undefined") {
        const basePath = resolveAdminBasePath();
        window.location.assign(withAdminBasePath(basePath, "/"));
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        setFieldErrors(toFieldErrors(err));
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="p-7 shadow-card">
        <div className="mb-6 text-center">
          <h2 className="font-display text-xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to Coderso</p>
        </div>

        <SsoButtons />

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or continue with email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? (
              <p className="text-xs text-destructive">{fieldErrors.email}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <a
                className="text-xs font-medium text-primary hover:underline"
                href={withAdminBasePath(resolveAdminBasePath(), "/reset")}
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => setRemember(Boolean(checked))}
            />
            Keep me signed in
          </label>
          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
