/**
 * GET /api/wallet
 *
 * The signed-in user's gem balance + reserve level. Degrades to zeros if
 * unauthenticated or the ledger isn't migrated yet, so the reserve UI never
 * errors in preview.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth-server'
import { getWalletState } from '@/lib/gems'

export async function GET(req: NextRequest) {
  const requester = await requireUser(req)
  if (!requester) {
    return NextResponse.json({ balance: 0, reservePct: 0 })
  }
  const wallet = await getWalletState(requester.id)
  return NextResponse.json(wallet)
}
