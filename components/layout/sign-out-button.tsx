"use client";

import { useTransition } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOut({
            callbackUrl: "/sign-in",
          });
        })
      }
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
