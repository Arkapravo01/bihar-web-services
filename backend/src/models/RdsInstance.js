export function toInstanceSummary(db) {
  return {
    id: db.DBInstanceIdentifier,
    engine: db.Engine,
    engineVersion: db.EngineVersion,
    instanceClass: db.DBInstanceClass,
    status: db.DBInstanceStatus,
    endpoint: db.Endpoint?.Address || null,
    port: db.Endpoint?.Port || null,
    multiAZ: !!db.MultiAZ,
    allocatedStorage: db.AllocatedStorage,
    storageType: db.StorageType,
  }
}

export function toInstanceDetail(db) {
  return {
    ...toInstanceSummary(db),
    arn: db.DBInstanceArn,
    publiclyAccessible: !!db.PubliclyAccessible,
    backupRetentionPeriod: db.BackupRetentionPeriod,
    preferredBackupWindow: db.PreferredBackupWindow || null,
    preferredMaintenanceWindow: db.PreferredMaintenanceWindow || null,
    parameterGroups: (db.DBParameterGroups || []).map((g) => ({ name: g.DBParameterGroupName, status: g.ParameterApplyStatus })),
    securityGroups: (db.VpcSecurityGroups || []).map((g) => ({ id: g.VpcSecurityGroupId, status: g.Status })),
    createdTime: db.InstanceCreateTime || null,
    storageEncrypted: !!db.StorageEncrypted,
    deletionProtection: !!db.DeletionProtection,
  }
}

export function toSnapshot(snap) {
  return {
    id: snap.DBSnapshotIdentifier,
    instanceId: snap.DBInstanceIdentifier,
    status: snap.Status,
    engine: snap.Engine,
    allocatedStorage: snap.AllocatedStorage,
    snapshotType: snap.SnapshotType,
    createdTime: snap.SnapshotCreateTime || null,
  }
}
