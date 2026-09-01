import {
  ListBucketsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  GetBucketAclCommand,
  GetBucketPolicyCommand,
  GetPublicAccessBlockCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getS3ClientForEnv } from '../clients/index.js'
import { AWS_REGION, S3_PROFILE } from '../config/aws.js'
import { toBucket } from '../models/Bucket.js'
import { toFolder, toFile } from '../models/S3Object.js'

let contextClient = null

function setContextClient(client) {
  contextClient = client
}

function getClient() {
  if (!contextClient) throw new Error('S3 client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  const profile = env === 'prod' ? 'claude-s3-prd' : 'claude-s3-qa'
  const client = getS3ClientForEnv(env)
  setContextClient(client)
  return { env, profile, region: AWS_REGION }
}

export async function listBuckets() {
  const out = await getClient().send(new ListBucketsCommand({}))
  return (out.Buckets ?? []).map(toBucket)
}

export async function headObject(bucket, key) {
  try {
    return await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  } catch (e) {
    if (e.$metadata?.httpStatusCode === 404 || e.name === 'NotFound') return null
    throw e
  }
}

export async function listObjects(bucket, prefix = '') {
  const folders = []
  const files = []
  let token

  do {
    const out = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: '/',
        ContinuationToken: token,
      })
    )
    for (const cp of out.CommonPrefixes ?? []) {
      folders.push(toFolder(cp, prefix))
    }
    for (const o of out.Contents ?? []) {
      if (o.Key === prefix) continue // skip the folder placeholder object itself
      files.push(toFile(o, prefix))
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined
  } while (token)

  return { folders, files }
}

export async function uploadObject({ bucket, prefix = '', file, overwrite }) {
  const key = `${prefix}${file.originalname}`

  if (!overwrite) {
    const existing = await headObject(bucket, key)
    if (existing) {
      return {
        conflict: true,
        key,
        size: existing.ContentLength,
        modified: existing.LastModified,
      }
    }
  }

  await new Upload({
    client: getClient(),
    params: {
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    },
  }).done()

  const verify = await headObject(bucket, key)
  return {
    conflict: false,
    key,
    size: verify?.ContentLength ?? null,
    modified: verify?.LastModified ?? null,
    verified: verify?.ContentLength === file.size,
  }
}

export async function getObjectStream(bucket, key) {
  return getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }))
}

const METRICS_PAGE_CAP = 50 // ~50,000 objects; report truncated rather than scan forever

export async function getBucketMetrics(bucket) {
  let objectCount = 0
  let totalBytes = 0
  let largest = null
  let mostRecent = null
  let token
  let pages = 0
  let truncated = false

  do {
    const out = await getClient().send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    )
    for (const o of out.Contents ?? []) {
      objectCount += 1
      totalBytes += o.Size ?? 0
      if (!largest || (o.Size ?? 0) > largest.size) {
        largest = { key: o.Key, size: o.Size }
      }
      if (!mostRecent || new Date(o.LastModified) > new Date(mostRecent.modified)) {
        mostRecent = { key: o.Key, modified: o.LastModified }
      }
    }
    pages += 1
    token = out.IsTruncated ? out.NextContinuationToken : undefined
    if (token && pages >= METRICS_PAGE_CAP) {
      truncated = true
      break
    }
  } while (token)

  return { objectCount, totalBytes, largest, mostRecent, truncated }
}

async function getBucketAcl(bucket) {
  const out = await getClient().send(new GetBucketAclCommand({ Bucket: bucket }))
  return {
    owner: out.Owner ?? null,
    grants: (out.Grants ?? []).map((g) => ({
      grantee: g.Grantee?.DisplayName || g.Grantee?.URI || g.Grantee?.ID || 'unknown',
      permission: g.Permission,
    })),
  }
}

async function getBucketPolicy(bucket) {
  try {
    const out = await getClient().send(new GetBucketPolicyCommand({ Bucket: bucket }))
    return out.Policy ? JSON.parse(out.Policy) : null
  } catch (e) {
    if (e.name === 'NoSuchBucketPolicy') return null
    throw e
  }
}

async function getPublicAccessBlock(bucket) {
  try {
    const out = await getClient().send(new GetPublicAccessBlockCommand({ Bucket: bucket }))
    return out.PublicAccessBlockConfiguration ?? null
  } catch (e) {
    if (e.name === 'NoSuchPublicAccessBlockConfiguration') return null
    throw e
  }
}

export async function getBucketPermissions(bucket) {
  const results = await Promise.allSettled([
    getBucketAcl(bucket),
    getBucketPolicy(bucket),
    getPublicAccessBlock(bucket),
  ])

  const [aclResult, policyResult, publicAccessResult] = results

  return {
    acl: aclResult.status === 'fulfilled' ? aclResult.value : null,
    aclError: aclResult.status === 'rejected' ? aclResult.reason.message : null,
    policy: policyResult.status === 'fulfilled' ? policyResult.value : null,
    policyError: policyResult.status === 'rejected' ? policyResult.reason.message : null,
    publicAccessBlock: publicAccessResult.status === 'fulfilled' ? publicAccessResult.value : null,
    publicAccessBlockError: publicAccessResult.status === 'rejected' ? publicAccessResult.reason.message : null,
  }
}

export async function deleteObject(bucket, key) {
  const existing = await headObject(bucket, key)
  if (!existing) {
    return { found: false, key }
  }

  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))

  const verify = await headObject(bucket, key)
  return { found: true, key, deleted: true, verified: verify === null }
}

/**
 * Search for objects matching a keyword within a single bucket — no delimiter,
 * so it scans all keys at every depth level.
 */
export async function searchObjectsInBucket({ bucket, keyword, maxObjects = 500 }) {
  const hits = []
  let token
  let scanned = 0

  do {
    const out = await getClient().send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    )
    for (const o of out.Contents ?? []) {
      if (o.Key.toLowerCase().includes(keyword.toLowerCase())) {
        hits.push({ bucket, key: o.Key, size: o.Size, modified: o.LastModified })
      }
      scanned += 1
    }
    token = out.IsTruncated && scanned < maxObjects ? out.NextContinuationToken : undefined
  } while (token)

  return { keyword, bucket, hits, scanned }
}

/**
 * Search for objects matching a keyword across all (or specified) buckets.
 * Scans up to maxPerBucket objects per bucket to keep latency reasonable.
 */
export async function searchObjectsAcrossBuckets({ keyword, buckets = null, maxPerBucket = 200 }) {
  const allBuckets = buckets ?? (await listBuckets()).map((b) => b.name)
  const hits = []

  for (const bucket of allBuckets) {
    let token
    let scanned = 0
    do {
      const out = await getClient().send(
        new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
      )
      for (const o of out.Contents ?? []) {
        if (o.Key.toLowerCase().includes(keyword.toLowerCase())) {
          hits.push({ bucket, key: o.Key, size: o.Size, modified: o.LastModified })
        }
        scanned += 1
      }
      token = out.IsTruncated && scanned < maxPerBucket ? out.NextContinuationToken : undefined
    } while (token)
  }

  return { keyword, hits, bucketsScanned: allBuckets.length }
}

