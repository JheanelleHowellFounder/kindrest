import type { Mood, Indicator, Recommendation, WellnessStats, UserProfile, JournalEntry } from './types'

export const MOODS: Mood[] = [
  {
    id: '1', mood_id: 5, mood_label: 'Great', regulation_phase: 'Anchor',
    description: 'Strong regulation and identity presence.',
    emoji: '✨', ui_label: 'Thriving', ui_description: 'Feeling great today',
  },
  {
    id: '2', mood_id: 4, mood_label: 'Good', regulation_phase: 'Expand',
    description: 'Regulated with available capacity.',
    emoji: '😊', ui_label: 'Good', ui_description: 'Pretty solid overall',
  },
  {
    id: '3', mood_id: 3, mood_label: 'Okay', regulation_phase: 'Maintain',
    description: 'Stable but stretched.',
    emoji: '😐', ui_label: 'Okay', ui_description: 'Just getting through',
  },
  {
    id: '4', mood_id: 2, mood_label: 'Off', regulation_phase: 'Stabilize',
    description: 'Activated or dysregulated but functional.',
    emoji: '😔', ui_label: 'Struggling', ui_description: 'Having a hard time',
  },
  {
    id: '5', mood_id: 1, mood_label: 'Struggling', regulation_phase: 'Contain',
    description: 'Nervous system overwhelmed or depleted.',
    emoji: '😢', ui_label: 'Overwhelmed', ui_description: 'Really hard right now',
  },
]

export const MENTAL_INDICATORS: Indicator[] = [
  // Thriving (Great)
  { id: 'm1', indicator_id: 1, mood_label: 'Great', label: 'I feel clear and focused', regulation_type: 'Mental', description: '', emoji: '🧠' },
  { id: 'm2', indicator_id: 2, mood_label: 'Great', label: 'I\'m in a creative flow', regulation_type: 'Mental', description: '', emoji: '✨' },
  { id: 'm3', indicator_id: 3, mood_label: 'Great', label: 'I feel mentally sharp today', regulation_type: 'Mental', description: '', emoji: '💡' },
  { id: 'm4', indicator_id: 4, mood_label: 'Great', label: 'I\'m fully present', regulation_type: 'Mental', description: '', emoji: '🎯' },

  // Good
  { id: 'm5', indicator_id: 5, mood_label: 'Good', label: 'My mind feels fairly clear', regulation_type: 'Mental', description: '', emoji: '🧠' },
  { id: 'm6', indicator_id: 6, mood_label: 'Good', label: 'I can focus when I need to', regulation_type: 'Mental', description: '', emoji: '🎯' },
  { id: 'm7', indicator_id: 7, mood_label: 'Good', label: 'I\'m thinking things through well', regulation_type: 'Mental', description: '', emoji: '💭' },
  { id: 'm8', indicator_id: 8, mood_label: 'Good', label: 'I\'m managing my thoughts', regulation_type: 'Mental', description: '', emoji: '📋' },

  // Okay
  { id: 'm9',  indicator_id: 9,  mood_label: 'Okay', label: 'My mind is mostly clear', regulation_type: 'Mental', description: '', emoji: '🧠' },
  { id: 'm10', indicator_id: 10, mood_label: 'Okay', label: 'Small worries in the background', regulation_type: 'Mental', description: '', emoji: '🤔' },
  { id: 'm11', indicator_id: 11, mood_label: 'Okay', label: 'Lots to think about', regulation_type: 'Mental', description: '', emoji: '📋' },
  { id: 'm12', indicator_id: 12, mood_label: 'Okay', label: 'I\'m a bit on autopilot', regulation_type: 'Identity', description: '', emoji: '🔄' },
  { id: 'm13', indicator_id: 13, mood_label: 'Okay', label: 'Managing but stretched', regulation_type: 'Mental', description: '', emoji: '😐' },

  // Struggling (Off)
  { id: 'm14', indicator_id: 14, mood_label: 'Off', label: 'Hard to concentrate', regulation_type: 'Mental', description: '', emoji: '😵' },
  { id: 'm15', indicator_id: 15, mood_label: 'Off', label: 'I feel behind on everything', regulation_type: 'Mental', description: '', emoji: '📋' },
  { id: 'm16', indicator_id: 16, mood_label: 'Off', label: 'Anxious thoughts keep coming', regulation_type: 'Mental', description: '', emoji: '💭' },
  { id: 'm17', indicator_id: 17, mood_label: 'Off', label: 'I can\'t seem to slow my mind down', regulation_type: 'Mental', description: '', emoji: '🌀' },
  { id: 'm18', indicator_id: 18, mood_label: 'Off', label: 'Second-guessing everything', regulation_type: 'Mental', description: '', emoji: '🤔' },

  // Overwhelmed (Struggling)
  { id: 'm19', indicator_id: 19, mood_label: 'Struggling', label: 'Mind feels foggy', regulation_type: 'Mental', description: '', emoji: '🌫️' },
  { id: 'm20', indicator_id: 20, mood_label: 'Struggling', label: 'I can\'t think clearly', regulation_type: 'Mental', description: '', emoji: '😵' },
  { id: 'm21', indicator_id: 21, mood_label: 'Struggling', label: 'Overwhelmed by decisions', regulation_type: 'Mental', description: '', emoji: '🌀' },
  { id: 'm22', indicator_id: 22, mood_label: 'Struggling', label: 'I\'m completely on autopilot', regulation_type: 'Identity', description: '', emoji: '🔄' },
  { id: 'm23', indicator_id: 23, mood_label: 'Struggling', label: 'I can\'t remember the last time I felt on top of things', regulation_type: 'Mental', description: '', emoji: '📋' },
]

