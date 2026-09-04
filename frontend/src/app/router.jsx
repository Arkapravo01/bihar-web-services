import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { orchestratorRoutes } from "@/features/orchestrator";
import { iamRoutes } from "@/features/iam";
import { secretsRoutes } from "@/features/secrets";
import { s3Routes } from "@/features/s3";
import { cloudwatchRoutes } from "@/features/cloudwatch";
import { lambdaRoutes } from "@/features/lambda";
import { rdsRoutes } from "@/features/rds";
import { ecsRoutes } from "@/features/ecs";
import { eventbridgeRoutes } from "@/features/eventbridge";
import { glueRoutes } from "@/features/glue";
import { logIntelligenceRoutes } from "@/features/log-intelligence";
import { apigatewayRoutes } from "@/features/apigateway";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/agent-center" replace /> },
      ...orchestratorRoutes,
      ...iamRoutes,
      ...secretsRoutes,
      ...s3Routes,
      ...cloudwatchRoutes,
      ...lambdaRoutes,
      ...rdsRoutes,
      ...ecsRoutes,
      ...eventbridgeRoutes,
      ...glueRoutes,
      ...logIntelligenceRoutes,
      ...apigatewayRoutes,
    ],
  },
]);
