import { ApiError } from "../api";
import { dateNumber, minorUnits, money } from "../investments/calculation";

// Member earnings (decision #7). Collected loan interest is attributed to the
// days on which it accrued, and each day's slice is shared by the members'
// lowest savings balance during that Kampala day. All money is integer cents.

export const EARNINGS_METHOD = "DAILY_MINIMUM_BALANCE_INTEREST_ATTRIBUTION";
export const EARNINGS_METHOD_LABEL =
  "Collected loan interest, shared daily by each member's lowest balance that day";

const DAY = 86_400_000;
const ZERO = BigInt(0);
const ONE = BigInt(1);
// Fixed-point precision for intermediate per-day weights.
const WEIGHT_SCALE = BigInt(1_000_000);

export const dayString = (day: number) =>
  new Date(day * DAY).toISOString().slice(0, 10);

export type InstallmentInterest = { dueDate: string; interestMinor: bigint };
export type InterestDay = { day: number; minor: bigint };

/**
 * Spreads each installment's interest evenly over the days it accrues: from the
 * previous due date (or disbursement) up to, but excluding, its own due date.
 * Leftover cents go to the earliest days, so each period sums exactly. Returns
 * days in chronological order.
 */
export function dailyInterestSchedule(
  disbursedOn: string,
  installments: InstallmentInterest[],
): InterestDay[] {
  const days: InterestDay[] = [];
  let start = dateNumber(disbursedOn);

  for (const row of [...installments].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  )) {
    const end = dateNumber(row.dueDate);
    const length = Math.max(1, end - start);
    const base = row.interestMinor / BigInt(length);
    const extra = Number(row.interestMinor % BigInt(length));

    for (let index = 0; index < length; index += 1) {
      const minor = base + (index < extra ? ONE : ZERO);
      if (minor > ZERO) days.push({ day: start + index, minor });
    }

    start = Math.max(start + length, end);
  }

  return days;
}

/**
 * Interest that can be shared now: what has been collected, capped at what has
 * accrued by `through` (prepaid interest waits until its days have passed),
 * minus what earlier runs already shared. The new amount funds the earliest
 * not-yet-funded days, so late payments are credited to the days they cover.
 */
export function attributeCollectedInterest(
  schedule: InterestDay[],
  collectedMinor: bigint,
  recognizedMinor: bigint,
  through: string,
) {
  const last = dateNumber(through);
  let accrued = ZERO;
  for (const entry of schedule) if (entry.day <= last) accrued += entry.minor;

  const cap = collectedMinor < accrued ? collectedMinor : accrued;
  const delta = cap > recognizedMinor ? cap - recognizedMinor : ZERO;
  const days = new Map<number, bigint>();
  if (delta === ZERO) return { delta, days };

  const from = recognizedMinor;
  const to = recognizedMinor + delta;
  let cursor = ZERO;
  for (const entry of schedule) {
    const low = cursor;
    const high = cursor + entry.minor;
    cursor = high;
    if (high <= from) continue;
    if (low >= to) break;
    const portion = (high < to ? high : to) - (low > from ? low : from);
    days.set(entry.day, (days.get(entry.day) ?? ZERO) + portion);
  }

  return { delta, days };
}

export type LedgerEntry = { day: number; balanceAfterMinor: bigint };

/**
 * Builds a lookup of each day's lowest balance from ledger entries in posting
 * order: the lower of the opening balance and every balance reached that day.
 * Money deposited during a day therefore earns from the next day; money
 * withdrawn during a day earns nothing that day.
 */
export function dailyMinimumBalances(entries: LedgerEntry[]) {
  const days: number[] = [];
  const minimums: bigint[] = [];
  const closings: bigint[] = [];
  let closing = ZERO;

  for (const entry of entries) {
    if (!days.length || days[days.length - 1] !== entry.day) {
      if (days.length && entry.day < days[days.length - 1])
        throw new ApiError("Ledger entries must be in posting order.", 500);
      days.push(entry.day);
      minimums.push(closing);
      closings.push(closing);
    }
    const index = days.length - 1;
    if (entry.balanceAfterMinor < minimums[index])
      minimums[index] = entry.balanceAfterMinor;
    closings[index] = entry.balanceAfterMinor;
    closing = entry.balanceAfterMinor;
  }

  return (day: number) => {
    let low = 0;
    let high = days.length - 1;
    let found = -1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      if (days[middle] <= day) {
        found = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (found < 0) return ZERO;
    const value = days[found] === day ? minimums[found] : closings[found];
    return value > ZERO ? value : ZERO;
  };
}

/** Member share of the newly collected interest, rounded down to the cent. */
export function memberPoolMinor(collectedMinor: bigint, sharePercent: string) {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(sharePercent) || Number(sharePercent) > 100)
    throw new ApiError("Invalid member earnings share.", 409);
  return (collectedMinor * minorUnits(sharePercent)) / BigInt(10_000);
}

export type EarningsAccount = {
  memberId: string;
  savingsAccountId: string;
  memberNumber: string;
  memberName: string;
  minimumOn: (day: number) => bigint;
};

export type EarningsShare = {
  memberId: string;
  savingsAccountId: string;
  memberNumber: string;
  memberName: string;
  earningDays: number;
  amount: string;
};

/**
 * Each day's income is split by that day's lowest balances; the per-member
 * totals then divide the member pool exactly (largest remainder, stable
 * member-ID tie-break). Days when nobody held savings contribute no weight.
 */
export function allocateEarnings(
  dayIncome: Map<number, bigint>,
  accounts: EarningsAccount[],
  poolMinor: bigint,
): EarningsShare[] {
  if (new Set(accounts.map((account) => account.memberId)).size !== accounts.length)
    throw new ApiError("Duplicate earnings member.", 500);

  const weights = accounts.map(() => ZERO);
  const earningDays = accounts.map(() => 0);

  for (const [day, income] of dayIncome) {
    if (income <= ZERO) continue;
    const minimums = accounts.map((account) => account.minimumOn(day));
    const total = minimums.reduce((sum, value) => sum + value, ZERO);
    if (total === ZERO) continue;
    minimums.forEach((value, index) => {
      if (value === ZERO) return;
      weights[index] += (income * value * WEIGHT_SCALE) / total;
      earningDays[index] += 1;
    });
  }

  const totalWeight = weights.reduce((sum, value) => sum + value, ZERO);
  if (totalWeight === ZERO || poolMinor <= ZERO) return [];

  const shares = accounts.map((account, index) => {
    const numerator = poolMinor * weights[index];
    return {
      account,
      index,
      cents: numerator / totalWeight,
      remainder: numerator % totalWeight,
    };
  });
  let remaining = poolMinor - shares.reduce((sum, row) => sum + row.cents, ZERO);
  for (const row of [...shares].sort((a, b) =>
    a.remainder === b.remainder
      ? a.account.memberId < b.account.memberId
        ? -1
        : 1
      : a.remainder > b.remainder
        ? -1
        : 1,
  )) {
    if (remaining === ZERO) break;
    if (weights[row.index] === ZERO) continue;
    row.cents += ONE;
    remaining -= ONE;
  }

  return shares
    .filter((row) => weights[row.index] > ZERO)
    .map(({ account, index, cents }) => ({
      memberId: account.memberId,
      savingsAccountId: account.savingsAccountId,
      memberNumber: account.memberNumber,
      memberName: account.memberName,
      earningDays: earningDays[index],
      amount: money(cents),
    }))
    .sort((a, b) => a.memberNumber.localeCompare(b.memberNumber));
}

export { minorUnits, money };
