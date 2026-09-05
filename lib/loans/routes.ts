import type { AuditAction, Prisma, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import type { ZodType } from "zod";

import { ApiError, handleRouteError, json } from "../api";
import { runAuditedMutation } from "../audit/mutation";
import { getRequestMetadata, type RequestMetadata } from "../audit/request";
import { authOptions } from "../auth/options";
import { env } from "../env";
import { assertLoanRole, getLoanActor, type LoanActor } from "./service";

type Context = { params?: Promise<{ id?: string }> };
type Outcome = {
  result: unknown;
  entityId?: string;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
};

async function readPayload(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("Send a JSON request body.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 400000) {
      await reader.cancel();
      throw new ApiError("Request is too large.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("Invalid JSON body.");
  }
}

/** Auth, RBAC, JSON parsing and validation all run INSIDE the audited operation. */
export function loanMutation<T>(options: {
  action: AuditAction;
  entityType: string;
  roles: UserRole[];
  schema: ZodType<T>;
  execute: (
    tx: Prisma.TransactionClient,
    actor: LoanActor,
    id: string,
    payload: T,
    metadata: RequestMetadata,
  ) => Promise<Outcome>;
}) {
  return async (request: NextRequest, context: Context) => {
    try {
      const session = await getServerSession(authOptions);
      const { id = "" } = (await context.params) ?? {};
      const metadata = getRequestMetadata(request);
      const auditContext = {
        actorId: session?.user?.id,
        actorRole: session?.user?.role,
        action: options.action,
        entityType: options.entityType,
        entityId: id || undefined,
        ...metadata,
      };
      const result = await runAuditedMutation(auditContext, async (tx) => {
        const actor = await getLoanActor(session?.user?.id, tx);
        auditContext.actorRole = actor.role;
        assertLoanRole(actor, options.roles);
        const origin = request.headers.get("origin");
        // Next normalizes loopback IPs to localhost in nextUrl. Also accept the
        // configured public origin, which retains its actual hostname and port.
        if (
          (origin &&
            origin !== request.nextUrl.origin &&
            origin !== new URL(env.NEXTAUTH_URL).origin) ||
          request.headers.get("sec-fetch-site") === "cross-site"
        )
          throw new ApiError("Cross-site requests are not allowed.", 403);
        const payload = options.schema.parse(await readPayload(request));
        return options.execute(tx, actor, id, payload, metadata);
      });
      return json(result);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export function loanRead(
  handler: (
    request: NextRequest,
    actor: LoanActor,
    id: string,
  ) => Promise<Response>,
) {
  return async (request: NextRequest, context: Context) => {
    try {
      const session = await getServerSession(authOptions);
      const actor = await getLoanActor(session?.user?.id);
      const { id = "" } = (await context.params) ?? {};
      return await handler(request, actor, id);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}
