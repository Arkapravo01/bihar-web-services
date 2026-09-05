import { Router } from 'express'
import * as eventbridgeController from '../controllers/eventbridge.controller.js'

export const eventbridgeRouter = Router()

eventbridgeRouter.get('/env', eventbridgeController.getEnv)
eventbridgeRouter.get('/buses', eventbridgeController.listEventBuses)
// Account-wide rule list, ahead of the per-bus routes so /rules is never read as
// a bus name.
eventbridgeRouter.get('/rules', eventbridgeController.listAllRules)
eventbridgeRouter.get('/buses/:eventBusName', eventbridgeController.describeEventBus)
eventbridgeRouter.get('/buses/:eventBusName/rules', eventbridgeController.listRules)
eventbridgeRouter.get('/buses/:eventBusName/rules/:ruleName', eventbridgeController.describeRule)
eventbridgeRouter.patch('/buses/:eventBusName/rules/:ruleName/state', eventbridgeController.setRuleState)
eventbridgeRouter.get('/buses/:eventBusName/rules/:ruleName/targets', eventbridgeController.listTargets)
