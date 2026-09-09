"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveDataList } from "@/components/tables/responsive-data-list";
import {
  Field,
  loanRequest as request,
  Notice,
  selectClass,
} from "@/components/loans/shared";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import type {
  InvestmentRecord,
  MemberOption,
  ProductRecord,
} from "@/lib/investments/types";

const emptyProduct: Omit<ProductRecord, "id"> = {
  name: "",
  description: "",
  expectedReturnRate: "",
  riskProfile: "LOW",
  active: true,
};
const emptyInvestment = {
  memberId: "",
  investmentProductId: "",
  principal: "",
  startDate: "",
  maturityDate: "",
};

export function InvestmentWorkspace({
  products,
  investments,
  members,
  admin,
}: {
  products: ProductRecord[];
  investments: InvestmentRecord[];
  members: MemberOption[];
  admin: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyProduct);
  const [investment, setInvestment] = useState(emptyInvestment);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState<{
    id: string;
    status: "MATURED" | "CANCELLED";
  } | null>(null);
  async function mutate(
    url: string,
    body: unknown,
    method: string,
    success: string,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request(url, body, method);
      setMessage(success);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    if (
      await mutate(
        editing
          ? `/api/investment-products/${editing}`
          : "/api/investment-products",
        form,
        editing ? "PATCH" : "POST",
        "Investment product saved.",
      )
    ) {
      setForm(emptyProduct);
      setEditing(null);
    }
  }
  async function saveInvestment(event: FormEvent) {
    event.preventDefault();
    if (
      await mutate(
        "/api/investments",
        investment,
        "POST",
        "Member investment recorded.",
      )
    )
      setInvestment(emptyInvestment);
  }
  const filtered = investments.filter((row) =>
    `${row.member.memberNumber} ${row.member.firstName} ${row.member.lastName} ${row.productName}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="w-full min-w-0 space-y-6">
      {error && <Notice error>{error}</Notice>}
      {message && <Notice>{message}</Notice>}
      {admin && (
        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>
                {editing
                  ? "Edit investment product"
                  : "Create investment product"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={saveProduct}
                className="grid gap-4 sm:grid-cols-2"
              >
                <Field label="Product name">
                  <Input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="text-base"
                  />
                </Field>
                <Field label="Expected annual return (%)">
                  <Input
                    required
                    type="number"
                    min="0"
                    max="100"
                    step="0.0001"
                    value={form.expectedReturnRate}
                    onChange={(e) =>
                      setForm({ ...form, expectedReturnRate: e.target.value })
                    }
                    className="text-base"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Product description">
                    <textarea
                      required
                      minLength={3}
                      maxLength={2000}
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      className={`${selectClass} min-h-24 py-3`}
                    />
                  </Field>
                </div>
                <Field label="Risk profile">
                  <select
                    className={selectClass}
                    value={form.riskProfile}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        riskProfile: e.target
                          .value as ProductRecord["riskProfile"],
                      })
                    }
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </Field>
                <label className="flex min-h-11 items-center gap-3 text-base">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  Available for new investments
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <Button type="submit" disabled={busy}>
                    {editing ? "Save product" : "Create product"}
                  </Button>
                  {editing && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setEditing(null);
                        setForm(emptyProduct);
                      }}
                    >
                      Cancel edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Record member investment</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={saveInvestment}
                className="grid gap-4 sm:grid-cols-2"
              >
                <Field label="Member">
                  <select
                    required
                    className={selectClass}
                    value={investment.memberId}
                    onChange={(e) =>
                      setInvestment({ ...investment, memberId: e.target.value })
                    }
                  >
                    <option value="">Select an active member</option>
                    {members.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.memberNumber} · {row.firstName} {row.lastName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Investment product">
                  <select
                    required
                    className={selectClass}
                    value={investment.investmentProductId}
                    onChange={(e) =>
                      setInvestment({
                        ...investment,
                        investmentProductId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select a product</option>
                    {products
                      .filter((row) => row.active)
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Principal (UGX)">
                  <Input
                    required
                    className="text-base"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={investment.principal}
                    onChange={(e) =>
                      setInvestment({
                        ...investment,
                        principal: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Start date">
                  <Input
                    required
                    className="text-base"
                    type="date"
                    value={investment.startDate}
                    onChange={(e) =>
                      setInvestment({
                        ...investment,
                        startDate: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Maturity date">
                  <Input
                    required
                    className="text-base"
                    type="date"
                    value={investment.maturityDate}
                    onChange={(e) =>
                      setInvestment({
                        ...investment,
                        maturityDate: e.target.value,
                      })
                    }
                  />
                </Field>
                <p className="text-base leading-7 text-[var(--muted-foreground)] sm:col-span-2">
                  Record investments funded outside this savings ledger.
                  Recording or closing an investment does not debit savings or
                  pay a return. Product terms are preserved when recorded.
                </p>
                <div>
                  <Button
                    type="submit"
                    disabled={
                      busy ||
                      !products.some((row) => row.active) ||
                      !members.length
                    }
                  >
                    Record investment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Investment products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {products.map((row) => (
              <article
                key={row.id}
                className="min-w-0 space-y-3 rounded-3xl border border-[var(--surface-border)] p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="break-words text-lg font-semibold">
                    {row.name}
                  </h3>
                  <Badge variant={row.active ? "success" : "muted"}>
                    {row.active ? "Available" : "Inactive"}
                  </Badge>
                </div>
                <p className="break-words text-base text-[var(--muted-foreground)]">
                  {row.description}
                </p>
                <p className="text-3xl font-bold tabular-nums">
                  {row.expectedReturnRate}%
                  <span className="ml-2 text-sm font-normal">
                    expected annual return
                  </span>
                </p>
                <p className="text-base">
                  {titleCase(row.riskProfile)} risk · Returns are not
                  guaranteed.
                </p>
                {admin && (
                  <Button
                    aria-label={`Edit ${row.name}`}
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setEditing(row.id);
                      setForm({
                        name: row.name,
                        description: row.description,
                        expectedReturnRate: row.expectedReturnRate,
                        riskProfile: row.riskProfile,
                        active: row.active,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit product
                  </Button>
                )}
              </article>
            ))}
          </div>
          {!products.length && (
            <p className="text-base text-[var(--muted-foreground)]">
              No investment products are available yet.
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Member investments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Find an investment">
            <Input
              className="text-base"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Member number, name, or product"
            />
          </Field>
          {closing && (
            <div
              className="space-y-3 rounded-2xl bg-[var(--surface-muted)] p-4"
              role="region"
              aria-label="Confirm investment status"
            >
              <p className="text-base">
                Mark this investment as{" "}
                {titleCase(closing.status).toLowerCase()}? This closes the
                record.
              </p>
              <div className="flex gap-3">
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await mutate(
                        `/api/investments/${closing.id}`,
                        { status: closing.status },
                        "PATCH",
                        "Investment status updated.",
                      )
                    )
                      setClosing(null);
                  }}
                >
                  Confirm status
                </Button>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => setClosing(null)}
                >
                  Go back
                </Button>
              </div>
            </div>
          )}
          <ResponsiveDataList
            rows={filtered}
            getRowId={(row) => row.id}
            emptyMessage="No member investments found."
            columns={[
              {
                label: "Member",
                className: "text-base",
                render: (row) => (
                  <>
                    {row.member.firstName} {row.member.lastName}
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {row.member.memberNumber}
                    </p>
                  </>
                ),
              },
              {
                label: "Product",
                className: "text-base",
                render: (row) => (
                  <>
                    {row.productName}
                    <p className="text-sm">
                      {row.expectedReturnRate}% expected ·{" "}
                      {titleCase(row.riskProfile)} risk
                    </p>
                  </>
                ),
              },
              {
                label: "Principal",
                className: "text-base tabular-nums md:whitespace-nowrap",
                render: (row) => formatCurrency(row.principal),
              },
              {
                label: "Term",
                className: "text-base md:whitespace-nowrap",
                render: (row) => (
                  <>
                    {formatDate(row.startDate)}
                    <p>to {formatDate(row.maturityDate)}</p>
                  </>
                ),
              },
              {
                label: "Status",
                className: "text-base",
                render: (row) => titleCase(row.status),
              },
              ...(admin
                ? [
                    {
                      label: "Action",
                      render: (row: InvestmentRecord) =>
                        row.status === "ACTIVE" ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                setClosing({ id: row.id, status: "MATURED" })
                              }
                            >
                              Mark matured
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                setClosing({ id: row.id, status: "CANCELLED" })
                              }
                            >
                              Cancel investment
                            </Button>
                          </div>
                        ) : (
                          "Closed"
                        ),
                    },
                  ]
                : []),
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
