import { ApiError } from "../api";

export const DIVIDEND_METHOD = "PRO_RATA_AVERAGE_DAILY_SAVINGS";
export const DIVIDEND_METHOD_LABEL =
  "Pro-rata by average savings balance over the financial year";
const DAY = 86_400_000;

export function dateNumber(date: string) {
  const value = Date.parse(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 10) !== date
  )
    throw new ApiError("Enter a valid calendar date.");
  return value / DAY;
}

export function minorUnits(value: string): bigint {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new ApiError("Invalid monetary amount.");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt("100") + BigInt(fraction.padEnd(2, "0"));
}

export function money(value: bigint) {
  return `${value / BigInt("100")}.${String(value % BigInt("100")).padStart(2, "0")}`;
}

export type BalanceDay = { date: string; delta: string };
export type DividendBasis = {
  memberId: string;
  savingsAccountId: string;
  memberNumber: string;
  memberName: string;
  balanceDaysMinor: string;
};
export type DividendShare = DividendBasis & {
  averageBalance: string;
  amount: string;
};

/** Opening movements are grouped onto the first day. All days use Kampala close. */
export function averageBalanceBasis(
  days: BalanceDay[],
  start: string,
  end: string,
) {
  const first = dateNumber(start);
  const last = dateNumber(end);
  if (last < first) throw new ApiError("Invalid financial year dates.");
  const grouped = new Map<number, bigint>();
  for (const entry of days) {
    const day = dateNumber(entry.date);
    if (day > last) continue;
    const effective = Math.max(day, first);
    const negative = entry.delta.startsWith("-");
    const delta =
      minorUnits(negative ? entry.delta.slice(1) : entry.delta) *
      (negative ? -BigInt("1") : BigInt("1"));
    grouped.set(effective, (grouped.get(effective) ?? BigInt("0")) + delta);
  }
  let balance = BigInt("0");
  let weight = BigInt("0");
  for (const [day, delta] of [...grouped].sort(([a], [b]) => a - b)) {
    balance += delta;
    if (balance < BigInt("0"))
      throw new ApiError(
        "A savings ledger has a negative daily closing balance. Reconcile it before proposing dividends.",
        409,
      );
    weight += delta * BigInt(last - day + 1);
  }
  return weight.toString();
}

/** Largest remainders distribute every cent, with stable member-ID tie breaking. */
export function allocateDividends(
  basis: DividendBasis[],
  pool: string,
  days: number,
): DividendShare[] {
  if (!Number.isInteger(days) || days < 1)
    throw new ApiError("Invalid financial year length.");
  if (
    new Set(basis.map((row) => row.memberId)).size !== basis.length ||
    new Set(basis.map((row) => row.savingsAccountId)).size !== basis.length
  )
    throw new ApiError("Duplicate dividend member or account.");
  if (basis.some((row) => !/^\d+$/.test(row.balanceDaysMinor)))
    throw new ApiError("Invalid dividend balance basis.");
  const eligible = basis.filter(
    (row) => BigInt(row.balanceDaysMinor) > BigInt("0"),
  );
  const total = eligible.reduce(
    (sum, row) => sum + BigInt(row.balanceDaysMinor),
    BigInt("0"),
  );
  const cents = minorUnits(pool);
  if (!total || !cents)
    throw new ApiError(
      "A positive pool and eligible average savings balances are required.",
      409,
    );
  const shares = eligible.map((row) => {
    const numerator = cents * BigInt(row.balanceDaysMinor);
    return { row, cents: numerator / total, remainder: numerator % total };
  });
  let remaining =
    cents - shares.reduce((sum, row) => sum + row.cents, BigInt("0"));
  const ranked = [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.row.memberId < b.row.memberId
        ? -1
        : 1
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const row of ranked) {
    if (!remaining) break;
    row.cents++;
    remaining--;
  }
  return shares
    .map(({ row, cents: amount }) => ({
      ...row,
      averageBalance: money(
        (BigInt(row.balanceDaysMinor) + BigInt(Math.floor(days / 2))) /
          BigInt(days),
      ),
      amount: money(amount),
    }))
    .sort((a, b) => a.memberNumber.localeCompare(b.memberNumber));
}
