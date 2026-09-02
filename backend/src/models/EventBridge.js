export function toEventBus(awsBus) {
  return {
    name: awsBus.Name,
    arn: awsBus.Arn,
    createdAt: awsBus.CreationTime?.toISOString?.(),
    policyText: awsBus.Policy,
  }
}

export function toRule(awsRule) {
  return {
    name: awsRule.Name,
    arn: awsRule.Arn,
    state: awsRule.State,
    description: awsRule.Description,
    eventPattern: awsRule.EventPattern,
    scheduleExpression: awsRule.ScheduleExpression,
    eventBusName: awsRule.EventBusName,
    managedBy: awsRule.ManagedBy,
  }
}

export function toTarget(awsTarget) {
  return {
    arn: awsTarget.Arn,
    roleArn: awsTarget.RoleArn,
    retryPolicy: awsTarget.RetryPolicy,
    deadLetterConfig: awsTarget.DeadLetterConfig,
    input: awsTarget.Input,
    httpParameters: awsTarget.HttpParameters,
  }
}
