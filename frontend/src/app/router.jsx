import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { iamRoutes } from "@/features/iam";
import { s3Routes } from "@/features/s3";
import { cloudwatchRoutes } from "@/features/cloudwatch";
import { lambdaRoutes } from "@/features/lambda";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/iam" replace /> },
      ...iamRoutes,
      ...s3Routes,
      ...cloudwatchRoutes,
      ...lambdaRoutes,
    ],
  },
]);
