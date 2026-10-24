> Generated from application source and docs/catalog.mjs. Refresh with npm run docs:generate; edit the catalog or application source, not this file.

# Data dictionary

Generated from the current Prisma schema. This describes storage, including states that do not yet have an application workflow. A column or enum value does not imply a supported user action. Decimal amounts cross JSON interfaces as strings. Database migrations may add constraints/triggers beyond the declarative schema; see architecture and operations.

## UserRole

Enum values: `CLIENT`, `TREASURER`, `BOARD`, `ADMIN`.

## UserStatus

Enum values: `ACTIVE`, `SUSPENDED`.

## MemberStatus

Enum values: `PENDING`, `ACTIVE`, `SUSPENDED`, `EXITED`.

## SavingsAccountStatus

Enum values: `ACTIVE`, `SUSPENDED`, `CLOSED`.

## AuditAction

Enum values: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `PASSWORD_RESET`, `PASSWORD_CHANGE`, `DISBURSE`, `SIGN`, `EXPORT`, `DEPOSIT`, `WITHDRAW`.

## AuditStatus

Enum values: `SUCCESS`, `FAILURE`.

## NotificationType

Enum values: `WELCOME`, `PASSWORD_RESET`, `SECURITY`, `SYSTEM`.

## AuthIdentifierType

Enum values: `MEMBER_NUMBER`, `USERNAME`, `EMAIL`, `PHONE`.

## PasswordResetChannel

Enum values: `EMAIL`, `SMS`, `ADMIN_ASSISTED`.

## TransactionType

Enum values: `DEPOSIT`, `WITHDRAWAL`, `INTEREST`, `DIVIDEND`, `LOAN_DISBURSEMENT`, `LOAN_REPAYMENT`.

## User

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| username | `String?` | — |
| email | `String?` | — |
| phone | `String?` | — |
| passwordHash | `String` | — |
| role | `UserRole` | — |
| memberId | `String?` | @unique |
| status | `UserStatus` | @default(ACTIVE) |
| mustChangePassword | `Boolean` | @default(true) |
| lastLoginAt | `DateTime?` | — |
| tempCredentialIssuedAt | `DateTime?` | — |
| createdAt | `DateTime` | @default(now()) |
| updatedAt | `DateTime` | @updatedAt |
| member | `Member?` | @relation(fields: [memberId], references: [id], onDelete: SetNull) |
| auditLogs | `AuditLog[]` | @relation("AuditActor") |
| notifications | `Notification[]` | — |
| passwordResetRequests | `PasswordResetRequest[]` | — |
| performedTransactions | `Transaction[]` | @relation("TransactionPerformer") |
| loanDecisions | `LoanApplication[]` | @relation("LoanDecisionMaker") |
| loanApprovalSteps | `LoanApprovalStep[]` | — |
| disbursedLoans | `Loan[]` | @relation("LoanDisburser") |
| recordedLoanPayments | `LoanPayment[]` | — |
| dividendRunsCreated | `DividendRun[]` | @relation("DividendCreator") |
| dividendRunsDecided | `DividendRun[]` | @relation("DividendDecider") |
| dividendRunsPosted | `DividendRun[]` | @relation("DividendPoster") |
| withdrawalsRequested | `WithdrawalRequest[]` | @relation("WithdrawalRequester") |
| withdrawalsReviewed | `WithdrawalRequest[]` | @relation("WithdrawalReviewer") |
| withdrawalsDisbursed | `WithdrawalRequest[]` | @relation("WithdrawalDisburser") |
| earningsProposed | `EarningsRun[]` | @relation("EarningsProposer") |
| earningsPosted | `EarningsRun[]` | @relation("EarningsPoster") |
| earningsCancelled | `EarningsRun[]` | @relation("EarningsCanceller") |

`@@index([role])` · `@@index([status])`

