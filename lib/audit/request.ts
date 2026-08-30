import type { NextRequest } from "next/server";

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

function readHeaderValue(
  headers: Headers | Record<string, string | string[] | undefined>,
  key: string,
) {
  if (headers instanceof Headers) {
    return headers.get(key);
  }

  const value = headers[key] ?? headers[key.toLowerCase()];

  return Array.isArray(value) ? value[0] : value ?? null;
}

export function getRequestMetadata(
  source:
    | NextRequest
    | Request
    | {
        headers?: Headers | Record<string, string | string[] | undefined>;
      },
): RequestMetadata {
  const headers = source.headers instanceof Headers ? source.headers : source.headers;

  if (!headers) {
    return {
      ipAddress: null,
      userAgent: null,
    };
  }

  const forwardedFor = readHeaderValue(headers, "x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  return {
    ipAddress,
    userAgent: readHeaderValue(headers, "user-agent"),
  };
}
