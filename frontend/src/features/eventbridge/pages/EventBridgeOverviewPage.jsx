import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, ChevronRight, Search } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Panel } from '@/components/layout/Panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { useAllRules } from '../hooks/useAllRules'
import { useEnv } from '../hooks/useEnv'
import { useSetRuleState } from '../hooks/useRuleMutations'
import { EventBridgeAiQueryBar } from '../components/EventBridgeAiQueryBar'
import { RulePostureBar } from '../components/RulePostureBar'
import { RuleLedger } from '../components/RuleLedger'
import { ScheduleStrip } from '../components/ScheduleStrip'
import { BusPanel } from '../components/BusPanel'
import { needsAttention, parseSchedule, ruleState, summarize, triggerKind } from '../lib/rules'
import { cn } from '@/lib/utils'

/**
 * EventBridge, arranged around the rule rather than the bus.
 *
 * The page this replaced opened with a grid of event bus cards, each showing a
 * name, an ARN and a rule count — three facts that never change and none of which
 * anyone came to find out. Meanwhile the rules, which are the thing that fires,
 * breaks and needs turning off at 2am, were a scrolling list of names and states
 * below the fold, and only for the default bus.
 *
 * So: rules lead, and they lead with their posture. Buses are a filter and a
 * folded-away reference at the bottom, which is what a namespace deserves.
 */

/** Rules that are on and delivering nowhere first, then by name. */
function orderRules(rules) {
  const rank = { deadEnd: 0, disabled: 1, managed: 2, live: 3 }
  return [...rules].sort(
    (a, b) => rank[ruleState(a)] - rank[ruleState(b)] || a.name.localeCompare(b.name),
  )
}

