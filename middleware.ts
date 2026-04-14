import { NextResponse } from 'next/server'

// Auth is handled inside the page component itself.
// This middleware is intentionally minimal.
export function middleware() {
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
