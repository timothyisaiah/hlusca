import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeToggle className="fixed right-4 top-4 z-20 bg-[var(--surface-glass)] backdrop-blur" />
      {children}
    </>
  );
}
