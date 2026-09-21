import type { Metadata } from 'next'
import { CarePlan } from '@/components/plan/CarePlan'
import { BottomNav } from '@/components/layout/BottomNav'

export const metadata: Metadata = {
  title: 'Your plan',
  robots: { index: false, follow: false },   // hers alone
  alternates: { canonical: null },
}

export default function PlanPage() {
  return (
    <>
      <CarePlan />
      <BottomNav />
    </>
  )
}
