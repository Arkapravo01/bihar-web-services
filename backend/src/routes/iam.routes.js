import { Router } from 'express'
import * as iamController from '../controllers/iam.controller.js'

export const iamRouter = Router()

iamRouter.get('/env', iamController.getEnv)
iamRouter.get('/users', iamController.listUsers)
iamRouter.get('/roles', iamController.listRoles)
iamRouter.get('/policies', iamController.listPolicies)
iamRouter.get('/access-keys', iamController.listAccessKeys)
iamRouter.get('/users/:userName', iamController.getUser)
iamRouter.get('/roles/:roleName', iamController.getRole)
iamRouter.post('/users', iamController.createUser)
iamRouter.delete('/users/:userName', iamController.deleteUser)

iamRouter.post('/users/:userName/access-keys', iamController.createAccessKey)
iamRouter.patch('/users/:userName/access-keys/:accessKeyId', iamController.updateAccessKeyStatus)
iamRouter.delete('/users/:userName/access-keys/:accessKeyId', iamController.deleteAccessKey)
