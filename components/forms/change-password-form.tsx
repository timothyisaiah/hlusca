"use client";

import { startTransition, useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    startTransition(async () => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "We could not change your password.");
        setIsPending(false);
        return;
      }

      setSuccess("Password updated. You’ll be signed out so the new session can start cleanly.");
      setIsPending(false);

      setTimeout(() => {
        void signOut({ callbackUrl: "/sign-in" });
      }, 900);
    });
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Change your password</CardTitle>
        <CardDescription>
          Your account is flagged for a required password update before you can continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="replacement-password">New password</Label>
            <Input
              id="replacement-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#8a1f1f]">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-2xl bg-[#edfdf2] px-4 py-3 text-sm text-[#1d6d42]">
              {success}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
