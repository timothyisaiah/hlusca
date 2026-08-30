"use client";

import { startTransition, useState } from "react";
import Link from "next/link";

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
import { Textarea } from "@/components/ui/textarea";

type EnrollmentResult = {
  member: {
    id: string;
    memberNumber: string;
  };
  temporaryPassword: string;
  deliveryMethod: string;
};

export function EnrollMemberForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    address: "",
    nationalIdNumber: "",
    nextOfKinName: "",
    nextOfKinPhone: "",
    dateOfBirth: "",
    photoUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<EnrollmentResult | null>(null);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsPending(true);

    startTransition(async () => {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as
        | EnrollmentResult
        | { error?: string };

      if (!response.ok) {
        setError((payload as { error?: string }).error ?? "Enrollment failed.");
        setIsPending(false);
        return;
      }

      setResult(payload as EnrollmentResult);
      setIsPending(false);
      setForm({
        firstName: "",
        lastName: "",
        username: "",
        phone: "",
        email: "",
        address: "",
        nationalIdNumber: "",
        nextOfKinName: "",
        nextOfKinPhone: "",
        dateOfBirth: "",
        photoUrl: "",
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enroll a new member</CardTitle>
        <CardDescription>
          This creates the member profile, linked login, and savings account in one audited action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone in E.164</Label>
            <Input
              id="phone"
              placeholder="+256700123456"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Optional"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => updateField("dateOfBirth", event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="national-id">National ID</Label>
            <Input
              id="national-id"
              value={form.nationalIdNumber}
              onChange={(event) =>
                updateField("nationalIdNumber", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-url">Photo URL</Label>
            <Input
              id="photo-url"
              placeholder="Optional"
              value={form.photoUrl}
              onChange={(event) => updateField("photoUrl", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-of-kin-name">Next of kin name</Label>
            <Input
              id="next-of-kin-name"
              value={form.nextOfKinName}
              onChange={(event) =>
                updateField("nextOfKinName", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-of-kin-phone">Next of kin phone</Label>
            <Input
              id="next-of-kin-phone"
              placeholder="+256700123456"
              value={form.nextOfKinPhone}
              onChange={(event) =>
                updateField("nextOfKinPhone", event.target.value)
              }
            />
          </div>
          <div className="md:col-span-2">
            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? "Enrolling member..." : "Create member record"}
            </Button>
          </div>
        </form>

        {error ? (
          <p className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#8a1f1f]">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-[28px] border border-[#f2d38a] bg-[#fff6dd] p-5 text-sm text-[#5f4a11]">
            <p className="font-semibold">
              Enrollment complete for {result.member.memberNumber}.
            </p>
            <p className="mt-2">
              Temporary password:{" "}
              <span className="rounded bg-white px-2 py-1 font-mono text-xs">
                {result.temporaryPassword}
              </span>
            </p>
            <p className="mt-2">
              Delivery method: {result.deliveryMethod}
            </p>
            <Link
              href={`/dashboard/admin/members/${result.member.id}`}
              className="mt-4 inline-flex text-sm font-semibold text-[#0f5c70]"
            >
              Open member profile
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
