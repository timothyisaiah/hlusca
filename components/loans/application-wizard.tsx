"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EligibilityPreview, LoanTypeRecord } from "@/lib/loans/types";
import { formatCurrency, titleCase } from "@/lib/utils";
import { Field, loanRequest, Notice, selectClass } from "./shared";

export function ApplicationWizard({ types }: { types: LoanTypeRecord[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loanTypeId, setLoanTypeId] = useState(types[0]?.id ?? "");
  const [amountRequested, setAmountRequested] = useState("");
  const [termMonths, setTermMonths] = useState(
    Math.min(12, types[0]?.maxTermMonths ?? 12),
  );
  const [purpose, setPurpose] = useState("");
  const [quote, setQuote] = useState<{
    key: string;
    data?: EligibilityPreview;
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const type = types.find((item) => item.id === loanTypeId);
  const query = new URLSearchParams({
    loanTypeId,
    amountRequested,
    termMonths: String(termMonths),
  }).toString();
  const preview = quote?.key === query ? quote.data : undefined;
  const quoteError = quote?.key === query ? quote.error : undefined;
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (
        !amountRequested ||
        !loanTypeId ||
        !Number.isInteger(termMonths) ||
        termMonths < 1
      )
        return;
      try {
        const response = await fetch(
          `/api/loan-applications/preview?${query}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not calculate eligibility.");
        setQuote({ key: query, data });
      } catch (err) {
        if (!controller.signal.aborted)
          setQuote({
            key: query,
            error:
              err instanceof Error ? err.message : "Could not load preview.",
          });
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, amountRequested, loanTypeId, termMonths]);

  async function next(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (!preview?.eligible || busy) return;
    setBusy(true);
    try {
      const result = await loanRequest<{ id: string }>(
        "/api/loan-applications",
        { loanTypeId, amountRequested, termMonths, purpose },
      );
      router.push(`/dashboard/loans/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit application.",
      );
      setBusy(false);
    }
  }

  if (!types.length)
    return (
      <Notice>
        No loan products are available yet. Please contact the Treasurer.
      </Notice>
    );
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Apply for a loan</CardTitle>
          <ol
            className="mt-4 flex flex-wrap gap-3 text-sm"
            aria-label="Application progress"
          >
            {["Loan & amount", "Terms & purpose", "Review & submit"].map(
              (label, i) => (
                <li
                  key={label}
                  aria-current={step === i ? "step" : undefined}
                  className={`rounded-full px-3 py-2 ${step === i ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-muted)]"}`}
                >
                  {i + 1}. {label}
                </li>
              ),
            )}
          </ol>
        </CardHeader>
        <CardContent>
          <form onSubmit={next} className="space-y-5">
            {error && <Notice error>{error}</Notice>}
            {step === 0 && (
              <>
                <Field label="Loan type">
                  <select
                    className={selectClass}
                    value={loanTypeId}
                    onChange={(e) => {
                      setLoanTypeId(e.target.value);
                      const selected = types.find(
                        (item) => item.id === e.target.value,
                      );
                      setTermMonths(
                        Math.min(termMonths, selected?.maxTermMonths ?? 12),
                      );
                    }}
                    required
                  >
                    {types.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Requested amount (UGX)">
                  <Input
                    className="text-base"
                    type="number"
                    min="0.01"
                    max="999999999999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={amountRequested}
                    onChange={(e) => setAmountRequested(e.target.value)}
                    required
                  />
                </Field>
                {type && (
                  <p className="text-base text-[var(--muted-foreground)]">
                    {type.interestRate}% annual interest ·{" "}
                    {titleCase(type.interestMethod)} · Up to{" "}
                    {type.maxMultipleOfSavings}× savings
                  </p>
                )}
              </>
            )}
            {step === 1 && (
              <>
                <Field
                  label={`Repayment term (1–${type?.maxTermMonths} months)`}
                >
                  <Input
                    className="text-base"
                    type="number"
                    min="1"
                    max={type?.maxTermMonths}
                    step="1"
                    required
                    value={termMonths || ""}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                  />
                </Field>
                <Field label="Purpose of this loan">
                  <Textarea
                    className="min-h-36 text-base"
                    value={purpose}
                    minLength={10}
                    maxLength={2000}
                    required
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe what the loan will help you fund."
                  />
                </Field>
              </>
            )}
            {step === 2 && (
              <div className="space-y-4 text-base">
                <h2 className="text-lg font-semibold">
                  Review your application
                </h2>
                <p>
                  <strong>{type?.name}</strong> ·{" "}
                  <span className="tabular-nums">
                    {formatCurrency(amountRequested)}
                  </span>{" "}
                  over {termMonths} months.
                </p>
                <p className="whitespace-pre-wrap break-words">{purpose}</p>
                <p>
                  Review the repayment estimate and processing fee before
                  submitting. Approval and a signed contract are required before
                  funds are disbursed.
                </p>
              </div>
            )}
            <div className="sticky bottom-3 flex flex-wrap gap-3 rounded-2xl bg-white py-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={busy || (step === 2 && !preview?.eligible)}
              >
                {busy
                  ? "Submitting…"
                  : step === 2
                    ? "Submit application"
                    : "Continue"}
              </Button>
              <Link
                href="/dashboard/loans"
                className={buttonVariants({ variant: "ghost" })}
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Eligibility & repayment preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" aria-live="polite">
            {!amountRequested ? (
              <p className="text-base text-[var(--muted-foreground)]">
                Enter an amount to see your eligibility and estimated
                repayments.
              </p>
            ) : quoteError ? (
              <Notice error>{quoteError}</Notice>
            ) : !preview ? (
              <p>Calculating your estimate…</p>
            ) : (
              <>
                <Notice error={!preview.eligible}>
                  {preview.eligible
                    ? "You meet the current eligibility requirements."
                    : preview.reasons.join(" ")}
                </Notice>
                <dl className="space-y-3 text-base">
                  {[
                    ["Your savings", preview.savingsBalance],
                    ["Maximum eligible amount", preview.maximumAmount],
                    ["Processing fee withheld", preview.processingFee],
                    ["Credit to your savings", preview.netDisbursement],
                    ["First monthly installment", preview.schedule[0].totalDue],
                    ["Total interest", preview.totalInterest],
                    ["Total to repay", preview.totalRepayable],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <dt className="text-[var(--muted-foreground)]">
                        {label}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCurrency(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-sm">
                  Approval: {preview.approvalRoles.map(titleCase).join(" → ")}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Monthly payments start one month after disbursement. The final
                  payment may adjust for rounding.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
