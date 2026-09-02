# RUNTIME LOG-ANALYSIS SUBAGENTS

## CRITICAL DISTINCTION: IMPLEMENTATION AGENTS VS RUNTIME AGENTS

Claude Code may use implementation-time subagents to inspect, search,
understand, test, or modify the repository. That is an implementation
detail and is NOT the runtime agent architecture required by this feature.

The runtime application MUST implement actual agents/workers whose job is
to analyze REAL AWS CloudWatch Logs.

DO NOT confuse:

"Claude Code spawned agents to understand the codebase"

with:

"The application spawned runtime subagents to analyze CloudWatch logs."

These are completely separate concepts.

Implementation-time repository exploration is allowed.

Runtime Log-Analysis Subagents MUST work on real CloudWatch data and MUST
NOT exist merely as cosmetic UI labels.

The runtime flow should be:

User
  ↓
Report Agent
  ↓
Discover REAL CloudWatch Log Groups
  ↓
Retrieve REAL CloudWatch Log Events
  ↓
Dynamically spawn/assign analysis subagents
  ↓
Parallel specialist analysis where practical
  ↓
Structured findings + evidence
  ↓
Correlation / validation
  ↓
Report synthesis
  ↓
Log Intelligence UI


# 1. LOG COLLECTOR AGENT

Purpose:
Retrieve the actual CloudWatch data required for analysis.

Responsibilities:

- Query CloudWatch Logs.
- Retrieve events for the requested time range.
- Handle pagination.
- Handle multiple log streams.
- Normalize event structure.
- Preserve timestamps.
- Preserve log group names.
- Preserve log stream names.
- Preserve raw log messages.
- Preserve event identifiers where available.
- Determine whether the requested range contains data.
- Report empty/no-data states correctly.
- Report AWS/API failures separately.
- Respect query limits and execution timeouts.
- Support cancellation when the report run is cancelled.

The Log Collector Agent MUST NEVER invent, synthesize, or fabricate
CloudWatch log events.

If CloudWatch returns no events, return NO_DATA.

If CloudWatch cannot be queried, return ANALYSIS_FAILED.

Do NOT convert either state into "zero errors."


# 2. ERROR ANALYSIS AGENT

Purpose:
Identify confirmed application and infrastructure errors from collected
CloudWatch events.

Analyze for:

- ERROR
- Exception
- Unhandled exception
- Stack traces
- Fatal errors
- Panic
- Crash
- Process failure
- Explicit application failure messages
- Runtime failures

Do not rely solely on simple string matching when surrounding event
context can establish what actually happened.

Every meaningful finding must contain supporting evidence.


# 3. TIMEOUT ANALYSIS AGENT

Purpose:
Identify real timeout-related failures.

Analyze for:

- Lambda timeouts
- API request timeouts
- Database timeouts
- Connection timeouts
- Network timeouts
- Explicit timeout failures
- AWS timeout-related events
- Requests exceeding configured limits when the logs actually establish it

The agent MUST distinguish an actual timeout from a message that merely
contains the word "timeout."

Every timeout finding must contain:

- timestamp
- log group
- log stream where available
- supporting message/evidence
- classification
- occurrence count


# 4. AWS FAILURE ANALYSIS AGENT

Purpose:
Identify AWS/service-level failures.

Analyze for:

- AccessDenied
- AccessDeniedException
- Unauthorized
- UnauthorizedException
- Throttling
- ThrottlingException
- ResourceNotFound
- ResourceNotFoundException
- ValidationException
- InvalidParameter
- ServiceUnavailable
- InternalFailure
- InternalServerError
- AWS SDK/API failures

IMPORTANT:

A failure while the application is querying CloudWatch is an analysis
failure unless the application's own logs show that it is an application
failure.

Do not classify Report Agent infrastructure failures as findings in the
user's application logs.


# 5. DEPENDENCY ANALYSIS AGENT

Purpose:
Identify failures involving external or downstream dependencies.

Analyze for:

- Database failures
- Redis/cache failures
- S3 failures
- SQS failures
- SNS failures
- Downstream API failures
- Connection refused
- Connection reset
- DNS failures
- TLS/SSL errors
- Network failures
- Dependency unavailable
- Connection pool exhaustion

Use surrounding events and timestamps when useful.

Do not claim that a dependency caused a broader incident unless the
evidence supports that conclusion.


# 6. RUNTIME / RESOURCE ANALYSIS AGENT

Purpose:
Identify runtime and resource-related failures.

Analyze for:

- OutOfMemory
- OOMKilled
- Memory exhaustion
- Memory limit exceeded
- Disk exhaustion
- CPU/resource exhaustion
- Container restarts
- Unexpected process termination
- Initialization failures
- Runtime failures
- Cold-start initialization failures

Only report conditions supported by actual CloudWatch evidence.


# 7. INVOCATION / MESSAGE PROCESSING AGENT

