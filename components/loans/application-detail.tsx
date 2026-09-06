"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { UserRole } from "@prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import type { ApplicationRecord } from "@/lib/loans/types";
import type { LoanStatement } from "@/lib/loans/statement-types";
import { RepaymentWorkspace } from "./repayment-workspace";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import { Field, loanRequest, Notice, ScheduleTable } from "./shared";
import { SignaturePad } from "./signature-pad";

export function ApplicationDetail({
  application: app,
  role,
  statement,
  canRecordPayment,
}: {
  application: ApplicationRecord;
  role: UserRole;
  statement: LoanStatement | null;
  canRecordPayment: boolean;
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [typedName, setTypedName] = useState("");
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState<
    "sign" | "disburse" | "approve" | "reject" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const nextStep = app.approvalSteps.find(
    (step) => step.decision === "PENDING",
  );
  const canReview =
    ["SUBMITTED", "UNDER_REVIEW"].includes(app.status) &&
    nextStep?.approverRole === role;
  const contract = app.contract;
  const terms = contract?.terms;
  const canSign =
    role === "CLIENT" && contract?.status === "AWAITING_SIGNATURE";
  const canDisburse =
    role === "TREASURER" && contract?.status === "SIGNED" && !app.loan;

  async function execute() {
    if (!confirm || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (confirm === "sign")
        await loanRequest(`/api/contracts/${contract!.id}/sign`, {
          typedName,
          signature,
          agree,
          documentHash: contract!.documentHash,
        });
      else if (confirm === "disburse")
        await loanRequest(`/api/loan-applications/${app.id}/disburse`, {
          password,
          confirm: true,
        });
      else
        await loanRequest(`/api/loan-applications/${app.id}/${confirm}`, {
          comment,
        });
      setMessage(
        confirm === "sign"
          ? "Contract signed. Your loan is ready for Treasurer disbursement."
          : confirm === "disburse"
            ? "Loan disbursed and repayment schedule created."
            : confirm === "reject"
              ? "Application rejected and the member notified."
              : "Approval recorded.",
      );
      setConfirm(null);
      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  }

  function requestSign(event: FormEvent) {
    event.preventDefault();
    if (agree && signature) {
      setError("");
      setConfirm("sign");
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/loans"
          className={buttonVariants({ variant: "outline" })}
        >
          Back to loans
        </Link>
        {statement && (
          <a
            href="#repayments"
            className={buttonVariants({ variant: "outline" })}
          >
            Repayments and statement
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {app.loanTypeName} loan
          </h1>
          <p className="mt-2 text-base text-[var(--muted-foreground)]">
            {app.member.firstName} {app.member.lastName} ·{" "}
            {app.member.memberNumber}
          </p>
        </div>
        <Badge>
          {app.loan ? titleCase(app.loan.status) : titleCase(app.status)}
        </Badge>
      </div>
      {!confirm && error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Application details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-5 sm:grid-cols-2">
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-sm text-[var(--muted-foreground)]">
                  Requested amount
                </dt>
                <dd className="mt-1 break-words text-3xl font-bold tabular-nums md:text-4xl">
                  {formatCurrency(app.amountRequested)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--muted-foreground)]">
                  Repayment term
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {app.termMonths} months
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--muted-foreground)]">
                  Annual interest
                </dt>
                <dd className="text-base">
                  {app.interestRate}% · {titleCase(app.interestMethod)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--muted-foreground)]">
                  Processing fee
                </dt>
                <dd className="text-base">
                  {app.processingFeePercent}% withheld at disbursement
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm text-[var(--muted-foreground)]">
                  Purpose
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-base">
                  {app.purpose}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm text-[var(--muted-foreground)]">
              Submitted {formatDateTime(app.submittedAt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approval progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {app.approvalSteps.map((step) => (
                <li
                  key={step.id}
                  className="rounded-2xl bg-[var(--surface-muted)] p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-base">
                      {step.stepNumber}. {titleCase(step.approverRole)}
                    </strong>
                    <Badge>{titleCase(step.decision)}</Badge>
                  </div>
                  {step.comment && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-base">
                      {step.comment}
                    </p>
                  )}
                  {step.decidedAt && (
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                      {formatDateTime(step.decidedAt)}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      {app.rejectionReason && (
        <Notice error>Application rejected: {app.rejectionReason}</Notice>
      )}
      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>Review this application</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Field label="Review comment (required when rejecting)">
                <Textarea
                  className="text-base"
                  maxLength={2000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setConfirm("approve");
                  }}
                >
                  {role === "TREASURER" && app.approvalSteps.length > 1
                    ? "Recommend to Board"
                    : "Approve application"}
                </Button>
                <Button
                  variant="danger"
                  disabled={busy || comment.trim().length < 3}
                  onClick={() => {
                    setError("");
                    setConfirm("reject");
                  }}
                >
                  Reject application
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {contract && terms && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Loan agreement</CardTitle>
              <a
                className={buttonVariants({ variant: "outline" })}
                href={`/api/contracts/${contract.id}/document`}
                target="_blank"
                rel="noreferrer"
              >
                Open contract PDF
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <p className="text-base">
                Agreement for <strong>{terms.memberName}</strong> (
                {terms.memberNumber}), generated{" "}
                {formatDateTime(terms.generatedAt)}.
              </p>
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Principal", terms.principal],
                  ["Processing fee withheld", terms.processingFee],
                  ["Credit to savings", terms.netDisbursement],
                  ["Total to repay", terms.totalRepayable],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-[var(--surface-muted)] p-4"
                  >
                    <dt className="text-sm text-[var(--muted-foreground)]">
                      {label}
                    </dt>
                    <dd className="mt-2 text-xl font-bold tabular-nums">
                      {formatCurrency(value)}
                    </dd>
                  </div>
                ))}
              </dl>
              <ol className="list-decimal space-y-3 pl-6 text-base leading-7">
                {terms.conditions.map((condition) => (
                  <li key={condition}>{condition}</li>
                ))}
              </ol>
              <details className="rounded-2xl border border-[var(--surface-border)] p-4">
                <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold">
                  Full repayment schedule preview
                </summary>
                <p className="my-3 text-base text-[var(--muted-foreground)]">
                  These dates assume disbursement on the agreement date. Final
                  dates are set when funds are disbursed.
                </p>
                <ScheduleTable schedule={terms.schedule} />
              </details>
              {contract.status === "SIGNED" && (
                <div className="space-y-3">
                  <Notice>
                    Signed by {contract.signedName} on{" "}
                    {formatDateTime(contract.memberSignedAt)}.
                  </Notice>
                  <Image
                    src={`/api/contracts/${contract.id}/signature`}
                    alt={`Signature of ${contract.signedName}`}
                    width={720}
                    height={240}
                    unoptimized
                    className="h-auto w-full max-w-md rounded-2xl border border-[var(--surface-border)]"
                  />
                </div>
              )}
              {canSign && (
                <form
                  onSubmit={requestSign}
                  className="space-y-5 border-t border-[var(--surface-border)] pt-6"
                >
                  <h2 className="text-xl font-semibold">Sign your agreement</h2>
                  <Field label={`Type your full name: ${terms.memberName}`}>
                    <Input
                      className="text-base"
                      value={typedName}
                      maxLength={200}
                      required
                      disabled={busy}
                      onChange={(e) => setTypedName(e.target.value)}
                      autoComplete="name"
                    />
                  </Field>
                  <SignaturePad onChange={setSignature} disabled={busy} />
                  <label className="flex min-h-11 items-start gap-3 text-base">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      required
                      disabled={busy}
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span>
                      I have reviewed the full agreement and repayment preview.
                      I agree to these terms and consent to this electronic
                      signature.
                    </span>
                  </label>
                  <Button
                    type="submit"
                    disabled={busy || !agree || !signature || !typedName.trim()}
                  >
                    Review and sign
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {canDisburse && (
        <Card>
          <CardHeader>
            <CardTitle>Disburse this loan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-base">
                Credit{" "}
                <strong className="tabular-nums">
                  {formatCurrency(terms!.netDisbursement)}
                </strong>{" "}
                to the member’s savings account after withholding the processing
                fee of {formatCurrency(terms!.processingFee)}.
              </p>
              <Button
                disabled={busy}
                onClick={() => {
                  setError("");
                  setConfirm("disburse");
                }}
              >
                Review disbursement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {statement && (
        <RepaymentWorkspace
          statement={statement}
          canRecord={canRecordPayment}
        />
      )}
      <ResponsiveDialog
        open={confirm !== null}
        title={
          confirm === "sign"
            ? "Confirm your signature"
            : confirm === "disburse"
              ? "Confirm disbursement"
              : confirm === "reject"
                ? "Confirm rejection"
                : "Confirm approval"
        }
        onClose={() => {
          if (!busy) {
            setConfirm(null);
            setPassword("");
          }
        }}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void execute();
          }}
        >
          {error && <Notice error>{error}</Notice>}
          <p className="text-base">
            {confirm === "sign"
              ? `You are signing as ${typedName} and accepting a principal of ${formatCurrency(app.amountRequested)}, with total scheduled repayments of ${formatCurrency(terms!.totalRepayable)}.`
              : confirm === "disburse"
                ? `This will credit ${formatCurrency(terms!.netDisbursement)} to ${app.member.firstName} ${app.member.lastName}'s savings account and create the full repayment schedule.`
                : confirm === "reject"
                  ? `Reject this application and notify the member with your reason: ${comment}`
                  : `Record your approval for ${formatCurrency(app.amountRequested)}. ${role === "TREASURER" && app.approvalSteps.length > 1 ? "The Board will review it next." : "The member will receive a contract to sign."}`}
          </p>
          {confirm === "disburse" && (
            <Field label="Confirm your Treasurer password">
              <Input
                className="text-base"
                type="password"
                autoComplete="current-password"
                required
                maxLength={200}
                value={password}
                disabled={busy}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              variant={confirm === "reject" ? "danger" : "default"}
              disabled={busy || (confirm === "disburse" && !password)}
            >
              {busy
                ? "Processing…"
                : confirm === "sign"
                  ? "Confirm and sign"
                  : confirm === "disburse"
                    ? "Confirm and disburse"
                    : confirm === "reject"
                      ? "Confirm rejection"
                      : "Confirm approval"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirm(null);
                setPassword("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  );
}
