import { Router } from 'express'
import * as secretsController from '../controllers/secrets.controller.js'

export const secretsRouter = Router()

secretsRouter.get('/env', secretsController.getEnv)
secretsRouter.get('/', secretsController.listSecrets)
secretsRouter.get('/:secretName', secretsController.getSecretDetail)
secretsRouter.get('/:secretName/value', secretsController.getSecretValue)
secretsRouter.put('/:secretName/value', secretsController.updateSecretValue)
secretsRouter.post('/', secretsController.createSecret)
secretsRouter.delete('/:secretName', secretsController.deleteSecret)
