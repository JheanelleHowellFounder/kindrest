/**
 * Two-tier detection for what a mother writes.
 *
 * Not a clinical tool. A first-pass safety net that responds when her own words
 * suggest she may be in danger, or carrying something heavier than Kindrest is
 * built for.
 *
 * TIER 1 — DANGER. Explicit statements about ending her life, harming herself,
 * harming her baby, or psychosis. Response is the full crisis card with 988,
 * Postpartum Support International, and 911. False positives are an acceptable
 * cost here; false negatives are not.
 *
 * TIER 2 — DISTRESS. Language clinicians associate with postpartum difficulty
 * that is not, on its face, an emergency: intrusive thoughts, fear of oneself,
 * numbness and dissociation, wanting to escape, resentment toward the baby.
 * Response is a gentle card and a warmline — never the full crisis screen.
 *
 * WHY THE TIERS EXIST. Everything used to fire the same alarm. Show a mother
 * the full 988 card for "I feel numb" and she learns to dismiss it, which costs
 * you the one moment it genuinely mattered. Tier 2 keeps the loud response rare
 * enough to stay meaningful.
 *
 * Tier 1 always wins — the same sentence never produces both.
 *
 * ⚠️ These lists are the founder's best guess and are pending review by mental
 * health professionals. Expect them to be replaced by better ones.
 */

/** Explicit danger. Full crisis response. */
const DANGER_PATTERNS: RegExp[] = [
  /kill(ing)?\s+myself/i,
  /suicid/i,
  /end(ing)?\s+my\s+life/i,
  /end\s+it\s+all/i,
  /(don'?t|do not)\s+want\s+to\s+be\s+here/i,
  /want(ed)?\s+to\s+die/i,
  /wish(ed)?\s+i\s+(was|were)\s+dead/i,
  /better\s+off\s+without\s+me/i,
  /no\s+reason\s+to\s+live/i,
  /hurt(ing)?\s+myself/i,
  /harm(ing)?\s+myself/i,
  /self[\s-]?harm/i,
  /hurt(ing)?\s+(my\s+)?(the\s+)?baby/i,
  /harm(ing)?\s+(my\s+)?(the\s+)?baby/i,
  /hearing\s+voices/i,
  /scared\s+i'?ll\s+hurt/i,
]

/**
 * Distress worth a gentle response.
 *
 * Deliberately excludes ordinary venting — "I'm exhausted", "bad mother",
 * "I can't do this anymore" — which is close to universal postpartum and would
 * fire on almost everyone, teaching her to ignore the card.
 */
const DISTRESS_PATTERNS: RegExp[] = [
  // Intrusive thoughts
  /intrusive\s+thought/i,
  /(can'?t|cannot)\s+stop\s+(the\s+)?think/i,
  /thoughts?\s+i\s+can'?t\s+control/i,
  /what\s+if\s+i\s+(dropped|drop|hurt|lost)/i,

  // Fear of herself
  /scared\s+of\s+myself/i,
  /(don'?t|do not)\s+trust\s+myself/i,
  /afraid\s+of\s+what\s+i/i,
  /i'?m\s+not\s+safe/i,

  // Wanting to escape — short of self-harm
  /want\s+to\s+(disappear|run\s+away|vanish)/i,
  /(everyone|they|he|she)('?d|\s+would)\s+be\s+better\s+off/i,
  /no\s+one\s+would\s+notice/i,

  // Numbness and dissociation
  /feel\s+(nothing|numb)/i,
  /(can'?t|cannot)\s+feel\s+anything/i,
  /watching\s+myself\s+from/i,
  /not\s+really\s+here/i,

  // Toward the baby — short of harm
  /(hate|resent)\s+(my\s+)?(the\s+)?baby/i,
  /(don'?t|do not)\s+(love|feel\s+connected\s+to)\s+(my\s+)?(the\s+)?baby/i,
  /regret\s+having/i,
]

export type SafetyLevel = 'none' | 'distress' | 'danger'

/** Smart quotes from phone keyboards must not defeat an apostrophe pattern. */
function normalize(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

/**
 * What level of response this text calls for.
 * Danger is checked first and wins outright.
 */
export function assessSafety(text: string): SafetyLevel {
  if (!text || text.trim().length === 0) return 'none'
  const t = normalize(text)
  if (DANGER_PATTERNS.some(p => p.test(t))) return 'danger'
  if (DISTRESS_PATTERNS.some(p => p.test(t))) return 'distress'
  return 'none'
}

/**
 * Explicit danger only — the full crisis card.
 * Kept as the original name so existing call sites keep their meaning.
 */
export function detectCrisisLanguage(text: string): boolean {
  return assessSafety(text) === 'danger'
}

/** Distress that deserves a gentle word, but not the 988 screen. */
export function detectDistressLanguage(text: string): boolean {
  return assessSafety(text) === 'distress'
}
