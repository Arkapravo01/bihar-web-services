import * as s3Service from '../services/s3.service.js'
import { assertBucketNameProvided, assertKeyProvided, assertFileProvided } from '../validators/s3.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export function getEnv(req, res) {
  const env = resolveEnv(req)
  const envInfo = s3Service.setClientForEnv(env)
  res.json({ success: true, data: envInfo })
}

export async function getBuckets(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const buckets = await s3Service.listBuckets()
  res.json({ success: true, data: buckets })
}

export async function getObjects(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { bucketName } = req.params
  const { prefix = '' } = req.query
  assertBucketNameProvided(bucketName)
  const result = await s3Service.listObjects(bucketName, prefix)
  res.json({ success: true, data: result })
}

export async function uploadObject(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { bucketName } = req.params
  const { prefix = '', overwrite } = req.body
  assertBucketNameProvided(bucketName)
  assertFileProvided(req.file)

  const result = await s3Service.uploadObject({
    bucket: bucketName,
    prefix,
    file: req.file,
    overwrite: overwrite === 'true',
  })

  if (result.conflict) {
    return res.status(409).json({
      success: false,
      error: { code: 'S3_OBJECT_EXISTS', message: 'An object already exists at this key' },
      data: { key: result.key, size: result.size, modified: result.modified },
    })
  }

  res.json({ success: true, data: result })
}

export async function getMetrics(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { bucketName } = req.params
  assertBucketNameProvided(bucketName)
  const result = await s3Service.getBucketMetrics(bucketName)
  res.json({ success: true, data: result })
}

export async function getPermissions(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { bucketName } = req.params
  assertBucketNameProvided(bucketName)
  const result = await s3Service.getBucketPermissions(bucketName)
  res.json({ success: true, data: result })
}

export async function downloadObject(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { bucketName } = req.params
  const { key } = req.query
  assertBucketNameProvided(bucketName)
  assertKeyProvided(key)

  const out = await s3Service.getObjectStream(bucketName, key)
  const filename = key.split('/').pop()
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`)
  if (out.ContentType) res.setHeader('Content-Type', out.ContentType)
  if (out.ContentLength) res.setHeader('Content-Length', String(out.ContentLength))
  out.Body.pipe(res)
}

export async function deleteObjectController(req, res) {
  const env = resolveEnv(req)
  s3Service.setClientForEnv(env)
  const { bucketName } = req.params
  const { key } = req.query
  assertBucketNameProvided(bucketName)
  assertKeyProvided(key)

  const result = await s3Service.deleteObject(bucketName, key)
  if (!result.found) {
    return res.status(404).json({
      success: false,
      error: { code: 'S3_OBJECT_NOT_FOUND', message: 'No object at that key' },
    })
  }

  res.json({ success: true, data: result })
}
