import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UploadDropzone, UploadTrigger } from '@/features/s3/components/UploadDialog'
import { useLayers } from '../hooks/useLayers'
import { usePublishLayer } from '../hooks/usePublishLayer'
import { useSetFunctionLayers } from '../hooks/useSetFunctionLayers'
import { Layers, Upload, X, Plus } from 'lucide-react'

function layerLabelFromArn(arn) {
  const match = arn.match(/layer:([^:]+):(\d+)$/)
  return match ? `${match[1]}:${match[2]}` : arn
}

export function LayersDialog({ open, onOpenChange, functionName, currentLayerArns = [] }) {
  const { data: layersData, isLoading: layersLoading } = useLayers()
  const { mutate: publish, isPending: isPublishing } = usePublishLayer()
  const { mutate: setLayers, isPending: isUpdating } = useSetFunctionLayers()

  const [layerName, setLayerName] = useState('')
  const [description, setDescription] = useState('')
  const [runtimes, setRuntimes] = useState('')
  const [file, setFile] = useState(null)
  const [justPublished, setJustPublished] = useState(null)

  const availableLayers = layersData?.layers ?? []

  function updateLayers(nextArns, successMessage) {
    setLayers(
      { functionName, layerArns: nextArns },
      {
        onSuccess: () => toast.success(successMessage),
        onError: (err) => toast.error('Failed to update layers', { description: err.message }),
      }
    )
  }

  function handleDetach(arn) {
    updateLayers(currentLayerArns.filter((a) => a !== arn), 'Layer detached')
  }

  function handleAttach(arn) {
    if (currentLayerArns.includes(arn)) return
    updateLayers([...currentLayerArns, arn], 'Layer attached')
  }

  function handlePublish() {
    if (!layerName.trim() || !file) {
      toast.error('Layer name and a zip file are required')
      return
    }
    publish(
      {
        layerName: layerName.trim(),
        description: description.trim(),
        compatibleRuntimes: runtimes.split(',').map((r) => r.trim()).filter(Boolean),
        file,
      },
      {
        onSuccess: (result) => {
          toast.success(`Published ${layerName} v${result.version}`)
          setJustPublished(result)
          setLayerName('')
          setDescription('')
          setRuntimes('')
          setFile(null)
        },
        onError: (err) => toast.error('Publish failed', { description: err.message }),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Attached */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attached to this function</p>
            {currentLayerArns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No layers attached.</p>
            ) : (
              <div className="space-y-1.5">
                {currentLayerArns.map((arn) => (
                  <div key={arn} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2">
                    <span className="font-mono text-xs truncate">{layerLabelFromArn(arn)}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDetach(arn)} disabled={isUpdating}>
                      <X className="w-3 h-3" />
                      Detach
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attach existing */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attach existing layer</p>
            {layersLoading ? (
              <p className="text-sm text-muted-foreground">Loading account layers…</p>
            ) : availableLayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No layers published in this account.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {availableLayers.map((layer) => {
                  const attached = currentLayerArns.includes(layer.versionArn)
                  return (
                    <div key={layer.name} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{layer.name} <span className="text-muted-foreground font-mono text-xs">v{layer.version}</span></p>
                        {layer.compatibleRuntimes.length > 0 && (
                          <p className="text-[11px] text-muted-foreground truncate">{layer.compatibleRuntimes.join(', ')}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs shrink-0"
                        disabled={attached || isUpdating}
                        onClick={() => handleAttach(layer.versionArn)}
                      >
                        <Plus className="w-3 h-3" />
                        {attached ? 'Attached' : 'Attach'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upload new version */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload new layer version</p>
            <p className="text-[11px] text-muted-foreground">
              Layer versions can't be deleted once published — only superseded by a new version.
            </p>
            <Input placeholder="Layer name (existing name = new version)" value={layerName} onChange={(e) => setLayerName(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input placeholder="Compatible runtimes, comma-separated (optional) — e.g. python3.13" value={runtimes} onChange={(e) => setRuntimes(e.target.value)} />

            <UploadDropzone onUpload={setFile}>
              <UploadTrigger onUpload={setFile}>
                {(openPicker) => (
                  <button
                    type="button"
                    onClick={openPicker}
                    className="w-full rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    <Upload className="w-4 h-4 mx-auto mb-1" />
                    {file ? file.name : 'Click or drop a .zip file'}
                  </button>
                )}
              </UploadTrigger>
            </UploadDropzone>

            <Button className="w-full" onClick={handlePublish} disabled={isPublishing || !layerName.trim() || !file}>
              {isPublishing ? 'Publishing…' : 'Publish layer version'}
            </Button>

            {justPublished && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                <span className="font-mono text-xs truncate">{layerLabelFromArn(justPublished.versionArn)}</span>
                <Button
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={currentLayerArns.includes(justPublished.versionArn) || isUpdating}
                  onClick={() => handleAttach(justPublished.versionArn)}
                >
                  Attach to this function
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
