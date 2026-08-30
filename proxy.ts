import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { env } from "@/lib/env";
import { getDashboardPathForRole } from "@/lib/dashboard/navigation";

const publicAuthPages = new Set(["/sign-in", "/forgot-password"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: env.AUTH_SECRET,
  });
  const isApiRoute = pathname.startsWith("/api/");
  const isPublicAuthRoute = publicAuthPages.has(pathname);

  if (isPublicAuthRoute && token?.sub) {
    const destination = token.mustChangePassword
      ? "/change-password"
      : getDashboardPathForRole(token.role ?? "CLIENT");

    return NextResponse.redirect(new URL(destination, request.url));
  }

  const requiresSession =
    pathname === "/change-password" ||
    pathname.startsWith("/dashboard") ||
    (isApiRoute && !pathname.startsWith("/api/auth"));

  if (requiresSession && !token?.sub) {
    if (isApiRoute) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (
    token?.mustChangePassword &&
    pathname !== "/change-password" &&
    pathname !== "/api/auth/change-password" &&
    pathname.startsWith("/dashboard")
  ) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sign-in",
    "/forgot-password",
    "/change-password",
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
