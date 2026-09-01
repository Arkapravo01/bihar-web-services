import { useBucketPermissions } from '../hooks/useBucketDetails'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TriangleAlert } from 'lucide-react'

function Section({ title, children }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  )
}

export function PermissionsPanel({ bucketName, active }) {
  const { data, isLoading, isError, error } = useBucketPermissions(bucketName, active)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertTitle>Could not load permissions</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!data) return null

  const blocksAllPublicAccess =
    data.publicAccessBlock &&
    Object.values(data.publicAccessBlock).every(Boolean)

  return (
    <div className="flex flex-col gap-4">
      <Section title="Public access">
        {data.publicAccessBlockError ? (
          <span className="text-sm text-muted-foreground">{data.publicAccessBlockError}</span>
        ) : blocksAllPublicAccess ? (
          <Badge className="bg-positive/10 text-positive">All public access blocked</Badge>
        ) : (
          <Badge variant="destructive">Public access is not fully blocked — review this</Badge>
        )}
      </Section>

      <Section title="Bucket policy">
        {data.policyError ? (
          <span className="text-sm text-muted-foreground">{data.policyError}</span>
        ) : data.policy ? (
          <pre className="max-h-64 overflow-auto rounded bg-muted p-3 font-mono text-xs">
            {JSON.stringify(data.policy, null, 2)}
          </pre>
        ) : (
          <span className="text-sm text-muted-foreground">No bucket policy attached.</span>
        )}
      </Section>

      <Section title="ACL grants">
        {data.aclError ? (
          <span className="text-sm text-muted-foreground">{data.aclError}</span>
        ) : data.acl?.grants?.length ? (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {data.acl.grants.map((g, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="truncate">{g.grantee}</span>
                <Badge variant="secondary">{g.permission}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-muted-foreground">No grants found.</span>
        )}
      </Section>
    </div>
  )
}
