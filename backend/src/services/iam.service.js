import {
  ListUsersCommand,
  ListRolesCommand,
  ListPoliciesCommand,
  GetUserCommand,
  GetRoleCommand,
  ListAttachedUserPoliciesCommand,
  ListAttachedRolePoliciesCommand,
  ListUserPoliciesCommand,
  ListGroupsForUserCommand,
  ListAccessKeysCommand,
  GetAccessKeyLastUsedCommand,
  CreateAccessKeyCommand,
  UpdateAccessKeyCommand,
  DeleteAccessKeyCommand,
  CreateUserCommand,
  DeleteUserCommand,
} from '@aws-sdk/client-iam'
import { getIAMClientForEnv } from '../clients/index.js'
import { AWS_REGION, IAM_PROFILE } from '../config/aws.js'
import { toUser, toRole, toPolicy, toAccessKey } from '../models/IAM.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('IAM client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getIAMClientForEnv(env)
  setContextClient(client)
  return { env, profile: IAM_PROFILE, region: AWS_REGION }
}

export async function listUsers() {
  const users = []
  let marker
  do {
    const out = await getClient().send(new ListUsersCommand({ Marker: marker }))
    users.push(...(out.Users ?? []))
    marker = out.IsTruncated ? out.Marker : undefined
  } while (marker)
  return users.map(toUser)
}

export async function listRoles() {
  const roles = []
  let marker
  do {
    const out = await getClient().send(new ListRolesCommand({ Marker: marker }))
    roles.push(...(out.Roles ?? []))
    marker = out.IsTruncated ? out.Marker : undefined
  } while (marker)
  return roles.map(toRole)
}

export async function listPolicies() {
  const policies = []
  let marker
  do {
    const out = await getClient().send(
      new ListPoliciesCommand({ Scope: 'Local', MaxItems: 100, Marker: marker })
    )
    policies.push(...(out.Policies ?? []))
    marker = out.IsTruncated ? out.Marker : undefined
  } while (marker)
  return policies.map(toPolicy)
}

export async function getUser(userName) {
  try {
    // Attached managed policies are only part of a user's permissions. Inline
    // policies and group membership grant access too, and a permissions review
    // that omits them can conclude a user has none when they have plenty.
    const [userCmd, attachedCmd, inlineCmd, groupsCmd, keysCmd] = await Promise.all([
      getClient().send(new GetUserCommand({ UserName: userName })),
      getClient().send(new ListAttachedUserPoliciesCommand({ UserName: userName })),
      getClient().send(new ListUserPoliciesCommand({ UserName: userName })),
      getClient().send(new ListGroupsForUserCommand({ UserName: userName })),
      getClient().send(new ListAccessKeysCommand({ UserName: userName })),
    ])

    const keys = keysCmd.AccessKeyMetadata ?? []
    const accessKeys = await mapWithConcurrency(keys, 5, async (k) =>
      toAccessKey(k, { userName, lastUsed: await getAccessKeyLastUsed(k.AccessKeyId) }),
    )

    return {
      user: toUser(userCmd.User),
      attachedPolicies: attachedCmd.AttachedPolicies ?? [],
      inlinePolicies: inlineCmd.PolicyNames ?? [],
      groups: (groupsCmd.Groups ?? []).map((g) => ({ name: g.GroupName, arn: g.Arn })),
      accessKeys,
    }
  } catch (e) {
    if (e.name === 'NoSuchEntityException' || e.name === 'NoSuchEntity') return null
    throw e
  }
}

export async function getRole(roleName) {
  try {
    const roleCmd = await getClient().send(new GetRoleCommand({ RoleName: roleName }))
    const policiesCmd = await getClient().send(
      new ListAttachedRolePoliciesCommand({ RoleName: roleName })
    )
    return {
      role: toRole(roleCmd.Role),
      attachedPolicies: policiesCmd.AttachedPolicies ?? [],
    }
  } catch (e) {
    if (e.name === 'NoSuchEntityException' || e.name === 'NoSuchEntity') return null
    throw e
  }
}

/**
 * Runs `fn` over `items` with a bounded number in flight. IAM's rate limit is
 * low, and listing keys plus a last-used lookup for every user is two calls per
 * user — an unbounded Promise.all over a large account gets throttled.
 */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  async function lane() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
  return results
}

/**
 * Last-used telemetry is advisory: a key that AWS cannot report on is still a
 * key, so a failed lookup degrades to "unknown" rather than failing the list.
 */
async function getAccessKeyLastUsed(accessKeyId) {
  try {
    const out = await getClient().send(new GetAccessKeyLastUsedCommand({ AccessKeyId: accessKeyId }))
    return out.AccessKeyLastUsed ?? null
  } catch {
    return null
  }
}

export async function listAccessKeys() {
  const users = await listUsers()
  const perUser = await mapWithConcurrency(users, 5, async (user) => {
    const out = await getClient().send(new ListAccessKeysCommand({ UserName: user.name }))
    const keys = out.AccessKeyMetadata ?? []
    return mapWithConcurrency(keys, 3, async (k) =>
      toAccessKey(k, { userName: user.name, lastUsed: await getAccessKeyLastUsed(k.AccessKeyId) }),
    )
  })
  return perUser.flat()
}

/**
 * The secret is returned by AWS exactly once, at creation, and is never
 * retrievable again. It is passed straight through to the caller and
 * deliberately not logged or persisted anywhere.
 */
export async function createAccessKey(userName) {
  const out = await getClient().send(new CreateAccessKeyCommand({ UserName: userName }))
  const k = out.AccessKey
  return {
    ...toAccessKey(k, { userName }),
    secretAccessKey: k.SecretAccessKey,
  }
}

export async function updateAccessKeyStatus(userName, accessKeyId, status) {
  await getClient().send(
    new UpdateAccessKeyCommand({ UserName: userName, AccessKeyId: accessKeyId, Status: status }),
  )
  return { userName, accessKeyId, status }
}

export async function deleteAccessKey(userName, accessKeyId) {
  await getClient().send(new DeleteAccessKeyCommand({ UserName: userName, AccessKeyId: accessKeyId }))
  return { userName, accessKeyId, deleted: true }
}

export async function createUser(userName) {
  const out = await getClient().send(new CreateUserCommand({ UserName: userName }))
  return toUser(out.User)
}

export async function deleteUser(userName) {
  await getClient().send(new DeleteUserCommand({ UserName: userName }))
  return { success: true, deletedUser: userName }
}
