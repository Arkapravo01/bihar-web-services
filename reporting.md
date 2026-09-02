# Ultimate Project --- CloudWatch Log Intelligence & Reporting

## Implementation Specification for Claude Code

> **Goal:** Add a polished **Log Reporting / Log Intelligence** page to
> the existing Ultimate Project AWS console. The page must use a **main
> Report Agent** that can dynamically spawn **as many specialized
> log-analysis subagents as required**, analyze real CloudWatch Logs,
> aggregate their findings, and present a clean operational report for
> the **last 24 hours** and **last 7 days**.
>
> **Important:** This is not a mock analytics page. Do not manufacture
> incidents, timeouts, errors, counts, log streams, or findings. Every
> reported finding must come from real AWS/CloudWatch data or be
> explicitly marked as unavailable.

------------------------------------------------------------------------

# 1. Product Intent

The existing Ultimate Project is an agentic AWS operations platform with
a central Orchestrator and service-specific agents.

Add a new page in the existing **sidebar navigation**:

**Log Intelligence**\
or\
**Log Reports**

Recommended label:

> **Log Intelligence**

Recommended icon: a terminal/log/search/chart-style icon that matches
the existing icon system.

This page is intended to answer, at a glance:

-   What went wrong in the last 24 hours?
-   What went wrong in the last 7 days?
-   Which services/log groups are affected?
-   What are the real error categories?
-   Which failures are recurring?
-   Which log streams contain the evidence?
-   How severe are the findings?
-   Can I jump directly to the relevant CloudWatch log stream?
-   Which log groups have been analyzed?
-   Did the Report Agent successfully analyze everything?
-   Are there still log groups that could not be analyzed?

The page should feel like a **production-grade operations intelligence
console**, not a generic AI dashboard.

------------------------------------------------------------------------

# 2. Core Architecture

## 2.1 Main Report Agent

Create a top-level **Report Agent** responsible for the complete
reporting mission.

The Report Agent should:

1.  Discover the relevant CloudWatch log groups.
2.  Determine how many log groups need analysis.
3.  Dynamically create/spawn subagents.
4.  Assign log groups to subagents.
5.  Allow parallel analysis where practical.
6.  Collect structured findings from every subagent.
7.  Validate and normalize findings.
8.  Deduplicate repeated evidence where appropriate.
9.  Categorize failures.
10. Aggregate counts and trends.
11. Identify the highest-impact findings.
12. Produce the final report consumed by the UI.
13. Preserve evidence references for every important finding.
14. Clearly distinguish:

-   confirmed finding
-   warning
-   informational event
-   analysis failure
-   unavailable data

### Critical requirement

**Do not hard-code a fixed number of subagents.**

The system must support:

``` text
1 log group       → 1 subagent
5 log groups      → 5 subagents
20 log groups     → as many as needed
100 log groups    → dynamically managed workers
```

The implementation may use concurrency limits for AWS/API safety, but
the **logical agent model must remain dynamic**.

Do not create arbitrary fake agents such as "Agent 1", "Agent 2", etc.
Each worker should have a meaningful assignment, for example:

``` text
CloudWatch Report Agent
 ├── Lambda /aws/lambda/order-processor
 ├── Lambda /aws/lambda/payment-worker
 ├── ECS /ecs/api-service
 ├── API Gateway /aws/apigateway/prod
 └── Application /myapp/production
```

If the platform already has an Agent Center, the Report Agent should
appear there as a real agent and its spawned workers should be
represented consistently with the existing agent architecture.

------------------------------------------------------------------------

# 3. Agent Hierarchy

Recommended model:

``` text
                         ┌───────────────────────┐
                         │     ORCHESTRATOR      │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │     REPORT AGENT      │
                         │  "Log Intelligence"   │
                         └───────────┬───────────┘
                                     │
                         Discover log groups
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
        ┌────────────┐        ┌────────────┐        ┌────────────┐
        │ Log Worker │        │ Log Worker │        │ Log Worker │
        │ Group A    │        │ Group B    │        │ Group C    │
        └─────┬──────┘        └─────┬──────┘        └─────┬──────┘
              │                     │                     │
              ▼                     ▼                     ▼
         CloudWatch             CloudWatch             CloudWatch
         log events             log events             log events
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                         ┌───────────────────────┐
                         │     REPORT AGENT      │
                         │ Aggregate + Validate  │
                         └───────────┬───────────┘
                                     ▼
                         ┌───────────────────────┐
                         │   LOG INTELLIGENCE    │
                         │        REPORT         │
                         └───────────────────────┘
```

------------------------------------------------------------------------

