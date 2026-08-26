/**
 * The reminder — the thing that brings her back.
 *
 * Kindrest shipped without any way to bring a mother back, and every early user
 * drifted off. This sends one email carrying that day's glimmer question.
 *
 * It's a single MailerLite campaign, not 100 separate sends, because the glimmer
 * is the same question for everyone by design. That keeps it free, and it means
 * MailerLite owns unsubscribes — both the decent thing and the legal one.
 *
 * The email body deliberately ends at the button. MailerLite appends its own
 * footer (address, socials, unsubscribe), so anything we add there is a second
 * copy of the same thing.
 *
 * The audience is rebuilt from Kindrest accounts before every send (see
 * lib/reminder-audience.ts), so new users are picked up automatically and nobody
 * without an account is ever emailed.
 *
 * SAFETY: sending is off unless DAILY_REMINDER_ENABLED === 'true'. Without it
 * this route reports exactly what it *would* send and stops. Turning it on is a
 * deliberate act, because the first run reaches real people.
 *
 * Triggered by the Vercel cron in vercel.json — Monday, Wednesday and Friday at
 * 9am Eastern. It ran daily for the first two weeks: 46% open rate, one
 * unsubscribe, no spam complaints, but opens drifting 53% → 41% and only four
 * click-throughs. People were reading it and not coming, so the volume was
 * buying fatigue rather than returns. Three a week keeps the rhythm without
 * spending the goodwill.
 *
 * Vercel signs cron requests with CRON_SECRET; anything else is refused so this
 * can't be fired by a stranger.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTodaysPrompt } from '@/lib/glimmers'
import { syncReminderAudience } from '@/lib/reminder-audience'

export const dynamic = 'force-dynamic'
// Syncing the audience makes one call per new user, so the first run is the
// slow one. Well inside this even at a few hundred users.
export const maxDuration = 60

const ML_API = 'https://connect.mailerlite.com/api'
const ML_TOKEN = process.env.MAILERLITE_API_KEY
const SITE = 'https://www.kindrest.co'

const ENABLED = process.env.DAILY_REMINDER_ENABLED === 'true'

function mlFetch(path: string, options: RequestInit = {}) {
  return fetch(`${ML_API}${path}`, {
    ...options,
    cache: 'no-store',            // never serve a cached MailerLite response
    headers: {
      Authorization: `Bearer ${ML_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

/**
 * The email. One question, one link, nothing else.
 *
 * Ends at the button — MailerLite appends the address and unsubscribe footer.
 *
 * No streak, no "you haven't been back in 4 days", no count of what she missed.
 * She's being invited, not chased — a guilt-shaped reminder is the fastest way
 * to make someone stop opening your email, and it would contradict the product.
 */
function buildHtml(question: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8f2ee;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f2ee;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:22px;padding:34px 30px;">
          <tr><td>
            <p style="margin:0 0 18px;font-family:Georgia,serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#c9981f;font-weight:bold;">
              Today's glimmer
            </p>
            <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:23px;line-height:1.32;color:#30211a;font-weight:normal;">
              ${question}
            </h1>
            <p style="margin:0 0 26px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#6b5951;">
              One honest sentence, whenever you get a minute. There's nothing to catch up on.
            </p>
            <a href="${SITE}" style="display:inline-block;background:#c9981f;color:#ffffff;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 28px;border-radius:12px;">
              Answer today's question
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export async function GET(req: NextRequest) {
  // Vercel cron sends this header; a stranger hitting the URL does not.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!ML_TOKEN) {
    return NextResponse.json({ error: 'MailerLite not configured' }, { status: 503 })
  }

  const prompt = getTodaysPrompt()
  const today = new Date().toISOString().slice(0, 10)
  const subject = prompt.text.length <= 60 ? prompt.text : 'Today’s glimmer'

  // ?preview=1 renders the email in the browser so it can be read before it's
  // ever sent to anyone. Sends nothing.
  if (req.nextUrl.searchParams.get('preview')) {
    return new NextResponse(buildHtml(prompt.text), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Rebuild the audience from Kindrest accounts before anything is sent, so a
  // user who signed up yesterday is included and nobody else ever is.
  const audience = await syncReminderAudience()

  if (!audience.groupId) {
    return NextResponse.json({ sent: false, audience }, { status: 502 })
  }

  // Dry run by default. Says exactly who would get it, sends nothing.
  if (!ENABLED) {
    return NextResponse.json({
      sent: false,
      reason: 'DAILY_REMINDER_ENABLED is not "true" — set it to start sending.',
      wouldSend: { date: today, subject, question: prompt.text, recipients: audience.subscribed },
      audience,
    })
  }

  // Nobody to send to. Not a failure — just don't create an empty campaign.
  if (audience.subscribed === 0) {
    return NextResponse.json({ sent: false, reason: 'No subscribers', audience })
  }

  const create = await mlFetch('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      name: `Daily glimmer — ${today}`,
      type: 'regular',
      groups: [audience.groupId],
      emails: [{
        subject,
        from_name: 'Kindrest',
        from: 'hello@kindrest.co',
        content: buildHtml(prompt.text),
      }],
    }),
  })

  if (!create.ok) {
    const detail = await create.text()
    console.error('[daily-reminder] campaign create failed:', detail)
    return NextResponse.json({ sent: false, error: detail }, { status: 502 })
  }

  const campaignId = (await create.json())?.data?.id
  if (!campaignId) {
    return NextResponse.json({ sent: false, error: 'No campaign id returned' }, { status: 502 })
  }

  const send = await mlFetch(`/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    body: JSON.stringify({ delivery: 'instant' }),
  })

  if (!send.ok) {
    const detail = await send.text()
    console.error('[daily-reminder] schedule failed:', detail)
    return NextResponse.json({ sent: false, campaignId, error: detail }, { status: 502 })
  }

  return NextResponse.json({ sent: true, campaignId, date: today, subject, audience })
}
