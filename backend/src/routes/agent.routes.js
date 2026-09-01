import { Router } from 'express'
import express from 'express'
import * as agentController from '../controllers/agent.controller.js'

export const agentRouter = Router()
agentRouter.use(express.json())
agentRouter.post('/cloudwatch/investigate', agentController.investigate)
agentRouter.post('/s3/investigate', agentController.investigateS3)
agentRouter.post('/iam/investigate', agentController.investigateIAM)
