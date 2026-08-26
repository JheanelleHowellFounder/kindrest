/**
 * Supabase Auth Hook — Send Email
 *
 * Intercepts all auth emails (signup confirmation, magic link sign-in, etc.)
 * and delivers them via Resend with Kindrest branding.
 *
 * Required secrets (set via Supabase Dashboard > Edge Functions > Secrets):
 *   RESEND_API_KEY   — from resend.com/api-keys
 *   RESEND_FROM      — e.g. "Kindrest <hello@kindrest.co>"
 *                      Use "Kindrest <onboarding@resend.dev>" before domain is verified
 *
 * Deploy:
 *   npx supabase functions deploy auth-send-email --no-verify-jwt
 *
 * Then register the hook in Supabase Dashboard:
 *   Auth > Hooks > Send Email > HTTP hook
 *   URL: https://<project-ref>.supabase.co/functions/v1/auth-send-email
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM    = Deno.env.get('RESEND_FROM') ?? 'Kindrest <onboarding@resend.dev>'
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? '' // auto-injected by Supabase

// ── Types ──────────────────────────────────────────────────────────────────

type ActionType =
  | 'signup'
  | 'recovery'
  | 'magic_link'
  | 'invite'
  | 'email_change_current'
  | 'email_change_new'

interface HookPayload {
  user: { id: string; email: string }
  email_data: {
    token: string
    token_hash: string
    redirect_to: string
    email_action_type: ActionType
    site_url: string
    token_new?: string
    token_hash_new?: string
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json() as HookPayload
    const { user, email_data } = payload
    const { email_action_type, token_hash, redirect_to, site_url } = email_data

    if (!user?.email) {
      return json({ error: 'Missing user email' }, 400)
    }

    if (!RESEND_API_KEY) {
      console.error('[auth-send-email] RESEND_API_KEY not set')
      return json({ error: 'Email service not configured' }, 500)
    }

    // Build the verification link pointing to the APP callback page, not
    // directly to Supabase's /auth/v1/verify endpoint.
    //
    // Why: email scanners (Gmail Safe Browsing, etc.) make GET requests to
    // every link in an email. Pointing directly to the Supabase verify endpoint
    // causes the scanner to consume the one-time token before the user clicks.
    // Pointing to the app instead is safe — scanners fetch the HTML but don't
    // execute JavaScript, so verifyOtp() never runs until a real browser loads.
    const fallbackUrl = site_url || 'https://kindrest.vercel.app'
    const appBase     = (redirect_to || fallbackUrl).replace(/\/$/, '')
    // Use the redirect_to URL directly if it points at /auth/callback;
    // otherwise append /auth/callback so the page knows how to handle it.
    const callbackUrl = appBase.includes('/auth/callback')
      ? appBase
      : `${appBase}/auth/callback`
    const confirmUrl  =
      `${callbackUrl}` +
      `?token_hash=${encodeURIComponent(token_hash)}` +
      `&type=${email_action_type}`

    const { subject, html } = buildEmail(email_action_type, confirmUrl)

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    RESEND_FROM,
        to:      [user.email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[auth-send-email] Resend error:', err)
      return json({ error: 'Failed to deliver email' }, 500)
    }

    return json({ success: true }, 200)

  } catch (err) {
    console.error('[auth-send-email] Unexpected error:', err)
    return json({ error: String(err) }, 500)
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Email templates ────────────────────────────────────────────────────────

interface Template {
  subject: string
  heading: string
  body:    string
  cta:     string
  expiry:  string
}

const TEMPLATES: Record<ActionType, Template> = {
  signup: {
    subject: 'Confirm your Kindrest account',
    heading: 'Welcome. You are almost in.',
    body:    'You just signed up for Kindrest, a space built around you. Tap the button below to confirm your email and get started.',
    cta:     'Confirm my email',
    expiry:  'This link expires in 24 hours.',
  },
  magic_link: {
    subject: 'Your Kindrest sign-in link',
    heading: 'Here is your sign-in link.',
    body:    'Tap the button below to sign in to your Kindrest account. This link is single-use and expires in 60 minutes.',
    cta:     'Sign in to Kindrest',
    expiry:  'This link expires in 60 minutes.',
  },
  recovery: {
    subject: 'Reset your Kindrest password',
    heading: 'Let us get you back in.',
    body:    'We received a request to reset your password. Tap the button below to create a new one. If this was not you, you can safely ignore this email.',
    cta:     'Reset my password',
    expiry:  'This link expires in 1 hour.',
  },
  invite: {
    subject: 'You have been invited to Kindrest',
    heading: 'Someone thought of you.',
    body:    'You have been invited to join Kindrest, a wellness space built for mothers. Tap below to accept your invitation and set up your account.',
    cta:     'Accept my invitation',
    expiry:  'This invitation expires in 24 hours.',
  },
  email_change_current: {
    subject: 'Confirm your email change',
    heading: 'Just checking it is you.',
    body:    'We received a request to update the email on your Kindrest account. Tap below to confirm from your current address.',
    cta:     'Confirm the change',
    expiry:  'This link expires in 24 hours.',
  },
  email_change_new: {
    subject: 'Confirm your new email address',
    heading: 'Almost done.',
    body:    'Tap below to confirm your new email address and complete the update to your Kindrest account.',
    cta:     'Confirm new email',
    expiry:  'This link expires in 24 hours.',
  },
}

function buildEmail(actionType: ActionType, confirmUrl: string): { subject: string; html: string } {
  const t = TEMPLATES[actionType] ?? TEMPLATES.magic_link

  // Table-based layout for maximum email client compatibility.
  // All styles are inline. Font stack falls back gracefully: PT Serif -> Georgia -> serif.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0e9e2;font-family:Arial,'Open Sans',sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f0e9e2;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;background-color:#f8f2ee;border-radius:20px;">
          <tr>
            <td style="padding:40px 36px 0;">

              <!-- Brand -->
              <p style="margin:0 0 32px;font-family:Georgia,'PT Serif',serif;font-size:20px;
                         font-weight:700;color:#30211a;letter-spacing:-0.3px;">Kindrest</p>

              <!-- Heading -->
              <h1 style="margin:0 0 14px;font-family:Georgia,'PT Serif',serif;font-size:26px;
                          font-weight:700;color:#30211a;line-height:1.3;">${t.heading}</h1>

              <!-- Body -->
              <p style="margin:0 0 32px;font-size:16px;color:rgba(48,33,26,0.75);
                         line-height:1.65;">${t.body}</p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:32px;">
                <tr>
                  <td style="background-color:#c9981f;border-radius:15px;">
                    <a href="${confirmUrl}"
                       style="display:inline-block;padding:14px 28px;color:#ffffff;
                              font-family:Arial,sans-serif;font-size:16px;font-weight:600;
                              text-decoration:none;letter-spacing:0.1px;">${t.cta}</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider + fallback -->
          <tr>
            <td style="padding:0 36px 28px;border-top:1px solid #d6c9be;">
              <p style="margin:24px 0 8px;font-size:13px;color:rgba(48,33,26,0.5);line-height:1.5;">
                Button not working? Copy this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;color:#c9981f;word-break:break-all;
                         line-height:1.55;">${confirmUrl}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 36px 36px;">
              <p style="margin:0;font-size:13px;color:rgba(48,33,26,0.4);line-height:1.6;">
                ${t.expiry} If you did not request this, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

        <!-- Tagline -->
        <p style="margin:20px 0 0;font-size:12px;color:rgba(48,33,26,0.35);
                   font-family:Arial,sans-serif;">
          Kindrest &bull; made for mothers
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`

  return { subject: t.subject, html }
}
