import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
  ListPoliciesCommand,
  ListAttachedUserPoliciesCommand,
  ListAttachedRolePoliciesCommand,
  ListUserPoliciesCommand,
  ListRolePoliciesCommand,
  GetUserPolicyCommand,
  GetRolePolicyCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand,
  CreateUserCommand,
  DeleteUserCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  CreatePolicyCommand,
  DeletePolicyCommand,
  AttachUserPolicyCommand,
  DetachUserPolicyCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand,
  CreateLoginProfileCommand,
  DeleteLoginProfileCommand,
  CreateAccessKeyCommand,
  DeleteAccessKeyCommand,
  ListAccessKeysCommand,
  UpdateAccessKeyCommand,
  AddUserToGroupCommand,
  RemoveUserFromGroupCommand,
  ListGroupsForUserCommand,
  ListGroupsCommand,
  GetUserCommand,
  GetRoleCommand,
} from '@aws-sdk/client-iam'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, IAM_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: IAM_PROFILE })
const iamClient = new IAMClient({ region: AWS_REGION, credentials })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

// ─── tool definitions ────────────────────────────────────────────────────────

export const toolDefinitions = [
  // ── identity ──
  {
    type: 'function',
    function: {
      name: 'get_caller_identity',
      description: 'Returns the AWS account ID and ARN of the credentials the agent is using. Call this first if a permission error occurs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ── read — users ──
  {
    type: 'function',
    function: {
      name: 'list_users',
      description: 'List all IAM users in the account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user',
      description: 'Get details for a single IAM user including their attached and inline policies and access keys.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Exact IAM user name.' },
        },
        required: ['userName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_policies',
      description: 'Get all attached managed policies and inline policies for a specific IAM user.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Exact IAM user name.' },
        },
        required: ['userName'],
      },
    },
  },

  // ── read — roles ──
  {
    type: 'function',
    function: {
      name: 'list_roles',
      description: 'List all IAM roles in the account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_role',
      description: 'Get details for a single IAM role including its trust policy and attached policies.',
      parameters: {
        type: 'object',
        properties: {
          roleName: { type: 'string', description: 'Exact IAM role name.' },
        },
        required: ['roleName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_role_policies',
      description: 'Get all attached managed policies and inline policies for a specific IAM role.',
      parameters: {
        type: 'object',
        properties: {
          roleName: { type: 'string', description: 'Exact IAM role name.' },
        },
        required: ['roleName'],
      },
    },
  },

  // ── read — policies ──
  {
    type: 'function',
    function: {
      name: 'list_policies',
      description: 'List all customer-managed IAM policies in the account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_policy_document',
      description: 'Get the full JSON document of a customer-managed policy by ARN.',
      parameters: {
        type: 'object',
        properties: {
          policyArn: { type: 'string', description: 'Full ARN of the policy.' },
        },
        required: ['policyArn'],
      },
    },
  },

  // ── read — groups & access keys ──
  {
    type: 'function',
    function: {
      name: 'list_groups',
      description: 'List all IAM groups in the account.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_user_access_keys',
      description: 'List access keys for a specific IAM user.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Exact IAM user name.' },
        },
        required: ['userName'],
      },
    },
  },

  // ── write — users ──
  {
    type: 'function',
    function: {
      name: 'create_user',
      description: 'Create a new IAM user.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Name for the new IAM user.' },
          path: { type: 'string', description: 'Optional path prefix (default /).' },
        },
        required: ['userName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_user',
      description: 'Delete an IAM user. The user must have no attached policies, access keys, or group memberships first.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Exact IAM user name to delete.' },
        },
        required: ['userName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_access_key',
      description: 'Create a new access key pair for an IAM user. Returns the secret access key — only shown once.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Exact IAM user name.' },
        },
        required: ['userName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_access_key',
      description: 'Delete an access key for an IAM user.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string', description: 'Exact IAM user name.' },
          accessKeyId: { type: 'string', description: 'The access key ID to delete.' },
        },
        required: ['userName', 'accessKeyId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_user_to_group',
      description: 'Add an IAM user to an IAM group.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          groupName: { type: 'string' },
        },
        required: ['userName', 'groupName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_user_from_group',
      description: 'Remove an IAM user from an IAM group.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          groupName: { type: 'string' },
        },
        required: ['userName', 'groupName'],
      },
    },
  },

  // ── write — roles ──
  {
    type: 'function',
    function: {
      name: 'create_role',
      description: 'Create a new IAM role with a trust policy document.',
      parameters: {
        type: 'object',
        properties: {
          roleName: { type: 'string', description: 'Name for the new role.' },
          trustPolicyDocument: { type: 'string', description: 'JSON string of the trust policy (AssumeRolePolicyDocument).' },
          description: { type: 'string', description: 'Optional description.' },
        },
        required: ['roleName', 'trustPolicyDocument'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_role',
      description: 'Delete an IAM role. All attached policies must be detached first.',
      parameters: {
        type: 'object',
        properties: {
          roleName: { type: 'string', description: 'Exact IAM role name to delete.' },
        },
        required: ['roleName'],
      },
    },
  },

  // ── write — policies ──
  {
    type: 'function',
    function: {
      name: 'create_policy',
      description: 'Create a new customer-managed IAM policy.',
      parameters: {
        type: 'object',
        properties: {
          policyName: { type: 'string', description: 'Name for the new policy.' },
          policyDocument: { type: 'string', description: 'JSON string of the policy document.' },
          description: { type: 'string', description: 'Optional description.' },
        },
        required: ['policyName', 'policyDocument'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_policy',
      description: 'Delete a customer-managed IAM policy by ARN.',
      parameters: {
        type: 'object',
        properties: {
          policyArn: { type: 'string', description: 'Full ARN of the policy to delete.' },
        },
        required: ['policyArn'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'attach_user_policy',
      description: 'Attach a managed policy to an IAM user.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          policyArn: { type: 'string', description: 'Full ARN of the policy to attach.' },
        },
        required: ['userName', 'policyArn'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detach_user_policy',
      description: 'Detach a managed policy from an IAM user.',
      parameters: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          policyArn: { type: 'string' },
        },
        required: ['userName', 'policyArn'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'attach_role_policy',
      description: 'Attach a managed policy to an IAM role.',
      parameters: {
        type: 'object',
        properties: {
          roleName: { type: 'string' },
          policyArn: { type: 'string', description: 'Full ARN of the policy to attach.' },
        },
        required: ['roleName', 'policyArn'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detach_role_policy',
      description: 'Detach a managed policy from an IAM role.',
      parameters: {
        type: 'object',
        properties: {
          roleName: { type: 'string' },
          policyArn: { type: 'string' },
        },
        required: ['roleName', 'policyArn'],
      },
    },
  },
]

// ─── helpers ─────────────────────────────────────────────────────────────────

async function paginateIAM(command, resultKey, markerKey = 'Marker') {
  const items = []
  let marker
  do {
    const res = await iamClient.send(new command({ [markerKey]: marker }))
    items.push(...(res[resultKey] ?? []))
    marker = res.IsTruncated ? res.Marker : undefined
  } while (marker)
  return items
}

// ─── tool implementations ────────────────────────────────────────────────────

async function getCallerIdentity() {
  try {
    const res = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: res.Account, userId: res.UserId, arn: res.Arn }
  } catch (e) { return { error: e.message } }
}

async function listUsers() {
  const users = await paginateIAM(ListUsersCommand, 'Users')
  return users.map(u => ({ name: u.UserName, arn: u.Arn, created: u.CreateDate, passwordLastUsed: u.PasswordLastUsed ?? null }))
}

async function getUser(userName) {
  try {
    const [userRes, keysRes, groupsRes] = await Promise.all([
      iamClient.send(new GetUserCommand({ UserName: userName })),
      iamClient.send(new ListAccessKeysCommand({ UserName: userName })),
      iamClient.send(new ListGroupsForUserCommand({ UserName: userName })),
    ])
    return {
      user: { name: userRes.User.UserName, arn: userRes.User.Arn, created: userRes.User.CreateDate },
      accessKeys: (keysRes.AccessKeyMetadata ?? []).map(k => ({ id: k.AccessKeyId, status: k.Status, created: k.CreateDate })),
      groups: (groupsRes.Groups ?? []).map(g => g.GroupName),
    }
  } catch (e) { return { error: e.message } }
}

async function getUserPolicies(userName) {
  try {
    const attached = await paginateIAM(
      (args) => new ListAttachedUserPoliciesCommand({ UserName: userName, ...args }),
      'AttachedPolicies'
    ).catch(() => [])

    const inlineNames = await iamClient.send(new ListUserPoliciesCommand({ UserName: userName }))
      .then(r => r.PolicyNames ?? []).catch(() => [])
    const inline = await Promise.all(
      inlineNames.map(p => iamClient.send(new GetUserPolicyCommand({ UserName: userName, PolicyName: p }))
        .then(r => ({ name: p, document: r.PolicyDocument })).catch(() => ({ name: p, error: 'fetch failed' })))
    )
    return { userName, attachedPolicies: attached, inlinePolicies: inline }
  } catch (e) { return { error: e.message } }
}

async function listRoles() {
  const roles = await paginateIAM(ListRolesCommand, 'Roles')
  return roles.map(r => ({ name: r.RoleName, arn: r.Arn, created: r.CreateDate, description: r.Description ?? null }))
}

async function getRole(roleName) {
  try {
    const res = await iamClient.send(new GetRoleCommand({ RoleName: roleName }))
    return {
      name: res.Role.RoleName,
      arn: res.Role.Arn,
      created: res.Role.CreateDate,
      description: res.Role.Description ?? null,
      trustPolicy: res.Role.AssumeRolePolicyDocument ? JSON.parse(decodeURIComponent(res.Role.AssumeRolePolicyDocument)) : null,
    }
  } catch (e) { return { error: e.message } }
}

async function getRolePolicies(roleName) {
  try {
    const attached = []
    let marker
    do {
      const res = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName, Marker: marker }))
      attached.push(...(res.AttachedPolicies ?? []))
      marker = res.IsTruncated ? res.Marker : undefined
    } while (marker)
    const inlineRes = await iamClient.send(new ListRolePoliciesCommand({ RoleName: roleName }))
    const inline = await Promise.all(
      (inlineRes.PolicyNames ?? []).map(p =>
        iamClient.send(new GetRolePolicyCommand({ RoleName: roleName, PolicyName: p }))
          .then(r => ({ name: p, document: r.PolicyDocument })).catch(() => ({ name: p, error: 'fetch failed' }))
      )
    )
    return { roleName, attachedPolicies: attached, inlinePolicies: inline }
  } catch (e) { return { error: e.message } }
}

async function listPolicies() {
  const policies = []
  let marker
  do {
    const res = await iamClient.send(new ListPoliciesCommand({ Scope: 'Local', MaxItems: 100, Marker: marker }))
    policies.push(...(res.Policies ?? []))
    marker = res.IsTruncated ? res.Marker : undefined
  } while (marker)
  return policies.map(p => ({ name: p.PolicyName, arn: p.Arn, attachmentCount: p.AttachmentCount, created: p.CreateDate }))
}

async function getPolicyDocument(policyArn) {
  try {
    const meta = await iamClient.send(new GetPolicyCommand({ PolicyArn: policyArn }))
    const ver = await iamClient.send(new GetPolicyVersionCommand({ PolicyArn: policyArn, VersionId: meta.Policy.DefaultVersionId }))
    return { policyArn, document: JSON.parse(decodeURIComponent(ver.PolicyVersion.Document)) }
  } catch (e) { return { error: e.message } }
}

async function listGroups() {
  const res = await iamClient.send(new ListGroupsCommand({}))
  return (res.Groups ?? []).map(g => ({ name: g.GroupName, arn: g.Arn, created: g.CreateDate }))
}

async function listUserAccessKeys(userName) {
  try {
    const res = await iamClient.send(new ListAccessKeysCommand({ UserName: userName }))
    return (res.AccessKeyMetadata ?? []).map(k => ({ accessKeyId: k.AccessKeyId, status: k.Status, created: k.CreateDate }))
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':        return getCallerIdentity()
    case 'list_users':                 return listUsers()
    case 'get_user':                   return getUser(args.userName)
    case 'get_user_policies':          return getUserPolicies(args.userName)
    case 'list_roles':                 return listRoles()
    case 'get_role':                   return getRole(args.roleName)
    case 'get_role_policies':          return getRolePolicies(args.roleName)
    case 'list_policies':              return listPolicies()
    case 'get_policy_document':        return getPolicyDocument(args.policyArn)
    case 'list_groups':                return listGroups()
    case 'list_user_access_keys':      return listUserAccessKeys(args.userName)

    case 'create_user': {
      try {
        const res = await iamClient.send(new CreateUserCommand({ UserName: args.userName, Path: args.path ?? '/' }))
        return { created: true, user: { name: res.User.UserName, arn: res.User.Arn } }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'delete_user': {
      try {
        await iamClient.send(new DeleteUserCommand({ UserName: args.userName }))
        return { deleted: true, userName: args.userName }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'create_access_key': {
      try {
        const res = await iamClient.send(new CreateAccessKeyCommand({ UserName: args.userName }))
        return {
          created: true,
          accessKeyId: res.AccessKey.AccessKeyId,
          secretAccessKey: res.AccessKey.SecretAccessKey,
          status: res.AccessKey.Status,
          warning: 'This is the only time the secret will be shown.',
        }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'delete_access_key': {
      try {
        await iamClient.send(new DeleteAccessKeyCommand({ UserName: args.userName, AccessKeyId: args.accessKeyId }))
        return { deleted: true, accessKeyId: args.accessKeyId }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'add_user_to_group': {
      try {
        await iamClient.send(new AddUserToGroupCommand({ UserName: args.userName, GroupName: args.groupName }))
        return { added: true, userName: args.userName, groupName: args.groupName }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'remove_user_from_group': {
      try {
        await iamClient.send(new RemoveUserFromGroupCommand({ UserName: args.userName, GroupName: args.groupName }))
        return { removed: true, userName: args.userName, groupName: args.groupName }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }

    case 'create_role': {
      try {
        const res = await iamClient.send(new CreateRoleCommand({
          RoleName: args.roleName,
          AssumeRolePolicyDocument: args.trustPolicyDocument,
          Description: args.description,
        }))
        return { created: true, role: { name: res.Role.RoleName, arn: res.Role.Arn } }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'delete_role': {
      try {
        await iamClient.send(new DeleteRoleCommand({ RoleName: args.roleName }))
        return { deleted: true, roleName: args.roleName }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }

    case 'create_policy': {
      try {
        const res = await iamClient.send(new CreatePolicyCommand({
          PolicyName: args.policyName,
          PolicyDocument: args.policyDocument,
          Description: args.description,
        }))
        return { created: true, policy: { name: res.Policy.PolicyName, arn: res.Policy.Arn } }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'delete_policy': {
      try {
        await iamClient.send(new DeletePolicyCommand({ PolicyArn: args.policyArn }))
        return { deleted: true, policyArn: args.policyArn }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'attach_user_policy': {
      try {
        await iamClient.send(new AttachUserPolicyCommand({ UserName: args.userName, PolicyArn: args.policyArn }))
        return { attached: true, userName: args.userName, policyArn: args.policyArn }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'detach_user_policy': {
      try {
        await iamClient.send(new DetachUserPolicyCommand({ UserName: args.userName, PolicyArn: args.policyArn }))
        return { detached: true, userName: args.userName, policyArn: args.policyArn }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'attach_role_policy': {
      try {
        await iamClient.send(new AttachRolePolicyCommand({ RoleName: args.roleName, PolicyArn: args.policyArn }))
        return { attached: true, roleName: args.roleName, policyArn: args.policyArn }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }
    case 'detach_role_policy': {
      try {
        await iamClient.send(new DetachRolePolicyCommand({ RoleName: args.roleName, PolicyArn: args.policyArn }))
        return { detached: true, roleName: args.roleName, policyArn: args.policyArn }
      } catch (e) {
        return { error: e.message, code: e.name }
      }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}
