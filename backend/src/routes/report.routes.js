import { Router } from 'express'
import * as reportController from '../controllers/report.controller.js'

export const reportRouter = Router()

reportRouter.post('/runs', reportController.startRun)
reportRouter.get('/runs/latest', reportController.getLatestRun)
reportRouter.get('/runs/:runId', reportController.getRun)
reportRouter.get('/runs', reportController.listRuns)
reportRouter.post('/runs/:runId/cancel', reportController.cancelRun)
