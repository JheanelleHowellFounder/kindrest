'use client'

import { useState } from 'react'
import { BookOpen, Plus, X, ChevronRight } from 'lucide-react'
import { MOCK_JOURNAL_ENTRIES } from '@/lib/mock-data'
import type { JournalEntry, SentimentLabel } from '@/lib/types'

const SENTIMENT_FILTERS: { value: SentimentLabel | 'all'; label: string; emoji: string }[] = [
  { value: 'all', label: 'All', emoji: '😊' },
  { value: 'very_positive', label: 'Very Positive', emoji: '😄' },
  { value: 'positive', label: 'Positive', emoji: '😊' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'negative', label: 'Negative', emoji: '😔' },
  { value: 'very_negative', label: 'Very Negative', emoji: '😢' },
]

const SENTIMENT_COLORS: Record<SentimentLabel, string> = {
  very_positive: 'bg-mustard/20 text-chocolate',
  positive: 'bg-mustard/10 text-chocolate',
  neutral: 'bg-beige/40 text-chocolate/70',
  negative: 'bg-chocolate/10 text-chocolate/80',
  very_negative: 'bg-chocolate/20 text-chocolate',
}

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>(MOCK_JOURNAL_ENTRIES)
  const [filter, setFilter] = useState<SentimentLabel | 'all'>('all')
  const [isWriting, setIsWriting] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = filter === 'all' ? entries : entries.filter(e => e.sentiment_label === filter)

  function handleSaveEntry() {
    if (!newContent.trim()) return
    const entry: JournalEntry = {
      id: `j${Date.now()}`,
      content: newContent,
      sentiment_score: 0,
      sentiment_label: 'neutral',
      emotions_detected: [],
      entry_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }
    setEntries([entry, ...entries])
    setNewContent('')
    setIsWriting(false)
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
            <p className="text-xs text-chocolate/50 font-sans">Private reflections and emotional insights</p>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* New Entry Button */}
        {!isWriting ? (
          <button
            onClick={() => setIsWriting(true)}
            className="w-full bg-chocolate text-white font-display font-semibold rounded-btn py-3.5 flex items-center justify-center gap-2"
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
              className="w-full min-h-[140px] font-sans text-sm text-chocolate bg-transparent resize-none outline-none placeholder:text-chocolate/30 leading-relaxed"
              autoFocus
            />
            <div className="flex items-center justify-between pt-2 border-t border-beige/20">
              <p className="text-xs text-chocolate/40 font-sans">{newContent.length} characters</p>
              <button
                onClick={handleSaveEntry}
                disabled={!newContent.trim()}
                className="bg-mustard text-white font-display font-semibold text-sm rounded-btn px-4 py-2 disabled:opacity-40"
              >
                Save Entry
              </button>
            </div>
          </div>
        )}

        {/* Trend Banner */}
        {entries.length > 0 && (
          <div className="bg-mustard/5 border border-mustard/15 rounded-2xl p-4 text-center">
            <p className="text-xs font-display font-semibold text-mustard uppercase tracking-wide mb-0.5">
              Emotional Trend
            </p>
            <p className="font-sans text-sm text-chocolate/70">
              Your reflections show a{' '}
              <span className="font-semibold text-chocolate">generally positive</span>{' '}
              emotional pattern this week. Keep showing up for yourself.
            </p>
          </div>
        )}

        {/* Sentiment Filters */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-xs text-chocolate/50 font-sans">Filter by sentiment</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5 scrollbar-hide">
            {SENTIMENT_FILTERS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-display font-semibold text-xs whitespace-nowrap transition-all ${
                  filter === value
                    ? 'bg-chocolate text-cream'
                    : 'bg-white border border-beige/30 text-chocolate/60'
                }`}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Entry List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={32} className="text-beige mx-auto mb-3" />
            <p className="font-sans text-sm text-chocolate/50">
              No entries yet. Start journaling to track your emotional journey.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => (
              <div key={entry.id} className="bg-white rounded-2xl border border-beige/20 overflow-hidden">
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-display font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_COLORS[entry.sentiment_label]}`}>
                          {entry.sentiment_label.replace('_', ' ')}
                        </span>
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

                {expandedId === entry.id && entry.emotions_detected.length > 0 && (
                  <div className="px-4 pb-4 border-t border-beige/10 pt-3">
                    <p className="text-xs font-display font-semibold text-chocolate/40 mb-2">Emotions detected</p>
                    <div className="flex flex-wrap gap-2">
                      {entry.emotions_detected.map(emotion => (
                        <span key={emotion} className="text-xs bg-mustard/10 text-chocolate px-2.5 py-1 rounded-full font-display font-semibold">
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
