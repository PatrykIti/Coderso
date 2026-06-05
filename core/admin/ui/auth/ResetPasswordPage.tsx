import { useEffect, useState } from "react";
import { AlertCircle, Layers } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
    <AuthShell
      mobileBrand={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </span>
          <span className="text-xl font-semibold">Coderso CMS</span>
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a className="hover:text-foreground" href="#">
            Privacy Policy
          </a>
          <a className="hover:text-foreground" href="#">
            Terms of Service
          </a>
          <a className="hover:text-foreground" href="#">
            Help Center
          </a>
        </div>
      }
    >
      <Card className="border-border/60 shadow-lg">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Reset password</h1>
            <p className="text-sm text-muted-foreground">Recover access to your Coderso account.</p>
          </div>
          {success ? (
            <InfoBanner
              title="Reset link sent"
              description="Check your inbox for a secure reset link."
            />
          ) : (
            <InfoBanner
              title="Need help?"
              description="Enter your email to receive a secure reset link."
            />
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use the email associated with your account.
              </p>
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
            <Button className="w-full" type="button" variant="ghost" asChild>
              <a href={withAdminBasePath(basePath, "/login")}>Back to login</a>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Separator />
          <p className="text-xs text-muted-foreground">
            For security reasons, reset links expire after the configured reset window.
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
