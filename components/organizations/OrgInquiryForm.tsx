'use client'

import { useState } from 'react'

const EMPLOYEE_RANGES = ['0–25', '25–50', '50+']

const inputClass =
  'w-full px-4 py-3 rounded-[12px] font-sans text-sm outline-none transition-all border bg-white/5 border-white/15 text-cream placeholder:text-cream/30 focus:border-mustard'
const labelClass = 'font-display font-semibold text-xs text-cream/60 mb-1.5 block'

export function OrgInquiryForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [employeeRange, setEmployeeRange] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = name.trim() && company.trim() && employeeRange

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')

    try {
      await fetch('/api/org-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, employeeRange, message }),
      })

      // Best-effort direct message — opens the visitor's own mail client
      // pre-filled, so a real message reaches Jheanelle immediately even
      // without a backend email service configured.
      const subject = encodeURIComponent(`Kindrest inquiry — ${company}`)
      const body = encodeURIComponent(
        `Name: ${name}\nCompany: ${company}\nTeam size: ${employeeRange}\n\n${message}`
      )
      window.location.href = `mailto:jheanelle@kindrest.co?subject=${subject}&body=${body}`

      setDone(true)
    } catch {
      setError('Something went wrong. Try again, or email jheanelle@kindrest.co directly.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white/5 border border-white/15 rounded-2xl p-8 text-center">
        <p className="font-serif text-[22px] text-cream mb-2">Thank you.</p>
        <p className="font-sans text-sm text-cream/60 leading-relaxed">
          Your details are saved, and an email draft should have opened on your device.
          Send it along, or reach me directly at{' '}
          <a href="mailto:jheanelle@kindrest.co" className="text-mustard underline">
            jheanelle@kindrest.co
          </a>.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/15 rounded-2xl p-8 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-semibold text-cream text-sm">Tell me about your team</p>
        <button type="button" onClick={onClose} className="text-cream/40 hover:text-cream text-sm">
          Cancel
        </button>
      </div>

      <div>
        <label className={labelClass}>Your name</label>
        <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Jane Doe" />
      </div>

      <div>
        <label className={labelClass}>Company</label>
        <input value={company} onChange={e => setCompany(e.target.value)} className={inputClass} placeholder="Acme Co." />
      </div>

      <div>
        <label className={labelClass}>Employee headcount</label>
        <select
          value={employeeRange}
          onChange={e => setEmployeeRange(e.target.value)}
          className={inputClass}
        >
          <option value="" className="text-chocolate">Select a range</option>
          {EMPLOYEE_RANGES.map(r => (
            <option key={r} value={r} className="text-chocolate">{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>What are you looking for?</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
          placeholder="Tell me a bit about your team and what you're hoping Kindrest can help with."
        />
      </div>

      {error && <p className="font-sans text-xs text-cream/70">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit || submitting}
        className="w-full px-8 py-4 bg-mustard text-white font-display font-semibold text-sm rounded-[15px] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending...' : 'Send it over'}
      </button>
    </form>
  )
}