## Member

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| memberNumber | `String` | @unique |
| firstName | `String` | — |
| lastName | `String` | — |
| dateOfBirth | `DateTime?` | — |
| nationalIdNumber | `String` | — |
| address | `String` | — |
| phone | `String` | — |
| email | `String?` | — |
| nextOfKinName | `String` | — |
| nextOfKinPhone | `String` | — |
| photoUrl | `String?` | — |
| enrollmentDate | `DateTime` | @default(now()) |
| status | `MemberStatus` | @default(PENDING) |
| createdAt | `DateTime` | @default(now()) |
| updatedAt | `DateTime` | @updatedAt |
| user | `User?` | — |
| savingsAccount | `SavingsAccount?` | — |
| loanApplications | `LoanApplication[]` | — |
| loans | `Loan[]` | — |
| investments | `MemberInvestment[]` | — |
| dividendAllocations | `DividendAllocation[]` | — |
| withdrawalRequests | `WithdrawalRequest[]` | — |
| earningsAllocations | `EarningsAllocation[]` | — |

`@@index([status])` · `@@index([createdAt])`

## SavingsAccount

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| memberId | `String` | @unique |
| accountNumber | `String` | @unique |
| balance | `Decimal` | @default(0) @db.Decimal(18, 2) |
| status | `SavingsAccountStatus` | @default(ACTIVE) |
| openedAt | `DateTime` | @default(now()) |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| transactions | `Transaction[]` | — |
| dividendAllocations | `DividendAllocation[]` | — |
| withdrawalRequests | `WithdrawalRequest[]` | — |
| earningsAllocations | `EarningsAllocation[]` | — |

`@@unique([id, memberId])` · `@@index([status])`

## Transaction

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| savingsAccountId | `String` | — |
| type | `TransactionType` | — |
| amount | `Decimal` | @db.Decimal(18, 2) |
| balanceAfter | `Decimal` | @db.Decimal(18, 2) |
| reference | `String?` | — |
| narrative | `String?` | — |
| performedById | `String` | — |
| createdAt | `DateTime` | @default(now()) |
| savingsAccount | `SavingsAccount` | @relation(fields: [savingsAccountId], references: [id], onDelete: Restrict) |
| performedBy | `User` | @relation("TransactionPerformer", fields: [performedById], references: [id], onDelete: Restrict) |
| disbursedLoan | `Loan?` | — |
| dividendAllocation | `DividendAllocation?` | — |
| withdrawalRequest | `WithdrawalRequest?` | — |
| earningsAllocation | `EarningsAllocation?` | — |

`@@index([savingsAccountId, createdAt(sort: Desc)])` · `@@index([performedById, createdAt(sort: Desc)])` · `@@index([type, createdAt(sort: Desc)])`

## WithdrawalRequestStatus

Enum values: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, `DISBURSED`.

## WithdrawalPayoutMethod

Enum values: `CASH`, `BANK_TRANSFER`, `MOBILE_MONEY`.

## WithdrawalRequest

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| memberId | `String` | — |
| savingsAccountId | `String` | — |
| amount | `Decimal` | @db.Decimal(18, 2) |
| payoutMethod | `WithdrawalPayoutMethod` | — |
| payoutDetails | `String?` | @db.VarChar(120) |
| reason | `String?` | @db.VarChar(240) |
| status | `WithdrawalRequestStatus` | @default(PENDING) |
| requestedById | `String` | — |
| requestedAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| reviewedById | `String?` | — |
| reviewedAt | `DateTime?` | @db.Timestamptz(3) |
| reviewComment | `String?` | @db.VarChar(500) |
| disbursedById | `String?` | — |
| disbursedAt | `DateTime?` | @db.Timestamptz(3) |
| transactionId | `String?` | @unique |
| cancelledAt | `DateTime?` | @db.Timestamptz(3) |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| savingsAccount | `SavingsAccount` | @relation(fields: [savingsAccountId, memberId], references: [id, memberId], onDelete: Restrict) |
| requestedBy | `User` | @relation("WithdrawalRequester", fields: [requestedById], references: [id], onDelete: Restrict) |
| reviewedBy | `User?` | @relation("WithdrawalReviewer", fields: [reviewedById], references: [id], onDelete: Restrict) |
| disbursedBy | `User?` | @relation("WithdrawalDisburser", fields: [disbursedById], references: [id], onDelete: Restrict) |
| transaction | `Transaction?` | @relation(fields: [transactionId], references: [id], onDelete: Restrict) |

`@@index([memberId, requestedAt(sort: Desc)])` · `@@index([savingsAccountId, status])` · `@@index([status, requestedAt])` · `@@index([requestedById])` · `@@index([reviewedById])` · `@@index([disbursedById])`

