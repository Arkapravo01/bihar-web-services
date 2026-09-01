import { ApiError } from '../errors.js'

export function assertInstanceId(instanceId) {
  if (!instanceId || typeof instanceId !== 'string' || !instanceId.trim()) {
    throw new ApiError(400, 'INSTANCE_ID_REQUIRED', 'A DB instance identifier is required')
  }
}

export function assertSnapshotIdentifier(snapshotId) {
  if (!snapshotId || typeof snapshotId !== 'string' || !snapshotId.trim()) {
    throw new ApiError(400, 'SNAPSHOT_ID_REQUIRED', 'A snapshot identifier is required')
  }
}

export function assertDeleteOptions({ skipFinalSnapshot, finalSnapshotIdentifier }) {
  if (typeof skipFinalSnapshot !== 'boolean') {
    throw new ApiError(400, 'SKIP_FINAL_SNAPSHOT_REQUIRED', 'skipFinalSnapshot must be explicitly true or false')
  }
  if (!skipFinalSnapshot && (!finalSnapshotIdentifier || !finalSnapshotIdentifier.trim())) {
    throw new ApiError(400, 'FINAL_SNAPSHOT_NAME_REQUIRED', 'A final snapshot name is required unless skipping the final snapshot')
  }
}

export function assertRestoreOptions({ snapshotId, newInstanceId }) {
  assertSnapshotIdentifier(snapshotId)
  if (!newInstanceId || typeof newInstanceId !== 'string' || !newInstanceId.trim()) {
    throw new ApiError(400, 'NEW_INSTANCE_ID_REQUIRED', 'A name for the restored instance is required')
  }
}
