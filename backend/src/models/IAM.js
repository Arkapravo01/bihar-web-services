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
