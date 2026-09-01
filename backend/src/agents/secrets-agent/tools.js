import {
  SecretsManagerClient,
  ListSecretsCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  CreateSecretCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, SECRETS_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: SECRETS_PROFILE })
const secretsClient = new SecretsManagerClient({ region: AWS_REGION, credentials })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_caller_identity',
      description: 'Returns the AWS account ID and ARN of the credentials the agent is using. Call this first if a permission error occurs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_secrets',
      description: 'List all secrets in the account (names, descriptions, rotation status, tags — never values). Always call this first when the user mentions a secret by name, to fuzzy-match what they probably meant.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_secret_metadata',
      description: 'Get metadata for a single secret: ARN, description, rotation configuration, tags, version ids. Does NOT return the value.',
      parameters: {
        type: 'object',
        properties: { secretName: { type: 'string', description: 'Exact secret name from list_secrets.' } },
        required: ['secretName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_secret_value',
      description: 'Reveal the actual value of a secret. Only call this when the user is clearly asking to see, use, or verify the content of a specific secret — never proactively while just listing or browsing secrets.',
      parameters: {
        type: 'object',
        properties: { secretName: { type: 'string', description: 'Exact secret name from list_secrets.' } },
        required: ['secretName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_secret_value',
      description: 'Publish a new value (new version) for an existing secret. AWS does not overwrite in place — this creates a new version.',
      parameters: {
        type: 'object',
        properties: {
          secretName: { type: 'string', description: 'Exact secret name.' },
          value: { type: 'string', description: 'New secret value. If it should be structured, pass a JSON string.' },
        },
        required: ['secretName', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_secret',
      description: 'Create a new secret.',
      parameters: {
        type: 'object',
        properties: {
          secretName: { type: 'string', description: 'Name for the new secret.' },
          value: { type: 'string', description: 'Initial secret value. If structured, pass a JSON string.' },
          description: { type: 'string', description: 'Optional description.' },
        },
        required: ['secretName', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_secret',
      description: 'Delete a secret. AWS soft-deletes with a default recovery window (it is not immediately destroyed).',
      parameters: {
        type: 'object',
        properties: { secretName: { type: 'string', description: 'Exact secret name to delete.' } },
        required: ['secretName'],
      },
    },
  },
]

async function getCallerIdentity() {
  try {
    const res = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: res.Account, userId: res.UserId, arn: res.Arn }
  } catch (e) { return { error: e.message } }
}

async function listSecrets() {
  try {
    const secrets = []
    let nextToken
    do {
      const res = await secretsClient.send(new ListSecretsCommand({ NextToken: nextToken, MaxResults: 100 }))
      secrets.push(...(res.SecretList ?? []))
      nextToken = res.NextToken
    } while (nextToken)
    return {
      secrets: secrets.map((s) => ({
        name: s.Name,
        description: s.Description || '',
        rotationEnabled: !!s.RotationEnabled,
        lastChangedDate: s.LastChangedDate ?? null,
        tags: (s.Tags || []).map((t) => `${t.Key}=${t.Value}`),
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function getSecretMetadata(secretName) {
  try {
    const res = await secretsClient.send(new DescribeSecretCommand({ SecretId: secretName }))
    return {
      name: res.Name,
      arn: res.ARN,
      description: res.Description || '',
      rotationEnabled: !!res.RotationEnabled,
      rotationRules: res.RotationRules ?? null,
      lastChangedDate: res.LastChangedDate ?? null,
      lastAccessedDate: res.LastAccessedDate ?? null,
      lastRotatedDate: res.LastRotatedDate ?? null,
      versionIds: Object.keys(res.VersionIdsToStages || {}),
      tags: (res.Tags || []).map((t) => `${t.Key}=${t.Value}`),
    }
  } catch (e) { return { error: e.message } }
}

async function getSecretValue(secretName) {
  try {
    const res = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretName }))
    if (res.SecretString === undefined) return { note: 'This secret stores binary data, which cannot be displayed as text.' }
    return { secretName, value: res.SecretString, versionId: res.VersionId }
  } catch (e) { return { error: e.message } }
}

async function updateSecretValue(secretName, value) {
  try {
    const res = await secretsClient.send(new PutSecretValueCommand({ SecretId: secretName, SecretString: value }))
    return { updated: true, name: res.Name, versionId: res.VersionId }
  } catch (e) { return { error: e.message } }
}

async function createSecret(secretName, value, description) {
  try {
    const res = await secretsClient.send(new CreateSecretCommand({
      Name: secretName,
      SecretString: value,
      Description: description || undefined,
    }))
    return { created: true, name: res.Name, arn: res.ARN }
  } catch (e) { return { error: e.message } }
}

async function deleteSecret(secretName) {
  try {
    const res = await secretsClient.send(new DeleteSecretCommand({ SecretId: secretName }))
    return { deleted: true, name: res.Name, deletionDate: res.DeletionDate, note: 'Soft-deleted with a recovery window — not immediately destroyed.' }
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':   return getCallerIdentity()
    case 'list_secrets':          return listSecrets()
    case 'get_secret_metadata':   return getSecretMetadata(args.secretName)
    case 'get_secret_value':      return getSecretValue(args.secretName)
    case 'update_secret_value':   return updateSecretValue(args.secretName, args.value)
    case 'create_secret':         return createSecret(args.secretName, args.value, args.description)
    case 'delete_secret':         return deleteSecret(args.secretName)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
