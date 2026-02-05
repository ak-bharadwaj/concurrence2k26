import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. Admin Protection
    if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
        const adminSession = request.cookies.get("admin_session")?.value;
        if (!adminSession) {
            return NextResponse.redirect(new URL("/admin/login", request.url));
        }
    }

    // 3. Reverse Protection (Redirect to dashboard if already logged in)
    if (path === "/login") {
        const studentSession = request.cookies.get("student_session")?.value;
        if (studentSession) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
    }

    if (path === "/admin/login") {
        const adminSession = request.cookies.get("admin_session")?.value;
        if (adminSession) {
            return NextResponse.redirect(new URL("/admin/main-dashboard", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/dashboard", "/team"],
};
