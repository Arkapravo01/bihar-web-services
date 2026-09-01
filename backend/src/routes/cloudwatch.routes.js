import { Router } from 'express'
import express from 'express'
import * as cwController from '../controllers/cloudwatch.controller.js'

export const cloudwatchRouter = Router()

cloudwatchRouter.use(express.json())

cloudwatchRouter.get('/log-groups', cwController.getLogGroups)
cloudwatchRouter.get('/log-groups/*logGroupName/streams', cwController.getLogStreams)
cloudwatchRouter.get('/log-groups/*logGroupName/streams/*logStreamName/events', cwController.getLogEvents)
cloudwatchRouter.get('/log-groups/*logGroupName/filter', cwController.filterLogEvents)
cloudwatchRouter.post('/query', cwController.executeInsightsQuery)
cloudwatchRouter.get('/query/:queryId', cwController.getInsightsQueryResults)
