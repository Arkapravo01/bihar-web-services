import { Router } from 'express'
import * as lambdaController from '../controllers/lambda.controller.js'

export const lambdaRouter = Router()

lambdaRouter.get('/env', lambdaController.getEnv)
lambdaRouter.get('/functions', lambdaController.listFunctions)
lambdaRouter.get('/functions/:functionName', lambdaController.getFunction)
lambdaRouter.get('/functions/:functionName/config', lambdaController.getFunctionConfig)
lambdaRouter.get('/functions/:functionName/code', lambdaController.getFunctionCode)
lambdaRouter.post('/functions/:functionName/invoke', lambdaController.invokeFunction)
lambdaRouter.patch('/functions/:functionName/config', lambdaController.updateFunctionConfig)
