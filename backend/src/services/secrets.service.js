import {
  ListSecretsCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  CreateSecretCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import { getSecretsClientForEnv } from '../clients/index.js'
import { AWS_REGION, SECRETS_PROFILE } from '../config/aws.js'
import { toSecretSummary, toSecretDetail, toSecretValue } from '../models/Secret.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('Secrets Manager client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getSecretsClientForEnv(env)
  setContextClient(client)
  return { env, profile: SECRETS_PROFILE, region: AWS_REGION }
}

export async function listSecrets() {
  const secrets = []
  let nextToken
  do {
    const out = await getClient().send(new ListSecretsCommand({ NextToken: nextToken, MaxResults: 100 }))
    secrets.push(...(out.SecretList ?? []))
    nextToken = out.NextToken
  } while (nextToken)
  return secrets.map(toSecretSummary)
}

export async function getSecretDetail(secretName) {
  try {
    const result = await getClient().send(new DescribeSecretCommand({ SecretId: secretName }))
    return toSecretDetail(result)
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function getSecretValue(secretName) {
  try {
    const result = await getClient().send(new GetSecretValueCommand({ SecretId: secretName }))
    return toSecretValue(result)
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') return null
    throw e
  }
}

export async function updateSecretValue(secretName, value) {
  const secretString = typeof value === 'string' ? value : JSON.stringify(value)
  const result = await getClient().send(new PutSecretValueCommand({ SecretId: secretName, SecretString: secretString }))
  return { name: result.Name, versionId: result.VersionId }
}

export async function createSecret(secretName, value, description) {
  const secretString = typeof value === 'string' ? value : JSON.stringify(value)
  const result = await getClient().send(new CreateSecretCommand({
    Name: secretName,
    SecretString: secretString,
    Description: description || undefined,
  }))
  return { name: result.Name, arn: result.ARN, versionId: result.VersionId }
}

export async function deleteSecret(secretName) {
  const result = await getClient().send(new DeleteSecretCommand({ SecretId: secretName }))
  return { name: result.Name, deletionDate: result.DeletionDate }
}
