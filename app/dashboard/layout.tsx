import { Sidebar } from "@/components/layout/sidebar";
import { requireCurrentUser } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 lg:grid-cols-[320px_1fr]">
        <Sidebar user={user} />
        <main className="rounded-[32px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,251,251,0.92))] p-6 shadow-[0_32px_80px_rgba(15,23,42,0.08)] md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
