import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { InfoBanner } from "@/ui/auth/InfoBanner";
import { isApiClientError } from "@/services/apiClient";
import {
  getAuthBotProtection,
  requestPasswordReset,
  type BotProtectionConfig,
} from "@/services/authClient";
import { resolveAdminBasePath, withAdminBasePath } from "@/utils/adminPaths";
import { executeRecaptcha, preloadRecaptcha } from "@/ui/auth/recaptcha";

type ResetPasswordPageProps = {
  initialEmail?: string;
  initialError?: string;
};

export function ResetPasswordPage({
  initialEmail = "",
  initialError = "",
}: ResetPasswordPageProps) {
  const basePath = resolveAdminBasePath();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(initialError);

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
    setLoading(true);
    setSuccess(false);
    try {
      let captchaToken: string | undefined = undefined;
      if (botConfig?.enabled) {
        if (!botConfig.siteKey) {
          setError("reCAPTCHA is enabled but missing the site key.");
          return;
        }
        captchaToken = await executeRecaptcha(botConfig.siteKey, "reset");
      }

      await requestPasswordReset({ email, captchaToken });
      setSuccess(true);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Unable to send reset link. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Card className="p-7 shadow-card">
        <div className="mb-6 text-center">
          <h2 className="font-display text-xl font-semibold">Reset password</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email and we&rsquo;ll send a reset link.
          </p>
        </div>
        {success ? (
          <div className="mb-4">
            <InfoBanner
              title="Reset link sent"
              description="Check your inbox for a secure reset link."
            />
          </div>
        ) : null}
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
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use the email associated with your account.
            </p>
          </div>
          <Button className="w-full" size="lg" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <p className="mt-5 text-center">
          <a
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            href={withAdminBasePath(basePath, "/login")}
          >
            <ArrowLeft className="size-4" /> Back to sign in
          </a>
        </p>
      </Card>
    </AuthShell>
  );
}