## EarningsRunStatus

Enum values: `PROPOSED`, `POSTED`, `CANCELLED`.

## EarningsRun

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| month | `String` | @db.Char(7) // YYYY-MM |
| periodEnd | `DateTime` | @db.Date |
| interestCollected | `Decimal` | @db.Decimal(18, 2) |
| memberSharePercent | `Decimal` | @db.Decimal(5, 2) |
| memberPool | `Decimal` | @db.Decimal(18, 2) |
| reserveAmount | `Decimal` | @db.Decimal(18, 2) |
| forfeitedAmount | `Decimal` | @default(0) @db.Decimal(18, 2) |
| calculationMethod | `String` | @default("DAILY_MINIMUM_BALANCE_INTEREST_ATTRIBUTION") |
| calculationSnapshot | `Json` | — |
| status | `EarningsRunStatus` | @default(PROPOSED) |
| proposedById | `String` | — |
| proposedAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| postedById | `String?` | — |
| postedAt | `DateTime?` | @db.Timestamptz(3) |
| cancelledById | `String?` | — |
| cancelledAt | `DateTime?` | @db.Timestamptz(3) |
| proposedBy | `User` | @relation("EarningsProposer", fields: [proposedById], references: [id], onDelete: Restrict) |
| postedBy | `User?` | @relation("EarningsPoster", fields: [postedById], references: [id], onDelete: Restrict) |
| cancelledBy | `User?` | @relation("EarningsCanceller", fields: [cancelledById], references: [id], onDelete: Restrict) |
| loans | `EarningsRunLoan[]` | — |
| allocations | `EarningsAllocation[]` | — |

`@@index([status, month])` · `@@index([proposedById])` · `@@index([postedById])` · `@@index([cancelledById])`

## EarningsRunLoan

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| runId | `String` | — |
| loanId | `String` | — |
| interestRecognized | `Decimal` | @db.Decimal(18, 2) |
| run | `EarningsRun` | @relation(fields: [runId], references: [id], onDelete: Restrict) |
| loan | `Loan` | @relation(fields: [loanId], references: [id], onDelete: Restrict) |

`@@id([runId, loanId])` · `@@index([loanId])`

## EarningsAllocation

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| runId | `String` | — |
| memberId | `String` | — |
| savingsAccountId | `String` | — |
| amount | `Decimal` | @db.Decimal(18, 2) |
| earningDays | `Int` | — |
| forfeited | `Boolean` | @default(false) |
| transactionId | `String?` | @unique |
| run | `EarningsRun` | @relation(fields: [runId], references: [id], onDelete: Restrict) |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| savingsAccount | `SavingsAccount` | @relation(fields: [savingsAccountId, memberId], references: [id, memberId], onDelete: Restrict) |
| transaction | `Transaction?` | @relation(fields: [transactionId], references: [id], onDelete: Restrict) |

`@@unique([runId, memberId])` · `@@index([memberId])` · `@@index([savingsAccountId, memberId])`

## AuditLog

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| actorId | `String?` | — |
| actorRole | `UserRole?` | — |
| action | `AuditAction` | — |
| entityType | `String` | — |
| entityId | `String?` | — |
| beforeState | `Json?` | — |
| afterState | `Json?` | — |
| metadata | `Json?` | — |
| status | `AuditStatus` | @default(SUCCESS) |
| failureReason | `String?` | — |
| ipAddress | `String?` | — |
| userAgent | `String?` | — |
| createdAt | `DateTime` | @default(now()) |
| actor | `User?` | @relation("AuditActor", fields: [actorId], references: [id], onDelete: SetNull) |

`@@index([actorId])` · `@@index([action, createdAt])` · `@@index([entityType, entityId])` · `@@index([status, createdAt])`

## SystemSetting

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| key | `String` | @id |
| value | `String` | — |
| updatedById | `String?` | — |
| updatedAt | `DateTime` | @updatedAt |



## Notification

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| userId | `String` | — |
| type | `NotificationType` | — |
| message | `String` | — |
| read | `Boolean` | @default(false) |
| createdAt | `DateTime` | @default(now()) |
| user | `User` | @relation(fields: [userId], references: [id], onDelete: Cascade) |

`@@index([userId, createdAt(sort: Desc)])`

