import { RDSClient } from '@aws-sdk/client-rds'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, RDS_PROFILE } from '../../config/aws.js'

export function createRdsClient(profile) {
  return new RDSClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getRdsClientForEnv(_env) {
  return createRdsClient(RDS_PROFILE)
}
