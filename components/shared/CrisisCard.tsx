'use client'

export function CrisisCard() {
  return (
    <div className="bg-chocolate rounded-2xl p-5">
      <p className="font-serif text-[20px] text-cream leading-snug">
        You don&apos;t have to carry this alone right now.
      </p>
      <div className="h-0.5 w-10 bg-mustard mt-3 mb-4" />
      <p className="font-sans text-[13px] text-cream/70 leading-relaxed">
        What you wrote matters, and it sounds like this is more than Kindrest is built
        to hold on its own. Please reach out to someone who can help right now:
      </p>
      <div className="mt-4 space-y-2.5">
        <a
          href="tel:988"
          className="flex items-center gap-2 font-display font-semibold text-[13px] text-cream"
        >
          <span className="text-mustard">♡</span>
          988 Suicide &amp; Crisis Lifeline: Call or text 988
        </a>
        <a
          href="tel:18009444773"
          className="flex items-center gap-2 font-display font-semibold text-[13px] text-cream"
        >
          <span className="text-mustard">♡</span>
          Postpartum Support International: 1-800-944-4773
        </a>
        <p className="flex items-center gap-2 font-display font-semibold text-[13px] text-cream">
          <span className="text-mustard">♡</span>
          Crisis Text Line: Text HOME to 741741
        </p>
      </div>
      <p className="font-sans text-[11px] text-cream/40 mt-4 italic">
        If you or your baby are in immediate danger, please call 911.
      </p>
    </div>
  )
}
