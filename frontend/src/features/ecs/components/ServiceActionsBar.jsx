import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUpdateDesiredCount } from '../hooks/useUpdateDesiredCount'
import { useForceNewDeployment } from '../hooks/useForceNewDeployment'
import { Gauge, RefreshCw } from 'lucide-react'

export function ServiceActionsBar({ clusterName, serviceName, desiredCount }) {
  const { mutate: updateCount, isPending: isUpdating } = useUpdateDesiredCount(clusterName, serviceName)
  const { mutate: forceDeploy, isPending: isDeploying } = useForceNewDeployment(clusterName, serviceName)

  const [scaleOpen, setScaleOpen] = useState(false)
  const [scaleValue, setScaleValue] = useState(String(desiredCount ?? 0))

  const isBusy = isUpdating || isDeploying

  function openScale() {
    setScaleValue(String(desiredCount ?? 0))
    setScaleOpen(true)
  }

  function handleScale() {
    const count = Number.parseInt(scaleValue, 10)
    if (Number.isNaN(count) || count < 0) return
    updateCount(count, {
      onSuccess: () => {
        toast.success(`${serviceName} scaling to ${count} task(s)`)
        setScaleOpen(false)
      },
      onError: (err) => toast.error('Failed to update desired count', { description: err.message }),
    })
  }

  function handleForceDeploy() {
    forceDeploy(undefined, {
      onSuccess: () => toast.success(`Forcing new deployment for ${serviceName}`),
      onError: (err) => toast.error('Failed to force deployment', { description: err.message }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" disabled={isBusy} onClick={openScale}>
        <Gauge className="size-3.5" /> Update desired count
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={isBusy} onClick={handleForceDeploy}>
        <RefreshCw className={`size-3.5 ${isDeploying ? 'animate-spin' : ''}`} /> Force new deployment
      </Button>

      <Dialog open={scaleOpen} onOpenChange={setScaleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update desired count</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ECS will scale <span className="font-mono">{serviceName}</span> to this many tasks.
          </p>
          <Input
            type="number"
            min="0"
            value={scaleValue}
            onChange={(e) => setScaleValue(e.target.value)}
            disabled={isUpdating}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScaleOpen(false)} disabled={isUpdating}>Cancel</Button>
            <Button disabled={isUpdating} onClick={handleScale}>
              {isUpdating ? 'Updating…' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
