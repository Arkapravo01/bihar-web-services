import { ECSClient } from '@aws-sdk/client-ecs'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, ECS_PROFILE } from '../../config/aws.js'

export function createEcsClient(profile) {
  return new ECSClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getEcsClientForEnv(_env) {
  return createEcsClient(ECS_PROFILE)
}
