import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ENV_TARGETS } from '@/constants/environments'
import { setApiBaseUrl, setApiEnvKey } from '@/services/apiClient'

const ActiveEnvContext = createContext(null)
const STORAGE_KEY = 'bws-active-env'

export function ActiveEnvProvider({ children }) {
  const queryClient = useQueryClient()
  const [activeEnvKey, setActiveEnvKeyState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const key = stored && ENV_TARGETS[stored] ? stored : 'qa'
      // sync module-level env key immediately so first requests use correct env
      setApiEnvKey(key)
      return key
    } catch {
      return 'qa'
    }
  })

  useEffect(() => {
    setApiBaseUrl(ENV_TARGETS[activeEnvKey].baseUrl)
    setApiEnvKey(activeEnvKey)
    // clear() only wipes cache metadata — it does not make mounted useQuery
    // observers refetch. resetQueries() does (it's what invalidation uses
    // under the hood for active queries), which is what actually makes the
    // switch show fresh (or freshly-erroring) data instead of stale cache.
    queryClient.resetQueries()
  }, [activeEnvKey, queryClient])

  function setActiveEnvKey(next) {
    if (!ENV_TARGETS[next]) return
    setActiveEnvKeyState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage unavailable — selection just won't persist across reloads
    }
  }

  return (
    <ActiveEnvContext.Provider value={{ activeEnvKey, setActiveEnvKey }}>
      {children}
    </ActiveEnvContext.Provider>
  )
}

export function useActiveEnv() {
  const ctx = useContext(ActiveEnvContext)
  if (!ctx) throw new Error('useActiveEnv must be used within an ActiveEnvProvider')
  return ctx
}
