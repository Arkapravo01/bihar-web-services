export const NAV_MODULES = [
  { id: "agent-center", label: "Agent Center", href: "/agent-center", enabled: true },
  { id: "iam", label: "IAM", href: "/iam", enabled: true },
  { id: "secrets", label: "Secrets Manager", href: "/secrets", enabled: true },
  { id: "s3", label: "S3", href: "/s3", enabled: true },
  { id: "cloudwatch", label: "CloudWatch", href: "/cloudwatch", enabled: true },
  { id: "lambda", label: "Lambda", href: "/lambda", enabled: true },
  { id: "rds", label: "RDS", href: "/rds", enabled: true },
  { id: "ecs", label: "ECS / ECR", href: "#", enabled: false },
  { id: "api-gateway", label: "API Gateway", href: "#", enabled: false },
  { id: "eventbridge", label: "EventBridge", href: "#", enabled: false },
];

export const NAV_AI_MODULES = [
  { id: "incidents", label: "Incidents", href: "#", enabled: false },
  { id: "rca", label: "RCA", href: "#", enabled: false },
  { id: "agents", label: "Agents", href: "#", enabled: false },
  { id: "approvals", label: "Approvals", href: "#", enabled: false },
];
