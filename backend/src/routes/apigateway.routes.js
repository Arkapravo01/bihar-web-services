import { Router } from 'express'
import * as apiGatewayController from '../controllers/apigateway.controller.js'

export const apiGatewayRouter = Router()

apiGatewayRouter.get('/env',                              apiGatewayController.getEnv)
apiGatewayRouter.get('/',                                 apiGatewayController.listApis)
apiGatewayRouter.get('/:apiId',                          apiGatewayController.getApiDetail)
apiGatewayRouter.get('/:apiId/stages',                   apiGatewayController.listStages)
apiGatewayRouter.get('/:apiId/resources',                        apiGatewayController.listResources)
apiGatewayRouter.get('/:apiId/deployments',                      apiGatewayController.listDeployments)
apiGatewayRouter.post('/:apiId/resources/:resourceId/test',      apiGatewayController.testInvokeMethod)
