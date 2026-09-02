import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function NoDataState({ onRunReport }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-2xl">✓</div>
      <div>
        <p className="text-base font-medium text-foreground">No confirmed errors detected</p>
        <p className="text-sm text-muted-foreground mt-1">No error patterns were found in the analyzed log groups for this time range.</p>
      </div>
      {onRunReport && (
        <button
          onClick={onRunReport}
          className="mt-2 px-4 py-2 text-sm rounded-md border border-border bg-background hover:bg-muted transition-colors"
        >
          Run New Report
        </button>
      )}
    </div>
  )
}

export function AnalysisFailedState({ error, onRetry }) {
  return (
    <Alert variant="destructive" className="max-w-xl mx-auto mt-8">
      <AlertTitle>Analysis unavailable</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error ?? 'The report run encountered an error and could not complete analysis.'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-sm rounded-md border border-destructive/40 hover:bg-destructive/10 transition-colors"
          >
            Retry
          </button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function NoRunYetState({ onRunReport }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center text-2xl">📋</div>
      <div>
        <p className="text-base font-medium text-foreground">No report run yet</p>
        <p className="text-sm text-muted-foreground mt-1">Run a report to analyze your CloudWatch logs for errors and patterns.</p>
      </div>
      {onRunReport && (
        <button
          onClick={onRunReport}
          className="mt-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Run Report
        </button>
      )}
    </div>
  )
}
