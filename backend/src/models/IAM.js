export function toUser(awsUser) {
  return {
    name: awsUser.UserName,
    arn: awsUser.Arn,
    createDate: awsUser.CreateDate,
    userId: awsUser.UserId,
  }
}

export function toRole(awsRole) {
  return {
    name: awsRole.RoleName,
    arn: awsRole.Arn,
    createDate: awsRole.CreateDate,
    roleId: awsRole.RoleId,
    assumeRolePolicyDocument: awsRole.AssumeRolePolicyDocument,
  }
}

/**
 * Access keys carry the facts, not the policy. AWS access keys never expire, so
 * there is no expiry date to report — what an operator actually needs is how
 * old a key is and whether it is being used. `ageDays` is served here so every
 * caller agrees on it; the rotation window that turns an age into "due" is a
 * decision left to the UI, which lets it be changed without a round trip.
 */
export function toAccessKey(awsKey, { userName, lastUsed } = {}) {
  const createDate = awsKey.CreateDate ?? null
  const ageDays = createDate
    ? Math.floor((Date.now() - new Date(createDate).getTime()) / 86_400_000)
    : null

  const lastUsedDate = lastUsed?.LastUsedDate ?? null
  return {
    accessKeyId: awsKey.AccessKeyId,
    userName: userName ?? awsKey.UserName ?? null,
    status: awsKey.Status,
    createDate,
    ageDays,
    lastUsedDate,
    // AWS reports "N/A" for a key that has never been used.
    lastUsedService: lastUsed?.ServiceName && lastUsed.ServiceName !== 'N/A' ? lastUsed.ServiceName : null,
    lastUsedRegion: lastUsed?.Region && lastUsed.Region !== 'N/A' ? lastUsed.Region : null,
    lastUsedDaysAgo: lastUsedDate
      ? Math.floor((Date.now() - new Date(lastUsedDate).getTime()) / 86_400_000)
      : null,
    neverUsed: !lastUsedDate,
  }
}

export function toPolicy(awsPolicy) {
  return {
    name: awsPolicy.PolicyName,
    arn: awsPolicy.Arn,
    createDate: awsPolicy.CreateDate,
    policyId: awsPolicy.PolicyId,
    attachmentCount: awsPolicy.AttachmentCount,
    defaultVersionId: awsPolicy.DefaultVersionId,
  }
}