# 4. Dynamic Subagent Strategy

The Report Agent must be able to decide how to divide work.

## Preferred strategy

For each discovered log group, create a logical worker assignment.

A worker should receive:

``` text
logGroupName
awsRegion
timeRange
analysisMode
reportRunId
```

Example:

``` json
{
  "logGroupName": "/aws/lambda/order-processor",
  "region": "eu-west-1",
  "timeRange": "24h",
  "analysisMode": "full",
  "reportRunId": "report-2026-09-02-1530"
}
```

The worker must return structured data rather than a prose-only
response.

------------------------------------------------------------------------

# 5. Worker Responsibilities

Each log-analysis subagent should:

## Step 1 --- Identify available data

Determine:

-   log group
-   region
-   earliest available event
-   latest available event
-   number of streams if obtainable
-   event volume if obtainable
-   whether the requested time range contains data

## Step 2 --- Analyze real events

Look for actual operational failures including, but not limited to:

### Error categories

-   Timeout
-   Request timeout
-   Lambda timeout
-   API timeout
-   Connection timeout
-   Database timeout
-   Network timeout

### Application failures

-   ERROR
-   Exception
-   Unhandled exception
-   Fatal
-   Panic
-   Stack trace
-   Crash
-   Process exited
-   Container stopped unexpectedly

### AWS/service failures

-   AccessDenied
-   AccessDeniedException
-   Unauthorized
-   Throttling
-   ThrottlingException
-   ResourceNotFound
-   ResourceNotFoundException
-   ValidationException
-   InvalidParameter
-   ServiceUnavailable
-   InternalFailure
-   InternalServerError

### Dependency failures

-   Connection refused
-   Connection reset
-   DNS failure
-   TLS/SSL errors
-   database connection errors
-   Redis/cache failures
-   SQS failures
-   SNS failures
-   S3 failures
-   downstream API failures

### Infrastructure/runtime failures

-   OutOfMemory
-   OOMKilled
-   memory limit exceeded
-   disk full
-   CPU/resource exhaustion
-   container restart
-   initialization failure
-   runtime failure
-   cold-start initialization failure

### Event/message failures

-   failed invocation
-   failed delivery
-   dead-letter queue activity
-   retry exhaustion
-   message processing failure
-   duplicate processing where clearly evidenced

Do not limit the implementation to string matching.

Use structured AWS metadata and contextual log events whenever possible.

------------------------------------------------------------------------

# 6. No Fake Errors

This is one of the most important requirements.

**NEVER invent an error just because a log group exists.**

Do not display:

``` text
12 timeouts
7 failures
3 exceptions
```

unless those findings were actually detected in CloudWatch.

If there are zero errors:

> **No confirmed errors detected**

That is a valid and valuable result.

If CloudWatch data could not be queried:

> **Analysis unavailable --- CloudWatch query failed**

Do not turn an AWS/API failure into an application error.

The UI must distinguish:

``` text
CONFIRMED ERROR
ANALYSIS WARNING
NO ERRORS
ANALYSIS FAILED
NO DATA
```

------------------------------------------------------------------------

# 7. Finding Data Model

Use a structured finding model similar to:

``` typescript
type LogFinding = {
  id: string

  category:
    | "timeout"
    | "exception"
    | "access_denied"
    | "throttling"
    | "resource_not_found"
    | "connection"
    | "database"
    | "network"
    | "runtime"
    | "memory"
    | "invocation"
    | "dependency"
    | "application"
    | "other"

  severity: "critical" | "high" | "medium" | "low" | "info"

  title: string

  summary: string

  count: number

  firstSeen: string
  lastSeen: string

  logGroupName: string
  logStreamName?: string

  region: string

  eventTimestamp?: string

  evidence?: {
    message: string
    timestamp: string
  }[]

  cloudWatchUrl?: string

  sourceAgentId: string

  confidence?: "high" | "medium" | "low"
}
```

The exact implementation can adapt to the existing codebase's types.

------------------------------------------------------------------------

# 8. Evidence Is Mandatory

Every meaningful finding must retain evidence.

For example:

``` text
TIMEOUT
AWS Lambda order-processor
47 occurrences

First seen:
02 Sep 2026 09:14:22

Last seen:
02 Sep 2026 14:51:08

Evidence:
Task timed out after 30.00 seconds

Log stream:
2026/09/02/[$LATEST]abc123...

[Open in CloudWatch]
```

Clicking the finding should expose enough information for an operator to
understand **why the system classified it as a timeout**.

Do not create opaque AI summaries with no supporting evidence.

------------------------------------------------------------------------

