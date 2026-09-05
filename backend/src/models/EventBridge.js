/**
 * EventBridge response mappers.
 *
 * Targets are keyed by Id in AWS, and every write operation (remove, retry
 * config, input transformer) addresses a target by that Id rather than its ARN —
 * a rule can point twice at the same Lambda with different inputs. The previous
 * mapper dropped Id, which made a target impossible to identify or act on.
 */

export function toEventBus(awsBus) {
  return {
    name: awsBus.Name,
    arn: awsBus.Arn,
    createdAt: awsBus.CreationTime?.toISOString?.(),
    description: awsBus.Description,
    // Set on DescribeEventBus only, and only for buses that can be dead — the
    // default bus reports nothing here.
    state: awsBus.State,
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
    eventBusName: awsRule.EventBusName ?? 'default',
    // Present when another AWS service owns the rule. Such rules cannot be
    // edited or disabled by us, so the UI has to know before offering the action.
    managedBy: awsRule.ManagedBy,
    roleArn: awsRule.RoleArn,
  }
}

export function toTarget(awsTarget) {
  return {
    id: awsTarget.Id,
    arn: awsTarget.Arn,
    roleArn: awsTarget.RoleArn,
    // Retry and dead-letter config decide whether a failed delivery is retried
    // or silently lost, so both travel with the target rather than being
    // fetched separately.
    retryPolicy: awsTarget.RetryPolicy
      ? {
          maximumRetryAttempts: awsTarget.RetryPolicy.MaximumRetryAttempts,
          maximumEventAgeInSeconds: awsTarget.RetryPolicy.MaximumEventAgeInSeconds,
        }
      : null,
    deadLetterArn: awsTarget.DeadLetterConfig?.Arn ?? null,
    input: awsTarget.Input,
    inputPath: awsTarget.InputPath,
    inputTransformer: awsTarget.InputTransformer
      ? {
          inputTemplate: awsTarget.InputTransformer.InputTemplate,
          pathsMap: awsTarget.InputTransformer.InputPathsMap,
        }
      : null,
    httpParameters: awsTarget.HttpParameters,
    // Kept as raw sub-objects: the UI only reports their presence, and the
    // shapes are large and service-specific.
    ecsParameters: awsTarget.EcsParameters ?? null,
    sqsParameters: awsTarget.SqsParameters ?? null,
    kinesisParameters: awsTarget.KinesisParameters ?? null,
  }
}
