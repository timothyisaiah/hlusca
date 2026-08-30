"use client";

import { startTransition, useState } from "react";

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

type MemberFormData = {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationalIdNumber: string;
  address: string;
  phone: string;
  email: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  photoUrl: string;
  status: string;
  username: string;
};

type MemberProfileFormProps = {
  member: MemberFormData;
  adminMode?: boolean;
};

export function MemberProfileForm({
  member,
  adminMode = false,
}: MemberProfileFormProps) {
  const [form, setForm] = useState(member);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function updateField(field: keyof MemberFormData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);

    startTransition(async () => {
      const payload = adminMode
        ? {
            firstName: form.firstName,
            lastName: form.lastName,
            username: form.username,
            phone: form.phone,
            email: form.email,
            address: form.address,
            nationalIdNumber: form.nationalIdNumber,
            nextOfKinName: form.nextOfKinName,
            nextOfKinPhone: form.nextOfKinPhone,
            dateOfBirth: form.dateOfBirth,
            photoUrl: form.photoUrl,
            status: form.status,
          }
        : {
            phone: form.phone,
            email: form.email,
            address: form.address,
            nextOfKinName: form.nextOfKinName,
            nextOfKinPhone: form.nextOfKinPhone,
          };

      const response = await fetch(`/api/members/${form.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Profile update failed.");
        setIsPending(false);
        return;
      }

      setSuccess("Profile updated and written to the audit log.");
      setIsPending(false);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{adminMode ? "Member profile" : "Your profile"}</CardTitle>
        <CardDescription>
          {adminMode
            ? "Maintain KYC, contact, and login details in one place."
            : "Keep your contact details current for service and recovery flows."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-3xl border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Member number
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {form.memberNumber}
          </p>
        </div>

        <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          {adminMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="member-first-name">First name</Label>
                <Input
                  id="member-first-name"
                  value={form.firstName}
                  onChange={(event) =>
                    updateField("firstName", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-last-name">Last name</Label>
                <Input
                  id="member-last-name"
                  value={form.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-username">Username</Label>
                <Input
                  id="member-username"
                  value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-status">Status</Label>
                <select
                  id="member-status"
                  className="h-11 w-full rounded-2xl border border-[var(--surface-border)] bg-white px-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color:rgba(14,116,144,0.14)]"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="EXITED">Exited</option>
                </select>
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="member-phone">Phone</Label>
            <Input
              id="member-phone"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input
              id="member-email"
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </div>

          {adminMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="member-dob">Date of birth</Label>
                <Input
                  id="member-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-nin">National ID</Label>
                <Input
                  id="member-nin"
                  value={form.nationalIdNumber}
                  onChange={(event) =>
                    updateField("nationalIdNumber", event.target.value)
                  }
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="member-address">Address</Label>
            <Textarea
              id="member-address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-nok-name">Next of kin name</Label>
            <Input
              id="member-nok-name"
              value={form.nextOfKinName}
              onChange={(event) =>
                updateField("nextOfKinName", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-nok-phone">Next of kin phone</Label>
            <Input
              id="member-nok-phone"
              value={form.nextOfKinPhone}
              onChange={(event) =>
                updateField("nextOfKinPhone", event.target.value)
              }
            />
          </div>

          {adminMode ? (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="member-photo-url">Photo URL</Label>
              <Input
                id="member-photo-url"
                value={form.photoUrl}
                onChange={(event) => updateField("photoUrl", event.target.value)}
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <Button className="w-full" type="submit" disabled={isPending}>
              {isPending ? "Saving profile..." : "Save profile"}
            </Button>
          </div>
        </form>

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
      </CardContent>
    </Card>
  );
}
