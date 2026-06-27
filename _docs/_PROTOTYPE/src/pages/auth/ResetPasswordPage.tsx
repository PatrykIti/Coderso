import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/lib/router";

export function ResetPasswordPage() {
  return (
    <Card className="p-7 shadow-card">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-semibold">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&rsquo;ll send a reset link.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" defaultValue="patryk@coderso.dev" />
        </div>
        <Link to="/reset/confirm">
          <Button className="w-full" size="lg">
            Send reset link
          </Button>
        </Link>
      </form>

      <p className="mt-5 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </p>
    </Card>
  );
}
