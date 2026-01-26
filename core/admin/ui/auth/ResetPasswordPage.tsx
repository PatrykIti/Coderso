import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthShell } from "@/ui/layouts/AuthShell";
import { InfoBanner } from "@/ui/auth/InfoBanner";

export function ResetPasswordPage() {
  return (
    <AuthShell
      mobileBrand={
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Layers className="h-5 w-5" />
          </span>
          <span className="text-xl font-semibold">Nextless CMS</span>
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
            <p className="text-sm text-muted-foreground">
              Recover access to your Nextless account.
            </p>
          </div>
          <InfoBanner
            title="Need help?"
            description="Enter your email to receive a secure reset link. It will expire in 1 hour."
          />
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email address
              </label>
              <Input id="email" type="email" placeholder="name@company.com" />
              <p className="text-xs text-muted-foreground">
                Use the email associated with your account.
              </p>
            </div>
            <Button className="w-full" type="submit">
              Send reset link
            </Button>
            <Button className="w-full" type="button" variant="ghost">
              Back to login
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Separator />
          <p className="text-xs text-muted-foreground">
            For security reasons, this link expires in 1 hour.
          </p>
        </CardFooter>
      </Card>
    </AuthShell>
  );
}
