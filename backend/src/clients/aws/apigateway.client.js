import { APIGatewayClient } from '@aws-sdk/client-api-gateway'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, APIGATEWAY_PROFILE } from '../../config/aws.js'

export function createApiGatewayClient(profile) {
  return new APIGatewayClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getApiGatewayClientForEnv(_env) {
  return createApiGatewayClient(APIGATEWAY_PROFILE)
}
