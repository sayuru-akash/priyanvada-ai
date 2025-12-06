import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect Admin Routes
  if (pathname.startsWith("/priyaadmin")) {
    const adminSession = request.cookies.get("priyanvada_admin_session");

    if (!adminSession) {
      const loginUrl = new URL("/priyanvadaadminlogin", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Prevent logged-in admins from seeing the login page
  if (pathname.startsWith("/priyanvadaadminlogin")) {
    const adminSession = request.cookies.get("priyanvada_admin_session");

    if (adminSession) {
      const dashboardUrl = new URL("/priyaadmin", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/priyaadmin/:path*", "/priyanvadaadminlogin"],
};