export const PHYSICAL_INDICATORS: Indicator[] = [
  // Thriving (Great)
  { id: 'p1', indicator_id: 30, mood_label: 'Great', label: 'My body feels energized', regulation_type: 'Physical', description: '', emoji: '⚡' },
  { id: 'p2', indicator_id: 31, mood_label: 'Great', label: 'I slept really well', regulation_type: 'Physical', description: '', emoji: '🌙' },
  { id: 'p3', indicator_id: 32, mood_label: 'Great', label: 'I feel physically strong', regulation_type: 'Physical', description: '', emoji: '💪' },
  { id: 'p4', indicator_id: 33, mood_label: 'Great', label: 'My body feels light and free', regulation_type: 'Physical', description: '', emoji: '🌿' },

  // Good
  { id: 'p5', indicator_id: 34, mood_label: 'Good', label: 'Energy is decent', regulation_type: 'Physical', description: '', emoji: '👍' },
  { id: 'p6', indicator_id: 35, mood_label: 'Good', label: 'Sleep was okay', regulation_type: 'Physical', description: '', emoji: '🌙' },
  { id: 'p7', indicator_id: 36, mood_label: 'Good', label: 'Body feels pretty good', regulation_type: 'Physical', description: '', emoji: '😊' },
  { id: 'p8', indicator_id: 37, mood_label: 'Good', label: 'I feel rested enough', regulation_type: 'Physical', description: '', emoji: '✨' },

  // Okay
  { id: 'p9',  indicator_id: 38, mood_label: 'Okay', label: 'Sleep was alright', regulation_type: 'Physical', description: '', emoji: '🌙' },
  { id: 'p10', indicator_id: 39, mood_label: 'Okay', label: 'Body feels neutral', regulation_type: 'Physical', description: '', emoji: '😌' },
  { id: 'p11', indicator_id: 40, mood_label: 'Okay', label: 'Carrying some tension', regulation_type: 'Physical', description: '', emoji: '😤' },
  { id: 'p12', indicator_id: 41, mood_label: 'Okay', label: 'A bit tired but managing', regulation_type: 'Physical', description: '', emoji: '😐' },
  { id: 'p13', indicator_id: 42, mood_label: 'Okay', label: 'My body is holding a lot right now', regulation_type: 'Physical', description: '', emoji: '🤔' },

  // Struggling (Off)
  { id: 'p14', indicator_id: 43, mood_label: 'Off', label: 'Carrying a lot of tension', regulation_type: 'Physical', description: '', emoji: '😤' },
  { id: 'p15', indicator_id: 44, mood_label: 'Off', label: 'Tired but still functioning', regulation_type: 'Physical', description: '', emoji: '😔' },
  { id: 'p16', indicator_id: 45, mood_label: 'Off', label: 'Haven\'t slept enough', regulation_type: 'Physical', description: '', emoji: '🪫' },
  { id: 'p17', indicator_id: 46, mood_label: 'Off', label: 'Body feels heavy', regulation_type: 'Physical', description: '', emoji: '😩' },
  { id: 'p18', indicator_id: 47, mood_label: 'Off', label: 'Headache or physical discomfort', regulation_type: 'Physical', description: '', emoji: '🤕' },

  // Overwhelmed (Struggling)
  { id: 'p19', indicator_id: 48, mood_label: 'Struggling', label: 'Running on empty', regulation_type: 'Physical', description: '', emoji: '🪫' },
  { id: 'p20', indicator_id: 49, mood_label: 'Struggling', label: 'Body is exhausted', regulation_type: 'Physical', description: '', emoji: '😴' },
  { id: 'p21', indicator_id: 50, mood_label: 'Struggling', label: 'I haven\'t slept enough', regulation_type: 'Physical', description: '', emoji: '🌙' },
  { id: 'p22', indicator_id: 51, mood_label: 'Struggling', label: 'Physical tension everywhere', regulation_type: 'Physical', description: '', emoji: '😤' },
  { id: 'p23', indicator_id: 52, mood_label: 'Struggling', label: 'I feel completely physically depleted', regulation_type: 'Physical', description: '', emoji: '💧' },
]

