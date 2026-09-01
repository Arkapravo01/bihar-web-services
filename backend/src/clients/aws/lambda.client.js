import { LambdaClient } from '@aws-sdk/client-lambda'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, LAMBDA_PROFILE } from '../../config/aws.js'

export function createLambdaClient(profile) {
  return new LambdaClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getLambdaClientForEnv(_env) {
  return createLambdaClient(LAMBDA_PROFILE)
}