## PasswordResetRequest

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| userId | `String` | — |
| identifierType | `AuthIdentifierType` | — |
| channel | `PasswordResetChannel` | — |
| tokenHash | `String` | — |
| expiresAt | `DateTime` | — |
| consumedAt | `DateTime?` | — |
| createdAt | `DateTime` | @default(now()) |
| user | `User` | @relation(fields: [userId], references: [id], onDelete: Cascade) |

`@@index([userId, createdAt(sort: Desc)])` · `@@index([tokenHash])` · `@@index([expiresAt])`

## InvestmentRiskProfile

Enum values: `LOW`, `MEDIUM`, `HIGH`.

## MemberInvestmentStatus

Enum values: `ACTIVE`, `MATURED`, `CANCELLED`.

## DividendRunStatus

Enum values: `PROPOSED`, `APPROVED`, `REJECTED`, `POSTED`.

## InvestmentProduct

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| name | `String` | @unique |
| description | `String` | — |
| expectedReturnRate | `Decimal` | @db.Decimal(7, 4) |
| riskProfile | `InvestmentRiskProfile` | — |
| active | `Boolean` | @default(true) |
| createdAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| updatedAt | `DateTime` | @updatedAt @db.Timestamptz(3) |
| investments | `MemberInvestment[]` | — |



## MemberInvestment

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| memberId | `String` | — |
| investmentProductId | `String` | — |
| principal | `Decimal` | @db.Decimal(18, 2) |
| startDate | `DateTime` | @db.Date |
| maturityDate | `DateTime` | @db.Date |
| status | `MemberInvestmentStatus` | @default(ACTIVE) |
| productName | `String` | — |
| expectedReturnRate | `Decimal` | @db.Decimal(7, 4) |
| riskProfile | `InvestmentRiskProfile` | — |
| createdAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| updatedAt | `DateTime` | @updatedAt @db.Timestamptz(3) |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| product | `InvestmentProduct` | @relation(fields: [investmentProductId], references: [id], onDelete: Restrict) |

`@@index([memberId, createdAt(sort: Desc)])` · `@@index([investmentProductId])` · `@@index([status, maturityDate])`

## DividendRun

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| financialYear | `Int` | — |
| periodStart | `DateTime` | @db.Date |
| periodEnd | `DateTime` | @db.Date |
| totalPoolAmount | `Decimal` | @db.Decimal(18, 2) |
| calculationMethod | `String` | @default("PRO_RATA_AVERAGE_DAILY_SAVINGS") |
| calculationSnapshot | `Json` | — |
| runDate | `DateTime` | @default(now()) @db.Timestamptz(3) |
| runById | `String` | — |
| status | `DividendRunStatus` | @default(PROPOSED) |
| decidedById | `String?` | — |
| decidedAt | `DateTime?` | @db.Timestamptz(3) |
| decisionComment | `String?` | — |
| postedById | `String?` | — |
| postedAt | `DateTime?` | @db.Timestamptz(3) |
| runBy | `User` | @relation("DividendCreator", fields: [runById], references: [id], onDelete: Restrict) |
| decidedBy | `User?` | @relation("DividendDecider", fields: [decidedById], references: [id], onDelete: Restrict) |
| postedBy | `User?` | @relation("DividendPoster", fields: [postedById], references: [id], onDelete: Restrict) |
| allocations | `DividendAllocation[]` | — |

`@@index([status, runDate])` · `@@index([runById])` · `@@index([decidedById])` · `@@index([postedById])`

## DividendAllocation

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| dividendRunId | `String` | — |
| memberId | `String` | — |
| savingsAccountId | `String` | — |
| amount | `Decimal` | @db.Decimal(18, 2) |
| averageBalance | `Decimal` | @db.Decimal(18, 2) |
| transactionId | `String?` | @unique |
| run | `DividendRun` | @relation(fields: [dividendRunId], references: [id], onDelete: Restrict) |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| savingsAccount | `SavingsAccount` | @relation(fields: [savingsAccountId, memberId], references: [id, memberId], onDelete: Restrict) |
| transaction | `Transaction?` | @relation(fields: [transactionId], references: [id], onDelete: Restrict) |

`@@unique([dividendRunId, memberId])` · `@@index([memberId])` · `@@index([savingsAccountId, memberId])`

