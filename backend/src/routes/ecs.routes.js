import { Router } from 'express'
import * as ecsController from '../controllers/ecs.controller.js'

export const ecsRouter = Router()

ecsRouter.get('/env', ecsController.getEnv)
ecsRouter.get('/clusters', ecsController.listClusters)
ecsRouter.get('/clusters/:clusterName', ecsController.describeCluster)
ecsRouter.get('/clusters/:clusterName/services', ecsController.listServices)
ecsRouter.get('/clusters/:clusterName/tasks', ecsController.listTasks)
ecsRouter.get('/task-definitions', ecsController.listTaskDefinitions)
ecsRouter.get('/container-instances/:clusterName', ecsController.listContainerInstances)
