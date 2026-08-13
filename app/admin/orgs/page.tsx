'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'
import { Check, Copy, Plus } from 'lucide-react'

interface Org {
  kind: 'employer' | 'partner'
  slug: string
  name: string
  cohort_size: number | null
  status: string
  started_on: string | null
  joined: number
}

/**
 * /admin/orgs — add a pilot and get its join link. Admin only.
 * Exists so adding a customer never requires writing SQL.
 */
export default function AdminOrgsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [orgs, setOrgs] = useState<Org[]>([])
  const [needsMigration, setNeedsMigration] = useState(false)
  const [fetching, setFetching] = useState(true)

  const [name, setName] = useState('')
  const [kind, setKind] = useState<'employer' | 'partner'>('employer')
  const [size, setSize] = useState('50')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const authed = useCallback(async (url: string, init: RequestInit = {}) => {
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null
    return fetch(url, { ...init, cache: 'no-store', headers: { ...(init.headers ?? {}), 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` } })
  }, [])

  const load = useCallback(() => {
    authed('/api/admin/orgs')
      .then(r => r.json())
      .then(d => { setOrgs(d?.orgs ?? []); setNeedsMigration(Boolean(d?.needsMigration)) })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [authed])

  useEffect(() => {
    if (loading) return
    if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) { router.replace('/'); return }
    load()
  }, [user, loading, router, load])

  async function addOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true); setError('')
    try {
      const res = await authed('/api/admin/orgs', { method: 'POST', body: JSON.stringify({ name, cohortSize: size, kind }) })
      const d = await res.json()
      if (!res.ok) { setError(d?.error ?? 'Could not add that pilot.'); return }
      setName(''); setSize('50'); setKind('employer'); load()
    } finally { setSaving(false) }
  }

  async function setStatus(slug: string, status: string) {
    await authed('/api/admin/orgs', { method: 'PATCH', body: JSON.stringify({ slug, status }) })
    load()
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/join/${slug}`
    navigator.clipboard?.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 1800)
  }

  if (loading || !user) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream pb-20">
      <div className="max-w-xl mx-auto px-5 pt-12">

        <h1 className="font-serif text-[28px] text-chocolate">Kindrest @ Work</h1>
        <p className="font-sans text-[14px] text-chocolate/50 mt-1 mb-8">
          Add an employer pilot or a local partner, then share its link.
        </p>

        {needsMigration && (
          <div className="bg-white border border-mustard/40 rounded-2xl px-5 py-4 mb-6">
            <p className="font-display font-semibold text-[14px] text-chocolate">One-time setup needed</p>
            <p className="font-sans text-[13px] text-chocolate/60 leading-relaxed mt-1">
              Run <span className="font-mono text-[12px]">supabase/organizations.sql</span> in the Supabase
              SQL editor. After that you’ll never need SQL for this again.
            </p>
          </div>
        )}

        {/* Add a pilot */}
        <form onSubmit={addOrg} className="bg-white rounded-2xl border border-beige/40 p-5 mb-8">
          <p className="font-display font-semibold text-[14px] text-chocolate mb-3">Add a pilot or partner</p>

          {/* Employer or local business — they get different copy on the join page. */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([
              { v: 'employer', label: 'Employer pilot', hint: 'Paid, seat-based' },
              { v: 'partner',  label: 'Local partner',  hint: 'Cafés, salons, clinics' },
            ] as const).map(o => (
              <button
                key={o.v}
                type="button"
                onClick={() => setKind(o.v)}
                className={`rounded-[12px] border px-3 py-2.5 text-left transition-colors ${
                  kind === o.v ? 'border-mustard bg-mustard/10' : 'border-beige/50 bg-cream hover:border-mustard/40'
                }`}
              >
                <span className={`block font-display font-semibold text-[13px] ${kind === o.v ? 'text-mustard' : 'text-chocolate'}`}>{o.label}</span>
                <span className="block font-sans text-[11.5px] text-chocolate/45 mt-0.5">{o.hint}</span>
              </button>
            ))}
          </div>

          <label className="font-sans text-[12px] text-chocolate/50 block mb-1">
            {kind === 'partner' ? 'Business name' : 'Organization'}
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={kind === 'partner' ? 'Marietta Breakfast Co.' : 'PagerDuty'}
            className="w-full bg-cream border border-beige/50 rounded-[12px] px-4 py-3 text-base text-chocolate placeholder:text-chocolate/30 outline-none focus:border-mustard font-sans mb-3"
          />

          {kind === 'employer' && (
            <>
              <label className="font-sans text-[12px] text-chocolate/50 block mb-1">Cohort size</label>
              <input
                value={size}
                onChange={e => setSize(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="50"
                className="w-full bg-cream border border-beige/50 rounded-[12px] px-4 py-3 text-base text-chocolate placeholder:text-chocolate/30 outline-none focus:border-mustard font-sans mb-4"
              />
            </>
          )}

          {error && <p className="font-sans text-[13px] text-chocolate/70 mb-3">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="w-full flex items-center justify-center gap-2 bg-mustard text-white font-display font-semibold text-[14px] py-3.5 rounded-[12px] disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adding…' : kind === 'partner' ? 'Add partner' : 'Add pilot'}
          </button>
        </form>

        {/* Existing pilots */}
        {fetching ? (
          <p className="font-sans text-[13px] text-chocolate/30 text-center py-6">Loading…</p>
        ) : orgs.length === 0 ? (
          <p className="font-sans text-[13px] text-chocolate/40 text-center py-6">No pilots yet.</p>
        ) : (
          <div className="space-y-3">
            {orgs.map(o => (
              <div key={o.slug} className={`bg-white rounded-2xl border border-beige/40 p-5 ${o.status !== 'active' ? 'opacity-55' : ''}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-display font-semibold text-[15px] text-chocolate">{o.name}</p>
                    <p className="font-sans text-[11.5px] text-chocolate/40 mt-0.5">
                      {o.kind === 'partner' ? 'Local partner' : 'Employer pilot'}
                    </p>
                  </div>
                  <p className="font-sans text-[12.5px] text-chocolate/45 tabular-nums">
                    {o.cohort_size ? `${o.joined} of ${o.cohort_size} joined` : `${o.joined} joined`}
                  </p>
                </div>

                {o.cohort_size ? (
                  <div className="h-1.5 bg-beige/40 rounded-full overflow-hidden mt-2.5">
                    <div className="h-full bg-mustard rounded-full transition-all" style={{ width: `${Math.min(100, Math.round((o.joined / o.cohort_size) * 100))}%` }} />
                  </div>
                ) : null}

                <button
                  onClick={() => copyLink(o.slug)}
                  className="w-full flex items-center justify-between gap-2 bg-cream border border-beige/50 rounded-[12px] px-3.5 py-2.5 mt-3.5 text-left hover:border-mustard/50 transition-colors"
                >
                  <span className="font-mono text-[12px] text-chocolate/70 truncate">/join/{o.slug}</span>
                  {copied === o.slug
                    ? <span className="flex items-center gap-1 font-display font-semibold text-[12px] text-mustard flex-shrink-0"><Check className="w-3.5 h-3.5" />Copied</span>
                    : <Copy className="w-3.5 h-3.5 text-chocolate/35 flex-shrink-0" />}
                </button>

                <button
                  onClick={() => setStatus(o.slug, o.status === 'active' ? 'ended' : 'active')}
                  className="font-sans text-[12.5px] text-chocolate/40 hover:text-chocolate/70 transition-colors mt-3"
                >
                  {o.status === 'active' ? (o.kind === 'partner' ? 'End this partnership' : 'End this pilot') : 'Reactivate'}
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
