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
        'relative inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]',
        'ring-1 ring-inset',
        isProd
          ? 'bg-destructive/10 text-destructive ring-destructive/40'
          : 'bg-positive/10 text-positive ring-positive/40',
        className
      )}
    >
      <span className={cn('relative size-1.5 rounded-full', isProd ? 'bg-destructive' : 'bg-positive')} />
      <span className="relative">{env}</span>
    </div>
  )
}
