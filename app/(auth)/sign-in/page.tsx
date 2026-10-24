import { Suspense } from "react";
import type { Metadata } from "next";

import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/components/forms/login-form";
import { redirectSignedInUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  await redirectSignedInUser();

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-md overflow-hidden rounded-[32px] border border-[var(--surface-border)] bg-[var(--surface)] shadow-[0_30px_90px_var(--shadow-color)] lg:max-w-5xl lg:grid-cols-2">
        {/* Brand panel: large screens only; phones get the mark above the form. */}
        <section
          aria-hidden
          className="relative hidden flex-col items-center justify-center gap-8 overflow-hidden bg-[image:var(--hero-accent)] p-12 text-white lg:flex"
        >
          <div className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <BrandMark decorative className="relative h-64 w-64 drop-shadow-[0_12px_30px_rgba(0,0,0,0.25)]" />
          <p className="relative max-w-xs text-center text-lg leading-8 text-white/85">
            Savings, loans and membership in one place.
          </p>
        </section>

        <section className="flex flex-col justify-center gap-8 p-8 sm:p-10 lg:p-14">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <BrandMark className="h-24 w-24 text-[var(--accent-ink)] lg:hidden" />
            <p className="mt-4 text-sm font-bold tracking-[0.2em] text-[var(--accent-ink)] lg:mt-0">
              HLUSCA
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-base text-[var(--muted-foreground)]">
              Sign in to your account.
            </p>
          </div>

          <Suspense
            fallback={
              <p className="text-sm text-[var(--muted-foreground)]">Loading sign-in…</p>
            }
          >
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-[var(--muted-foreground)] lg:text-left">
            New or locked out? Contact your Administrator.
          </p>
        </section>
      </div>
    </main>
  );
}
