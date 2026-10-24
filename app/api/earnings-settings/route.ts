import { json } from "@/lib/api";
import { earningsSettingsSchema } from "@/lib/earnings/schemas";
import {
  getEarningsSharePercent,
  saveEarningsSharePercent,
} from "@/lib/earnings/service";
import { loanMutation, loanRead } from "@/lib/loans/routes";

export const GET = loanRead(async () =>
  json({ memberSharePercent: await getEarningsSharePercent() }),
);

export const PATCH = loanMutation({
  action: "UPDATE",
  entityType: "SystemSetting",
  roles: ["ADMIN"],
  schema: earningsSettingsSchema,
  execute: (tx, actor, _id, input) =>
    saveEarningsSharePercent(tx, actor, input.memberSharePercent),
});
