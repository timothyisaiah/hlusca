> Generated from application source and docs/catalog.mjs. Refresh with npm run docs:generate; edit the catalog or application source, not this file.

# Validation reference

These definitions are copied from source without importing application modules or connecting to a database. Transformations, refinements and helper functions are retained so limits are not silently lost. Endpoint request descriptions translate these rules into plain language. Database-dependent eligibility and ownership checks also apply.

## lib/members/schemas.ts

[`lib/members/schemas.ts`](../../lib/members/schemas.ts)

```ts
const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value && value.length > 0 ? value : undefined);

const emailField = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => normalizeEmail(value))
  .optional()
  .or(z.literal("").transform(() => undefined));

const usernameField = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be 32 characters or fewer.")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username can only include letters, numbers, periods, underscores, and hyphens.",
  )
  .transform((value) => normalizeUsername(value));

function phoneField(fieldName: string) {
  return z
    .string()
    .trim()
    .transform((value) => assertE164Phone(value, fieldName));
}

const dateField = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date.");
    }

    return parsed;
  });

export const memberEnrollmentSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  username: usernameField,
  phone: phoneField("Phone number"),
  email: emailField,
  address: z.string().trim().min(2, "Address is required."),
  nationalIdNumber: z.string().trim().min(5, "National ID is required."),
  nextOfKinName: z.string().trim().min(2, "Next of kin name is required."),
  nextOfKinPhone: phoneField("Next-of-kin phone number"),
  dateOfBirth: dateField,
  photoUrl: optionalTrimmedString,
});

export const adminMemberUpdateSchema = z.object({
  firstName: z.string().trim().min(2).optional(),
  lastName: z.string().trim().min(2).optional(),
  username: usernameField.optional(),
  phone: phoneField("Phone number").optional(),
  email: emailField,
  address: z.string().trim().min(2).optional(),
  nationalIdNumber: z.string().trim().min(5).optional(),
  nextOfKinName: z.string().trim().min(2).optional(),
  nextOfKinPhone: phoneField("Next-of-kin phone number").optional(),
  dateOfBirth: dateField.optional(),
  photoUrl: optionalTrimmedString,
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "EXITED"]).optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const selfMemberUpdateSchema = z.object({
  address: z.string().trim().min(2).optional(),
  phone: phoneField("Phone number").optional(),
  email: emailField,
  nextOfKinName: z.string().trim().min(2).optional(),
  nextOfKinPhone: phoneField("Next-of-kin phone number").optional(),
});

export const passwordResetRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username, phone, email, or member number."),
});

export const passwordResetConfirmSchema = z.object({
  identifier: z.string().trim().min(1),
  token: z.string().trim().min(6, "Enter the reset code or token you received."),
  newPassword: z.string().min(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(10, "New password must be at least 10 characters."),
});
```

## lib/savings/schemas.ts

[`lib/savings/schemas.ts`](../../lib/savings/schemas.ts)

```ts
function optionalTextField(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

function parseDateBoundary(value: string | undefined, boundary: "start" | "end") {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date.");
  }

  if (boundary === "start") {
    parsed.setHours(0, 0, 0, 0);
  } else {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
}

export const savingsMutationSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine(
      (value) => /^\d+(?:\.\d{1,2})?$/.test(value) && Number.parseFloat(value) > 0,
      "Enter a valid amount greater than zero with up to 2 decimal places.",
    ),
  reference: optionalTextField(80),
  narrative: optionalTextField(240),
});

export const savingsLedgerQuerySchema = z
  .object({
    query: optionalTextField(80),
    type: z.nativeEnum(TransactionType).optional(),
    from: z
      .string()
      .trim()
      .optional()
      .transform((value) => parseDateBoundary(value, "start")),
    to: z
      .string()
      .trim()
      .optional()
      .transform((value) => parseDateBoundary(value, "end")),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(8),
    format: z.enum(["json", "csv", "pdf"]).default("json"),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "The start date must be before the end date.",
    path: ["to"],
  });
```

