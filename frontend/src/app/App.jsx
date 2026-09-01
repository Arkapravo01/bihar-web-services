import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from './providers/QueryProvider'
import { ActivityProvider } from './providers/ActivityProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { ActiveEnvProvider } from './providers/ActiveEnvProvider'
import { router } from './router'

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ActiveEnvProvider>
          <ActivityProvider>
            <RouterProvider router={router} />
            <Toaster />
          </ActivityProvider>
        </ActiveEnvProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}
