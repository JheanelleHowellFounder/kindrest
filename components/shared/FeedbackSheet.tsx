'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export function FeedbackSheet({
  userId,
  email,
  onClose,
}: {
  userId: string
  email: string
  onClose: () => void
}) {
  const [visible, setVisible]       = useState(false)
  const [message, setMessage]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  async function handleSubmit() {
    if (!message.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/user-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email, message }),
      })
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-chocolate/50 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-cream rounded-t-3xl z-50 transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-beige rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-[22px] text-chocolate leading-tight">
              {done ? 'Thank you. 🤎' : 'Share feedback'}
            </h3>
            <p className="text-xs text-chocolate/40 font-sans mt-0.5">
              {done ? 'Your feedback has been received.' : "What's working? What's missing? Be honest."}
            </p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-full bg-beige/40 flex items-center justify-center mt-1"
          >
            <X size={14} className="text-chocolate/60" />
          </button>
        </div>

        {done ? (
          <div className="px-5 pb-16 text-center py-6">
            <p className="font-sans text-sm text-chocolate/60 leading-relaxed max-w-xs mx-auto">
              Jheanelle reads every message. Your feedback directly shapes what gets built next.
            </p>
            <button
              onClick={close}
              className="mt-6 px-8 py-3 bg-mustard text-white font-display font-semibold text-sm rounded-[15px]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-5 pb-16 space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Tell us anything - what's helping, what's confusing, what you wish existed..."
              rows={5}
              autoFocus
              className="w-full bg-white rounded-2xl px-4 py-3 border-2 border-beige/40 focus:border-mustard outline-none font-sans text-[16px] text-chocolate placeholder:text-chocolate/30 transition-colors resize-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || submitting}
              className="w-full px-7 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting ? 'Sending...' : 'Send feedback'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
