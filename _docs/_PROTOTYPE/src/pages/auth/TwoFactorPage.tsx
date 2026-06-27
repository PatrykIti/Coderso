import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/lib/router";

const DIGITS = ["3", "", "", "", "", ""];

export function TwoFactorPage() {
  return (
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
        <div className="flex items-center justify-center gap-2">
          {DIGITS.map((value, index) => (
            <Input
              key={index}
              defaultValue={value}
              maxLength={1}
              inputMode="numeric"
              aria-label={`Digit ${index + 1}`}
              className={
                index === 0
                  ? "h-14 w-12 text-center text-lg ring-2 ring-ring"
                  : "h-14 w-12 text-center text-lg"
              }
            />
          ))}
        </div>

        <Link to="/">
          <Button className="w-full" size="lg">
            Verify
          </Button>
        </Link>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Didn&rsquo;t get a code?{" "}
        <button type="button" className="font-medium text-primary hover:underline">
          Resend
        </button>
      </p>
      <p className="mt-1 text-center text-sm">
        <Link to="/2fa" className="font-medium text-primary hover:underline">
          Use a backup code
        </Link>
      </p>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
