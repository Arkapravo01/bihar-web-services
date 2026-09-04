import { Router } from "express";
import { iamRouter } from "./iam.routes.js";
import { s3Router } from "./s3.routes.js";
import { cloudwatchRouter } from "./cloudwatch.routes.js";
import { lambdaRouter } from "./lambda.routes.js";
import { secretsRouter } from "./secrets.routes.js";
import { rdsRouter } from "./rds.routes.js";
import { ecsRouter } from "./ecs.routes.js";
import { eventbridgeRouter } from "./eventbridge.routes.js";
import { glueRouter } from "./glue.routes.js";
import { agentRouter } from "./agent.routes.js";
import { reportRouter } from "./report.routes.js";
import { apiGatewayRouter } from "./apigateway.routes.js";

export const apiRouter = Router();

apiRouter.use("/iam", iamRouter);
apiRouter.use("/s3", s3Router);
apiRouter.use("/cloudwatch", cloudwatchRouter);
apiRouter.use("/lambda", lambdaRouter);
apiRouter.use("/secrets", secretsRouter);
apiRouter.use("/rds", rdsRouter);
apiRouter.use("/ecs", ecsRouter);
apiRouter.use("/eventbridge", eventbridgeRouter);
apiRouter.use("/glue", glueRouter);
apiRouter.use("/agent", agentRouter);
apiRouter.use("/report", reportRouter);
apiRouter.use("/apigateway", apiGatewayRouter);
