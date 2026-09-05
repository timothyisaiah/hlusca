"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

type SignOutButtonProps = {
  compact?: boolean;
};

export function SignOutButton({ compact = false }: SignOutButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className={compact ? "min-h-[44px] min-w-[44px] rounded-2xl p-0" : "w-full"}
      disabled={isPending}
      aria-label="Sign out"
      title="Sign out"
      onClick={() =>
        startTransition(async () => {
          await signOut({
            callbackUrl: "/sign-in",
          });
        })
      }
    >
      {compact ? <LogOut className="h-4 w-4" /> : isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
