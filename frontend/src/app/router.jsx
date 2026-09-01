import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { iamRoutes } from "@/features/iam";
import { secretsRoutes } from "@/features/secrets";
import { s3Routes } from "@/features/s3";
import { cloudwatchRoutes } from "@/features/cloudwatch";
import { lambdaRoutes } from "@/features/lambda";
import { rdsRoutes } from "@/features/rds";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/iam" replace /> },
      ...iamRoutes,
      ...secretsRoutes,
      ...s3Routes,
      ...cloudwatchRoutes,
      ...lambdaRoutes,
      ...rdsRoutes,
    ],
  },
]);
