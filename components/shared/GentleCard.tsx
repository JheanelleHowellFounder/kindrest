'use client'

/**
 * Tier 2 — for language that reads as real difficulty but not danger.
 *
 * Deliberately quieter than CrisisCard: cream rather than chocolate, a warmline
 * rather than 988 first, and no mention of 911. It names what it noticed and
 * offers one door, without implying she's in an emergency she didn't describe.
 *
 * Nothing she wrote is blocked or lost. This appears alongside it.
 */
export function GentleCard() {
  return (
    <div className="bg-mustard/[0.09] border border-mustard/25 rounded-2xl px-5 py-4 flex flex-col gap-2.5">
      <p className="font-serif text-[18px] leading-[1.35] text-chocolate">
        That sounds heavy.
      </p>
      <p className="font-sans text-[13.5px] leading-[1.6] text-chocolate/65">
        What you wrote is yours and it stays here. If any of it has been sitting on
        you, there are people who talk to mothers about exactly this — no crisis
        required, and it&apos;s free.
      </p>
      <div className="flex flex-col gap-1 pt-0.5">
        <a
          href="tel:1-800-944-4773"
          className="font-display font-semibold text-[13.5px] text-mustard"
        >
          Postpartum Support International · 1-800-944-4773
        </a>
        <p className="font-sans text-[12px] text-chocolate/45">
          Call or text. They&apos;ll talk about anything — you don&apos;t have to be in crisis.
        </p>
      </div>
    </div>
  )
}
