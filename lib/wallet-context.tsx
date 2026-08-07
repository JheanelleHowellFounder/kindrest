'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authedFetch } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { FLAGS } from '@/lib/flags'

export interface WalletState {
  balance: number
  reservePct: number
}

interface WalletContextValue {
  wallet: WalletState | null
  refresh: () => void
  applyWallet: (w: WalletState) => void
}

const WalletContext = createContext<WalletContextValue>({
  wallet: null,
  refresh: () => {},
  applyWallet: () => {},
})

/**
 * One source of truth for gems + reserve, so every Reserve on every screen
 * moves together. Actions that earn/spend gems call `applyWallet` with the
 * fresh wallet from their response; the provider also refetches on focus so a
 * change made on one screen shows up when you return to another.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletState | null>(null)

  const refresh = useCallback(() => {
    if (!user || !FLAGS.glimmer) return
    authedFetch('/api/wallet', { cache: 'no-store' })
      .then(r => r.json())
      .then((w: WalletState) => setWallet(w))
      .catch(() => {})
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  // Keep it fresh when the tab regains focus (e.g. after navigating between screens).
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [refresh])

  const applyWallet = useCallback((w: WalletState) => setWallet(w), [])

  return (
    <WalletContext.Provider value={{ wallet, refresh, applyWallet }}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => useContext(WalletContext)