## InterestMethod

Enum values: `FLAT`, `REDUCING_BALANCE`.

## LoanApplicationStatus

Enum values: `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `CANCELLED`.

## LoanDecision

Enum values: `PENDING`, `APPROVED`, `REJECTED`.

## LoanContractStatus

Enum values: `AWAITING_SIGNATURE`, `SIGNED`, `VOID`.

## LoanStatus

Enum values: `ACTIVE`, `CLOSED`, `DEFAULTED`.

## LoanScheduleStatus

Enum values: `PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `WAIVED`.

## LoanPaymentMethod

Enum values: `CASH`, `BANK_TRANSFER`, `MOBILE_MONEY`.

## LoanType

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| name | `String` | @unique |
| interestMethod | `InterestMethod` | — |
| interestRate | `Decimal` | @db.Decimal(7, 4) |
| maxTermMonths | `Int` | — |
| maxMultipleOfSavings | `Decimal` | @db.Decimal(7, 2) |
| processingFeePercent | `Decimal` | @db.Decimal(7, 4) |
| active | `Boolean` | @default(true) |
| createdAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| updatedAt | `DateTime` | @updatedAt @db.Timestamptz(3) |
| applications | `LoanApplication[]` | — |



## LoanApplication

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| memberId | `String` | — |
| loanTypeId | `String` | — |
| amountRequested | `Decimal` | @db.Decimal(18, 2) |
| termMonths | `Int` | — |
| purpose | `String` | — |
| status | `LoanApplicationStatus` | @default(SUBMITTED) |
| loanTypeName | `String` | — |
| interestMethod | `InterestMethod` | — |
| interestRate | `Decimal` | @db.Decimal(7, 4) |
| processingFeePercent | `Decimal` | @db.Decimal(7, 4) |
| maxMultipleOfSavings | `Decimal` | @db.Decimal(7, 2) |
| boardApprovalThreshold | `Decimal` | @db.Decimal(18, 2) |
| submittedAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| decidedAt | `DateTime?` | @db.Timestamptz(3) |
| decidedById | `String?` | — |
| rejectionReason | `String?` | — |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| loanType | `LoanType` | @relation(fields: [loanTypeId], references: [id], onDelete: Restrict) |
| decidedBy | `User?` | @relation("LoanDecisionMaker", fields: [decidedById], references: [id], onDelete: Restrict) |
| approvalSteps | `LoanApprovalStep[]` | — |
| contract | `LoanContract?` | — |
| loan | `Loan?` | — |

`@@index([memberId, submittedAt(sort: Desc)])` · `@@index([status, submittedAt])` · `@@index([loanTypeId])` · `@@index([decidedById])`

## LoanApprovalStep

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| loanApplicationId | `String` | — |
| stepNumber | `Int` | — |
| approverRole | `UserRole` | — |
| approverId | `String?` | — |
| decision | `LoanDecision` | @default(PENDING) |
| comment | `String?` | — |
| decidedAt | `DateTime?` | @db.Timestamptz(3) |
| application | `LoanApplication` | @relation(fields: [loanApplicationId], references: [id], onDelete: Restrict) |
| approver | `User?` | @relation(fields: [approverId], references: [id], onDelete: Restrict) |

`@@unique([loanApplicationId, stepNumber])` · `@@unique([loanApplicationId, approverRole])` · `@@index([approverRole, decision])` · `@@index([approverId])`

## LoanContract

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| loanApplicationId | `String` | @unique |
| documentPdf | `Bytes` | — |
| documentHash | `String` | — |
| terms | `Json` | — |
| generatedAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| status | `LoanContractStatus` | @default(AWAITING_SIGNATURE) |
| memberSignedAt | `DateTime?` | @db.Timestamptz(3) |
| signedName | `String?` | — |
| memberSignaturePng | `Bytes?` | — |
| signatureHash | `String?` | — |
| signingIpAddress | `String?` | — |
| signingUserAgent | `String?` | — |
| consentVersion | `String?` | — |
| application | `LoanApplication` | @relation(fields: [loanApplicationId], references: [id], onDelete: Restrict) |
| loan | `Loan?` | — |



