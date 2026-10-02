'use client'

/**
 * The journal — the place she writes. Not the place she reads.
 *
 * Her past entries used to be listed here as well, which duplicated the
 * Journal tab in History exactly: same table, same query, same rows. History
 * is the right home for them, so this page now does one thing. The page opens
 * straight into the box with the cursor in it — the "New Journal Entry" button
 * that used to guard it was guarding an empty room.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, X, Shuffle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { authedFetch } from '@/lib/api-client'
import { assessSafety, type SafetyLevel } from '@/lib/safety'
import { CrisisCard } from '@/components/shared/CrisisCard'
import { GentleCard } from '@/components/shared/GentleCard'
import { shuffledPrompts, type JournalPrompt } from '@/lib/journal-prompts'

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

  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [affirmation, setAffirmation] = useState<string | null>(null)
  const [safety, setSafety] = useState<SafetyLevel>('none')

  /** Only to decide whether this is her first time writing — the entries
   *  themselves are not shown here any more, so we count rather than fetch. */
  const [hasWritten, setHasWritten] = useState<boolean | null>(null)

  /** One starter for the blank box, with the rest held back for "Another".
   *  Picked on the client only, so server and first paint never disagree. */
  const [queue, setQueue] = useState<JournalPrompt[]>([])
  const suggestion = queue[0] ?? null
  const [chosenPrompt, setChosenPrompt] = useState<string | null>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  /** Picking a starter takes focus with it, which on a phone drops the
   *  keyboard and makes her tap the box a second time. Hand focus straight
   *  back so she can start typing the moment she has chosen. */
  function chooseStarter(text: string) {
    setChosenPrompt(text)
    requestAnimationFrame(() => boxRef.current?.focus())
  }

  /** Next question. Refills from the full set once the queue runs dry, so
   *  "Another" never stops working however long she taps it. */
  function nextSuggestion() {
    setQueue(prev => (prev.length > 1 ? prev.slice(1) : shuffledPrompts()))
  }

  // Redirect unauthenticated users to sign in, then bring them right back here
  useEffect(() => {
    if (!authLoading && !user) router.push('/signin?redirect=/journal')
  }, [authLoading, user, router])

  useEffect(() => { setQueue(shuffledPrompts()) }, [])

  useEffect(() => {
    if (!user || !supabase) return
    supabase
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setHasWritten((count ?? 0) > 0))
  }, [user])

  async function handleSaveEntry() {
    if (!newContent.trim() || !user) return
    setSaving(true)
    try {
      await authedFetch('/api/journal-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          userId: user.id,
          source: chosenPrompt ? 'journal_prompted' : 'journal',
          prompt: chosenPrompt,
        }),
      })
      setSafety(assessSafety(newContent))
      setAffirmation(JOURNAL_AFFIRMATIONS[Math.floor(Math.random() * JOURNAL_AFFIRMATIONS.length)])
      setNewContent('')
      setChosenPrompt(null)
      setHasWritten(true)
      setQueue(shuffledPrompts())
    } catch (err) {
      console.error('[JournalScreen] Save failed:', err)
    } finally {
      setSaving(false)
    }
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
        {safety === 'danger'   && <CrisisCard />}
        {safety === 'distress' && <GentleCard />}

        {/* Affirmation after saving */}
        {affirmation && safety === 'none' && (
          <div className="bg-mustard/5 border border-mustard/15 rounded-2xl p-4 flex items-start gap-2.5">
            <span className="text-lg flex-shrink-0">🤎</span>
            <p className="font-sans text-sm text-chocolate/70 leading-relaxed">{affirmation}</p>
          </div>
        )}

        {/* First time only — the warmest thing on the page, and it is doing
            real work for a mother who has never written here before. */}
        {hasWritten === false && !affirmation && (
          <div className="bg-[#faf6f0] border border-mustard/15 rounded-[24px] px-6 py-7 text-center">
            <h3 className="font-serif text-[20px] text-chocolate leading-snug mb-2">
              This space is yours.
            </h3>
            <p className="font-sans text-[14px] text-chocolate/55 leading-relaxed max-w-[260px] mx-auto">
              No right way to use it. Write what you are carrying, what went well, what you wish someone knew. It stays private.
            </p>
          </div>
        )}

        {/* The box — always open, never behind a button */}
        <div className="bg-white rounded-2xl p-4 border border-beige/30 space-y-3">
          <p className="font-display font-semibold text-chocolate text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>

          {/* The starter she picked, sitting above her entry as a heading.
              Deliberately not typed into the box — her saved journal should
              be her words, not Kindrest's. */}
          {chosenPrompt && (
            <div className="flex items-start justify-between gap-2 bg-mustard/5 rounded-xl px-3 py-2.5">
              <p className="font-serif text-[15px] leading-snug text-chocolate/80">{chosenPrompt}</p>
              <button onClick={() => setChosenPrompt(null)} aria-label="Remove prompt">
                <X size={13} className="text-chocolate/35 mt-1" />
              </button>
            </div>
          )}

          {/* One starter at a time, in the same panel it becomes once she
              takes it — so accepting it barely moves the page. */}
          {!chosenPrompt && !newContent.trim() && suggestion && (
            <div className="bg-mustard/5 border border-mustard/15 rounded-xl px-3.5 py-3 flex flex-col gap-2.5">
              <p className="font-serif text-[15.5px] leading-snug text-chocolate/80">{suggestion.text}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => chooseStarter(suggestion.text)}
                  className="bg-chocolate text-cream font-display font-semibold text-[12.5px] rounded-full px-3.5 py-1.5"
                >
                  Use this
                </button>
                <button
                  onClick={nextSuggestion}
                  className="flex items-center gap-1.5 font-sans text-[12.5px] text-chocolate/45 px-1.5 py-1.5"
                >
                  <Shuffle size={12} /> Another
                </button>
              </div>
            </div>
          )}

          <textarea
            ref={boxRef}
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder={chosenPrompt ? 'Start anywhere.' : 'Write whatever you like. No one else sees this.'}
            className="w-full min-h-[140px] font-sans text-base text-chocolate bg-transparent resize-none outline-none placeholder:text-chocolate/30 leading-relaxed"
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

        {/* Without this, a mother who wrote yesterday opens the page, sees
            nothing, and reasonably concludes it was lost. */}
        {hasWritten && (
          <Link
            href="/history"
            className="flex items-center justify-center gap-1.5 font-sans text-[13px] text-chocolate/45 py-2"
          >
            Your past entries live in History
            <ArrowRight size={13} className="text-mustard" />
          </Link>
        )}
      </div>
    </div>
  )
}
