import { cn } from '@/lib/utils'

/**
 * A titled region of a page.
 *
 * Pages in this app are stacks of these rather than grids of cards: a card grid
 * implies its items are alternatives of equal weight, which is almost never true
 * of an operations page. A vertical stack states an order of importance, and the
 * header row gives every region somewhere to put its own controls — search, a
 * filter, an action — instead of pushing them all up into one page-level toolbar.
 */
export function Panel({ title, description, actions, children, className, contentClassName }) {
  return (
    <section className={cn('rounded-md border border-border bg-card', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-medium text-foreground">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  )
}
