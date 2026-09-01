import {
  DescribeDBInstancesCommand,
  DescribeDBSnapshotsCommand,
  StartDBInstanceCommand,
  StopDBInstanceCommand,
  RebootDBInstanceCommand,
  CreateDBSnapshotCommand,
  DeleteDBInstanceCommand,
  RestoreDBInstanceFromDBSnapshotCommand,
} from '@aws-sdk/client-rds'
import { getRdsClientForEnv } from '../clients/index.js'
import { AWS_REGION, RDS_PROFILE } from '../config/aws.js'
import { toInstanceSummary, toInstanceDetail, toSnapshot } from '../models/RdsInstance.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('RDS client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const client = getRdsClientForEnv(env)
  setContextClient(client)
  return { env, profile: RDS_PROFILE, region: AWS_REGION }
}

export async function listInstances() {
  const instances = []
  let marker
  do {
    const out = await getClient().send(new DescribeDBInstancesCommand({ Marker: marker, MaxRecords: 100 }))
    instances.push(...(out.DBInstances ?? []))
    marker = out.Marker
  } while (marker)
  return instances.map(toInstanceSummary)
}

export async function getInstanceDetail(instanceId) {
  try {
    const out = await getClient().send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: instanceId }))
    const db = out.DBInstances?.[0]
    return db ? toInstanceDetail(db) : null
  } catch (e) {
    if (e.name === 'DBInstanceNotFoundFault') return null
    throw e
  }
}

export async function listSnapshots(instanceId) {
  const snapshots = []
  let marker
  do {
    const out = await getClient().send(new DescribeDBSnapshotsCommand({ DBInstanceIdentifier: instanceId, Marker: marker, MaxRecords: 100 }))
    snapshots.push(...(out.DBSnapshots ?? []))
    marker = out.Marker
  } while (marker)
  return snapshots.map(toSnapshot)
}

export async function startInstance(instanceId) {
  const out = await getClient().send(new StartDBInstanceCommand({ DBInstanceIdentifier: instanceId }))
  return toInstanceSummary(out.DBInstance)
}

export async function stopInstance(instanceId) {
  const out = await getClient().send(new StopDBInstanceCommand({ DBInstanceIdentifier: instanceId }))
  return toInstanceSummary(out.DBInstance)
}

export async function rebootInstance(instanceId) {
  const out = await getClient().send(new RebootDBInstanceCommand({ DBInstanceIdentifier: instanceId }))
  return toInstanceSummary(out.DBInstance)
}

export async function createSnapshot(instanceId, snapshotId) {
  const out = await getClient().send(new CreateDBSnapshotCommand({
    DBInstanceIdentifier: instanceId,
    DBSnapshotIdentifier: snapshotId,
  }))
  return toSnapshot(out.DBSnapshot)
}

export async function deleteInstance(instanceId, { skipFinalSnapshot, finalSnapshotIdentifier }) {
  const out = await getClient().send(new DeleteDBInstanceCommand({
    DBInstanceIdentifier: instanceId,
    SkipFinalSnapshot: skipFinalSnapshot,
    FinalDBSnapshotIdentifier: skipFinalSnapshot ? undefined : finalSnapshotIdentifier,
  }))
  return toInstanceSummary(out.DBInstance)
}

export async function restoreFromSnapshot(snapshotId, newInstanceId) {
  const out = await getClient().send(new RestoreDBInstanceFromDBSnapshotCommand({
    DBSnapshotIdentifier: snapshotId,
    DBInstanceIdentifier: newInstanceId,
  }))
  return toInstanceSummary(out.DBInstance)
}
