import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function BucketToolbar({ value, onChange, placeholder = 'Search buckets…' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
    </div>
  )
}
