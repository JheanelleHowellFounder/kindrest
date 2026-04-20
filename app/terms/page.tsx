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
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Limitation of Liability</h2>
            <p>Since Kindrest is still in development, we cannot guarantee uninterrupted or error-free service. To the extent allowed by law, we are not responsible for damages arising from the use of our site, forms, or communications.</p>
          </section>

          <section>
            <h2 className="font-serif text-[22px] text-chocolate mb-3">Changes to These Terms</h2>
            <p>We may update these terms as we grow. If we make significant changes, we will let you know.</p>
          </section>

        </div>

        <div className="mt-16 pt-8 border-t border-beige/50 flex items-center justify-between">
          <p className="font-sans text-xs text-chocolate/30">Last revised: September 2025</p>
          <p className="font-sans text-xs text-chocolate/30">© 2026 Kindrest. All rights reserved.</p>
        </div>

      </div>
    </div>
  )
}