export function EventBridgeOverviewPage() {
  const { activeEnvKey } = useActiveEnv()
  const { data = {}, isLoading, error } = useAllRules()
  const { data: envInfo } = useEnv()
  const setRuleState = useSetRuleState()

  const rules = useMemo(() => data.rules ?? [], [data])
  const buses = useMemo(() => data.buses ?? [], [data])

  const [stateFilter, setStateFilter] = useState(null)
  const [busFilter, setBusFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [showBuses, setShowBuses] = useState(false)
  const [pendingChange, setPendingChange] = useState(null)

  // The schedule strip draws a "now" line, so now has to keep moving. A minute is
  // the resolution of a cron expression, so anything finer would be noise.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const scoped = useMemo(
    () => (busFilter ? rules.filter((r) => r.eventBusName === busFilter) : rules),
    [rules, busFilter],
  )

  const summary = useMemo(() => summarize(scoped), [scoped])
  const attention = useMemo(() => orderRules(scoped.filter(needsAttention)), [scoped])

  const ruleCounts = useMemo(() => {
    const counts = {}
    for (const r of rules) counts[r.eventBusName] = (counts[r.eventBusName] ?? 0) + 1
    return counts
  }, [rules])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orderRules(
      scoped
        .filter((r) => !stateFilter || ruleState(r) === stateFilter)
        .filter(
          (r) =>
            !q ||
            r.name.toLowerCase().includes(q) ||
            (r.description ?? '').toLowerCase().includes(q) ||
            (r.scheduleExpression ?? '').toLowerCase().includes(q) ||
            (r.eventPattern ?? '').toLowerCase().includes(q) ||
            (r.targets ?? []).some((t) => (t.arn ?? '').toLowerCase().includes(q)),
        ),
    )
  }, [scoped, stateFilter, search])

  // Only schedules that could actually put a mark on today's timeline.
  const hasSchedules = useMemo(
    () =>
      scoped.some((r) => {
        if (triggerKind(r) !== 'schedule' || r.state !== 'ENABLED') return false
        return parseSchedule(r.scheduleExpression)?.parsed ?? false
      }),
    [scoped],
  )

  const region = envInfo?.region
  const consoleUrl = region
    ? (rule) =>
        `https://${region}.console.aws.amazon.com/events/home?region=${region}#/eventbus/${encodeURIComponent(rule.eventBusName)}/rules/${encodeURIComponent(rule.name)}`
    : null

  async function runPendingChange() {
    const change = pendingChange
    if (!change) return
    setPendingChange(null)
    try {
      await setRuleState.mutateAsync({
        eventBusName: change.rule.eventBusName,
        ruleName: change.rule.name,
        enabled: change.enabled,
      })
      toast.success(change.enabled ? `${change.rule.name} is on` : `${change.rule.name} is off`)
    } catch (err) {
      toast.error(err?.message ?? 'The rule could not be changed.')
    }
  }

  if (error) {
    const isNetworkError = !error.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Event routing</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Rules, schedules and targets</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/30 bg-destructive/5 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" aria-hidden="true" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : `Not configured for ${activeEnvKey.toUpperCase()}`}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {isNetworkError ? (
              'The backend server is not running. Start it with npm run dev.'
            ) : (
              <>
                The AWS profile{' '}
                <code className="rounded bg-destructive/10 px-2 py-1 font-mono">
                  claude-eventbridge-{activeEnvKey === 'prod' ? 'prd' : 'qa'}
                </code>{' '}
                is not set up or cannot read EventBridge.
              </>
            )}
          </p>
        </div>
      </PageContainer>
    )
  }

  const busyRule = setRuleState.isPending
    ? `${setRuleState.variables?.eventBusName}/${setRuleState.variables?.ruleName}`
    : null

  return (
    <PageContainer>
      <header>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Event routing</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {isLoading
            ? 'Reading rules from AWS…'
            : `${summary.total} ${summary.total === 1 ? 'rule' : 'rules'} on ${buses.length} ${buses.length === 1 ? 'bus' : 'buses'} in ${activeEnvKey.toUpperCase()}, ${summary.scheduled} on a schedule.`}
        </p>
      </header>

      <EventBridgeAiQueryBar eventBusName={busFilter} />

      <RulePostureBar
        summary={summary}
        activeState={stateFilter}
        onStateChange={setStateFilter}
        buses={buses}
        activeBus={busFilter}
        onBusChange={setBusFilter}
      />

      {/* Shown only when there is something to act on, so it never becomes
          furniture the operator learns to scroll past. */}
      {!isLoading && attention.length > 0 && (
        <Panel
          title="Needs attention"
          description={`${attention.length} ${attention.length === 1 ? 'rule is' : 'rules are'} switched on but deliver nowhere. Matching events are discarded without an error.`}
        >
          <RuleLedger
            rules={attention}
            onToggleState={(rule, enabled) => setPendingChange({ rule, enabled })}
            busyRule={busyRule}
            consoleUrl={consoleUrl}
            now={now}
          />
        </Panel>
      )}

      {!isLoading && hasSchedules && (
        <Panel
          title="Today"
          description="When each scheduled rule fires, in UTC. Ticks behind the line have already run."
        >
          <ScheduleStrip rules={scoped} now={now} />
        </Panel>
      )}

      <Panel
        title="All rules"
        description={
          stateFilter || search || busFilter
            ? `${visible.length} of ${summary.total} shown`
            : 'Every rule in the account, worst first.'
        }
        actions={
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="sr-only">Search rules by name, schedule, pattern or target</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, pattern or target"
              className="h-8 w-64 rounded-sm border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </label>
        }
      >
        <RuleLedger
          rules={visible}
          loading={isLoading}
          filtered={Boolean(stateFilter || search || busFilter)}
          onClearFilter={() => {
            setStateFilter(null)
            setBusFilter(null)
            setSearch('')
          }}
          onToggleState={(rule, enabled) => setPendingChange({ rule, enabled })}
          busyRule={busyRule}
          consoleUrl={consoleUrl}
          now={now}
        />
      </Panel>

      <section className="rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowBuses((v) => !v)}
          aria-expanded={showBuses}
          className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <ChevronRight
            className={cn('size-3.5 shrink-0 text-muted-foreground transition-transform', showBuses && 'rotate-90')}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-foreground">Event buses</span>
          <span className="text-xs text-muted-foreground">
            {buses.length} {buses.length === 1 ? 'bus' : 'buses'}
            {busFilter && ` · showing ${busFilter} only`}
          </span>
        </button>

        {showBuses && (
          <div className="border-t border-border">
            <BusPanel
              buses={buses}
              ruleCounts={ruleCounts}
              loading={isLoading}
              activeBus={busFilter}
              onSelectBus={setBusFilter}
            />
          </div>
        )}
      </section>

      <ConfirmRuleStateDialog
        change={pendingChange}
        onCancel={() => setPendingChange(null)}
        onConfirm={runPendingChange}
      />
    </PageContainer>
  )
}

/**
 * Turning a rule off stops delivering events that nothing else will replay, and
 * turning one on can start a schedule firing within the minute. Both are
 * confirmed, and both say what happens to events rather than restating the verb.
 */
function ConfirmRuleStateDialog({ change, onCancel, onConfirm }) {
  const rule = change?.rule
  const enabling = change?.enabled

  return (
    <Dialog open={Boolean(change)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {rule && (
          <>
            <DialogHeader>
              <DialogTitle>{enabling ? 'Turn this rule on?' : 'Turn this rule off?'}</DialogTitle>
              <DialogDescription>
                {enabling
                  ? 'It starts matching events straight away. A schedule can fire within the minute.'
                  : 'Matching events stop being delivered immediately. They are not queued, and nothing will replay them once the rule is back on.'}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-1 rounded-sm border border-border bg-muted/40 p-3 text-xs">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">Rule</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">{rule.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">Bus</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">{rule.eventBusName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">Trigger</dt>
                <dd className="min-w-0 break-all font-mono text-foreground">
                  {rule.scheduleExpression ?? (rule.eventPattern ? 'event pattern' : 'none')}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-muted-foreground">Targets</dt>
                <dd className="font-mono text-foreground">{rule.targetCount ?? 'unknown'}</dd>
              </div>
            </dl>

            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant={enabling ? 'default' : 'destructive'} onClick={onConfirm}>
                {enabling ? 'Turn on' : 'Turn off'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
