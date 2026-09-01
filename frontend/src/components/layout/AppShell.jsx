import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from '@/components/navigation/CommandPalette'
import { useEnv } from '@/features/s3/hooks/useEnv'

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  const { data: env, isError: envUnreachable } = useEnv()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <TopBar env={env} envUnreachable={envUnreachable} onOpenCommandPalette={() => setCommandOpen(true)} />
        <Outlet />
      </SidebarInset>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </SidebarProvider>
  )
}
