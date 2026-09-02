import { Router } from 'express'
import * as eventbridgeController from '../controllers/eventbridge.controller.js'

export const eventbridgeRouter = Router()

eventbridgeRouter.get('/env', eventbridgeController.getEnv)
eventbridgeRouter.get('/buses', eventbridgeController.listEventBuses)
eventbridgeRouter.get('/buses/:eventBusName', eventbridgeController.describeEventBus)
eventbridgeRouter.get('/buses/:eventBusName/rules', eventbridgeController.listRules)
eventbridgeRouter.get('/buses/:eventBusName/rules/:ruleName', eventbridgeController.describeRule)
eventbridgeRouter.get('/buses/:eventBusName/rules/:ruleName/targets', eventbridgeController.listTargets)