Purpose:
Identify failures in invocation and event/message processing.

Analyze for:

- Failed invocations
- Failed event delivery
- Dead-letter queue activity
- Retry exhaustion
- Message processing failures
- Repeated processing failures
- Duplicate processing where clearly evidenced

Where possible, preserve the relationship between the event,
invocation/request identifier, and failure evidence.


# 8. PATTERN / RECURRENCE ANALYSIS AGENT

Purpose:
Identify repeated and recurring failures.

Analyze:

- Frequency
- First occurrence
- Last occurrence
- Repeated signatures
- Affected streams
- Affected resources
- Temporal clustering
- Recurrence intervals
- Increasing/decreasing frequency

Only claim recurrence when actual timestamps support it.

For example, do not claim:

"Recurring every 10 minutes"

unless the timestamps provide enough evidence to support that statement.

If there is insufficient evidence, say so.


# 9. CORRELATION AGENT

Purpose:
Connect related findings across log groups, services, resources, and
timestamps.

Example:

Lambda errors
    ↓
Database connection failures
    ↓
Request failures
    ↓
Retries
    ↓
Timeouts

The Correlation Agent should determine whether events are actually
related based on available evidence.

Every correlation must be classified as:

OBSERVED
Directly supported by the logs.

INFERRED
A reasoned relationship supported by evidence but not directly proven.

UNKNOWN
Insufficient evidence to establish the relationship.

Never present an inferred relationship as a confirmed fact.


# 10. ROOT CAUSE ANALYSIS AGENT

Purpose:
Evaluate validated findings and identify likely causes.

Inputs may include:

- Findings from specialist agents
- Raw/normalized evidence
- Timestamps
- Log groups
- Log streams
- Affected services
- Resource identifiers
- Cross-service correlations
- Recurrence information

Output should include:

Likely cause:
<description>

Confidence:
high | medium | low

Supporting evidence:
<evidence references>

The Root Cause Analysis Agent MUST NOT claim a definitive root cause
when the evidence is insufficient.

Use language such as:

"Likely cause"

or

"Evidence suggests"

when certainty is not established.


# 11. REPORT SYNTHESIS AGENT

Purpose:
Turn validated findings into the final operational report.

Responsibilities:

- Generate concise executive summary.
- Explain the most important issues.
- Rank high-impact findings.
- Summarize recurring failures.
- Identify affected services/log groups.
- Explain likely significance.
- Preserve evidence references.
- Distinguish confirmed findings from inference.
- Identify analysis failures and unavailable data.

The Report Synthesis Agent MUST NOT invent findings or numbers.

Authoritative counts MUST come from deterministic aggregation/report
data rather than AI-generated arithmetic.

The AI is responsible primarily for interpretation and explanation.


# 12. ADAPTIVE SUBAGENT ORCHESTRATION

The Report Agent decides which runtime specialist agents are necessary.

Do NOT automatically spawn every specialist for every report.

The architecture should support conditional specialist creation.

Example:

If the collected CloudWatch data contains:

- Lambda timeout events
- AccessDenied events
- Database connection failures

The Report Agent may create:

Report Agent
├── Log Collector
├── Timeout Analysis Agent
├── AWS Failure Analysis Agent
├── Dependency Analysis Agent
├── Pattern Analysis Agent
├── Correlation Agent
├── Root Cause Analysis Agent
└── Report Synthesis Agent

If no evidence relevant to memory/resource failures exists, there is no
reason to run a dedicated Runtime/Resource Analysis Agent.

The number and type of runtime subagents must therefore be determined by
the actual analysis workload.

The implementation MUST support:

1. Dynamic worker creation.
2. Parallel specialist analysis where practical.
3. Conditional specialist creation.
4. Result aggregation.
5. Cross-agent correlation.
6. Failure isolation.
7. Per-agent execution timeouts.
8. Cancellation.
9. Retry of retryable failures.
10. Final synthesis.
11. Partial report generation when some workers fail.


# 13. LOG-GROUP WORK DISTRIBUTION

The primary workload unit should remain the discovered CloudWatch log
group, consistent with the existing Report Agent architecture.

For example:

Report Agent
├── Log Group Worker: /aws/lambda/order-processor
├── Log Group Worker: /aws/lambda/payment-worker
└── Log Group Worker: /ecs/api-service

Each worker retrieves/analyzes its assigned real CloudWatch data.

Specialist analysis may then operate on the collected events either:

A. Within each log-group worker, using the appropriate specialist logic.

OR

B. As additional runtime specialist workers spawned by the Report Agent.

The exact implementation should follow the existing project's agent
architecture.

Do not create unnecessary architectural duplication if the project
already has a suitable worker/orchestration abstraction.


# 14. STRUCTURED AGENT OUTPUT

Runtime subagents MUST return structured data.

Do NOT rely on prose-only agent responses.

