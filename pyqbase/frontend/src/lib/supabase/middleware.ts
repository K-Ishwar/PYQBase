import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip Supabase session refresh when credentials are not configured.
  // This allows the app to run in UI-only mode during Phase 4 development.
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('placeholder') ||
    supabaseKey.includes('placeholder')
  ) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // First, write cookies onto the request so subsequent server-side
        // reads in this same request see the updated values.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

        // Re-create the response so it carries the updated request cookies,
        // then also stamp the Set-Cookie headers so the browser persists them.
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do not add any logic between createServerClient and
  // supabase.auth.getUser(). A subtle bug in Next.js can cause session
  // tokens to be invalidated if auth checks are mixed in between.
  await supabase.auth.getUser()

  return supabaseResponse
}
