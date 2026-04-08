export type MoodLabel = 'thriving' | 'good' | 'okay' | 'struggling' | 'overwhelmed'
export type RegulationPhase = 'Contain' | 'Stabilize' | 'Maintain' | 'Expand' | 'Anchor'
export type RegulationType = 'Emotional' | 'Mental' | 'Physical' | 'Identity' | 'Relational' | 'Sensory'
export type EffortLevel = 'Low' | 'Medium' | 'High'
export type TimeAvailable = '2_minutes' | '5_minutes' | '10_minutes' | '15_plus_minutes'
export type SentimentLabel = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive'
export type MotherhoodStage = 'expecting' | 'newborn' | 'infant' | 'toddler' | 'preschool' | 'school_age'

export interface Mood {
  id: string
  mood_id: number
  mood_label: string
  regulation_phase: RegulationPhase
  description: string
  emoji: string
  ui_label: string
  ui_description: string
}

export interface Indicator {
  id: string
  indicator_id: number
  mood_label: string
  label: string
  regulation_type: RegulationType
  description: string
  emoji: string
}

export interface Recommendation {
  id: string
  rec_id: number
  title: string
  description: string
  regulation_type: RegulationType
  category: string
  capacity_level: string
  regulation_phase: RegulationPhase
  time_suggestion: string
  effort_level: EffortLevel
  saveable: boolean
}

export interface CheckInState {
  mood: MoodLabel | null
  mental_indicators: string[]
  physical_indicators: string[]
  emotional_indicators: string[]
  time_available: TimeAvailable | null
}

export interface CareKit {
  id: string
  recommendations: Recommendation[]
  primary_action: Recommendation | null
  helpful_rating: number | null
  completed: boolean
  created_at: string
}

export interface JournalEntry {
  id: string
  content: string
  sentiment_score: number
  sentiment_label: SentimentLabel
  emotions_detected: string[]
  entry_date: string
  created_at: string
}

export interface WellnessStats {
  total_check_ins: number
  completed_kits: number
  avg_rating: number
  streak_days: number
  top_techniques: { title: string; rating: number; used: number }[]
  recently_loved: string[]
  common_mood: string
}

export interface UserProfile {
  name: string
  email: string
  motherhood_stage: MotherhoodStage | null
  child_ages: string[]
  support_people: { name: string; relationship: string; best_for: string }[]
  favorite_places: { name: string; type: string; description: string }[]
  preferred_activities: string[]
  member_since: string
}
