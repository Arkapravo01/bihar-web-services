import express from 'express'
import cors from 'cors'
import { PORT } from './config/env.js'
import { AWS_REGION, S3_PROFILE, CLOUDWATCH_PROFILE, IAM_PROFILE, LAMBDA_PROFILE } from './config/aws.js'
import { requestIdMiddleware } from './middleware/requestId.middleware.js'
import { loggingMiddleware } from './middleware/logging.middleware.js'
import { errorMiddleware } from './middleware/error.middleware.js'
import { apiRouter } from './routes/index.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use(requestIdMiddleware)
app.use(loggingMiddleware)
app.use('/api', apiRouter)
app.use(errorMiddleware)

app.listen(PORT, () => {
  console.log(
    `[bihar-web-services] backend on http://localhost:${PORT} | region: ${AWS_REGION} | s3: ${S3_PROFILE} | cloudwatch: ${CLOUDWATCH_PROFILE} | iam: ${IAM_PROFILE} | lambda: ${LAMBDA_PROFILE}`
  )
})
