export function toSecretSummary(awsSecret) {
  return {
    name: awsSecret.Name,
    arn: awsSecret.ARN,
    description: awsSecret.Description || '',
    lastChangedDate: awsSecret.LastChangedDate || null,
    lastAccessedDate: awsSecret.LastAccessedDate || null,
    rotationEnabled: !!awsSecret.RotationEnabled,
    tags: (awsSecret.Tags || []).map((t) => ({ key: t.Key, value: t.Value })),
  }
}

export function toSecretDetail(describeResult) {
  return {
    name: describeResult.Name,
    arn: describeResult.ARN,
    description: describeResult.Description || '',
    kmsKeyId: describeResult.KmsKeyId || null,
    lastChangedDate: describeResult.LastChangedDate || null,
    lastAccessedDate: describeResult.LastAccessedDate || null,
    lastRotatedDate: describeResult.LastRotatedDate || null,
    rotationEnabled: !!describeResult.RotationEnabled,
    rotationRules: describeResult.RotationRules || null,
    versionIds: Object.keys(describeResult.VersionIdsToStages || {}),
    tags: (describeResult.Tags || []).map((t) => ({ key: t.Key, value: t.Value })),
    deletedDate: describeResult.DeletedDate || null,
  }
}

export function toSecretValue(getValueResult) {
  const raw = getValueResult.SecretString ?? null
  let parsed = null
  if (raw) {
    try {
      const candidate = JSON.parse(raw)
      if (candidate && typeof candidate === 'object') parsed = candidate
    } catch {
      parsed = null
    }
  }
  return {
    raw,
    parsed,
    versionId: getValueResult.VersionId,
    createdDate: getValueResult.CreatedDate || null,
    isBinary: raw === null,
  }
}
