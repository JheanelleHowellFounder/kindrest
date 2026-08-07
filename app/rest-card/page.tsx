'use client'

import { RestCard } from '@/components/glimmer/RestCard'
import { BottomNav } from '@/components/layout/BottomNav'
import { FLAGS } from '@/lib/flags'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function RestCardPage() {
  const router = useRouter()

  useEffect(() => {
    if (!FLAGS.glimmer) router.replace('/')
  }, [router])

  if (!FLAGS.glimmer) return <div className="min-h-screen bg-cream" />

  return (
    <>
      <RestCard />
      <BottomNav />
    </>
  )
}
