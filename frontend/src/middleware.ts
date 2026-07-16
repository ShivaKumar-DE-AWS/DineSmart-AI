import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  let currentHost = hostname;
  if (hostname.includes(".smartdineai.co.in")) {
    currentHost = hostname.replace(".smartdineai.co.in", "");
  } else if (hostname.includes(".localhost:3000")) {
    currentHost = hostname.replace(".localhost:3000", "");
  } else if (hostname.includes(".vercel.app")) {
    const parts = hostname.split(".");
    if (parts.length >= 4) {
      currentHost = parts[0];
    }
  }

  // Handle staff routes (admin, kitchen, counter, cashier)
  const isStaffRoute = url.pathname.startsWith('/admin') || url.pathname.startsWith('/kitchen') || url.pathname.startsWith('/counter') || url.pathname.startsWith('/cashier');
  
  if (isStaffRoute) {
    // If on the main domain, block access to tenant-specific staff routes
    if (
      currentHost === "smartdineai.co.in" ||
      currentHost === "www" ||
      currentHost === "localhost:3000" ||
      (currentHost === hostname && !hostname.includes(".vercel.app")) // Fallback if replace didn't do anything, EXCEPT on vercel previews where we must allow root domain access
    ) {
      url.pathname = "/404";
      return NextResponse.rewrite(url);
    }
    // For subdomains, DO NOT rewrite staff routes so they hit app/admin natively!
    return NextResponse.next();
  }

  // If the host is the main domain or a system subdomain, proceed normally
  if (
    currentHost === "smartdineai.co.in" ||
    currentHost === "www" ||
    currentHost === "api" ||
    currentHost === "localhost:3000" ||
    currentHost === hostname // Fallback if replace didn't do anything
  ) {
    return NextResponse.next();
  }

  // Prevent rewriting for static assets or paths that are already correct
  if (
    url.pathname.startsWith("/r/") ||
    url.pathname.startsWith("/auth") ||
    url.pathname.startsWith("/super-admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.includes(".") // static files like .png, .ico
  ) {
    return NextResponse.next();
  }

  // currentHost is now the unique subdomain (e.g., 'mehfil')
  // We rewrite the request silently to our dynamic route `/r/[slug]`
  // If they visit mehfil.smartdineai.co.in/menu -> it rewrites to /r/mehfil/menu
  url.pathname = `/r/${currentHost}${url.pathname}`;
  
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
