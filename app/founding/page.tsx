'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function FoundingPage() {
  const router = useRouter()

  useEffect(() => {
    localStorage.setItem('kindrest_signup_source', 'founding_mom')
    router.replace('/onboarding')
  }, [router])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-mustard border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
