'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Plus, X, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/api-client'
import { assessSafety, type SafetyLevel } from '@/lib/safety'
import { CrisisCard } from '@/components/shared/CrisisCard'
import { GentleCard } from '@/components/shared/GentleCard'

interface JournalEntryRow {
  id: string
  content: string
  source: string | null
  entry_date: string
  created_at: string
}

const SOURCE_LABEL: Record<string, string> = {
  unknown_door:   'From a check-in',
  reflective_rec: 'From a reflection',
  journal:        'Free write',
}

const JOURNAL_AFFIRMATIONS = [
  "Getting it out of your head is one of the most powerful things you can do for yourself.",
  "You don't have to have it figured out. Writing it down is enough.",
  "The act of naming what you're feeling is already a form of healing.",
  "You showed up for yourself today. That's not a small thing.",
  "There's no right way to feel. You're doing this exactly right.",
  "Sometimes the most productive thing you can do is just let it out.",
  "Your feelings deserve space. Thank you for giving them some.",
  "Writing is how we make sense of the things that don't quite make sense yet.",
  "You are not too much. You are a mother doing her best, and that is everything.",
  "This moment of honesty with yourself matters more than you know.",
]

export function JournalScreen() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [entries, setEntries] = useState<JournalEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isWriting, setIsWriting] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [affirmation, setAffirmation] = useState<string | null>(null)
  const [safety, setSafety] = useState<SafetyLevel>('none')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Redirect unauthenticated users to sign in, then bring them right back here
  useEffect(() => {
    if (!authLoading && !user) router.push('/signin?redirect=/journal')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); return }
    supabase
      .from('journal_entries')
      .select('id, content, source, entry_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEntries(data ?? [])
        setLoading(false)
      })
  }, [user])

  async function handleSaveEntry() {
    if (!newContent.trim() || !user) return
    setSaving(true)
    try {
      await authedFetch('/api/journal-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim(), userId: user.id, source: 'journal' }),
      })
      const optimistic: JournalEntryRow = {
        id: `temp-${Date.now()}`,
        content: newContent.trim(),
        source: 'journal',
        entry_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      }
      setEntries(prev => [optimistic, ...prev])
      setSafety(assessSafety(newContent))
      setAffirmation(JOURNAL_AFFIRMATIONS[Math.floor(Math.random() * JOURNAL_AFFIRMATIONS.length)])
      setNewContent('')
      setIsWriting(false)
    } catch (err) {
      console.error('[JournalScreen] Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-mustard/10 rounded-xl flex items-center justify-center">
            <BookOpen size={18} className="text-mustard" />
          </div>
          <div>
            <h1 className="font-display font-bold text-chocolate text-xl">Your Journal</h1>
            <p className="text-xs text-chocolate/50 font-sans">Private space, just for you</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">

        {/* Crisis card takes priority over the ordinary affirmation */}
        {safety === 'danger'   && !isWriting && <CrisisCard />}
        {safety === 'distress' && !isWriting && <GentleCard />}

        {/* Affirmation after saving */}
        {affirmation && !isWriting && safety === 'none' && (
          <div className="bg-mustard/5 border border-mustard/15 rounded-2xl p-4 flex items-start gap-2.5">
            <span className="text-lg flex-shrink-0">🤎</span>
            <p className="font-sans text-sm text-chocolate/70 leading-relaxed">{affirmation}</p>
          </div>
        )}

        {/* New Entry Button */}
        {!isWriting ? (
          <button
            onClick={() => { setIsWriting(true); setAffirmation(null); setSafety('none') }}
            className="w-full bg-chocolate text-white font-display font-semibold rounded-[15px] py-3.5 flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            New Journal Entry
          </button>
        ) : (
          /* Writing Mode */
          <div className="bg-white rounded-2xl p-4 border border-beige/30 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-display font-semibold text-chocolate text-sm">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <button onClick={() => { setIsWriting(false); setNewContent('') }}>
                <X size={16} className="text-chocolate/40" />
              </button>
            </div>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="What's going on? How are you feeling? What do you need right now?"
              className="w-full min-h-[140px] font-sans text-base text-chocolate bg-transparent resize-none outline-none placeholder:text-chocolate/30 leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-between pt-2 border-t border-beige/20">
              <p className="text-xs text-chocolate/40 font-sans">{newContent.length} characters</p>
              <button
                onClick={handleSaveEntry}
                disabled={!newContent.trim() || saving}
                className="bg-mustard text-white font-display font-semibold text-sm rounded-[15px] px-4 py-2 disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        )}

        {/* Entry List */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-beige/20 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-[#faf6f0] border border-mustard/15 rounded-[24px] px-6 py-10 text-center">
            <div className="w-12 h-12 bg-mustard/10 rounded-[14px] flex items-center justify-center mx-auto mb-4">
              <BookOpen size={22} className="text-mustard" />
            </div>
            <h3 className="font-serif text-[20px] text-chocolate leading-snug mb-2">
              This space is yours.
            </h3>
            <p className="font-sans text-[14px] text-chocolate/55 leading-relaxed max-w-[260px] mx-auto">
              No right way to use it. Write what you are carrying, what went well, what you wish someone knew. It stays private.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-chocolate/40 font-sans px-1">
              {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
            </p>
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-2xl border border-beige/20 overflow-hidden">
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {entry.source && (
                          <span className="text-[10px] font-display font-semibold px-2 py-0.5 rounded-full bg-beige/40 text-chocolate/60">
                            {SOURCE_LABEL[entry.source] ?? 'Journal'}
                          </span>
                        )}
                        <span className="text-xs text-chocolate/40 font-sans">{formatDate(entry.entry_date)}</span>
                      </div>
                      <p className={`font-sans text-sm text-chocolate/80 leading-relaxed ${expandedId !== entry.id ? 'line-clamp-2' : ''}`}>
                        {entry.content}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-chocolate/30 flex-shrink-0 mt-1 transition-transform ${expandedId === entry.id ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