export const EMOTIONAL_INDICATORS: Indicator[] = [
  // Thriving (Great)
  { id: 'e1', indicator_id: 60, mood_label: 'Great', label: 'Feeling genuinely joyful', regulation_type: 'Emotional', description: '', emoji: '😊' },
  { id: 'e2', indicator_id: 61, mood_label: 'Great', label: 'I feel deeply connected', regulation_type: 'Emotional', description: '', emoji: '💕' },
  { id: 'e3', indicator_id: 62, mood_label: 'Great', label: 'Feeling proud of myself', regulation_type: 'Emotional', description: '', emoji: '🌟' },
  { id: 'e4', indicator_id: 63, mood_label: 'Great', label: 'I feel at peace', regulation_type: 'Emotional', description: '', emoji: '🕊️' },
  { id: 'e5', indicator_id: 64, mood_label: 'Great', label: 'Grateful and fully present', regulation_type: 'Emotional', description: '', emoji: '✨' },

  // Good
  { id: 'e6', indicator_id: 65, mood_label: 'Good', label: 'Feeling content', regulation_type: 'Emotional', description: '', emoji: '😊' },
  { id: 'e7', indicator_id: 66, mood_label: 'Good', label: 'Feeling hopeful', regulation_type: 'Emotional', description: '', emoji: '🌟' },
  { id: 'e8', indicator_id: 67, mood_label: 'Good', label: 'I have patience today', regulation_type: 'Emotional', description: '', emoji: '🕊️' },
  { id: 'e9', indicator_id: 68, mood_label: 'Good', label: 'I feel connected to myself', regulation_type: 'Emotional', description: '', emoji: '💕' },
  { id: 'e10', indicator_id: 69, mood_label: 'Good', label: 'Feeling emotionally steady', regulation_type: 'Emotional', description: '', emoji: '🌿' },

  // Okay
  { id: 'e11', indicator_id: 70, mood_label: 'Okay', label: 'Emotionally steady', regulation_type: 'Emotional', description: '', emoji: '🎭' },
  { id: 'e12', indicator_id: 71, mood_label: 'Okay', label: 'Okay but a bit flat', regulation_type: 'Emotional', description: '', emoji: '😐' },
  { id: 'e13', indicator_id: 72, mood_label: 'Okay', label: 'Mild frustration in the background', regulation_type: 'Emotional', description: '', emoji: '⚡' },
  { id: 'e14', indicator_id: 73, mood_label: 'Okay', label: 'I\'m steady but not quite joyful', regulation_type: 'Emotional', description: '', emoji: '🌿' },
  { id: 'e15', indicator_id: 74, mood_label: 'Okay', label: 'I feel a bit invisible today', regulation_type: 'Relational', description: '', emoji: '😔' },

  // Struggling (Off)
  { id: 'e16', indicator_id: 75, mood_label: 'Off', label: 'Feeling reactive', regulation_type: 'Emotional', description: '', emoji: '⚡' },
  { id: 'e17', indicator_id: 76, mood_label: 'Off', label: 'I feel a bit disconnected', regulation_type: 'Relational', description: '', emoji: '💧' },
  { id: 'e18', indicator_id: 77, mood_label: 'Off', label: 'Feeling unseen or unheard', regulation_type: 'Relational', description: '', emoji: '😔' },
  { id: 'e19', indicator_id: 78, mood_label: 'Off', label: 'Carrying some sadness', regulation_type: 'Emotional', description: '', emoji: '💧' },
  { id: 'e20', indicator_id: 79, mood_label: 'Off', label: 'Frustrated and not sure why', regulation_type: 'Emotional', description: '', emoji: '😤' },

  // Overwhelmed (Struggling)
  { id: 'e21', indicator_id: 80, mood_label: 'Struggling', label: 'Emotionally depleted', regulation_type: 'Emotional', description: '', emoji: '💧' },
  { id: 'e22', indicator_id: 81, mood_label: 'Struggling', label: 'I feel alone in this', regulation_type: 'Relational', description: '', emoji: '😔' },
  { id: 'e23', indicator_id: 82, mood_label: 'Struggling', label: 'I feel disconnected from myself', regulation_type: 'Identity', description: '', emoji: '🌫️' },
  { id: 'e24', indicator_id: 83, mood_label: 'Struggling', label: 'I\'m overwhelmed and tearful', regulation_type: 'Emotional', description: '', emoji: '😢' },
  { id: 'e25', indicator_id: 84, mood_label: 'Struggling', label: 'I feel like I\'m failing', regulation_type: 'Emotional', description: '', emoji: '💔' },
]

