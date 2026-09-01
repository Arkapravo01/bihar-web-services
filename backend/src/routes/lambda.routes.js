import { Router } from 'express'
import multer from 'multer'
import * as lambdaController from '../controllers/lambda.controller.js'

const layerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
})

export const lambdaRouter = Router()

lambdaRouter.get('/env', lambdaController.getEnv)
lambdaRouter.get('/functions', lambdaController.listFunctions)
lambdaRouter.get('/functions/:functionName', lambdaController.getFunction)
lambdaRouter.get('/functions/:functionName/config', lambdaController.getFunctionConfig)
lambdaRouter.get('/functions/:functionName/code', lambdaController.getFunctionCode)
lambdaRouter.get('/functions/:functionName/files', lambdaController.getFunctionFiles)
lambdaRouter.post('/functions/:functionName/deploy', lambdaController.deployFunctionCode)
lambdaRouter.post('/functions/:functionName/invoke', lambdaController.invokeFunction)
lambdaRouter.patch('/functions/:functionName/config', lambdaController.updateFunctionConfig)
lambdaRouter.patch('/functions/:functionName/layers', lambdaController.setFunctionLayers)
lambdaRouter.get('/layers', lambdaController.listLayers)
lambdaRouter.post('/layers', layerUpload.single('file'), lambdaController.publishLayer)
