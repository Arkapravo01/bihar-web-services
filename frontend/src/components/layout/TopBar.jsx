import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { S3EnvironmentBadge } from "@/features/s3/components/S3EnvironmentBadge";
import { useTheme } from "@/app/providers/ThemeProvider";
import { useActiveEnv } from "@/app/providers/ActiveEnvProvider";
import { ENV_TARGETS } from "@/constants/environments";
import { Server, ChevronDown, Flame, Monitor, Moon, Settings, Sun, Sparkles } from "lucide-react";

export function TopBar({ env, envUnreachable, onOpenCommandPalette }) {
  const { theme, setTheme } = useTheme();
  const { activeEnvKey, setActiveEnvKey } = useActiveEnv();
  const isWitcher = theme === 'redblack';
  const isDeepSpace = theme === 'deepspace';

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-sidebar px-4 relative">
      <SidebarTrigger />

      {/* Logo — centred in the full header width. Hidden on small screens, where
          absolute centring put it straight through the environment controls. */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 select-none items-center gap-2 md:flex">
        {isWitcher ? (
          <span className="text-primary" style={{ lineHeight: 1 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="witcher-icon">
              {/* left claw — sharp filled tapered blade */}
              <path d="M6 1 L4.5 1.5 L2.5 14 L3.5 14.2 L5 16 L5.2 15 L6.5 3 Z" fill="currentColor"/>
              {/* middle claw — tallest */}
              <path d="M12.5 0 L11 0.5 L9.5 15 L10.5 15.3 L12 17.5 L12.2 16 L13.5 2 Z" fill="currentColor"/>
              {/* right claw */}
              <path d="M19 1 L17.5 1.5 L16 14 L17 14.2 L18.5 16 L18.7 15 L20 3 Z" fill="currentColor"/>
              {/* blood drip left */}
              <path d="M3.5 14.2 L3.2 17 Q3.1 18.5 3.8 18.4 Q4.5 18.3 4.2 17 Z" fill="currentColor" opacity="0.8"/>
              {/* blood drip middle */}
              <path d="M10.5 15.3 L10.1 19 Q10 20.8 10.8 20.7 Q11.6 20.6 11.2 19 Z" fill="currentColor" opacity="0.9"/>
              {/* blood drip right */}
              <path d="M17 14.2 L16.7 17 Q16.6 18.5 17.3 18.4 Q18 18.3 17.7 17 Z" fill="currentColor" opacity="0.8"/>
            </svg>
          </span>
        ) : isDeepSpace ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-pulse" style={{ color: '#7C6AF7' }}>
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" fill="none" />
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
            <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <line x1="2" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <line x1="18" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
          </svg>
        ) : (
          <Server className="size-4 text-primary logo-pulse" />
        )}
        <div className="flex flex-col leading-tight">
          <span
            className={`text-sm font-semibold ${isWitcher ? 'witcher-title' : ''}`}
            style={
              isDeepSpace
                ? { background: 'linear-gradient(90deg, #A78BFA, #7C6AF7, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
                : {}
            }>
            Bihar Web Services
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            {isWitcher ? '⚔ Enterprise Edition ⚔' : isDeepSpace ? '◈ Enterprise Edition ◈' : 'Enterprise Edition'}
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="font-mono text-xs">
              {ENV_TARGETS[activeEnvKey].label}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel>Environment</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={activeEnvKey}
              onValueChange={setActiveEnvKey}
            >
              {Object.values(ENV_TARGETS).map((target) => (
                <DropdownMenuRadioItem key={target.key} value={target.key}>
                  {target.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {env ? (
          <S3EnvironmentBadge env={env.env} />
        ) : envUnreachable ? (
          <span className="rounded-full bg-destructive/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-destructive">
            Unreachable
          </span>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun className="size-4" />
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="size-4" />
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="size-4" />
                System
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="redblack">
                <Flame className="size-4" />
                Red/Black
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="deepspace">
                <Sparkles className="size-4" />
                Deep Space
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar className="size-8">
          <AvatarFallback className="text-xs">AC</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
