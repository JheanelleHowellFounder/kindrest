/**
 * Lightweight keyword-based detector for crisis language in free-text entries.
 * Not a clinical tool — a first-pass safety net that surfaces real hotlines
 * when a mom's own words suggest she may be in danger. False positives are
 * an acceptable tradeoff; false negatives are not.
 */

const CRISIS_PATTERNS: RegExp[] = [
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

export function detectCrisisLanguage(text: string): boolean {
  if (!text || text.trim().length === 0) return false
  // Normalize iOS/Android "smart quote" auto-correction (’ ‘ → ') so
  // apostrophe-containing patterns still match real mobile-typed text.
  const normalized = text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
  return CRISIS_PATTERNS.some(pattern => pattern.test(normalized))
}