# 9. CloudWatch Deep Links

This is a core interaction.

Every finding that has a known log stream must have:

> **Open in CloudWatch**

or a compact external-link icon.

The link should take the user directly to the **existing CloudWatch
Console log stream**, not merely to the CloudWatch home page.

Construct the URL using the actual:

-   AWS region
-   log group
-   log stream

Use proper AWS CloudWatch console URL encoding.

Example conceptual destination:

``` text
CloudWatch
  → Logs
    → Log groups
      → Specific log group
        → Specific log stream
```

Do not hard-code a single AWS region.

Do not hard-code account IDs.

Use the currently configured AWS account/region context where
appropriate.

If the exact stream cannot be determined, fall back gracefully to the
closest useful CloudWatch destination and label it accurately.

------------------------------------------------------------------------

# 10. Report Time Ranges

The page must support at minimum:

## Last 24 Hours

Primary operational view.

Show:

-   total findings
-   critical/high findings
-   timeouts
-   exceptions
-   throttles
-   access failures
-   affected log groups
-   top recurring failures
-   latest incidents

## Last 7 Days

Trend/operational history view.

Show:

-   total findings
-   daily trend
-   recurring categories
-   most affected log groups
-   repeated failures
-   first/last seen
-   changes compared with the previous period if the data supports it

Use a segmented control:

``` text
[ 24 Hours ] [ 7 Days ]
```

The selected period should update the entire report consistently.

------------------------------------------------------------------------

# 11. Recommended Page Layout

The page should feel like a serious **operations intelligence console**.

Avoid the generic:

``` text
Card
Card
Card
Chart
Table
```

look.

Use hierarchy, density, whitespace, subtle borders, and purposeful
interactions.

------------------------------------------------------------------------

## Header

Top area:

``` text
Log Intelligence

AI-generated operational report from CloudWatch Logs

[24 Hours] [7 Days]       Last updated 14:58:21
                          [Refresh]
```

Also show agent status:

``` text
● Report Agent
  Analyzing 18 log groups
```

or:

``` text
✓ Report Agent
  Analysis complete
```

------------------------------------------------------------------------

# 12. Executive Summary

At the top, provide a concise AI-generated summary.

Example:

> **System health is mostly stable.** 4 log groups produced confirmed
> failures in the last 24 hours. The dominant issue was Lambda timeout
> activity in `order-processor`, accounting for 71% of detected
> failures. Two access-denied events were also detected in the payment
> workflow.

Keep this short.

Do not let the AI generate huge walls of text.

The summary should answer:

1.  Is anything wrong?
2.  What is the biggest issue?
3.  Where is it happening?
4.  Is it recurring?
5.  What should the operator investigate first?

------------------------------------------------------------------------

# 13. KPI Strip

Use compact operational metrics.

Recommended:

``` text
┌─────────────────┐
│ Total Findings  │
│      143        │
│  +18% vs prior  │
└─────────────────┘

┌─────────────────┐
│ Critical        │
│       3         │
└─────────────────┘

┌─────────────────┐
│ Timeouts        │
│      61         │
└─────────────────┘

┌─────────────────┐
│ Affected Groups │
│       7         │
└─────────────────┘
```

Only show comparisons when the underlying data exists.

------------------------------------------------------------------------

# 14. Error Category Explorer

This should be one of the main visual components.

Display categories such as:

``` text
Timeouts             61
Exceptions           39
Access Denied        17
Throttling            9
Connection Errors     8
Other                 9
```

Categories should be **clickable**.

When the user clicks:

> Timeouts

the report filters to timeout findings.

Do not merely navigate away.

The UI should make the interaction feel immediate.

------------------------------------------------------------------------

# 15. Severity Breakdown

Use clear severity indicators:

``` text
Critical    3
High       14
Medium     47
Low        79
```

Severity must be based on real evidence/rules, not arbitrary decoration.

Suggested reasoning:

### Critical

-   widespread production failure
-   repeated service outage indicators
-   severe runtime/resource failure
-   high-confidence system-wide impact

### High

-   repeated production failures
-   persistent timeout/connection failures
-   important dependency failure

### Medium

-   isolated but meaningful application failure

### Low

-   isolated non-impacting error

The exact classification should remain configurable.

------------------------------------------------------------------------

# 16. Trend Visualization

For 24-hour mode:

Show failures across time.

Example:

``` text
Failures
 ^
 |                    ╭╮
 |             ╭╮     ││
 |       ╭╮    ││  ╭──╯│
 |  ╭────╯╰────╯╰──╯   ╰──
 +--------------------------------> time
```

Allow the user to see:

