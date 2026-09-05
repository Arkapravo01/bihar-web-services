import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useBuckets } from '@/features/s3/hooks/useBuckets'
import { NAV_MODULES } from '@/constants/nav'

/**
 * Jump anywhere: the modules first, then whatever buckets the S3 module has
 * already loaded.
 *
 * Modules come first because they are always there and always the more likely
 * destination — buckets are only in the list at all if the S3 page has been
 * visited, so a palette holding nothing but buckets is empty on a cold start.
 */
export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate()
  // The API layer already strips the response envelope, so this hook returns
  // { buckets: [...] } — not the array itself.
  const { data: bucketsData } = useBuckets()
  const buckets = useMemo(() => bucketsData?.buckets ?? [], [bucketsData])
  const modules = useMemo(() => NAV_MODULES.filter((m) => m.enabled), [])

  function go(href) {
    onOpenChange(false)
    navigate(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a module or a bucket">
      <CommandInput placeholder="Go to a module, or search buckets…" />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        <CommandGroup heading="Modules">
          {modules.map((module) => (
            <CommandItem key={module.id} value={`${module.label} ${module.href}`} onSelect={() => go(module.href)}>
              {module.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {buckets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Buckets">
              {buckets.map((bucket) => (
                <CommandItem key={bucket.name} value={bucket.name} onSelect={() => go(`/s3/buckets/${bucket.name}`)}>
                  {bucket.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
