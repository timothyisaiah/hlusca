"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type SavingsTransactionFormProps = {
  mode: "deposit" | "withdraw";
  accountId: string;
  memberName: string;
  memberNumber: string;
  currentBalance: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

type SavingsMutationResponse = {
  activatedMember: boolean;
};

type FieldErrors = Partial<Record<"amount" | "reference" | "narrative", string[]>>;

const emptyFieldErrors: FieldErrors = {};

export function SavingsTransactionForm({
  mode,
  accountId,
  memberName,
  memberNumber,
  currentBalance,
  onClose,
  onSuccess,
}: SavingsTransactionFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [narrative, setNarrative] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyFieldErrors);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors(emptyFieldErrors);
    setIsPending(true);

    startTransition(async () => {
      const response = await fetch(`/api/savings/${accountId}/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          reference,
          narrative,
        }),
      });

      const payload = (await response.json()) as
        | SavingsMutationResponse
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
        setError(errorPayload.error ?? "The transaction could not be recorded.");
        setFieldErrors(errorPayload.details?.fieldErrors ?? emptyFieldErrors);
        setIsPending(false);
        return;
      }

      const result = payload as SavingsMutationResponse;
      const actionLabel = mode === "deposit" ? "Deposit" : "Withdrawal";
      setIsPending(false);
      onSuccess(
        result.activatedMember
          ? `${actionLabel} recorded and the member is now active.`
          : `${actionLabel} recorded successfully.`,
      );
      onClose();
      router.refresh();
    });
  }

  const title = mode === "deposit" ? "Record deposit" : "Record withdrawal";
  const submitLabel = mode === "deposit" ? "Post deposit" : "Post withdrawal";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-[28px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
          Member
        </p>
        <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{memberName}</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{memberNumber}</p>
        <div className="mt-4 rounded-2xl bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Current balance
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">
            {formatCurrency(currentBalance)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-amount`}>{title} amount</Label>
        <Input
          id={`${mode}-amount`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={Boolean(fieldErrors.amount)}
        />
        {fieldErrors.amount?.[0] ? (
          <p className="text-xs text-[#8a1f1f]">{fieldErrors.amount[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-reference`}>Reference</Label>
        <Input
          id={`${mode}-reference`}
          placeholder="Receipt number, teller note, or bank ref"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          aria-invalid={Boolean(fieldErrors.reference)}
        />
        {fieldErrors.reference?.[0] ? (
          <p className="text-xs text-[#8a1f1f]">{fieldErrors.reference[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-narrative`}>Narrative</Label>
        <Textarea
          id={`${mode}-narrative`}
          placeholder="Add a short reason or note for the ledger"
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          aria-invalid={Boolean(fieldErrors.narrative)}
        />
        {fieldErrors.narrative?.[0] ? (
          <p className="text-xs text-[#8a1f1f]">{fieldErrors.narrative[0]}</p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-2xl bg-[#fff2f2] px-4 py-3 text-sm text-[#8a1f1f]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