-   total errors
-   timeout count
-   exception count
-   throttling count

Use a clean interactive chart.

For 7-day mode:

``` text
Mon   Tue   Wed   Thu   Fri   Sat   Sun
 12    19    8     44    21    9     30
```

Hovering should show exact counts.

------------------------------------------------------------------------

# 17. Top Issues

Create a ranked section:

``` text
TOP ISSUES

01  Lambda timeout
    /aws/lambda/order-processor
    61 occurrences
    Last seen 14:51
    [Open]

02  Access denied
    /aws/lambda/payment-worker
    17 occurrences
    Last seen 13:22
    [Open]

03  Database connection failure
    /ecs/api-service
    8 occurrences
    Last seen 11:42
    [Open]
```

This is likely one of the most useful sections for a senior manager.

------------------------------------------------------------------------

# 18. Log Group Analysis

Provide a view of all analyzed groups.

Example:

  Log Group                       Status      Findings   Critical Last Event
  ------------------------------- --------- ---------- ---------- ------------
  `/aws/lambda/order-processor`   Issues            61          2 14:51
  `/aws/lambda/payment-worker`    Issues            17          1 13:22
  `/ecs/api-service`              Healthy            0          0 14:57

Status should be:

-   Healthy
-   Issues
-   Critical
-   No Data
-   Analysis Failed
-   Analyzing

Clicking a row should open that log group's detailed analysis.

------------------------------------------------------------------------

# 19. Finding Detail Drawer

When a user clicks a category or issue, do **not** immediately send them
to another page.

Open a right-side detail drawer or sheet.

Recommended structure:

``` text
TIMEOUTS

61 occurrences
7 affected log groups

────────────────────────

Top affected resources

order-processor       47
payment-worker          9
notification-worker    5

────────────────────────

Latest evidence

14:51:08
/aws/lambda/order-processor

Task timed out after 30.00 seconds

Log stream:
2026/09/02/[$LATEST]/abc123

[Open in CloudWatch]

────────────────────────

First seen
09:14:22

Last seen
14:51:08

Frequency
Recurring
```

Use the existing project's drawer/sheet/modal components if available.

------------------------------------------------------------------------

# 20. Agent Activity Panel

Because this is an agentic platform, the user should be able to see what
the Report Agent is doing.

Include a collapsible section:

``` text
REPORT AGENT ACTIVITY

✓ Discovered 18 log groups
✓ Spawned 18 analysis workers
✓ 18/18 workers completed
✓ Aggregated 143 findings
✓ Generated final report

Workers

✓ order-processor
✓ payment-worker
✓ api-service
✓ notification-worker
...
```

During execution:

``` text
● Report Agent

Analyzing 11 / 18 log groups

██████████████░░░░ 61%

Current:
payment-worker
```

This makes the multi-agent architecture visible without making it
annoying.

------------------------------------------------------------------------

# 21. Agent Communication Visualization

If the existing Agent Center already has the communication graph, do not
duplicate the entire graph here.

Instead provide a compact link/card:

``` text
REPORT AGENT

18 workers
143 findings
100% complete

[View Agent Mission Control →]
```

If appropriate, clicking this should open the existing Agent Center with
the relevant report run selected.

------------------------------------------------------------------------

# 22. Refresh / Run Report

Provide:

``` text
[Run Analysis]
```

or:

``` text
[Refresh Report]
```

A run should create a report execution ID.

Example:

``` text
report-2026-09-02-1542
```

The UI should show:

``` text
Started 15:42
Completed 15:43
18 log groups
18 workers
143 findings
```

Avoid re-running expensive analysis unnecessarily.

------------------------------------------------------------------------

# 23. Loading States

Do not show a blank page while analysis is running.

Use polished skeleton/loading states.

Example:

``` text
Log Intelligence

Report Agent is analyzing your CloudWatch logs...

[████████████████░░░░]

12 / 18 log groups

Current:
Analyzing /aws/lambda/payment-worker
```

Use skeleton components for:

-   KPI cards
-   charts
-   tables
-   summary
-   issue list

Avoid ugly full-screen spinners.

------------------------------------------------------------------------

# 24. Empty States

If no errors exist:

``` text
✓ No confirmed failures detected

CloudWatch logs were analyzed across 18 log groups
for the selected time range.

Last analysis:
2 minutes ago
```

This should feel like a successful operational result.

Do not show:

``` text
No data
```

when there was data and no errors.

Those are different states.

------------------------------------------------------------------------

# 25. Error States

If AWS access fails:

``` text
Unable to complete log analysis

The Report Agent could not query:
  /aws/lambda/payment-worker

Reason:
  AccessDeniedException

[Retry]
```

Do not silently return zero.

Do not convert infrastructure/query errors into "no errors."

------------------------------------------------------------------------

# 26. Filtering

Provide powerful but clean filters:

``` text
Search findings...

[Severity]
[Category]
[Log Group]
[Region]
[Time]
```

Possible filters:

-   Critical
-   High
-   Medium
-   Low
-   Timeout
-   Exception
-   Access Denied
-   Throttling
-   Connection
-   Runtime
-   Memory
-   Application
-   etc.

Filters should update the visible report immediately.

------------------------------------------------------------------------

# 27. Search

Provide a global search field for the report.

Users should be able to search:

``` text
timeout
order-processor
AccessDenied
database
2026/09/02/[$LATEST]
```

Search should work across:

-   finding title
-   category
-   log group
-   stream
-   evidence
-   summary

------------------------------------------------------------------------

# 28. Data Integrity

Every number displayed must come from the report data.

For example:

``` text
Timeouts: 61
```

must be derived from actual findings.

Avoid AI-generated arithmetic.

The backend should calculate:

-   totals
-   category counts
-   severity counts
-   affected groups
-   time-series counts
-   first/last occurrence

The AI should primarily be responsible for:

-   interpretation
-   summarization
-   grouping contextual information
-   explaining likely significance

------------------------------------------------------------------------

# 29. AI Summary Guardrails

The Report Agent must not claim certainty that the logs do not support.

Bad:

> "The database caused the outage."

Better:

> "The logs show repeated database connection failures coinciding with
> the application errors."

If root cause is not proven:

> **Likely cause:** Database connectivity failure\
> **Confidence:** Medium

Always distinguish:

``` text
Observed
Inferred
Unknown
```

------------------------------------------------------------------------

# 30. Deduplication

A single failure may produce many log events.

Do not blindly display:

``` text
10,000 identical timeout cards
```

Instead:

``` text
Lambda timeout
10,000 occurrences
First seen ...
Last seen ...
Affected streams: 4

[View evidence]
```

Group repeated events using meaningful signatures such as:

-   normalized error message
-   exception type
-   category
-   resource
-   service
-   log group

Keep raw evidence accessible.

------------------------------------------------------------------------

# 31. Recurring Issue Detection

The report should identify recurring failures.

Example:

``` text
RECURRING ISSUE

Lambda timeout
47 occurrences
Detected across 4 execution streams
First seen 09:14
Last seen 14:51

Pattern:
Recurring every ~8–12 minutes
```

Only calculate recurrence when the actual timestamps support it.

Do not invent patterns.

------------------------------------------------------------------------

# 32. 24h vs 7d Comparison

When switching from 24h to 7d, preserve the same visual hierarchy.

7-day mode should add:

``` text
Trend
Recurring issues
Most affected log groups
Daily distribution
```

Optional comparison:

``` text
Previous 7 days
vs
Current 7 days
```

Only implement this if sufficient historical data exists.

------------------------------------------------------------------------

# 33. UI Design Direction

The page must look **premium, technical, calm, and operational**.

Think:

-   AWS console intelligence
-   modern observability platform
-   AI mission control
-   high-end developer tooling
-   production incident dashboard

Avoid:

-   excessive gradients
-   huge glowing AI blobs
-   generic "AI magic" visuals
-   excessive rounded cards
-   random colorful icons
-   fake terminal animations
-   meaningless decorative charts

The UI should communicate:

> **This is a serious tool an engineer can trust during an incident.**

------------------------------------------------------------------------

# 34. Recommended Component System

If the project already uses a component library/design system, **reuse
it**.

Do not introduce an unrelated visual system.

If the existing project is React/Tailwind/shadcn-based, use the
project's existing shadcn primitives and extend them rather than
creating one-off components. The official shadcn ecosystem provides
dashboard blocks with sidebars, charts, and data tables, plus composable
chart and table primitives.
citeturn0search0turn0search15turn0search6

Useful component patterns include:

-   Card
-   Badge
-   Tabs
-   Tooltip
-   Dropdown
-   Command/Search
-   Sheet/Drawer
-   Table
-   Progress
-   Skeleton
-   Alert
-   Separator
-   Collapsible
-   Chart

Do not blindly install a new library if the project already has
equivalent components.

------------------------------------------------------------------------

# 35. Visual Hierarchy

Recommended page order:

``` text
┌─────────────────────────────────────────────────────────────┐
│ LOG INTELLIGENCE                           [24h] [7d]       │
│ AI-powered CloudWatch operational reporting                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ EXECUTIVE SUMMARY                                           │
│ "System mostly stable..."                                   │
│                                                             │
├────────────┬────────────┬────────────┬──────────────────────┤
│ Findings   │ Critical   │ Timeouts   │ Affected Groups      │
├────────────┴────────────┴────────────┴──────────────────────┤
│                                                             │
│ ERROR TRENDS                          SEVERITY               │
│                                                             │
├───────────────────────────────────────┬─────────────────────┤
│ TOP ISSUES                            │ CATEGORIES           │
│                                       │                      │
├───────────────────────────────────────┴─────────────────────┤
│                                                             │
│ LOG GROUP ANALYSIS                                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ REPORT AGENT ACTIVITY                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The most important information should appear above the fold.

------------------------------------------------------------------------

# 36. Sidebar Integration

**This page MUST be added to the existing application sidebar.**

Do not create a separate navigation system.

Recommended location:

``` text
Ultimate Project
│
├── Overview
├── S3
├── Lambda
├── RDS
├── CloudWatch
├── IAM
├── EC2
├── ECS / ECR
├── API Gateway
├── SQS / SNS
├── EventBridge
│
├── Log Intelligence   ← NEW
│
├── Resource Explorer
├── Architecture Map
├── Incident Console
├── RCA Factory
├── Agent Center
└── Approval Center
```

The exact ordering should respect the existing sidebar conventions.

Use the existing sidebar component, active-state behavior, permissions,
routing, and responsive behavior.

------------------------------------------------------------------------

# 37. Routing

Add a dedicated route consistent with the project's routing conventions.

Recommended conceptual route:

``` text
/log-intelligence
```

Do not assume this exact route if the application has an established
routing pattern.

The sidebar item must navigate to the page without breaking existing
routes.

------------------------------------------------------------------------

# 38. Backend / AWS Integration

Use the existing AWS integration architecture.

Do not create a second credential system.

Reuse:

-   existing AWS account context
-   region selection
-   credential handling
-   AWS SDK configuration
-   existing API layer
-   existing logging utilities
-   existing error handling

The Report Agent should use real CloudWatch Logs APIs.

Potential AWS operations include:

-   describe log groups
-   describe log streams
-   filter/query log events
-   retrieve relevant log events
-   obtain timestamps and stream identifiers

Use the project's existing AWS SDK version and patterns.

Do not blindly add another SDK version.

------------------------------------------------------------------------

# 39. Query Efficiency

Do not fetch every historical log event from every stream if avoidable.

The report system should:

1.  discover log groups
2.  define the selected time range
3.  query/filter relevant events
4.  analyze relevant evidence
5.  aggregate findings

Prefer server-side filtering/querying where available.

Respect AWS API limits.

Use:

-   pagination
-   bounded concurrency
-   retries with backoff
-   cancellation
-   timeouts
-   caching where appropriate

The user should not be able to accidentally trigger an unbounded
CloudWatch scan.

------------------------------------------------------------------------

# 40. Worker Failure Isolation

If one subagent fails:

``` text
18 workers
17 successful
1 failed
```

the entire report should still be usable.

Show:

``` text
Analysis completed with warnings

17 / 18 log groups analyzed successfully

1 log group could not be analyzed:
payment-worker

[View details]
[Retry failed group]
```

Never discard all successful results because one worker failed.

------------------------------------------------------------------------

# 41. Report Run Lifecycle

Model a report run:

``` text
QUEUED
   ↓
DISCOVERING
   ↓
SPAWNING_WORKERS
   ↓
ANALYZING
   ↓
AGGREGATING
   ↓
GENERATING_SUMMARY
   ↓
COMPLETE
```

Failure:

``` text
ANALYZING
   ↓
PARTIAL
```

or:

``` text
FAILED
```

The UI should reflect this lifecycle.

------------------------------------------------------------------------

# 42. Report Run Metadata

Keep:

``` typescript
type ReportRun = {
  id: string
  startedAt: string
  completedAt?: string

  status:
    | "queued"
    | "discovering"
    | "analyzing"
    | "aggregating"
    | "complete"
    | "partial"
    | "failed"

  timeRange: "24h" | "7d"

  logGroupsDiscovered: number
  workersSpawned: number
  workersCompleted: number
  workersFailed: number

  findingCount: number
}
```

This makes the agent activity UI straightforward.

------------------------------------------------------------------------

# 43. Performance Expectations

The UI should remain responsive while analysis happens.

Do not block the browser waiting for every worker if the existing
architecture supports asynchronous progress.

Preferred behavior:

``` text
Start report
     ↓