A specialist result should contain, where applicable:

- agentId
- agentType
- reportRunId
- logGroupName
- region
- status
- findings
- evidence
- startedAt
- completedAt
- error
- confidence

Example:

{
  "agentType": "timeout-analysis",
  "logGroupName": "/aws/lambda/order-processor",
  "status": "completed",
  "findings": [
    {
      "category": "timeout",
      "count": 47,
      "severity": "high",
      "confidence": "high",
      "evidence": [
        {
          "timestamp": "...",
          "logStreamName": "...",
          "message": "..."
        }
      ]
    }
  ]
}


# 15. AGENT FAILURE AND TIMEOUT HANDLING

Every runtime subagent must have bounded execution.

Do NOT allow:

- infinite waits
- permanently running workers
- silent failures
- swallowed exceptions
- fake successful results
- "0 errors" when analysis actually failed

Possible worker states:

QUEUED
RUNNING
COMPLETED
FAILED
TIMED_OUT
CANCELLED
NO_DATA

If a worker times out:

Agent status:
TIMED_OUT

Do not report:

"No errors detected"

unless the requested data was actually analyzed successfully.

If a worker fails:

Agent status:
FAILED

Include the actual failure reason when safe to expose.

Retry only when the failure is retryable.

Use bounded retries and backoff.


# 16. EVIDENCE CHAIN

Every important final finding must be traceable through:

Final Finding
    ↓
Specialist Agent
    ↓
Log Group Analysis
    ↓
CloudWatch Event
    ↓
Log Stream
    ↓
CloudWatch Console

The UI should make this chain inspectable.

A user should be able to determine:

WHY was this classified as a timeout?

WHERE did it happen?

WHEN did it happen?

WHICH log stream contains the evidence?

CAN I OPEN IT IN CLOUDWATCH?


# 17. NO FAKE AGENT ACTIVITY

Do not display fake agent activity such as:

"Spawned 18 agents"

unless 18 runtime workers/assignments actually existed.

Do not animate fake progress.

Do not display fake completion percentages.

Agent activity shown in the UI must come from the actual Report Run
state.

Examples of valid activity:

✓ Discovered 18 log groups
✓ Created 18 runtime analysis assignments
✓ 15 workers completed
● 2 workers running
⚠ 1 worker timed out

The activity panel must reflect actual execution state.


# 18. IMPORTANT: CLOUDWATCH IS THE SOURCE OF TRUTH

The runtime agent system is an analysis layer over CloudWatch.

CloudWatch remains the source of truth.

The agents must not manufacture:

- log events
- timestamps
- log streams
- error counts
- timeout counts
- root causes
- recurrence patterns
- affected resources

If information cannot be established from the available AWS/CloudWatch
data, explicitly mark it as:

UNKNOWN
UNAVAILABLE
ANALYSIS FAILED

rather than guessing.


# 19. IMPLEMENTATION GUIDANCE

Claude Code should first understand the existing project's:

- Agent architecture
- Orchestrator
- AWS integration
- CloudWatch integration
- API layer
- Report/Run state management
- Existing Agent Center
- Existing worker abstractions
- Existing UI component system

Claude Code may use implementation-time subagents to do this work.

However, after implementation, the application MUST contain the runtime
Report Agent + CloudWatch Log Analysis architecture described in this
section.

Do not implement the feature by simply spawning Claude Code agents to
inspect repository files.

Do not use repository inspection as a substitute for querying CloudWatch.

Do not use static JSON/mock findings as the production report source.


# 20. FINAL RUNTIME ARCHITECTURE

The intended architecture is:

                         ORCHESTRATOR
                              │
                              ▼
                       ┌─────────────┐
                       │ REPORT AGENT│
                       └──────┬──────┘
                              │
                       Discover Log Groups
                              │
                              ▼
                       LOG COLLECTOR
                              │
                       REAL CLOUDWATCH
                           EVENTS
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
      TIMEOUT             ERROR/AWS          DEPENDENCY/
      ANALYSIS             ANALYSIS            RUNTIME
       AGENTS               AGENTS              AGENTS
          │                   │                    │
          └───────────────────┼────────────────────┘
                              ▼
                    PATTERN / RECURRENCE
                              │
                              ▼
                       CORRELATION AGENT
                              │
                              ▼
                     ROOT CAUSE AGENT
                              │
                              ▼
                    REPORT SYNTHESIS AGENT
                              │
                              ▼
                       FINAL REPORT UI

The Report Agent controls the mission.

The Log Collector retrieves real data.

Specialist agents analyze the data.

Correlation connects related evidence.

Root Cause evaluates supported explanations.

Report Synthesis creates the human-readable report.

The UI exposes the result and the evidence chain.

CloudWatch remains the source of truth.

Build this as a real runtime multi-agent log-analysis system, not as a
demo and not as a collection of cosmetic agent labels.
