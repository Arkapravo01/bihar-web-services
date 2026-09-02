import { GlueClient } from '@aws-sdk/client-glue'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, GLUE_PROFILE } from '../../config/aws.js'

export function createGlueClient(profile) {
  return new GlueClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getGlueClientForEnv(_env) {
  return createGlueClient(GLUE_PROFILE)
}
