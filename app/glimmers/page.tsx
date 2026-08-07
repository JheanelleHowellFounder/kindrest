'use client'

import { GlimmerTimeline } from '@/components/glimmer/GlimmerTimeline'
import { BottomNav } from '@/components/layout/BottomNav'
import { FLAGS } from '@/lib/flags'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function GlimmersPage() {
  const router = useRouter()

  // Behind the same flag as the glimmer home — off means this route doesn't exist for users.
  useEffect(() => {
    if (!FLAGS.glimmer) router.replace('/')
  }, [router])

  if (!FLAGS.glimmer) return <div className="min-h-screen bg-cream" />

  return (
    <>
      <GlimmerTimeline />
      <BottomNav />
    </>
  )
}
