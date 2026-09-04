import { Router } from 'express'
import * as glueController from '../controllers/glue.controller.js'

export const glueRouter = Router()

glueRouter.get('/databases',                                      glueController.listDatabases)
glueRouter.get('/databases/:name',                               glueController.getDatabase)
glueRouter.get('/databases/:databaseName/tables',                glueController.listTables)
glueRouter.get('/databases/:databaseName/tables/:tableName',     glueController.getTable)
glueRouter.get('/jobs',                                           glueController.listJobs)
glueRouter.get('/jobs/:jobName',                                  glueController.getJob)
glueRouter.get('/jobs/:jobName/runs',                            glueController.getJobRuns)
glueRouter.post('/jobs/:jobName/runs',                           glueController.startJobRun)
glueRouter.get('/connections',                                    glueController.listConnections)
glueRouter.get('/crawlers',                                       glueController.listCrawlers)
glueRouter.get('/crawlers/:crawlerName',                         glueController.getCrawler)
glueRouter.get('/crawlers/:crawlerName/crawls',                  glueController.listCrawlHistory)
glueRouter.get('/workflows',                                      glueController.listWorkflows)
glueRouter.get('/workflows/:workflowName/runs',                  glueController.getWorkflowRuns)
glueRouter.get('/workflows/:workflowName/runs/:runId',           glueController.getWorkflowRunDetail)
glueRouter.post('/workflows/:workflowName/runs',                 glueController.startWorkflowRun)
