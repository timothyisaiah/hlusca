import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export function json<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

export function handleRouteError(error: unknown) {
  if (error instanceof ApiError) {
    return json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return json(
      {
        error: "Validation failed.",
        details: error.flatten(),
      },
      { status: 400 },
    );
  }

  console.error(error);

  return json(
    {
      error: "Something went wrong.",
    },
    { status: 500 },
  );
}

export function notFoundMessage(entity = "record") {
  return `${entity.charAt(0).toUpperCase() + entity.slice(1)} not found.`;
}