## Loan

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| loanApplicationId | `String` | @unique |
| memberId | `String` | — |
| contractId | `String` | @unique |
| principal | `Decimal` | @db.Decimal(18, 2) |
| interestRate | `Decimal` | @db.Decimal(7, 4) |
| interestMethod | `InterestMethod` | — |
| termMonths | `Int` | — |
| processingFee | `Decimal` | @db.Decimal(18, 2) |
| netDisbursement | `Decimal` | @db.Decimal(18, 2) |
| disbursementDate | `DateTime` | @db.Timestamptz(3) |
| disbursedById | `String` | — |
| disbursementTransactionId | `String` | @unique |
| status | `LoanStatus` | @default(ACTIVE) |
| outstandingBalance | `Decimal` | @db.Decimal(18, 2) |
| application | `LoanApplication` | @relation(fields: [loanApplicationId], references: [id], onDelete: Restrict) |
| member | `Member` | @relation(fields: [memberId], references: [id], onDelete: Restrict) |
| contract | `LoanContract` | @relation(fields: [contractId], references: [id], onDelete: Restrict) |
| disbursedBy | `User` | @relation("LoanDisburser", fields: [disbursedById], references: [id], onDelete: Restrict) |
| disbursementTransaction | `Transaction` | @relation(fields: [disbursementTransactionId], references: [id], onDelete: Restrict) |
| schedule | `LoanSchedule[]` | — |
| payments | `LoanPayment[]` | — |
| earningsRecognized | `EarningsRunLoan[]` | — |

`@@index([memberId, disbursementDate(sort: Desc)])` · `@@index([status])` · `@@index([disbursedById])`

## LoanSchedule

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| loanId | `String` | — |
| installmentNumber | `Int` | — |
| dueDate | `DateTime` | @db.Date |
| principalDue | `Decimal` | @db.Decimal(18, 2) |
| interestDue | `Decimal` | @db.Decimal(18, 2) |
| totalDue | `Decimal` | @db.Decimal(18, 2) |
| principalBalanceAfter | `Decimal` | @db.Decimal(18, 2) |
| principalPaid | `Decimal` | @default(0) @db.Decimal(18, 2) |
| interestPaid | `Decimal` | @default(0) @db.Decimal(18, 2) |
| status | `LoanScheduleStatus` | @default(PENDING) |
| loan | `Loan` | @relation(fields: [loanId], references: [id], onDelete: Restrict) |
| allocations | `LoanPaymentAllocation[]` | — |

`@@unique([id, loanId])` · `@@unique([loanId, installmentNumber])` · `@@index([status, dueDate])`

## LoanPayment

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| id | `String` | @id @default(cuid()) |
| loanId | `String` | — |
| amount | `Decimal` | @db.Decimal(18, 2) |
| paymentDate | `DateTime` | @db.Date |
| method | `LoanPaymentMethod` | — |
| reference | `String` | @db.VarChar(100) |
| targetInstallmentNumber | `Int?` | — |
| recordedById | `String` | — |
| createdAt | `DateTime` | @default(now()) @db.Timestamptz(3) |
| loan | `Loan` | @relation(fields: [loanId], references: [id], onDelete: Restrict) |
| recordedBy | `User` | @relation(fields: [recordedById], references: [id], onDelete: Restrict) |
| allocations | `LoanPaymentAllocation[]` | — |

`@@unique([id, loanId])` · `@@unique([loanId, reference])` · `@@index([loanId, paymentDate, createdAt, id])` · `@@index([recordedById])`

## LoanPaymentAllocation

| Field | Type (? optional; [] relation list) | Constraints / relation |
| --- | --- | --- |
| paymentId | `String` | — |
| scheduleId | `String` | — |
| loanId | `String` | — |
| principalAmount | `Decimal` | @db.Decimal(18, 2) |
| interestAmount | `Decimal` | @db.Decimal(18, 2) |
| payment | `LoanPayment` | @relation(fields: [paymentId, loanId], references: [id, loanId], onDelete: Restrict) |
| schedule | `LoanSchedule` | @relation(fields: [scheduleId, loanId], references: [id, loanId], onDelete: Restrict) |

`@@id([paymentId, scheduleId])` · `@@index([scheduleId, loanId])` · `@@index([loanId])`

Source: [`prisma/schema.prisma`](../../prisma/schema.prisma)
