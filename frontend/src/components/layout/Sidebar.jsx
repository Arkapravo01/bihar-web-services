import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NAV_AI_MODULES, NAV_MODULES } from '@/constants/nav'
import {
  Shield, Database, Activity, Zap, Server, Cpu, Container, Globe, MessageSquare, Calendar,
  GitBranch, Bot, CheckSquare, BarChart2, KeyRound, ScrollText
} from 'lucide-react'

const SERVICE_ICONS = {
  iam: Shield,
  secrets: KeyRound,
  s3: Database,
  cloudwatch: Activity,
  lambda: Zap,
  rds: Server,
  ec2: Cpu,
  'ecs': Container,
  'log-intelligence': ScrollText,
  'api-gateway': Globe,
  messaging: MessageSquare,
  eventbridge: Calendar,
  incidents: GitBranch,
  rca: BarChart2,
  agents: Bot,
  approvals: CheckSquare,
}

function NavGroup({ label, items }) {
  const location = useLocation()
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 pb-1">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = SERVICE_ICONS[item.id] || Server
            const isActive = location.pathname.startsWith(item.href) && item.enabled
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  disabled={!item.enabled}
                  className="relative group/btn"
                >
                  {item.enabled ? (
                    <Link to={item.href} className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                      <Icon className={`size-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover/btn:text-sidebar-foreground'}`} />
                      <span className={`text-sm transition-colors duration-200 ${isActive ? 'font-medium text-sidebar-foreground' : 'text-sidebar-foreground/50 group-hover/btn:text-sidebar-foreground'}`}>
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId={`nav-active-${label}`}
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-not-allowed">
                      <Icon className="size-4 shrink-0 text-muted-foreground/30" />
                      <span className="text-sm text-muted-foreground/40">{item.label}</span>
                      <span className="ml-auto text-[9px] font-mono uppercase tracking-wider text-muted-foreground/30 border border-muted-foreground/20 rounded px-1">
                        soon
                      </span>
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent className="gap-2 pt-2">
        <NavGroup label="AWS Services" items={NAV_MODULES} />
        <NavGroup label="AI Operations" items={NAV_AI_MODULES} />
      </SidebarContent>
    </Sidebar>
  )
}
