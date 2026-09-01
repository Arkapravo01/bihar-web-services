import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Fail fast: this app never falls back between environments, so a
          // long retry-with-backoff before showing "unreachable" would just
          // read as a stuck loading state instead of an honest error.
          queries: { retry: 0 },
        },
      })
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
