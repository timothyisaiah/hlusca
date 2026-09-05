import { Suspense } from "react";
import Link from "next/link";

import { LoginForm } from "@/components/forms/login-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { redirectSignedInUser } from "@/lib/auth/server";

export default async function SignInPage() {
  await redirectSignedInUser();

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardContent className="relative flex h-full flex-col justify-between gap-10 p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(15,107,120,0.18),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(217,172,53,0.16),transparent_28%)]" />
            <div className="relative space-y-6">
              <Badge>Member portal</Badge>
              <div className="max-w-2xl space-y-5">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                  Your savings, loans, and membership in one place.
                </h1>
                <p className="max-w-xl text-base leading-8 text-[var(--muted-foreground)]">
                  Check your savings, follow your loan applications, and review and sign your loan agreements from your HLUSCA account.
                </p>
              </div>
            </div>

            <div className="relative grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Savings and loans
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                  View your transactions and repayment schedules, with updates as your loan moves through review, approval, and disbursement.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Need access?
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                  Contact your Administrator to enroll or recover access. You can sign in with your username, phone, email, or member number.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Suspense
            fallback={
              <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[0_24px_70px_rgba(18,35,45,0.08)]">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Loading sign-in form...
                </p>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="font-semibold text-[var(--accent)]">
              Start a reset
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
