import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useBuckets } from '@/features/s3/hooks/useBuckets'

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate()
  const { data: buckets } = useBuckets()

  function go(href) {
    onOpenChange(false)
    navigate(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Jump to a bucket">
      <CommandInput placeholder="Search buckets…" />
      <CommandList>
        <CommandEmpty>No buckets match.</CommandEmpty>
        <CommandGroup heading="Buckets">
          {(buckets ?? []).map((bucket) => (
            <CommandItem key={bucket.name} onSelect={() => go(`/s3/buckets/${bucket.name}`)}>
              {bucket.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
