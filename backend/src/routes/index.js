import { Router } from "express";
import { iamRouter } from "./iam.routes.js";
import { s3Router } from "./s3.routes.js";
import { cloudwatchRouter } from "./cloudwatch.routes.js";
import { lambdaRouter } from "./lambda.routes.js";
import { agentRouter } from "./agent.routes.js";

export const apiRouter = Router();

apiRouter.use("/iam", iamRouter);
apiRouter.use("/s3", s3Router);
apiRouter.use("/cloudwatch", cloudwatchRouter);
apiRouter.use("/lambda", lambdaRouter);
apiRouter.use("/agent", agentRouter);
