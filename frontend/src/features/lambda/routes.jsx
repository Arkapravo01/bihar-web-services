import { LambdaOverviewPage } from './pages/LambdaOverviewPage'
import { LambdaFunctionDetailPage } from './pages/LambdaFunctionDetailPage'

export const lambdaRoutes = [
  { path: '/lambda', element: <LambdaOverviewPage /> },
  { path: '/lambda/functions/:functionName', element: <LambdaFunctionDetailPage /> },
]
