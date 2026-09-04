import { cn } from '@/lib/utils'

// Same "official seal" motif as S3EnvironmentBadge (double ring, uppercase mono) —
// kept local to this feature rather than a cross-feature import, since it's a
// small, self-contained presentational piece.
export function EnvironmentSeal({ env, className }) {
  if (!env) return null
  const isProd = env === 'prod'

  return (
    <div
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest',
        'ring-1 ring-inset ring-offset-1 ring-offset-background',
        isProd
          ? 'bg-destructive/10 text-destructive ring-destructive/40'
          : 'bg-positive/10 text-positive ring-positive/40',
        className
      )}
    >
      <span
        className={cn(
          'absolute inset-[2px] rounded-full border border-dashed',
          isProd ? 'border-destructive/30' : 'border-positive/30'
        )}
        aria-hidden
      />
      <span className="relative">◈</span>
      <span className="relative">{env}</span>
    </div>
  )
}
