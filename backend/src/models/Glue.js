export function toDatabase(awsDb) {
  if (!awsDb) return null
  return {
    name: awsDb.Name,
    description: awsDb.Description,
    arn: `arn:aws:glue:*:*:database/${awsDb.Name}`,
    catalogId: awsDb.CatalogId,
    created: awsDb.CreateTime?.toISOString(),
    updated: awsDb.UpdateTime?.toISOString(),
  }
}

export function toTable(awsTable) {
  if (!awsTable) return null
  return {
    name: awsTable.Name,
    database: awsTable.DatabaseName,
    arn: `arn:aws:glue:*:*:table/${awsTable.DatabaseName}/${awsTable.Name}`,
    owner: awsTable.Owner,
    description: awsTable.Description,
    tableType: awsTable.TableType,
    location: awsTable.StorageDescriptor?.Location,
    inputFormat: awsTable.StorageDescriptor?.InputFormat,
    outputFormat: awsTable.StorageDescriptor?.OutputFormat,
    serdeInfo: awsTable.StorageDescriptor?.SerdeInfo?.SerializationLibrary,
    columns: awsTable.StorageDescriptor?.Columns?.map(c => ({ name: c.Name, type: c.Type, comment: c.Comment })) || [],
    partitionKeys: awsTable.PartitionKeys?.map(p => ({ name: p.Name, type: p.Type })) || [],
    created: awsTable.CreateTime?.toISOString(),
    updated: awsTable.UpdateTime?.toISOString(),
  }
}

export function toJob(awsJob) {
  if (!awsJob) return null
  return {
    name: awsJob.Name,
    arn: `arn:aws:glue:*:*:job/${awsJob.Name}`,
    description: awsJob.Description,
    status: awsJob.Status,
    scriptLocation: awsJob.Command?.ScriptLocation,
    scriptLanguage: awsJob.Command?.ScriptLanguage,
    jobType: awsJob.Command?.Name,
    role: awsJob.Role,
    maxRetries: awsJob.MaxRetries,
    timeout: awsJob.Timeout,
    glueVersion: awsJob.GlueVersion,
    created: awsJob.CreatedOn?.toISOString(),
    updated: awsJob.LastModifiedOn?.toISOString(),
  }
}

export function toJobRun(awsRun) {
  if (!awsRun) return null
  return {
    id: awsRun.Id,
    jobName: awsRun.JobName,
    status: awsRun.JobRunState,
    startedOn: awsRun.StartedOn?.toISOString(),
    completedOn: awsRun.CompletedOn?.toISOString(),
    durationSeconds: awsRun.ExecutionTime,
    arguments: awsRun.Arguments || {},
    attempt: awsRun.Attempt,
    errorMessage: awsRun.ErrorMessage,
  }
}

export function toConnection(awsCon) {
  if (!awsCon) return null
  return {
    name: awsCon.Name,
    type: awsCon.ConnectionType,
    description: awsCon.Description,
    created: awsCon.CreationTime?.toISOString(),
    lastUpdated: awsCon.LastUpdatedTime?.toISOString(),
    status: awsCon.LastUpdatedStatus,
  }
}

export function toCrawler(awsCrawler) {
  if (!awsCrawler) return null
  return {
    name: awsCrawler.Name,
    arn: `arn:aws:glue:*:*:crawler/${awsCrawler.Name}`,
    status: awsCrawler.State,
    role: awsCrawler.Role,
    targets: awsCrawler.Targets,
    database: awsCrawler.DatabaseName,
    tablePrefix: awsCrawler.TablePrefix,
    description: awsCrawler.Description,
    schedule: awsCrawler.Schedule?.ScheduleExpression,
    created: awsCrawler.CreationTime?.toISOString(),
    updated: awsCrawler.LastUpdated?.toISOString(),
    lastCrawl: awsCrawler.LastCrawl?.Timestamp?.toISOString(),
  }
}
