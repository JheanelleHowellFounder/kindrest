import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_EMAIL   = 'jheanelle@kindrest.co'
const ADMIN_ROUTES  = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only run on admin routes
  if (!ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  // Build a Supabase client that can read cookies in middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect home
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Wrong email → redirect home silently
  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
