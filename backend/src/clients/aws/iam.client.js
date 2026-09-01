import { IAMClient } from '@aws-sdk/client-iam'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION } from '../../config/aws.js'

export function createIAMClient(profile) {
  return new IAMClient({
    region: AWS_REGION,
    credentials: fromIni({ profile }),
  })
}

export function getIAMClientForEnv(env) {
  const profile = env === 'prod' ? 'claude-iam-prd' : 'claude-iam-qa'
  return createIAMClient(profile)
}
