import { Router } from 'express'
import * as rdsController from '../controllers/rds.controller.js'

export const rdsRouter = Router()

rdsRouter.get('/env', rdsController.getEnv)
rdsRouter.get('/', rdsController.listInstances)
rdsRouter.get('/:instanceId', rdsController.getInstanceDetail)
rdsRouter.get('/:instanceId/snapshots', rdsController.listSnapshots)
rdsRouter.post('/:instanceId/start', rdsController.startInstance)
rdsRouter.post('/:instanceId/stop', rdsController.stopInstance)
rdsRouter.post('/:instanceId/reboot', rdsController.rebootInstance)
rdsRouter.post('/:instanceId/snapshots', rdsController.createSnapshot)
rdsRouter.delete('/:instanceId', rdsController.deleteInstance)
rdsRouter.post('/restore', rdsController.restoreFromSnapshot)
