import { Router } from 'express'
import multer from 'multer'
import * as s3Controller from '../controllers/s3.controller.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
})

export const s3Router = Router()

s3Router.get('/env', s3Controller.getEnv)
s3Router.get('/buckets', s3Controller.getBuckets)
s3Router.get('/buckets/:bucketName/objects', s3Controller.getObjects)
s3Router.get('/buckets/:bucketName/metrics', s3Controller.getMetrics)
s3Router.get('/buckets/:bucketName/permissions', s3Controller.getPermissions)
s3Router.post('/buckets/:bucketName/objects', upload.single('file'), s3Controller.uploadObject)
s3Router.get('/buckets/:bucketName/objects/download', s3Controller.downloadObject)
s3Router.delete('/buckets/:bucketName/objects', s3Controller.deleteObjectController)
