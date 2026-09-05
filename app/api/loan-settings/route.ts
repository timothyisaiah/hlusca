import { json } from "@/lib/api";
import { loanMutation, loanRead } from "@/lib/loans/routes";
import { thresholdSchema } from "@/lib/loans/schemas";
import {
  getApprovalThreshold,
  saveApprovalThreshold,
} from "@/lib/loans/service";

export const GET = loanRead(async () =>
  json({ threshold: await getApprovalThreshold() }),
);
export const PATCH = loanMutation({
  action: "UPDATE",
  entityType: "SystemSetting",
  roles: ["ADMIN"],
  schema: thresholdSchema,
  execute: (tx, actor, _id, payload) =>
    saveApprovalThreshold(tx, actor, payload.threshold),
});
