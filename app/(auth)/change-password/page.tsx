import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { requireCurrentUser } from "@/lib/auth/server";

export default async function ChangePasswordPage() {
  await requireCurrentUser({
    allowPasswordChange: true,
  });

  return (
    <main className="app-grid flex min-h-screen items-center justify-center px-4 py-10">
      <ChangePasswordForm />
    </main>
  );
}
