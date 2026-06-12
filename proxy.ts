import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Optimistic guards only (per Next.js auth guidance): pages re-check data
// access via RLS. Public invite routes (/[slug]/[token]) match no prefix.
const PROTECTED_PREFIXES = [
  "/app",
  "/checkin",
  "/cliente",
  "/admin",
  "/onboarding",
];
const AUTH_PAGES = ["/login", "/cadastro"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirect = NextResponse.redirect(url);
    response.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return redirectTo("/login");
  }
  if (user && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    return redirectTo("/app");
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
