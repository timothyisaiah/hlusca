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

type EnrollmentForm = {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  email: string;
  address: string;
  nationalIdNumber: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  dateOfBirth: string;
  photoUrl: string;
};

type FieldErrors = Partial<Record<keyof EnrollmentForm, string[]>>;

const emptyForm: EnrollmentForm = {
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
};

function FieldError({ messages }: { messages?: string[] }) {
  const message = messages?.[0];

  return message ? (
    <p className="text-xs text-[#8a1f1f]" role="alert">
      {message}
    </p>
  ) : null;
}

export function EnrollMemberForm() {
  const [form, setForm] = useState<EnrollmentForm>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
    setFieldErrors({});
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
        | {
          error?: string;
          details?: {
            fieldErrors?: FieldErrors;
          };
        };

      if (!response.ok) {
        const errorPayload = payload as {
          error?: string;
          details?: { fieldErrors?: FieldErrors };
        };
        setError(errorPayload.error ?? "Enrollment failed.");
        setFieldErrors(errorPayload.details?.fieldErrors ?? {});
        setIsPending(false);
        return;
      }

      setResult(payload as EnrollmentResult);
      setIsPending(false);
      setForm(emptyForm);
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
              aria-invalid={Boolean(fieldErrors.firstName)}
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
            />
            <FieldError messages={fieldErrors.firstName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              aria-invalid={Boolean(fieldErrors.lastName)}
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
            />
            <FieldError messages={fieldErrors.lastName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              aria-invalid={Boolean(fieldErrors.username)}
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
            />
            <FieldError messages={fieldErrors.username} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone in E.164 (required)</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+256700123456"
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
            <FieldError messages={fieldErrors.phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Optional"
              aria-invalid={Boolean(fieldErrors.email)}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
            <FieldError messages={fieldErrors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              aria-invalid={Boolean(fieldErrors.dateOfBirth)}
              value={form.dateOfBirth}
              onChange={(event) => updateField("dateOfBirth", event.target.value)}
            />
            <FieldError messages={fieldErrors.dateOfBirth} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              aria-invalid={Boolean(fieldErrors.address)}
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
            <FieldError messages={fieldErrors.address} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="national-id">National ID</Label>
            <Input
              id="national-id"
              aria-invalid={Boolean(fieldErrors.nationalIdNumber)}
              value={form.nationalIdNumber}
              onChange={(event) =>
                updateField("nationalIdNumber", event.target.value)
              }
            />
            <FieldError messages={fieldErrors.nationalIdNumber} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo-url">Photo URL</Label>
            <Input
              id="photo-url"
              placeholder="Optional"
              aria-invalid={Boolean(fieldErrors.photoUrl)}
              value={form.photoUrl}
              onChange={(event) => updateField("photoUrl", event.target.value)}
            />
            <FieldError messages={fieldErrors.photoUrl} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-of-kin-name">Next of kin name</Label>
            <Input
              id="next-of-kin-name"
              aria-invalid={Boolean(fieldErrors.nextOfKinName)}
              value={form.nextOfKinName}
              onChange={(event) =>
                updateField("nextOfKinName", event.target.value)
              }
            />
            <FieldError messages={fieldErrors.nextOfKinName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next-of-kin-phone">
              Next-of-kin phone in E.164 (required)
            </Label>
            <Input
              id="next-of-kin-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="+256700123456"
              required
              aria-invalid={Boolean(fieldErrors.nextOfKinPhone)}
              value={form.nextOfKinPhone}
              onChange={(event) =>
                updateField("nextOfKinPhone", event.target.value)
              }
            />
            <FieldError messages={fieldErrors.nextOfKinPhone} />
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
