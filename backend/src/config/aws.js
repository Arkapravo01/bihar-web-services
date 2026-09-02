export const S3_ENV = process.env.S3_ENV || 'qa'
export const S3_PROFILE = process.env.S3_PROFILE ||
  (S3_ENV === 'prod' ? 'claude-s3-prd' : 'claude-s3-qa')
export const CLOUDWATCH_ENV = process.env.CLOUDWATCH_ENV || 'qa'
export const CLOUDWATCH_PROFILE = process.env.CLOUDWATCH_PROFILE || 'claude-cloudwatch-qa'
export const IAM_ENV = process.env.IAM_ENV || 'qa'
export const IAM_PROFILE = process.env.IAM_PROFILE ||
  (IAM_ENV === 'prod' ? 'claude-iam-prd' : 'claude-iam-qa')
export const LAMBDA_ENV = process.env.LAMBDA_ENV || 'qa'
export const LAMBDA_PROFILE = process.env.LAMBDA_PROFILE ||
  (LAMBDA_ENV === 'prod' ? 'claude-lambda-prd' : 'claude-lambda-qa')
export const SECRETS_ENV = process.env.SECRETS_ENV || 'qa'
export const SECRETS_PROFILE = process.env.SECRETS_PROFILE ||
  (SECRETS_ENV === 'prod' ? 'claude-secrets-manager-prd' : 'claude-secrets-manager-qa')
export const RDS_ENV = process.env.RDS_ENV || 'qa'
export const RDS_PROFILE = process.env.RDS_PROFILE ||
  (RDS_ENV === 'prod' ? 'claude-rds-prd' : 'claude-rds-qa')
export const ECS_ENV = process.env.ECS_ENV || 'qa'
export const ECS_PROFILE = process.env.ECS_PROFILE ||
  (ECS_ENV === 'prod' ? 'claude-ecs-prd' : 'claude-ecs-qa')
export const EVENTBRIDGE_ENV = process.env.EVENTBRIDGE_ENV || 'qa'
export const EVENTBRIDGE_PROFILE = process.env.EVENTBRIDGE_PROFILE ||
  (EVENTBRIDGE_ENV === 'prod' ? 'claude-eventbridge-prd' : 'claude-eventbridge-qa')
export const GLUE_ENV = process.env.GLUE_ENV || 'qa'
export const GLUE_PROFILE = process.env.GLUE_PROFILE ||
  (GLUE_ENV === 'prod' ? 'claude-glue-prd' : 'claude-glue-qa')
export const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
