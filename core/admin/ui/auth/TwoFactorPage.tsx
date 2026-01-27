import { useState } from "react";
import { AlertCircle, CheckCircle, KeyRound, QrCode } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { OtpInput } from "@/ui/auth/OtpInput";
import { RecoveryCodesPanel } from "@/ui/auth/RecoveryCodesPanel";
import { isApiClientError } from "@/services/apiClient";
import { verifyOtp } from "@/services/authClient";

type TwoFactorPageProps = {
  initialError?: string;
};

export function TwoFactorPage({ initialError = "" }: TwoFactorPageProps) {
  const [otp, setOtp] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await verifyOtp(
        useRecovery ? { recoveryCode } : { code: otp }
      );
      if (typeof window !== "undefined") {
        window.location.assign("/admin");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell contentClassName="max-w-2xl">
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Two-factor authentication</h1>
            <p className="text-sm text-muted-foreground">
              Secure your account with an authenticator app.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-10">
          <section className="space-y-4 text-center">
            <Badge variant="secondary" className="gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                1
              </span>
              Scan QR Code
            </Badge>
            <p className="text-sm text-muted-foreground">
              Use an app like Google Authenticator or Authy to scan the code.
            </p>
            <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-xl border bg-muted/40">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
          </section>
          <section className="space-y-4 text-center">
            <Badge variant="secondary" className="gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                2
              </span>
              Enter Verification Code
            </Badge>
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {useRecovery ? (
              <div className="space-y-3">
                <Input
                  placeholder="Enter recovery code"
                  value={recoveryCode}
                  onChange={(event) => setRecoveryCode(event.target.value)}
                />
                <Button
                  variant="ghost"
                  onClick={() => setUseRecovery(false)}
                >
                  Use authenticator code instead
                </Button>
              </div>
            ) : (
              <OtpInput value={otp} onChange={setOtp} />
            )}
            <Button
              className="w-full max-w-sm gap-2"
              onClick={handleVerify}
              disabled={loading}
            >
              <CheckCircle className="h-4 w-4" />
              {loading
                ? "Verifying..."
                : useRecovery
                  ? "Verify recovery code"
                  : "Verify & Enable"}
            </Button>
            {!useRecovery ? (
              <Button variant="ghost" onClick={() => setUseRecovery(true)}>
                Use a recovery code
              </Button>
            ) : null}
          </section>
          <section>
            <RecoveryCodesPanel />
          </section>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
