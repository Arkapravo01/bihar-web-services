import { ApiGatewayOverviewPage } from './pages/ApiGatewayOverviewPage'
import { ApiGatewayDetailPage } from './pages/ApiGatewayDetailPage'

export const apigatewayRoutes = [
  { path: '/apigateway', element: <ApiGatewayOverviewPage /> },
  { path: '/apigateway/:apiId', element: <ApiGatewayDetailPage /> },
]