## lib/loans/schemas.ts

[`lib/loans/schemas.ts`](../../lib/loans/schemas.ts)

```ts
export const moneySchema = z
  .string()
  .trim()
  .regex(
    /^\d{1,12}(\.\d{1,2})?$/,
    "Enter an amount with at most two decimal places.",
  )
  .refine((value) => Number(value) > 0, "Amount must be greater than zero.");

const percentage = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,4})?$/)
  .refine((value) => Number(value) <= 100, "Percentage cannot exceed 100.");

export const loanTypeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  interestMethod: z.enum(["FLAT", "REDUCING_BALANCE"]),
  interestRate: percentage,
  maxTermMonths: z.number().int().min(1).max(360),
  maxMultipleOfSavings: z
    .string()
    .trim()
    .regex(/^\d{1,3}(\.\d{1,2})?$/)
    .refine((value) => Number(value) > 0, "Savings multiple must be positive."),
  processingFeePercent: percentage.refine(
    (value) => Number(value) < 100,
    "Fee must be less than 100%.",
  ),
  active: z.boolean().default(true),
});

export const applicationSchema = z.object({
  loanTypeId: z.string().min(1).max(100),
  amountRequested: moneySchema,
  termMonths: z.number().int().min(1).max(360),
  purpose: z
    .string()
    .trim()
    .min(10, "Describe the purpose in at least 10 characters.")
    .max(2000),
});

export const previewSchema = applicationSchema.omit({ purpose: true });

export const decisionSchema = z.object({
  comment: z.string().trim().max(2000).default(""),
});

export const rejectionSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(3, "Provide a reason for rejection.")
    .max(2000),
});

export const thresholdSchema = z.object({ threshold: moneySchema });

export const signatureSchema = z.object({
  typedName: z.string().trim().min(3).max(200),
  signature: z.string().max(350000).startsWith("data:image/png;base64,"),
  documentHash: z.string().regex(/^[a-f0-9]{64}$/),
  agree: z.literal(true),
});

export const disbursementSchema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal(true),
});

export const paymentSchema = z.object({
  amount: moneySchema,
  paymentDate: z.iso.date(),
  method: z.enum(["CASH", "BANK_TRANSFER", "MOBILE_MONEY"]),
  reference: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9 ./_-]*$/,
      "Use letters, numbers, spaces, dots, /, _ or - in the receipt reference.",
    )
    .transform((value) => value.toUpperCase()),
  targetInstallmentNumber: z.number().int().min(1).max(360).optional(),
  confirm: z.literal(true),
});

export const applicationFiltersSchema = z
  .object({
    status: z
      .enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED"])
      .optional(),
    query: z.string().trim().max(100).default(""),
    memberId: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    queue: z.enum(["true", "false"]).default("false"),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (input) => !input.from || !input.to || input.from <= input.to,
    "The start date must not be after the end date.",
  );
```

## lib/loans/statement-types.ts

[`lib/loans/statement-types.ts`](../../lib/loans/statement-types.ts)

```ts
export const statementFiltersSchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    type: z.enum(["DISBURSEMENT", "PAYMENT"]).optional(),
    query: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(100000).default(1),
  })
  .refine(
    (input) => !input.from || !input.to || input.from <= input.to,
    "The start date must not be after the end date.",
  );

export function filterStatementRows(
  rows: LoanStatementRow[],
  filters: StatementFilters,
) {
  return rows.filter(
    (row) =>
      (!filters.from || row.date >= filters.from) &&
      (!filters.to || row.date <= filters.to) &&
      (!filters.type || row.type === filters.type) &&
      (!filters.query ||
        row.reference.toLowerCase().includes(filters.query.toLowerCase())),
  );
}
```

## lib/investments/schemas.ts

[`lib/investments/schemas.ts`](../../lib/investments/schemas.ts)

