import { Suspense } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";
import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex flex-col items-center gap-2">
          <BrandMark className="h-16 w-16 text-[var(--accent-ink)]" />
          <p className="text-sm font-bold tracking-[0.2em] text-[var(--accent-ink)]">HLUSCA</p>
        </div>
        <Suspense
          fallback={
            <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[0_24px_70px_var(--shadow-color)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                Loading recovery form...
              </p>
            </div>
          }
        >
          <ForgotPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-semibold text-[var(--accent)]">
            Return to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
