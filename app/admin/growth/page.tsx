'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { ADMIN_EMAILS } from '@/lib/admin'

interface WeekRow {
  week: string
  signups: number
  activated: number
  activationRate: string
  returned: number
}
interface Tally { label: string; count: number }
interface Data {
  needsMigration: boolean
  totalSignups: number
  weeks: WeekRow[]
  byUtmSource: Tally[]
  byHeardAbout: Tally[]
}

/**
 * /admin/growth — where signups come from and whether they stick.
 *
 * Plain tables, no charts, no filters, no export. Every number is computed in
 * /api/admin/growth; this renders rows and nothing else.
 */
export default function AdminGrowthPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<Data | null>(null)
  const [fetching, setFetching] = useState(true)

  const load = useCallback(async () => {
    const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null
    const res = await fetch('/api/admin/growth', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
    setData(await res.json())
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) { router.replace('/'); return }
    load().catch(() => {}).finally(() => setFetching(false))
  }, [user, loading, router, load])

  if (loading || !user) return <div className="min-h-screen bg-cream" />

  return (
    <div className="min-h-screen bg-cream pb-24">
      <div className="max-w-3xl mx-auto px-5 pt-12">

        <h1 className="font-serif text-[28px] text-chocolate">Growth</h1>
        <p className="font-sans text-[14px] text-chocolate/50 mt-1 mb-8">
          {data ? `${data.totalSignups} accounts, all time.` : 'Where signups come from, and whether they stay.'}
        </p>

        {data?.needsMigration && (
          <div className="bg-white border border-mustard/40 rounded-2xl px-5 py-4 mb-8">
            <p className="font-display font-semibold text-[14px] text-chocolate">One-time setup needed</p>
            <p className="font-sans text-[13px] text-chocolate/60 leading-relaxed mt-1">
              Run <span className="font-mono text-[12px]">supabase/growth-attribution.sql</span> in the
              Supabase SQL editor. Weekly numbers work now; the source tables stay empty until then.
            </p>
          </div>
        )}

        {fetching ? (
          <p className="font-sans text-[13px] text-chocolate/30 py-10">Loading…</p>
        ) : !data ? (
          <p className="font-sans text-[13px] text-chocolate/40 py-10">Couldn’t load growth data.</p>
        ) : (
          <>
            <Section title="By signup week">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {['Week', 'Signups', 'Activated', 'Rate', 'Returned'].map(h => (
                      <Th key={h} numeric={h !== 'Week'}>{h}</Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.weeks.length === 0 ? (
                    <tr><Td colSpan={5}>No signups yet.</Td></tr>
                  ) : data.weeks.map(w => (
                    <tr key={w.week}>
                      <Td>{w.week}</Td>
                      <Td numeric>{w.signups}</Td>
                      <Td numeric>{w.activated}</Td>
                      <Td numeric>{w.activationRate}</Td>
                      <Td numeric>{w.returned}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="font-sans text-[11.5px] text-chocolate/35 leading-relaxed mt-3">
                Weeks start Monday. Activated = first check-in within 48 hours of signing up.
                Returned = any check-in, glimmer, or journal entry the week after she joined.
              </p>
            </Section>

            <Section title="By utm_source">
              <Counts rows={data.byUtmSource} empty="No campaign traffic recorded yet." />
            </Section>

            <Section title="By “how did you hear about us”">
              <Counts rows={data.byHeardAbout} empty="Nobody has answered this yet." />
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display font-semibold text-[12px] tracking-[0.14em] uppercase text-chocolate/40 mb-3">
        {title}
      </h2>
      <div className="bg-white rounded-2xl border border-beige/40 px-5 py-4 overflow-x-auto">
        {children}
      </div>
    </section>
  )
}

function Counts({ rows, empty }: { rows: Tally[]; empty: string }) {
  if (rows.length === 0) return <p className="font-sans text-[13px] text-chocolate/40 py-2">{empty}</p>
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr><Th>Source</Th><Th numeric>Signups</Th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label}>
            <Td>{r.label}</Td>
            <Td numeric>{r.count}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Th({ children, numeric }: { children: React.ReactNode; numeric?: boolean }) {
  return (
    <th className={`font-display font-semibold text-[11px] tracking-[0.08em] uppercase text-chocolate/40 pb-2 border-b border-beige/50 ${numeric ? 'text-right' : ''}`}>
      {children}
    </th>
  )
}

function Td({ children, numeric, colSpan }: { children: React.ReactNode; numeric?: boolean; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={`font-sans text-[13.5px] text-chocolate/80 py-2.5 border-b border-beige/25 ${numeric ? 'text-right tabular-nums' : ''}`}
    >
      {children}
    </td>
  )
}
