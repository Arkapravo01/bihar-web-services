import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION } from '../../config/aws.js'

export function createLogsClient(profile) {
  return new CloudWatchLogsClient({
    region: AWS_REGION,
    credentials: fromIni({ profile }),
  })
}

export function getLogsClientForEnv(env) {
  const profile = env === 'prod' ? 'claude-cloudwatch-prd' : 'claude-cloudwatch-qa'
  return createLogsClient(profile)
}
