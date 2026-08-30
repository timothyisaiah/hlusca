import { Suspense } from "react";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl space-y-4">
        <Suspense
          fallback={
            <div className="rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] p-8 shadow-[0_24px_70px_rgba(18,35,45,0.08)]">
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
