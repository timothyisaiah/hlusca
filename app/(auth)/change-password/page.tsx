import { BrandMark } from "@/components/brand/brand-mark";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { requireCurrentUser } from "@/lib/auth/server";

export const metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  await requireCurrentUser({
    allowPasswordChange: true,
  });

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex flex-col items-center gap-2">
          <BrandMark className="h-16 w-16 text-[var(--accent-ink)]" />
          <p className="text-sm font-bold tracking-[0.2em] text-[var(--accent-ink)]">HLUSCA</p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
