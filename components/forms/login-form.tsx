"use client";

import { startTransition, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
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

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/dashboard",
    [searchParams],
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    startTransition(async () => {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        setError("Invalid credentials. Check your identifier and password.");
        setIsPending(false);
        return;
      }

      window.location.assign(result.url ?? callbackUrl);
    });
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your username, phone, email, or member number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="identifier">Identifier</Label>
            <Input
              id="identifier"
              name="identifier"
              autoComplete="username"
              placeholder="HLUSCA-000001 or your username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#8a1f1f]">
              {error}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Signing in..." : "Access dashboard"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
