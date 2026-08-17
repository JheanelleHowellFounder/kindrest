import Link from 'next/link'

export const metadata = { title: 'Terms & Conditions — Kindrest' }

export default function TermsPage() {
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
        <h1 className="font-serif text-[42px] text-chocolate leading-tight mb-4">Terms &amp; Conditions</h1>
        <div className="h-[2px] w-12 bg-mustard mb-10" />

        <p className="font-sans text-[15px] text-chocolate/70 leading-relaxed mb-10">
          Welcome to Kindrest. By signing up for updates or participating in conversations with us, you agree to these simple terms.
        </p>

        <div className="space-y-10 font-sans text-[15px] text-chocolate/70 leading-relaxed">

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Purpose of Kindrest</h2>
            <p>Kindrest is an early-stage journaling and reflection tool designed to support moms in finding space for themselves. Right now, we are in a discovery and development phase.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Your Role</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>By signing up, you agree to receive communication from us.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>If you participate in research or discovery calls, you may share your personal experiences voluntarily.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>You keep ownership of anything you share. By submitting it, you give us permission to use it only for improving Kindrest.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Our Role</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>We will not sell your information.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>We will only use what you share to design, build, and communicate about Kindrest.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>We may contact you with updates, invites, or relevant resources.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Health Disclaimer</h2>
            <p>Kindrest is not a medical or mental health service. It is not intended to diagnose, treat, or provide professional health advice. If you are experiencing a medical or mental health emergency, please seek professional help.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Safety features &amp; crisis support</h2>
            <p className="mb-4">Kindrest includes features meant to be supportive — for example, it may surface crisis resources (such as the 988 Suicide &amp; Crisis Lifeline) when it notices certain language, and it may gently check in with you during a harder stretch. Please understand their limits:</p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>These features are automated. They are not monitored by a person in real time.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>They are not guaranteed to detect, catch, or correctly interpret every situation, and may miss or misread what you share.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>They are not a crisis line, emergency service, or clinical monitoring service, and are not a substitute for professional care.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-mustard mt-1 flex-shrink-0">♡</span>
                <span>In an emergency, or if you are thinking about harming yourself or someone else, contact the 988 Suicide &amp; Crisis Lifeline, call 911, or reach your local emergency services directly. Please do not rely on Kindrest to reach help for you.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Love Notes</h2>
            <p className="mb-3">
              Love Notes lets you share a private link so people you choose — family,
              friends, whoever holds you up — can leave you a short note. They don&apos;t need an account,
              and they never see your check-ins, your journal, or anything else you write in
              Kindrest. Notes only ever travel one way: to you.
            </p>
            <p className="mb-3">
              Because anyone holding your link can write to you, a few things are worth being
              clear about:
            </p>
            <ul className="space-y-3 mb-3">
              <li className="flex gap-3">
                <span className="text-mustard flex-shrink-0">•</span>
                <span>
                  <strong className="text-chocolate">You control the link.</strong> You can close
                  it or replace it at any time from your Love Notes page. Replacing it stops the old
                  link working immediately. Your existing notes stay yours.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-mustard flex-shrink-0">•</span>
                <span>
                  <strong className="text-chocolate">You can delete any note, instantly,</strong>{' '}
                  for any reason or none. You never have to explain it to anyone.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-mustard flex-shrink-0">•</span>
                <span>
                  <strong className="text-chocolate">Notes are written by other people, not by
                  us.</strong> We don&apos;t review them before they reach you, and we can&apos;t
                  vouch for what they say. We block links inside notes and limit how many can
                  arrive in an hour, but the meaningful protection is that you decide who gets
                  your link in the first place.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-mustard flex-shrink-0">•</span>
                <span>
                  <strong className="text-chocolate">If something arrives that upsets you,</strong>{' '}
                  delete it and replace your link. If someone is harassing you, please tell us at{' '}
                  <a href="mailto:jheanelle@kindrest.co" className="text-mustard underline underline-offset-2">
                    jheanelle@kindrest.co
                  </a>{' '}
                  — we can remove notes and block a link for good.
                </span>
              </li>
            </ul>
            <p>
              If you&apos;re the one leaving a note: please write only what you&apos;d be happy for
              her to read on a hard day. Don&apos;t send advertising, links, or anything you
              wouldn&apos;t say to her face. We may remove notes and disable access for anyone who
              misuses this.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Limitation of Liability</h2>
            <p>Since Kindrest is still in development, we cannot guarantee uninterrupted or error-free service. To the extent allowed by law, we are not responsible for damages arising from the use of our site, forms, or communications.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Changes to These Terms</h2>
            <p>We may update these terms as we grow. If we make significant changes, we will let you know.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-beige/50 flex items-center justify-between">
          <p className="font-sans text-xs text-chocolate/30">Last revised: August 2026</p>
          <p className="font-sans text-xs text-chocolate/30">© 2026 Kindrest. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}
