import { Router } from 'express'
import * as glueController from '../controllers/glue.controller.js'

export const glueRouter = Router()

glueRouter.get('/databases', glueController.listDatabases)
glueRouter.get('/databases/:name', glueController.getDatabase)
glueRouter.get('/databases/:databaseName/tables', glueController.listTables)
glueRouter.get('/jobs', glueController.listJobs)
glueRouter.get('/jobs/:jobName/runs', glueController.getJobRuns)
glueRouter.get('/connections', glueController.listConnections)
glueRouter.get('/crawlers', glueController.listCrawlers)
