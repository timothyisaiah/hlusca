"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import type { LoanTypeRecord } from "@/lib/loans/types";
import { formatCurrency, titleCase } from "@/lib/utils";
import { Field, loanRequest, Notice, selectClass } from "./shared";

const empty = {
  name: "",
  interestMethod: "FLAT" as const,
  interestRate: "12",
  maxTermMonths: 12,
  maxMultipleOfSavings: "3",
  processingFeePercent: "0",
  active: true,
};

export function LoanTypeManager({
  types,
  threshold,
}: {
  types: LoanTypeRecord[];
  threshold: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<LoanTypeRecord, "id">>(empty);
  const [boardThreshold, setBoardThreshold] = useState(threshold);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: FormEvent, settings = false) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (settings)
        await loanRequest(
          "/api/loan-settings",
          { threshold: boardThreshold },
          "PATCH",
        );
      else {
        await loanRequest(
          editing ? `/api/loan-types/${editing}` : "/api/loan-types",
          form,
          editing ? "PATCH" : "POST",
        );
        setEditing(null);
        setForm(empty);
      }
      setMessage(
        settings
          ? "Approval threshold saved. New applications will use this threshold."
          : "Loan type saved. Existing applications retain their original terms.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              {editing ? "Edit loan type" : "Create loan type"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name">
                <Input
                  className="text-base"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Interest method">
                <select
                  className={selectClass}
                  value={form.interestMethod}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      interestMethod: e.target
                        .value as LoanTypeRecord["interestMethod"],
                    })
                  }
                >
                  <option value="FLAT">Flat rate</option>
                  <option value="REDUCING_BALANCE">Reducing balance</option>
                </select>
              </Field>
              <Field label="Annual interest rate (%)">
                <Input
                  className="text-base"
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.0001"
                  value={form.interestRate}
                  onChange={(e) =>
                    setForm({ ...form, interestRate: e.target.value })
                  }
                />
              </Field>
              <Field label="Maximum term (months)">
                <Input
                  className="text-base"
                  required
                  type="number"
                  min="1"
                  max="360"
                  value={form.maxTermMonths}
                  onChange={(e) =>
                    setForm({ ...form, maxTermMonths: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Maximum multiple of savings">
                <Input
                  className="text-base"
                  required
                  type="number"
                  min="0.01"
                  max="999.99"
                  step="0.01"
                  value={form.maxMultipleOfSavings}
                  onChange={(e) =>
                    setForm({ ...form, maxMultipleOfSavings: e.target.value })
                  }
                />
              </Field>
              <Field label="Processing fee (%)">
                <Input
                  className="text-base"
                  required
                  type="number"
                  min="0"
                  max="99.9999"
                  step="0.0001"
                  value={form.processingFeePercent}
                  onChange={(e) =>
                    setForm({ ...form, processingFeePercent: e.target.value })
                  }
                />
              </Field>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="h-5 w-5"
                />
                Available for new applications
              </label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editing
                      ? "Save loan type"
                      : "Create loan type"}
                </Button>
                {editing && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(null);
                      setForm(empty);
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approval routing</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => save(event, true)} className="space-y-4">
              <Field label="Board approval threshold (UGX)">
                <Input
                  className="text-base"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={boardThreshold}
                  onChange={(e) => setBoardThreshold(e.target.value)}
                />
              </Field>
              <p className="text-base leading-7 text-[var(--muted-foreground)]">
                Amounts below the threshold need Treasurer approval. Amounts
                equal to or above it also need Board approval, after the
                Treasurer recommends them.
              </p>
              <Button type="submit" disabled={busy}>
                Save threshold
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <ResponsiveDataList
        rows={types}
        getRowId={(row) => row.id}
        emptyMessage="Create your first loan type to enable member applications."
        columns={[
          {
            label: "Product",
            render: (row) => <span className="font-semibold">{row.name}</span>,
          },
          {
            label: "Annual interest",
            render: (row) =>
              `${row.interestRate}% · ${titleCase(row.interestMethod)}`,
          },
          {
            label: "Limits",
            render: (row) =>
              `${row.maxTermMonths} months · ${row.maxMultipleOfSavings}× savings`,
          },
          { label: "Fee", render: (row) => `${row.processingFeePercent}%` },
          {
            label: "Availability",
            render: (row) => (row.active ? "Active" : "Inactive"),
          },
          {
            label: "Action",
            render: (row) => (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setEditing(row.id);
                  setForm(row);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Edit
              </Button>
            ),
          },
        ]}
      />
      <p className="text-sm text-[var(--muted-foreground)]">
        Current Board threshold:{" "}
        <span className="tabular-nums">{formatCurrency(threshold)}</span>.
        Processing fees are withheld from the amount credited to savings.
      </p>
    </div>
  );
}
