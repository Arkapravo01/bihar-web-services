import { EventBridgeClient } from '@aws-sdk/client-eventbridge'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, EVENTBRIDGE_PROFILE } from '../../config/aws.js'

export function createEventBridgeClient(profile) {
  return new EventBridgeClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getEventBridgeClientForEnv(_env) {
  return createEventBridgeClient(EVENTBRIDGE_PROFILE)
}
