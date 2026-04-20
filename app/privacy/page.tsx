import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Kindrest' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream">

      {/* Nav */}
      <nav className="bg-chocolate border-b border-white/5 px-6 lg:px-10 h-[68px] flex items-center justify-between">
        <Link href="/">
          <span className="font-serif text-[22px] text-cream">Kind</span>
          <span className="font-serif text-[22px] text-mustard">rest</span>
        </Link>
        <Link href="/" className="font-display text-sm text-cream/50 hover:text-cream transition-colors">
          ← Back to home
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-20">

        <p className="font-display text-xs text-mustard tracking-[0.2em] uppercase mb-4">Legal</p>
        <h1 className="font-serif text-[42px] text-chocolate leading-tight mb-4">Privacy Policy</h1>
        <div className="h-[2px] w-12 bg-mustard mb-4" />
        <p className="font-sans text-sm text-chocolate/40 mb-10">Last updated: April 2026</p>

        <p className="font-sans text-[15px] text-chocolate/70 leading-relaxed mb-10">
          Kindrest is a wellness app for mothers. We take your privacy seriously — especially because what you share here is personal. This policy explains what we collect, why we collect it, and how we protect it. We've written it in plain language on purpose.
        </p>

        <div className="space-y-10 font-sans text-[15px] text-chocolate/70 leading-relaxed">

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">What we collect</h2>
            <p className="mb-4">When you create a Kindrest account or use the app, we collect:</p>
            <ul className="space-y-3">
              {[
                'Your name and email address, provided during sign-up.',
                'Your check-in responses — how you\'re feeling mentally, physically, and emotionally, how much time you have, and which care recommendations resonated with you.',
                'Your journal entries, if you choose to write them.',
                'Your check-in history, mood patterns, and streak data.',
                'Authentication tokens stored in your browser to keep you logged in.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-mustard mt-0.5 flex-shrink-0">♡</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Why we collect it</h2>
            <p className="mb-4">Everything we collect serves one purpose: making Kindrest work better for you.</p>
            <ul className="space-y-3">
              {[
                'Your name and email let us create and secure your account.',
                'Your check-in responses power the care recommendations you receive. They help Kindrest understand where you are and what you need.',
                'Your history and patterns let you see your own trends over time — and help the app learn what works for you.',
                'We use your email to send you important account information and, if you\'ve opted in, our email sequences about Kindrest.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-mustard mt-0.5 flex-shrink-0">♡</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Third-party services we use</h2>
            <p className="mb-4">Kindrest is built on a small stack of trusted services. Here's what each one touches:</p>
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6">
                <p className="font-display font-semibold text-chocolate text-[14px] mb-1">Supabase</p>
                <p>Our database and authentication provider. Your account data, check-in history, and journal entries are stored here. Supabase is SOC 2 compliant and encrypts data in transit and at rest.</p>
              </div>
              <div className="bg-white rounded-2xl p-6">
                <p className="font-display font-semibold text-chocolate text-[14px] mb-1">Vercel</p>
                <p>Our hosting provider. Vercel serves the Kindrest app and handles basic request logging. No personal data is stored by Vercel beyond standard server logs.</p>
              </div>
              <div className="bg-white rounded-2xl p-6">
                <p className="font-display font-semibold text-chocolate text-[14px] mb-1">MailerLite</p>
                <p>Our email platform. If you join the waitlist or create an account, your name and email are added to MailerLite so we can send you updates. You can unsubscribe at any time using the link in any email.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">What we don't do</h2>
            <ul className="space-y-3">
              {[
                'We do not sell your data. Ever.',
                'We do not share your personal information with advertisers.',
                'We do not use your check-in responses or journal entries for any purpose other than powering your Kindrest experience.',
                'We do not run ads.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-mustard mt-0.5 flex-shrink-0">♡</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Your rights</h2>
            <p>You can request a copy of all the data we hold about you, or ask us to delete your account and all associated data, at any time. To make a request, email us at <a href="mailto:jheanelle@kindrest.co" className="text-mustard underline">jheanelle@kindrest.co</a>. We'll respond within 30 days.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Cookies</h2>
            <p>Kindrest uses authentication cookies to keep you logged in between sessions. These contain a secure token and no personally identifiable information. We don't use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Changes to this policy</h2>
            <p>If we make meaningful changes to this policy, we'll let you know via email. The "last updated" date at the top of this page always reflects the current version.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Questions?</h2>
            <p>Reach out anytime at <a href="mailto:jheanelle@kindrest.co" className="text-mustard underline">jheanelle@kindrest.co</a>. We read every email.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-beige/50">
          <p className="font-sans text-xs text-chocolate/30">© 2026 Kindrest. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}
