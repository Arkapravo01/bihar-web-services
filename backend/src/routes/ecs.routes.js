import { Router } from 'express'
import * as ecsController from '../controllers/ecs.controller.js'

export const ecsRouter = Router()

ecsRouter.get('/env', ecsController.getEnv)
ecsRouter.get('/clusters', ecsController.listClusters)
ecsRouter.get('/clusters/:clusterName', ecsController.describeCluster)
ecsRouter.get('/clusters/:clusterName/services', ecsController.listServices)
ecsRouter.get('/clusters/:clusterName/services/:serviceName', ecsController.describeService)
ecsRouter.patch('/clusters/:clusterName/services/:serviceName/desired-count', ecsController.updateDesiredCount)
ecsRouter.post('/clusters/:clusterName/services/:serviceName/force-deployment', ecsController.forceNewDeployment)
ecsRouter.get('/clusters/:clusterName/tasks', ecsController.listTasks)
ecsRouter.post('/clusters/:clusterName/tasks/stop', ecsController.stopTask)
ecsRouter.get('/task-definitions', ecsController.listTaskDefinitions)
ecsRouter.get('/container-instances/:clusterName', ecsController.listContainerInstances)
