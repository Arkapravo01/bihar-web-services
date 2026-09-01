import { S3Client } from '@aws-sdk/client-s3'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION } from '../../config/aws.js'

export function createS3Client(profile) {
  return new S3Client({
    region: AWS_REGION,
    credentials: fromIni({ profile }),
  })
}

export function getS3ClientForEnv(env) {
  const profile = env === 'prod' ? 'claude-s3-prd' : 'claude-s3-qa'
  return createS3Client(profile)
}
