import { Router } from 'express'
import express from 'express'
import * as agentController from '../controllers/agent.controller.js'

export const agentRouter = Router()
agentRouter.use(express.json())
agentRouter.post('/orchestrator/investigate', agentController.investigateOrchestrator)
agentRouter.post('/cloudwatch/investigate', agentController.investigate)
agentRouter.post('/s3/investigate', agentController.investigateS3)
agentRouter.post('/iam/investigate', agentController.investigateIAM)
agentRouter.post('/lambda/investigate', agentController.investigateLambda)
agentRouter.post('/secrets/investigate', agentController.investigateSecrets)
agentRouter.post('/rds/investigate', agentController.investigateRds)
agentRouter.post('/ecs/investigate', agentController.investigateEcs)
agentRouter.post('/eventbridge/investigate', agentController.investigateEventBridge)
agentRouter.post('/glue/investigate', agentController.investigateGlue)
agentRouter.post('/report/investigate', agentController.investigateReport)
agentRouter.post('/apigateway/investigate', agentController.investigateApiGateway)