```ts
export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(3).max(2000),
    expectedReturnRate: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\.\d{1,4})?$/)
      .refine(
        (value) => Number(value) <= 100,
        "Return rate cannot exceed 100%.",
      ),
    riskProfile: z.enum(["LOW", "MEDIUM", "HIGH"]),
    active: z.boolean().default(true),
  })
  .strict();

export const investmentSchema = z
  .object({
    memberId: z.string().min(1).max(100),
    investmentProductId: z.string().min(1).max(100),
    principal: moneySchema,
    startDate: z.iso.date(),
    maturityDate: z.iso.date(),
  })
  .strict()
  .refine((row) => row.maturityDate > row.startDate, {
    message: "Maturity must be after the start date.",
    path: ["maturityDate"],
  });

export const investmentStatusSchema = z
  .object({ status: z.enum(["MATURED", "CANCELLED"]) })
  .strict();

export const dividendRunSchema = z
  .object({
    financialYear: z.number().int().min(2000).max(9998),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    totalPoolAmount: moneySchema,
  })
  .strict()
  .superRefine((row, ctx) => {
    if (
      !z.iso.date().safeParse(row.periodStart).success ||
      !z.iso.date().safeParse(row.periodEnd).success
    )
      return;
    const days = dateNumber(row.periodEnd) - dateNumber(row.periodStart) + 1;
    const anniversary = new Date(`${row.periodStart}T00:00:00Z`);
    const startMonth = anniversary.getUTCMonth();
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    // Match PostgreSQL's calendar-year interval: Feb 29 clamps to Feb 28.
    if (anniversary.getUTCMonth() !== startMonth) anniversary.setUTCDate(0);
    anniversary.setUTCDate(anniversary.getUTCDate() - 1);
    if (
      days < 365 ||
      days > 366 ||
      anniversary.toISOString().slice(0, 10) !== row.periodEnd
    )
      ctx.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "Select one complete financial year (12 months).",
      });
    if (Number(row.periodEnd.slice(0, 4)) !== row.financialYear)
      ctx.addIssue({
        code: "custom",
        path: ["financialYear"],
        message: "Financial year must match the period's ending year.",
      });
  });

export const dividendDecisionSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    comment: z.string().trim().min(3).max(2000),
  })
  .strict();

export const dividendPostSchema = z
  .object({ password: z.string().min(1).max(200), confirm: z.literal(true) })
  .strict();

export const memberFilterSchema = z.object({
  memberId: z.string().min(1).max(100).optional(),
});
```

## lib/auth/passwords.ts

[`lib/auth/passwords.ts`](../../lib/auth/passwords.ts)

```ts
const passwordComplexity = {
  minLength: 10,
  lower: /[a-z]/,
  upper: /[A-Z]/,
  digit: /\d/,
  symbol: /[^A-Za-z0-9]/,
};

export async function hashPassword(password: string) {
  assertStrongPassword(password);
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export function assertStrongPassword(password: string) {
  const failures: string[] = [];

  if (password.length < passwordComplexity.minLength) {
    failures.push(`at least ${passwordComplexity.minLength} characters`);
  }

  if (!passwordComplexity.lower.test(password)) {
    failures.push("one lowercase letter");
  }

  if (!passwordComplexity.upper.test(password)) {
    failures.push("one uppercase letter");
  }

  if (!passwordComplexity.digit.test(password)) {
    failures.push("one number");
  }

  if (!passwordComplexity.symbol.test(password)) {
    failures.push("one symbol");
  }

  if (failures.length > 0) {
    throw new ApiError(
      `Password must include ${failures.join(", ")}.`,
      400,
      "WEAK_PASSWORD",
    );
  }
}

export function generateTemporaryPassword() {
  return `Hl!${randomBytes(6).toString("base64url")}9a`;
}

export function generateResetToken() {
  return randomBytes(24).toString("base64url");
}

export function generateOtpCode() {
  return String(randomInt(100000, 1_000_000));
}

export function hashOpaqueToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
```
