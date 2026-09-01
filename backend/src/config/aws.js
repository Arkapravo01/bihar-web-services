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
export const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
