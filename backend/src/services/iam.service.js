import {
  ListUsersCommand,
  ListRolesCommand,
  ListPoliciesCommand,
  GetUserCommand,
  GetRoleCommand,
  ListAttachedUserPoliciesCommand,
  ListAttachedRolePoliciesCommand,
  ListAccessKeysCommand,
  CreateUserCommand,
  DeleteUserCommand,
} from '@aws-sdk/client-iam'
import { getIAMClientForEnv } from '../clients/index.js'
import { AWS_REGION, IAM_PROFILE } from '../config/aws.js'
import { toUser, toRole, toPolicy } from '../models/IAM.js'

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
    const [userCmd, policiesCmd, keysCmd] = await Promise.all([
      getClient().send(new GetUserCommand({ UserName: userName })),
      getClient().send(new ListAttachedUserPoliciesCommand({ UserName: userName })),
      getClient().send(new ListAccessKeysCommand({ UserName: userName })),
    ])
    return {
      user: toUser(userCmd.User),
      attachedPolicies: policiesCmd.AttachedPolicies ?? [],
      accessKeys: (keysCmd.AccessKeyMetadata ?? []).map((k) => ({
        accessKeyId: k.AccessKeyId,
        status: k.Status,
        createDate: k.CreateDate,
      })),
    }
  } catch (e) {
    if (e.name === 'NoSuchEntity') return null
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
    if (e.name === 'NoSuchEntity') return null
    throw e
  }
}

export async function listAccessKeys() {
  // Fetch all users first, then get their access keys in parallel
  const users = await listUsers()
  const results = await Promise.all(
    users.map(async (user) => {
      const out = await getClient().send(new ListAccessKeysCommand({ UserName: user.name }))
      return (out.AccessKeyMetadata ?? []).map((k) => ({
        userName: user.name,
        accessKeyId: k.AccessKeyId,
        status: k.Status,
        createDate: k.CreateDate,
      }))
    })
  )
  return results.flat()
}

export async function createUser(userName) {
  const out = await getClient().send(new CreateUserCommand({ UserName: userName }))
  return toUser(out.User)
}

export async function deleteUser(userName) {
  await getClient().send(new DeleteUserCommand({ UserName: userName }))
  return { success: true, deletedUser: userName }
}
