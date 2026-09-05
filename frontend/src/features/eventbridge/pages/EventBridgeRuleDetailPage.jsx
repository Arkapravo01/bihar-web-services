import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  ExternalLink,
  Lock,
  Pause,
  Power,
} from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Panel } from '@/components/layout/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRuleDetail } from '../hooks/useRuleDetail'
import { useTargets } from '../hooks/useTargets'
import { useEnv } from '../hooks/useEnv'
import { useSetRuleState } from '../hooks/useRuleMutations'
import { EventBridgeAiQueryBar } from '../components/EventBridgeAiQueryBar'
import { TriggerPanel } from '../components/TriggerPanel'
import { TargetList } from '../components/TargetList'
import { CopyButton } from '../components/CopyButton'
import { RULE_STATES, ruleFlags, ruleState } from '../lib/rules'
import { cn } from '@/lib/utils'

/**
 * One rule, as its two ends.
 *
 * The page is a wire read left to right: what triggers it, and where it delivers.
 * Everything else about a rule — its ARN, its owner, its description — is
 * reference material and sits in a strip under the title where it can be copied
 * and then ignored.
 */

const STATE_ICONS = { alert: AlertTriangle, pause: Pause, lock: Lock, check: Check }

function Meta({ label, children }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-mono text-foreground">{children}</dd>
    </div>
  )
}

export function EventBridgeRuleDetailPage() {
  const params = useParams()
  const eventBusName = decodeURIComponent(params.eventBusName ?? 'default')
  const ruleName = decodeURIComponent(params.ruleName ?? '')

  const { data: rule, isLoading, error } = useRuleDetail(eventBusName, ruleName)
  const { data: targetsData = {}, isLoading: targetsLoading } = useTargets(eventBusName, ruleName)
  const { data: envInfo } = useEnv()
  const setRuleState = useSetRuleState()
  const [pendingChange, setPendingChange] = useState(null)

  const targets = useMemo(() => targetsData.targets ?? null, [targetsData])

  // Health is a property of the whole wire, so the rule and its targets are read
  // together before either is judged.
  const composed = useMemo(
    () => (rule ? { ...rule, targets: targets ?? [], targetCount: targetsLoading ? null : (targets?.length ?? 0) } : null),
    [rule, targets, targetsLoading],
  )
  const flags = composed && !targetsLoading ? ruleFlags(composed) : []
  const stateId = composed ? ruleState(composed) : 'live'
  const state = RULE_STATES[stateId]
  const StateIcon = STATE_ICONS[state.icon]
  const enabled = rule?.state === 'ENABLED'

  const region = envInfo?.region
  const consoleHref = region
    ? `https://${region}.console.aws.amazon.com/events/home?region=${region}#/eventbus/${encodeURIComponent(eventBusName)}/rules/${encodeURIComponent(ruleName)}`
    : null

  async function runPendingChange() {
    const change = pendingChange
    if (!change) return
    setPendingChange(null)
    try {
      await setRuleState.mutateAsync({ eventBusName, ruleName, enabled: change.enabled })
      toast.success(change.enabled ? `${ruleName} is on` : `${ruleName} is off`)
    } catch (err) {
      toast.error(err?.message ?? 'The rule could not be changed.')
    }
  }

  if (error) {
    return (
      <PageContainer>
        <Link
          to="/eventbridge"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All rules
        </Link>
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/30 bg-destructive/5 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" aria-hidden="true" />
          <p className="text-sm font-semibold text-destructive">
            {error.status === 404 ? 'This rule no longer exists' : 'The rule could not be read'}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">{error.message}</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Link
        to="/eventbridge"
        className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All rules
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 break-all font-mono text-lg font-semibold tracking-tight text-foreground">
              {ruleName}
            </h1>
            {!isLoading && (
              <span className={cn('inline-flex items-center gap-1 text-xs', state.text)}>
                <StateIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {state.label}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? 'Reading the rule from AWS…' : (rule?.description || `A rule on the ${eventBusName} bus.`)}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {consoleHref && (
            <Button variant="secondary" size="sm" asChild>
              <a href={consoleHref} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                AWS console
              </a>
            </Button>
          )}
          {rule && !rule.managedBy && (
            <Button
              size="sm"
              variant={enabled ? 'destructive' : 'default'}
              disabled={setRuleState.isPending}
              onClick={() => setPendingChange({ enabled: !enabled })}
            >
              <Power className="size-3.5" />
              {enabled ? 'Turn off' : 'Turn on'}
            </Button>
          )}
        </div>
      </header>

      {/* Reference strip: everything that identifies the rule, in one place, all
          copyable, none of it competing with the two panels below. */}
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <dl className="flex flex-wrap gap-x-6 gap-y-1.5 rounded-md border border-border bg-card px-4 py-3 text-xs">
          <Meta label="Bus">{eventBusName}</Meta>
          {rule?.arn && (
            <div className="flex min-w-0 gap-2">
              <dt className="shrink-0 text-muted-foreground">ARN</dt>
              <dd className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-mono text-foreground" title={rule.arn}>
                  {rule.arn}
                </span>
                <CopyButton value={rule.arn} label="rule ARN" />
              </dd>
            </div>
          )}
          {rule?.managedBy && <Meta label="Managed by">{rule.managedBy}</Meta>}
          {rule?.roleArn && <Meta label="Role">{rule.roleArn.split('/').pop()}</Meta>}
        </dl>
      )}

      {flags.length > 0 && (
        <ul
          className={cn(
            'space-y-1 rounded-md border px-4 py-3 text-xs',
            stateId === 'deadEnd'
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-border bg-muted/40 text-muted-foreground',
          )}
        >
          {flags.map((flag) => (
            <li key={flag} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {flag}
            </li>
          ))}
        </ul>
      )}

      <EventBridgeAiQueryBar eventBusName={eventBusName} ruleName={ruleName} />

      {/* items-start so a long event pattern does not stretch the targets panel
          into a column of empty card. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Trigger" description="What sets this rule off">
          {isLoading ? (
            <div className="space-y-2 px-4 py-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            rule && <TriggerPanel rule={rule} />
          )}
        </Panel>

        <Panel
          title="Delivers to"
          description={
            targetsLoading
              ? 'Reading targets…'
              : `${targets?.length ?? 0} ${targets?.length === 1 ? 'target' : 'targets'}`
          }
        >
          <TargetList targets={targets} loading={targetsLoading} />
        </Panel>
      </div>

      <Dialog open={Boolean(pendingChange)} onOpenChange={(open) => !open && setPendingChange(null)}>
        <DialogContent className="sm:max-w-md">
          {pendingChange && (
            <>
              <DialogHeader>
                <DialogTitle>{pendingChange.enabled ? 'Turn this rule on?' : 'Turn this rule off?'}</DialogTitle>
                <DialogDescription>
                  {pendingChange.enabled
                    ? 'It starts matching events straight away. A schedule can fire within the minute.'
                    : 'Matching events stop being delivered immediately. They are not queued, and nothing will replay them once the rule is back on.'}
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-1 rounded-sm border border-border bg-muted/40 p-3 text-xs">
                <Meta label="Rule">{ruleName}</Meta>
                <Meta label="Bus">{eventBusName}</Meta>
                <Meta label="Targets">{targets?.length ?? 'unknown'}</Meta>
              </dl>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setPendingChange(null)}>
                  Cancel
                </Button>
                <Button
                  variant={pendingChange.enabled ? 'default' : 'destructive'}
                  onClick={runPendingChange}
                >
                  {pendingChange.enabled ? 'Turn on' : 'Turn off'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