Backend creates run
     ↓
UI receives run ID
     ↓
Workers analyze
     ↓
UI receives/polls/subscribes to progress
     ↓
Final report appears
```

Use the project's existing real-time/event mechanism if one exists.

Do not introduce WebSockets solely for this feature if the project does
not already use them unless genuinely necessary.

------------------------------------------------------------------------

# 44. Responsive Design

Desktop is the primary target because this is an operations console.

Still support:

-   tablet
-   smaller laptop
-   responsive sidebar
-   responsive charts
-   horizontally scrollable dense tables where necessary
-   drawers that become full-screen sheets on small displays

Do not allow important data to simply disappear on smaller screens.

------------------------------------------------------------------------

# 45. Accessibility

Use accessible:

-   buttons
-   links
-   tabs
-   dialogs
-   drawers
-   tooltips
-   tables
-   status indicators

Do not communicate status using color alone.

For example:

``` text
● Critical
```

should also have text.

Keyboard navigation should work for major interactions.

------------------------------------------------------------------------

# 46. Dark Mode

The page should look excellent in the existing dark theme if the
application supports dark mode.

Do not make a separate dark-mode design.

Use the existing design tokens.

The interface should remain readable at 2 AM during an incident.

Avoid low-contrast gray-on-gray text.

------------------------------------------------------------------------

# 47. Microinteractions

Use restrained motion.

Good:

-   subtle progress animation
-   drawer transition
-   hover state
-   chart tooltip
-   row highlight
-   agent activity status
-   skeleton shimmer if already used by the project

Avoid:

-   constant pulsing
-   aggressive glowing
-   animated backgrounds
-   unnecessary particle effects
-   excessive bouncing

Motion should communicate state.

------------------------------------------------------------------------

# 48. Important UX Rule: Clickable Evidence

Whenever a user sees:

``` text
Timeout — 61
```

they should be able to get to:

``` text
Why?
Where?
When?
Which log stream?
Open CloudWatch
```

within one or two interactions.

This is the most important operational UX principle for the page.

------------------------------------------------------------------------

# 49. Example Final Report

For real data, the UI might render:

``` text
LOG INTELLIGENCE
Last 24 Hours

System health requires attention.

143 confirmed findings across 7 log groups.
The dominant issue is repeated Lambda timeout activity
in order-processor.

────────────────────────────────────────

143 FINDINGS      3 CRITICAL      61 TIMEOUTS      7 GROUPS

────────────────────────────────────────

ERROR TREND

14:00       23
13:00       18
12:00        7
11:00        4
...

────────────────────────────────────────

TOP ISSUES

01  Lambda timeout
    order-processor
    47 occurrences
    Last seen 14:51
    HIGH

    [Open in CloudWatch]

02  Access denied
    payment-worker
    17 occurrences
    Last seen 13:22
    HIGH

    [Open in CloudWatch]

────────────────────────────────────────

LOG GROUPS

order-processor       Issues       61
payment-worker        Issues       17
api-service           Healthy       0
notification-worker   Issues        8

────────────────────────────────────────

REPORT AGENT

