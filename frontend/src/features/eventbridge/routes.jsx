import { EventBridgeOverviewPage } from './pages/EventBridgeOverviewPage'
import { EventBridgeRuleDetailPage } from './pages/EventBridgeRuleDetailPage'

export const eventbridgeRoutes = [
  { path: '/eventbridge', element: <EventBridgeOverviewPage /> },
  { path: '/eventbridge/buses/:eventBusName/rules/:ruleName', element: <EventBridgeRuleDetailPage /> },
]
