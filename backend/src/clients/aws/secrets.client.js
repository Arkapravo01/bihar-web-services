import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, SECRETS_PROFILE } from '../../config/aws.js'

export function createSecretsClient(profile) {
  return new SecretsManagerClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getSecretsClientForEnv(_env) {
  return createSecretsClient(SECRETS_PROFILE)
}
