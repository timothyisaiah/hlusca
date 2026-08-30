"use client";

import { startTransition, useState } from "react";
import { useSearchParams } from "next/navigation";

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

type ResetChannel = "EMAIL" | "SMS" | "ADMIN_ASSISTED" | null;

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get("identifier") ?? "");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [channel, setChannel] = useState<ResetChannel>(null);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRequestMessage(null);
    setIsRequesting(true);

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier }),
      });

      const payload = (await response.json()) as {
        error?: string;
        channel?: ResetChannel;
        previewToken?: string | null;
      };

      if (!response.ok) {
        setError(payload.error ?? "We could not start the reset flow.");
        setIsRequesting(false);
        return;
      }

      setChannel(payload.channel ?? null);
      setPreviewToken(payload.previewToken ?? null);
      setRequestMessage(
        "If an account matches, reset instructions were prepared. Use the code or token you received below.",
      );
      setIsRequesting(false);
    });
  }

  async function confirmReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setConfirmMessage(null);
    setIsConfirming(true);

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, token, newPassword }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Reset confirmation failed.");
        setIsConfirming(false);
        return;
      }

      setConfirmMessage(
        "Password reset complete. You can return to sign in with your new password.",
      );
      setIsConfirming(false);
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Reset access</CardTitle>
        <CardDescription>
          We’ll route recovery through email, SMS, or administrator-assisted support based on the account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={requestReset}>
          <div className="space-y-2">
            <Label htmlFor="reset-identifier">Identifier</Label>
            <Input
              id="reset-identifier"
              placeholder="Username, phone, email, or member number"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </div>
          <Button className="w-full" type="submit" disabled={isRequesting}>
            {isRequesting ? "Preparing reset..." : "Send reset instructions"}
          </Button>
        </form>

        {requestMessage ? (
          <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted-foreground)]">
            <p>{requestMessage}</p>
            {channel ? (
              <p className="mt-2 font-medium text-[var(--foreground)]">
                Channel: {channel.replace("_", " ")}
              </p>
            ) : null}
            {previewToken ? (
              <p className="mt-3 rounded-2xl bg-[#fdf3c6] px-4 py-3 font-mono text-xs text-[#634200]">
                Development preview token: {previewToken}
              </p>
            ) : null}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={confirmReset}>
          <div className="space-y-2">
            <Label htmlFor="reset-token">Reset token or OTP</Label>
            <Input
              id="reset-token"
              placeholder="Paste the reset token or code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Choose a strong new password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <Button className="w-full" type="submit" disabled={isConfirming}>
            {isConfirming ? "Applying reset..." : "Set new password"}
          </Button>
        </form>

        {error ? (
          <p className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#8a1f1f]">
            {error}
          </p>
        ) : null}

        {confirmMessage ? (
          <p className="rounded-2xl bg-[#edfdf2] px-4 py-3 text-sm text-[#1d6d42]">
            {confirmMessage}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
