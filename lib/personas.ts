/**
 * Kindrest Customer Personas
 * Derived from 25 customer discovery interviews.
 *
 * Each persona captures a distinct pattern of:
 *   - mood distribution (how often they check in at each level)
 *   - which indicators they select most
 *   - which recommendation categories resonate vs. fall flat
 *   - feedback tendencies (what they skip, save, or complete)
 *
 * Used for simulation, product decisions, and prompt context.
 */

export interface Persona {
  id: string
  name: string
  archetype: string
  description: string

  // Source interviews (representative)
  representedBy: string[]

  // Check-in patterns
  moodDistribution: Record<string, number>         // mood → % of check-ins
  typicalIndicators: string[]                       // most commonly selected
  timeAvailableDistribution: Record<string, number> // time → % of check-ins

  // Recommendation preferences
  lovedCategories: string[]                         // high Did-it rate
  avoidedCategories: string[]                       // high Skip rate
  preferredEffort: 'Low' | 'Medium' | 'High'
  preferredRegulationTypes: string[]

  // Feedback pattern
  feedbackStyle: 'did_it_heavy' | 'save_heavy' | 'skip_heavy' | 'balanced'

  // Product notes
  primaryNeed: string
  keyQuote: string
  riskIfMissed: string
}

export const PERSONAS: Persona[] = [
  {
    id: 'persona-1',
    name: 'The High-Functioning Internalizer',
    archetype: 'Looks fine. Isn\'t fine.',
    description:
      'Externally composed, professionally successful, she manages everything so well that nobody — including herself — realizes how close to the edge she is. Her overwhelm is sensory and cognitive, not dramatic. Evenings are her danger zone.',
    representedBy: ['Shantale (Shani Jules)', 'Daphne', 'Kristina'],

    moodDistribution: { okay: 0.45, struggling: 0.30, good: 0.15, overwhelmed: 0.10 },
    typicalIndicators: [
      'I\'m overstimulated',
      'I feel behind',
      'I\'m on autopilot',
      'Small worries in the background',
      'Carrying some tension',
    ],
    timeAvailableDistribution: { '2_minutes': 0.5, '5_minutes': 0.35, '10_minutes': 0.15, '15_plus_minutes': 0 },

    lovedCategories: ['Micro Practice', 'Environment Reset', 'Rest'],
    avoidedCategories: ['Reflection', 'Joy'],  // too much energy required
    preferredEffort: 'Low',
    preferredRegulationTypes: ['Sensory', 'Physical', 'Mental'],

    feedbackStyle: 'did_it_heavy',

    primaryNeed: 'Real-time micro-resets (30–90 seconds). Evening-specific grounding.',
    keyQuote: 'Overwhelm is less about emotional collapse and more about mental interruption.',
    riskIfMissed: 'She will never self-identify as struggling — so she\'ll never seek help. Kindrest must meet her before crisis.',
  },

  {
    id: 'persona-2',
    name: 'The Identity Searcher',
    archetype: 'Who was I before this?',
    description:
      'She\'s been in "mom mode" so long she\'s lost touch with herself as a person. Not in acute crisis — but slowly hollowing out. She wants to feel like herself again, not just function better. Joy, creativity, and identity-reconnection land deeply with her.',
    representedBy: ['Camille M.', 'Ereica O.', 'Jeala', 'Tiffany H.', 'Zoe Malbrue'],

    moodDistribution: { struggling: 0.35, okay: 0.35, overwhelmed: 0.20, good: 0.10 },
    typicalIndicators: [
      'I feel disconnected from myself',
      'I\'m on autopilot',
      'I feel alone in this',
      'Emotionally depleted',
      'I feel unseen',
    ],
    timeAvailableDistribution: { '5_minutes': 0.40, '10_minutes': 0.35, '2_minutes': 0.15, '15_plus_minutes': 0.10 },

    lovedCategories: ['Joy', 'Reflection', 'Connection'],
    avoidedCategories: ['Practical Support', 'Movement'],  // feels like more tasks
    preferredEffort: 'Low',
    preferredRegulationTypes: ['Identity', 'Emotional', 'Relational'],

    feedbackStyle: 'save_heavy',  // she saves things to return to later

    primaryNeed: 'Permission to exist beyond motherhood. Identity-anchoring practices.',
    keyQuote: 'I forgot that I was a person.',
    riskIfMissed: 'She will drift into quiet resentment. The guilt around taking time is the primary barrier — every interaction must dissolve it.',
  },

  {
    id: 'persona-3',
    name: 'The Efficiency Mom',
    archetype: 'I don\'t need a retreat. I need 10 minutes that work.',
    description:
      'Goal-oriented, high-achieving, not emotionally dysregulated — just mentally saturated. She doesn\'t want to be fixed; she wants friction reduced. Practical, actionable, fast. She\'ll abandon anything that feels like homework.',
    representedBy: ['Shade Reid', 'Deanna Belleny', 'Ashlee Jones', 'Alexa Irvin'],

    moodDistribution: { okay: 0.50, good: 0.25, struggling: 0.20, overwhelmed: 0.05 },
    typicalIndicators: [
      'Lots to think about',
      'I\'m managing but stretched',
      'I feel behind',
      'I feel clear-headed',
      'Body feels neutral',
    ],
    timeAvailableDistribution: { '5_minutes': 0.45, '2_minutes': 0.30, '10_minutes': 0.20, '15_plus_minutes': 0.05 },

    lovedCategories: ['Micro Practice', 'Practical Support', 'Environment Reset'],
    avoidedCategories: ['Reflection', 'Rest'],  // feels unproductive to her
    preferredEffort: 'Low',
    preferredRegulationTypes: ['Mental', 'Physical'],

    feedbackStyle: 'did_it_heavy',

    primaryNeed: 'Fast, specific, zero-overhead recommendations. Evening support.',
    keyQuote: 'Even 15 minutes to sit, eat, pray can significantly improve everything.',
    riskIfMissed: 'She\'ll churn if recommendations feel too soft, too slow, or too journally. She needs immediate utility.',
  },

  {
    id: 'persona-4',
    name: 'The Isolated Connector',
    archetype: 'No one around me gets it.',
    description:
      'Geographically isolated, or first in her friend group to have kids. She has no local peer support, or her network simply can\'t relate. She craves community and shared experience above all. A single "others have been here too" signal can shift her entire day.',
    representedBy: ['Kristin A.', 'Adrianna', 'Shantale (Shani Jules)', 'Amber Davis', 'Dana'],

    moodDistribution: { struggling: 0.40, okay: 0.30, overwhelmed: 0.20, good: 0.10 },
    typicalIndicators: [
      'I feel alone in this',
      'I feel unseen',
      'Things are fine but I feel distant',
      'I feel disconnected from myself',
      'I\'m steady but not joyful',
    ],
    timeAvailableDistribution: { '10_minutes': 0.40, '5_minutes': 0.30, '15_plus_minutes': 0.20, '2_minutes': 0.10 },

    lovedCategories: ['Connection', 'Reflection', 'Joy'],
    avoidedCategories: ['Environment Reset', 'Practical Support'],  // misses the point for her
    preferredEffort: 'Low',
    preferredRegulationTypes: ['Relational', 'Emotional', 'Identity'],

    feedbackStyle: 'save_heavy',

    primaryNeed: 'Community. Being witnessed. Knowing she\'s not the only one.',
    keyQuote: 'No one else has been through this.',
    riskIfMissed: 'Without community features, this persona will not retain. The individual check-in is not enough for her.',
  },

  {
    id: 'persona-5',
    name: 'The Crisis-Adjacent Mom',
    archetype: 'I only act when I hit the wall.',
    description:
      'She waits until she\'s at breaking point before reaching for support. Her overwhelm is real and high. She\'s reactive by default — logistics, environment, and a newborn or multiple kids under three are her reality. She responds to small, faith-friendly, guilt-free steps. Kindrest needs to catch her before she breaks.',
    representedBy: ['Stephanie Okori', 'Tiffany H.', 'Valerie Lilley', 'Zoe Malbrue', 'Oksana'],

    moodDistribution: { overwhelmed: 0.40, struggling: 0.35, okay: 0.20, good: 0.05 },
    typicalIndicators: [
      'I feel overwhelmed',
      'I can\'t think clearly',
      'Body is exhausted',
      'Running on empty',
      'I haven\'t slept enough',
      'I feel alone in this',
    ],
    timeAvailableDistribution: { '2_minutes': 0.50, '5_minutes': 0.35, '10_minutes': 0.15, '15_plus_minutes': 0 },

    lovedCategories: ['Micro Practice', 'Rest', 'Connection'],
    avoidedCategories: ['Movement', 'Practical Support'],  // too much when already depleted
    preferredEffort: 'Low',
    preferredRegulationTypes: ['Physical', 'Emotional', 'Relational'],

    feedbackStyle: 'balanced',

    primaryNeed: 'Catch her before the wall. Immediate, low-bar interventions. Guilt dissolution.',
    keyQuote: 'What is the most peaceful action I can take right now?',
    riskIfMissed: 'She\'s the highest-risk user. Late-stage overwhelm can tip into PPD. Kindrest has a real responsibility here.',
  },
]

export function getPersonaById(id: string): Persona | undefined {
  return PERSONAS.find(p => p.id === id)
}
