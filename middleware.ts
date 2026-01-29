// Middleware is disabled - no database functionality
import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: [],
};
///oijoi