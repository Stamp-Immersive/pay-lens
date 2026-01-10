import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { convertPendingInvitesForUser } from '@/lib/actions/invites';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    // Collect cookies to set on response
    const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Allowed emails (restrict access during development)
      const allowedEmails = [
        'hello@rupertstamp.com',
        'xstamp3@gmail.com',
      ];

      // Check if user's email is allowed
      if (!data.user.email || !allowedEmails.includes(data.user.email.toLowerCase())) {
        // Sign out unauthorized user
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unauthorized`);
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      // Convert any pending invites for this user's email
      let hasInvites = false;
      if (data.user.email) {
        try {
          const result = await convertPendingInvitesForUser(data.user.id, data.user.email);
          hasInvites = result.converted > 0;
        } catch (err) {
          console.error('Error converting pending invites:', err);
        }
      }

      // Determine redirect URL
      // If user has pending invites, redirect to invites page
      const redirectPath = hasInvites ? '/invites' : next;

      let redirectUrl: string;
      if (isLocalEnv) {
        redirectUrl = `${origin}${redirectPath}`;
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${redirectPath}`;
      } else {
        redirectUrl = `${origin}${redirectPath}`;
      }

      const response = NextResponse.redirect(redirectUrl);

      // Set all cookies on the response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Record<string, unknown>);
      });

      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