export const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'r1', rec_id: 1, title: 'Take 3 slow breaths', description: 'Inhale for 4, hold for 2, exhale for 6. Repeat three times.',
    regulation_type: 'Physical', category: 'Micro Practice', capacity_level: 'Level 1',
    regulation_phase: 'Contain', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
  {
    id: 'r2', rec_id: 4, title: 'Put one hand on your chest', description: 'Ground yourself physically. Feel your heartbeat and breathe into it.',
    regulation_type: 'Emotional', category: 'Micro Practice', capacity_level: 'Level 1',
    regulation_phase: 'Contain', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
  {
    id: 'r3', rec_id: 9, title: 'Lower the noise', description: 'Turn off one sound source. Give your nervous system a break from stimulation.',
    regulation_type: 'Sensory', category: 'Environment Reset', capacity_level: 'Level 2',
    regulation_phase: 'Stabilize', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
  {
    id: 'r4', rec_id: 13, title: 'Take a 5-minute joy break', description: 'Do something that feels like you. Music, a quick walk, your favorite snack — something just for you.',
    regulation_type: 'Identity', category: 'Joy', capacity_level: 'Level 2',
    regulation_phase: 'Maintain', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
  {
    id: 'r5', rec_id: 18, title: 'Move your body intentionally', description: 'Use extra energy gently. A short walk, some stretches, or dancing in the kitchen.',
    regulation_type: 'Physical', category: 'Movement', capacity_level: 'Level 3',
    regulation_phase: 'Expand', time_suggestion: 'Anytime', effort_level: 'Medium', saveable: true,
  },
  {
    id: 'r6', rec_id: 12, title: 'Prep one small thing for tomorrow', description: 'Lighten future mental load. Choose one small task — pack a bag, write a list, prep lunch.',
    regulation_type: 'Mental', category: 'Practical Support', capacity_level: 'Level 3',
    regulation_phase: 'Maintain', time_suggestion: 'Evening', effort_level: 'Medium', saveable: true,
  },
  {
    id: 'r7', rec_id: 27, title: 'Put phone away for 10 minutes', description: 'Reduce stimulation. Give yourself an intentional break from the scroll.',
    regulation_type: 'Sensory', category: 'Environment Reset', capacity_level: 'Level 2',
    regulation_phase: 'Stabilize', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
  {
    id: 'r8', rec_id: 20, title: 'Do something creative for 10 minutes', description: 'Reinforce identity. Draw, write, cook something new, or arrange flowers.',
    regulation_type: 'Identity', category: 'Joy', capacity_level: 'Level 3',
    regulation_phase: 'Expand', time_suggestion: 'Anytime', effort_level: 'Medium', saveable: true,
  },
  {
    id: 'r9', rec_id: 29, title: 'Revisit a personal goal', description: 'Reconnect with identity. Spend 10 minutes on something that is just about you and your future.',
    regulation_type: 'Identity', category: 'Reflection', capacity_level: 'Level 3',
    regulation_phase: 'Expand', time_suggestion: 'Weekend', effort_level: 'Medium', saveable: true,
  },
  {
    id: 'r10', rec_id: 15, title: 'Declutter one surface', description: 'Create small order. Clear your desk, counter, or nightstand. A tidy space can calm a busy mind.',
    regulation_type: 'Mental', category: 'Environment Reset', capacity_level: 'Level 3',
    regulation_phase: 'Maintain', time_suggestion: 'Anytime', effort_level: 'Medium', saveable: true,
  },
  {
    id: 'r11', rec_id: 6, title: 'Joyful Gratitude Jot', description: 'Take a moment to write down three things you\'re grateful for right now, celebrating this good moment in your life.',
    regulation_type: 'Emotional', category: 'Reflection', capacity_level: 'Level 2',
    regulation_phase: 'Stabilize', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
  {
    id: 'r12', rec_id: 7, title: 'Cozy Breathing & Stretching Break', description: 'Combine gentle breathing with light stretching for a calming reset.',
    regulation_type: 'Physical', category: 'Movement', capacity_level: 'Level 2',
    regulation_phase: 'Stabilize', time_suggestion: 'Anytime', effort_level: 'Low', saveable: true,
  },
]

export const MOCK_WELLNESS_STATS: WellnessStats = {
  total_check_ins: 13,
  completed_kits: 10,
  avg_rating: 3.2,
  streak_days: 0,
  top_techniques: [
    { title: '5-Minute Cozy Breathing Break', rating: 5.0, used: 1 },
    { title: 'Joyful Gratitude Jot', rating: 4.0, used: 5 },
    { title: 'Cozy Breathing & Stretching Break', rating: 4.0, used: 1 },
    { title: 'Take a moment', rating: 4.0, used: 2 },
  ],
  recently_loved: ['Joyful Gratitude Jot', 'Joyful Gratitude Jot', 'Cozy Breathing & Stretching Break'],
  common_mood: 'Good',
}

export const MOCK_USER: UserProfile = {
  name: 'Jheanelle',
  email: 'jheanelle@kindrest.co',
  motherhood_stage: 'toddler',
  child_ages: ['2 years'],
  support_people: [
    { name: 'Nik', relationship: 'Partner', best_for: 'Venting / Emotional support' },
    { name: 'Taylor Wood', relationship: 'Friend', best_for: 'Childcare help' },
  ],
  favorite_places: [
    { name: 'Vitality Gym', type: 'Gym/Studio', description: 'Best for exercise' },
  ],
  preferred_activities: ['Dancing', 'HIIT/Cardio', 'Stretching', 'Breathing exercises'],
  member_since: 'January 20, 2026',
}

export const MOCK_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'j1',
    content: 'Today was hard but I showed up. The breathing exercise actually helped me calm down before the afternoon chaos.',
    sentiment_score: 0.3,
    sentiment_label: 'positive',
    emotions_detected: ['calm', 'determined', 'tired'],
    entry_date: '2026-03-26',
    created_at: '2026-03-26T14:00:00Z',
  },
  {
    id: 'j2',
    content: 'I felt really disconnected this morning. Like I was just going through the motions. But writing this helps.',
    sentiment_score: -0.2,
    sentiment_label: 'negative',
    emotions_detected: ['disconnected', 'reflective'],
    entry_date: '2026-03-11',
    created_at: '2026-03-11T09:00:00Z',
  },
]

export const DAILY_AFFIRMATIONS = [
  '"One moment at a time."',
  '"You are doing better than you think."',
  '"Rest is not a reward — it is a requirement."',
  '"Every small act of care counts."',
  '"You haven\'t lost yourself. You are still here."',
]

export function getTodayAffirmation(): string {
  const day = new Date().getDay()
  return DAILY_AFFIRMATIONS[day % DAILY_AFFIRMATIONS.length]
}
