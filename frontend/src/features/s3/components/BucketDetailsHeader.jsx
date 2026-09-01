import { S3EnvironmentBadge } from './S3EnvironmentBadge'

export function BucketDetailsHeader({ bucketName, env }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-mono text-xl font-semibold">{bucketName}</h1>
        <p className="text-sm text-muted-foreground">{env?.region ?? '—'}</p>
      </div>
      {env && <S3EnvironmentBadge env={env.env} />}
    </div>
  )
}
