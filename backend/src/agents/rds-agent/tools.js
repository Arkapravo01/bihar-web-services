import {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBSnapshotsCommand,
  StartDBInstanceCommand,
  StopDBInstanceCommand,
  RebootDBInstanceCommand,
  CreateDBSnapshotCommand,
  DeleteDBInstanceCommand,
  RestoreDBInstanceFromDBSnapshotCommand,
} from '@aws-sdk/client-rds'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, RDS_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: RDS_PROFILE })
const rdsClient = new RDSClient({ region: AWS_REGION, credentials })
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
      name: 'list_instances',
      description: 'List all RDS DB instances with engine, class, and status. Always call this first when the user mentions an instance by name, to fuzzy-match what they probably meant.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_instance_detail',
      description: 'Get full detail for a single DB instance: endpoint, storage, multi-AZ, backup window, security groups, deletion protection.',
      parameters: {
        type: 'object',
        properties: { instanceId: { type: 'string', description: 'Exact DB instance identifier from list_instances.' } },
        required: ['instanceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_snapshots',
      description: 'List snapshots for a DB instance.',
      parameters: {
        type: 'object',
        properties: { instanceId: { type: 'string', description: 'Exact DB instance identifier.' } },
        required: ['instanceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_instance',
      description: 'Start a stopped DB instance. Only call this on clear, explicit instruction.',
      parameters: {
        type: 'object',
        properties: { instanceId: { type: 'string' } },
        required: ['instanceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_instance',
      description: 'Stop a running DB instance. This causes downtime for anything using it. Only call this on clear, explicit instruction — never infer this from an ambiguous request.',
      parameters: {
        type: 'object',
        properties: { instanceId: { type: 'string' } },
        required: ['instanceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reboot_instance',
      description: 'Reboot a DB instance (brief downtime, self-recovers). Only call this on clear, explicit instruction.',
      parameters: {
        type: 'object',
        properties: { instanceId: { type: 'string' } },
        required: ['instanceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_snapshot',
      description: 'Create a manual snapshot of a DB instance. Low risk — does not affect the running instance.',
      parameters: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
          snapshotId: { type: 'string', description: 'Name for the new snapshot.' },
        },
        required: ['instanceId', 'snapshotId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_instance',
      description: 'Permanently delete a DB instance. Only call this on clear, explicit instruction. Always ask the user whether to take a final snapshot before calling this, unless they already said to skip it.',
      parameters: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
          skipFinalSnapshot: { type: 'boolean', description: 'true to delete without a final snapshot (data loss beyond any earlier snapshots), false to take one first.' },
          finalSnapshotIdentifier: { type: 'string', description: 'Required when skipFinalSnapshot is false — name for the final snapshot.' },
        },
        required: ['instanceId', 'skipFinalSnapshot'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'restore_from_snapshot',
      description: 'Restore a snapshot into a brand-new DB instance. Does not touch the original instance or any existing data.',
      parameters: {
        type: 'object',
        properties: {
          snapshotId: { type: 'string', description: 'Exact snapshot identifier.' },
          newInstanceId: { type: 'string', description: 'Name for the new instance to create.' },
        },
        required: ['snapshotId', 'newInstanceId'],
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

async function listInstances() {
  try {
    const instances = []
    let marker
    do {
      const res = await rdsClient.send(new DescribeDBInstancesCommand({ Marker: marker, MaxRecords: 100 }))
      instances.push(...(res.DBInstances ?? []))
      marker = res.Marker
    } while (marker)
    return {
      instances: instances.map((db) => ({
        id: db.DBInstanceIdentifier,
        engine: db.Engine,
        engineVersion: db.EngineVersion,
        instanceClass: db.DBInstanceClass,
        status: db.DBInstanceStatus,
        multiAZ: !!db.MultiAZ,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function getInstanceDetail(instanceId) {
  try {
    const res = await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId }))
    const db = res.DBInstances?.[0]
    if (!db) return { error: 'Instance not found' }
    return {
      id: db.DBInstanceIdentifier,
      engine: db.Engine,
      engineVersion: db.EngineVersion,
      instanceClass: db.DBInstanceClass,
      status: db.DBInstanceStatus,
      endpoint: db.Endpoint?.Address ?? null,
      port: db.Endpoint?.Port ?? null,
      multiAZ: !!db.MultiAZ,
      allocatedStorage: db.AllocatedStorage,
      storageType: db.StorageType,
      backupRetentionPeriod: db.BackupRetentionPeriod,
      deletionProtection: !!db.DeletionProtection,
      publiclyAccessible: !!db.PubliclyAccessible,
    }
  } catch (e) { return { error: e.message } }
}

async function listSnapshots(instanceId) {
  try {
    const snapshots = []
    let marker
    do {
      const res = await rdsClient.send(new DescribeDBSnapshotsCommand({ DBInstanceIdentifier: instanceId, Marker: marker, MaxRecords: 100 }))
      snapshots.push(...(res.DBSnapshots ?? []))
      marker = res.Marker
    } while (marker)
    return {
      snapshots: snapshots.map((s) => ({
        id: s.DBSnapshotIdentifier,
        status: s.Status,
        snapshotType: s.SnapshotType,
        createdTime: s.SnapshotCreateTime ?? null,
      })),
    }
  } catch (e) { return { error: e.message } }
}

async function startInstance(instanceId) {
  try {
    const res = await rdsClient.send(new StartDBInstanceCommand({ DBInstanceIdentifier: instanceId }))
    return { started: true, status: res.DBInstance?.DBInstanceStatus }
  } catch (e) { return { error: e.message } }
}

async function stopInstance(instanceId) {
  try {
    const res = await rdsClient.send(new StopDBInstanceCommand({ DBInstanceIdentifier: instanceId }))
    return { stopped: true, status: res.DBInstance?.DBInstanceStatus }
  } catch (e) { return { error: e.message } }
}

async function rebootInstance(instanceId) {
  try {
    const res = await rdsClient.send(new RebootDBInstanceCommand({ DBInstanceIdentifier: instanceId }))
    return { rebooting: true, status: res.DBInstance?.DBInstanceStatus }
  } catch (e) { return { error: e.message } }
}

async function createSnapshot(instanceId, snapshotId) {
  try {
    const res = await rdsClient.send(new CreateDBSnapshotCommand({ DBInstanceIdentifier: instanceId, DBSnapshotIdentifier: snapshotId }))
    return { created: true, snapshotId: res.DBSnapshot?.DBSnapshotIdentifier, status: res.DBSnapshot?.Status }
  } catch (e) { return { error: e.message } }
}

async function deleteInstance(instanceId, skipFinalSnapshot, finalSnapshotIdentifier) {
  try {
    const res = await rdsClient.send(new DeleteDBInstanceCommand({
      DBInstanceIdentifier: instanceId,
      SkipFinalSnapshot: skipFinalSnapshot,
      FinalDBSnapshotIdentifier: skipFinalSnapshot ? undefined : finalSnapshotIdentifier,
    }))
    return { deleted: true, status: res.DBInstance?.DBInstanceStatus, finalSnapshot: skipFinalSnapshot ? null : finalSnapshotIdentifier }
  } catch (e) { return { error: e.message } }
}

async function restoreFromSnapshot(snapshotId, newInstanceId) {
  try {
    const res = await rdsClient.send(new RestoreDBInstanceFromDBSnapshotCommand({
      DBSnapshotIdentifier: snapshotId,
      DBInstanceIdentifier: newInstanceId,
    }))
    return { restoring: true, newInstanceId: res.DBInstance?.DBInstanceIdentifier, status: res.DBInstance?.DBInstanceStatus }
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity':     return getCallerIdentity()
    case 'list_instances':          return listInstances()
    case 'get_instance_detail':     return getInstanceDetail(args.instanceId)
    case 'list_snapshots':          return listSnapshots(args.instanceId)
    case 'start_instance':          return startInstance(args.instanceId)
    case 'stop_instance':           return stopInstance(args.instanceId)
    case 'reboot_instance':         return rebootInstance(args.instanceId)
    case 'create_snapshot':         return createSnapshot(args.instanceId, args.snapshotId)
    case 'delete_instance':         return deleteInstance(args.instanceId, args.skipFinalSnapshot, args.finalSnapshotIdentifier)
    case 'restore_from_snapshot':   return restoreFromSnapshot(args.snapshotId, args.newInstanceId)
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