✓ 18 log groups discovered
✓ 18 workers spawned
✓ 18 workers completed
✓ 143 findings aggregated
✓ Final report generated
```

Again: **those numbers are only illustrative. Never hard-code them.**

------------------------------------------------------------------------

# 50. What Claude Must NOT Do

Do not:

-   create fake log data
-   create fake CloudWatch streams
-   invent error counts
-   invent timeouts
-   invent root causes
-   use static JSON as the final data source
-   make the page look like a generic SaaS analytics dashboard
-   hard-code a fixed number of agents
-   make the Report Agent purely cosmetic
-   replace the existing CloudWatch Console
-   create fake AWS URLs
-   expose credentials
-   introduce a second AWS credential mechanism
-   break the existing Agent Center
-   break existing sidebar navigation
-   duplicate existing CloudWatch functionality unnecessarily
-   make AI-generated claims without evidence
-   hide failed analysis behind "0 errors"
-   make the entire report depend on one worker succeeding
-   show a spinner forever
-   create huge walls of AI prose
-   sacrifice usability for flashy AI visuals

------------------------------------------------------------------------

# 51. Implementation Sequence

Implement in this order.

## Phase 1 --- Inspect existing application

Before changing anything:

-   inspect project structure
-   identify framework
-   identify existing sidebar
-   identify routing
-   identify AWS integration
-   identify CloudWatch Console implementation
-   identify Agent Center
-   identify existing agent/orchestrator architecture
-   identify existing UI/component system
-   identify existing charts/tables
-   identify existing API patterns

**Do not duplicate existing infrastructure.**

## Phase 2 --- Add route + sidebar

Add:

``` text
Log Intelligence
```

to the existing sidebar.

Create the route/page shell.

## Phase 3 --- Build data contracts

Create:

-   ReportRun
-   LogFinding
-   LogGroupAnalysis
-   AgentWorkerStatus
-   ReportSummary

## Phase 4 --- Implement CloudWatch discovery

Real AWS data.

Discover log groups according to the project's existing
AWS/account/region context.

## Phase 5 --- Implement dynamic worker orchestration

Report Agent:

``` text
discover
→ create worker assignments
→ execute
→ collect
→ aggregate
```

Support arbitrary numbers of workers subject to sensible concurrency
controls.

## Phase 6 --- Implement real analysis

Detect real:

-   timeouts
-   exceptions
-   access failures
-   throttles
-   connection failures
-   runtime failures
-   memory/resource failures
-   dependency failures
-   invocation failures
-   application errors

## Phase 7 --- Implement evidence/deep links

Every finding should retain evidence and CloudWatch navigation data.

## Phase 8 --- Build report UI

Implement:

-   header
-   summary
-   KPI strip
-   trends
-   categories
-   top issues
-   log group table
-   finding drawer
-   agent activity

## Phase 9 --- Polish

Add:

-   loading states
-   empty states
-   partial failure states
-   responsive behavior
-   dark mode
-   keyboard accessibility
-   subtle motion
-   hover states
-   tooltips

## Phase 10 --- Validate

Test against:

1.  no log groups
2.  one log group
3.  many log groups
4.  no errors
5.  one error
6.  repeated errors
7.  multiple categories
8.  one worker failure
9.  multiple worker failures
10. CloudWatch permission failure
11. empty 24h range
12. populated 7d range
13. very large log group
14. pagination
15. direct CloudWatch stream link
16. region changes
17. refresh
18. concurrent report runs

------------------------------------------------------------------------

# 52. Definition of Done

The feature is complete only when:

-   [ ] Log Intelligence appears in the existing sidebar.
-   [ ] The page uses the existing application shell.
-   [ ] The Report Agent is a real part of the agent architecture.
-   [ ] The Report Agent dynamically creates worker assignments.
-   [ ] No fixed worker count is hard-coded.
-   [ ] Workers analyze real CloudWatch data.
-   [ ] 24-hour reporting works.
-   [ ] 7-day reporting works.
-   [ ] Findings are categorized.
-   [ ] Timeouts are detected from real evidence.
-   [ ] Exceptions are detected from real evidence.
-   [ ] AWS failures are detected from real evidence.
-   [ ] Repeated events are grouped appropriately.
-   [ ] Counts are calculated from actual data.
-   [ ] Every important finding retains evidence.
-   [ ] Log streams are directly accessible from the UI.
-   [ ] CloudWatch links use the correct region/resource context.
-   [ ] No credentials are exposed.
-   [ ] Zero-error periods display correctly.
-   [ ] Analysis failures are not presented as zero errors.
-   [ ] Worker failures are isolated.
-   [ ] The final Report Agent aggregates successful worker results.
-   [ ] The report includes a concise executive summary.
-   [ ] The report includes trend visualization.
-   [ ] The report includes category breakdown.
-   [ ] The report includes top issues.
-   [ ] The report includes log-group status.
-   [ ] The report includes agent execution status.
-   [ ] Findings can be filtered.
-   [ ] Findings can be searched.
-   [ ] Finding details open in a drawer/sheet.
-   [ ] The UI is visually polished.
-   [ ] The page works in dark mode if supported.
-   [ ] Loading states are polished.
-   [ ] Empty states are clear.
-   [ ] Error states are clear.
-   [ ] Existing application pages continue working.
-   [ ] Existing CloudWatch Console functionality continues working.
-   [ ] Existing Agent Center functionality continues working.
-   [ ] The implementation uses existing project conventions wherever
    possible.

------------------------------------------------------------------------

# 53. Final Design Principle

The page should make a senior engineer or manager understand the state
of the AWS environment in **seconds**, while allowing an engineer to
drill from:

``` text
Executive Summary
      ↓
Issue Category
      ↓
Specific Failure
      ↓
Log Group
      ↓
Log Stream
      ↓
Exact CloudWatch Evidence
```

The AI is responsible for reducing the investigation effort.

CloudWatch remains the source of truth.

The Report Agent orchestrates the investigation.

The subagents do the detailed work.

The UI makes the result understandable.

**Build the feature as a real operational product, not a demo.**
