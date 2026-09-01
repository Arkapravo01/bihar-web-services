# Bihar Web Services — Developer & Agent Reference

> Read this entire file before touching the codebase.
> It describes architecture, conventions, and the exact checklist for adding new features.

---

## What this app is

A full-stack internal operations dashboard for managing AWS infrastructure (IAM, S3, CloudWatch, and more planned). Each AWS service gets a module with:
- A REST API backed by real AWS SDK calls
- A conversational AI agent that can investigate live data in plain English
- A React frontend page with data tables, stats cards, and the AI chat bar

**Stack:**
- Backend: Node.js (ESM, `"type": "module"`), Express 5, AWS SDK v3, no TypeScript
- Frontend: React + Vite, TanStack Query, Tailwind CSS, shadcn/ui components, `motion/react` animations
- AI: IBM ICA API (OpenAI-compatible), model `claude-haiku-4-5`

---

## Monorepo layout

```
bihar-web-services/
├── backend/
│   ├── .env.qa              # QA env vars (AWS profiles, region, API keys)
│   ├── .env.prod            # Prod env vars
│   └── src/
│       ├── app.js           # Express entry point
│       ├── errors.js        # Shared ApiError class
│       ├── config/
│       │   ├── aws.js       # All AWS profile/env exports (S3_PROFILE, IAM_PROFILE, etc.)
│       │   └── env.js       # PORT, NODE_ENV
│       ├── clients/
│       │   ├── index.js     # Re-exports all client factories
│       │   └── aws/
│       │       ├── s3.client.js
│       │       ├── iam.client.js
│       │       └── cloudwatch.client.js
│       ├── models/          # AWS response → plain object mappers (toBucket, toUser, etc.)
│       ├── validators/      # Input assertion helpers (throw ApiError on bad input)
│       ├── middleware/
│       │   ├── requestId.middleware.js
│       │   ├── logging.middleware.js
│       │   └── error.middleware.js
│       ├── services/        # AWS SDK calls, one file per service
│       ├── controllers/     # HTTP layer: parse req, call service, send res
│       ├── routes/          # Express routers, one file per service + agent.routes.js
│       └── agents/
│           ├── icaClient.js # Shared ICA API fetch wrapper
│           ├── runner.js    # Shared agentic loop (tool calls, incidents, knowledge)
│           ├── cloudwatch-agent/
│           │   ├── agent.js      # System prompt + knowledge distiller prompt
│           │   ├── tools.js      # Tool definitions + executeTool()
│           │   ├── knowledge.md  # Persistent knowledge base (auto-updated)
│           │   └── incidents/    # Auto-saved investigation logs (YYYY/MM/DD/)
│           ├── iam-agent/
│           │   └── (same structure)
│           └── s3-agent/
│               └── (same structure)
└── frontend/
    └── src/
        ├── app/
        │   ├── router.jsx          # React Router config — import feature routes here
        │   └── providers/
        │       ├── ActiveEnvProvider.jsx  # Global QA/prod env switcher
        │       ├── QueryProvider.jsx      # TanStack Query client
        │       └── ActivityProvider.jsx   # Recent activity log
        ├── constants/
        │   └── nav.js              # Sidebar nav items — add new modules here
        ├── services/
        │   └── apiClient.js        # Fetch wrapper (reads baseUrl from ActiveEnvProvider)
        └── features/
            └── <service>/          # One folder per AWS service
                ├── index.js        # Exports routes for router.jsx
                ├── routes.jsx      # React Router route definitions
                ├── api/
                │   └── <service>Api.js   # API functions calling apiClient
                ├── hooks/
                │   └── use<Resource>.js  # TanStack Query hooks wrapping API functions
                ├── components/     # Feature-specific React components
                └── pages/          # Page-level components rendered by routes
```

---

## Environment & credentials

### Env files

`backend/.env.qa` and `backend/.env.prod` each contain:

```
S3_PROFILE=claude-s3-qa          # AWS named profile for S3 calls
CLOUDWATCH_PROFILE=claude-cloudwatch-qa
IAM_PROFILE=claude-iam-qa
IAM_ENV=qa
S3_ENV=qa
CLOUDWATCH_ENV=qa
AWS_REGION=eu-west-1
ANTHROPIC_BASE_URL=https://api.nextgen-beta.ica.ibm.com/ica
```

`ANTHROPIC_API_KEY` is set globally in the shell environment (not in `.env` files).

### Adding a new service profile

1. Add `NEW_PROFILE=claude-new-qa` to both `.env.qa` and `.env.prod`.
2. Export it from `src/config/aws.js`:
   ```js
   export const NEW_PROFILE = process.env.NEW_PROFILE || 'claude-new-qa'
   ```
3. Use it in the client factory and service (see pattern below).

---

## Backend — how it works

### Request lifecycle

```
HTTP request
  → requestIdMiddleware   (attaches req.requestId UUID)
  → loggingMiddleware     (logs method/path/status/duration using req.query.env)
  → /api router
      → /iam, /s3, /cloudwatch, /agent sub-routers
          → controller    (resolveEnv, call service, res.json)
  → errorMiddleware       (catches thrown ApiError or unhandled errors)
```

### Response envelope — always this shape

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "...", "requestId": "..." } }
```

Never deviate from this envelope. Every `res.json()` call wraps data in `{ success: true, data: ... }`.

### resolveEnv pattern

Every controller file has this function and calls it at the top of every handler:

```js
function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}
```

The frontend always appends `?env=qa` or `?env=prod` to every request (done automatically in `apiClient.js`).

### ApiError

Defined in `src/errors.js`. Throw it from validators or services for known bad-input cases:

```js
import { ApiError } from '../errors.js'
throw new ApiError(400, 'MY_ERROR_CODE', 'Human-readable message')
```

The `errorMiddleware` catches it and formats the standard error envelope. Never call `res.status().json()` for errors inside controllers — just throw.

### Client pattern (one per AWS service)

File: `src/clients/aws/<service>.client.js`

```js
import { SomeAWSClient } from '@aws-sdk/client-something'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, NEW_PROFILE } from '../../config/aws.js'

export function createNewClient(profile) {
  return new SomeAWSClient({ region: AWS_REGION, credentials: fromIni({ profile }) })
}

export function getNewClientForEnv(_env) {
  // If the service has separate qa/prod profiles, use env here.
  // If it uses a single profile from .env, just use NEW_PROFILE directly.
  return createNewClient(NEW_PROFILE)
}
```

Export it from `src/clients/index.js`.

### Service pattern

File: `src/services/<service>.service.js`

```js
import { getNewClientForEnv } from '../clients/index.js'
import { AWS_REGION, NEW_PROFILE } from '../config/aws.js'

let contextClient = null

function setContextClient(c) { contextClient = c }
function getClient() {
  if (!contextClient) throw new Error('<Service> client not initialized')
  return contextClient
}

export function setClientForEnv(env) {
  setContextClient(getNewClientForEnv(env))
  return { env, profile: NEW_PROFILE, region: AWS_REGION }
}

// AWS calls go here — always use getClient(), never instantiate clients directly
export async function listThings() { ... }
```

**Key rules:**
- Always paginate. Every AWS list call that supports `Marker`/`NextToken`/`NextContinuationToken` must loop until exhausted.
- Use `getClient()`, never a module-level client instance (so env switching works at runtime).
- Profile strings come from `config/aws.js` exports, never hardcoded in the service.

### Controller pattern

File: `src/controllers/<service>.controller.js`

```js
import * as newService from '../services/new.service.js'
import { assertSomething } from '../validators/new.validator.js'

function resolveEnv(req) {
  const env = req.query.env || 'qa'
  return env === 'prod' ? 'prod' : 'qa'
}

export async function listThings(req, res) {
  const env = resolveEnv(req)
  newService.setClientForEnv(env)
  const things = await newService.listThings()
  res.json({ success: true, data: { things } })
}
```

No try/catch needed for unhandled errors — `errorMiddleware` covers it. Only use try/catch for known recoverable cases (e.g. 404 when a resource doesn't exist).

### Route pattern

File: `src/routes/<service>.routes.js`

```js
import { Router } from 'express'
import * as newController from '../controllers/new.controller.js'

export const newRouter = Router()

newRouter.get('/things',       newController.listThings)
newRouter.get('/things/:id',   newController.getThing)
newRouter.post('/things',      newController.createThing)
```

Register it in `src/routes/index.js`:
```js
import { newRouter } from './new.routes.js'
apiRouter.use('/new', newRouter)
```

### Agent route

AI agent endpoints live in `src/routes/agent.routes.js` (not per-service routes):

```js
agentRouter.post('/new/investigate', agentController.investigateNew)
```

Add the handler to `src/controllers/agent.controller.js`:
```js
import { runInvestigation as runNewInvestigation } from '../agents/new-agent/agent.js'

export async function investigateNew(req, res) {
  const { query, history } = req.body
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: { message: 'query is required' } })
  }
  const result = await runNewInvestigation(query.trim(), history ?? [])
  res.json({ success: true, data: result })
}
```

### Validator pattern

File: `src/validators/<service>.validator.js`

```js
import { ApiError } from '../errors.js'
export { ApiError }

export function assertThingId(id) {
  if (!id) throw new ApiError(400, 'NEW_ID_REQUIRED', 'A thing ID is required')
}
```

---

## Agents — how they work

### Architecture

```
agent.js          — system prompt + knowledge distiller prompt function
tools.js          — tool definitions (JSON schema) + executeTool() dispatcher
runner.js         — shared: agentic loop, incident saving, knowledge updating
icaClient.js      — shared: raw ICA API fetch
knowledge.md      — persistent knowledge base, auto-appended after each session
incidents/        — one markdown file per investigation, organised YYYY/MM/DD/
```

### runner.js — what it does

`runAgent(config)` is called by every `agent.js`. It:
1. Reads `knowledge.md` and appends it to the system prompt.
2. Builds the message array: `[system, ...history, user]`.
3. Loops: calls ICA, processes tool calls, appends results, repeats until `finish_reason === 'stop'` or tool call cap (12) reached.
4. In parallel after the loop: saves the investigation to `incidents/` and calls the knowledge distiller to optionally append a new entry to `knowledge.md`.
5. Returns `{ reply, tool_calls_made, history }`.

### agent.js pattern

```js
import path from 'path'
import { fileURLToPath } from 'url'
import { toolDefinitions, executeTool } from './tools.js'
import { runAgent } from '../runner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.md')
const INCIDENTS_DIR  = path.join(__dirname, 'incidents')

const SYSTEM_PROMPT = `You are the <Service> Investigation Agent for Bihar Web Services. ...`

function knowledgeDistillerPrompt(query, reply, existing) {
  return `...instructions for when to add a knowledge entry...`
}

export async function runInvestigation(query, history = []) {
  return runAgent({
    systemPrompt: SYSTEM_PROMPT,
    toolDefinitions,
    executeTool,
    knowledgeFile: KNOWLEDGE_FILE,
    incidentsDir:  INCIDENTS_DIR,
    agentTag:      'new-agent',       // used in console logs
    idPrefix:      'NEW',             // knowledge entry IDs: NEW-001, NEW-002...
    knowledgeDistillerPrompt,
    query,
    history,
  })
}
```

### tools.js pattern

```js
import { SomeCommand } from '@aws-sdk/client-something'
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'
import { fromIni } from '@aws-sdk/credential-providers'
import { AWS_REGION, NEW_PROFILE } from '../../config/aws.js'

const credentials = fromIni({ profile: NEW_PROFILE })
const newClient = new SomeAWSClient({ region: AWS_REGION, credentials })
const stsClient = new STSClient({ region: AWS_REGION, credentials })

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'get_caller_identity',
      description: 'Returns the AWS identity currently in use. Call first when hitting permission errors.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  // ... domain tools
]

async function getCallerIdentity() {
  try {
    const r = await stsClient.send(new GetCallerIdentityCommand({}))
    return { accountId: r.Account, userId: r.UserId, arn: r.Arn }
  } catch (e) { return { error: e.message } }
}

export async function executeTool(name, args) {
  switch (name) {
    case 'get_caller_identity': return getCallerIdentity()
    // ...
    default: return { error: `Unknown tool: ${name}` }
  }
}
```

**Critical:** Agent `tools.js` files create their own AWS SDK clients using `fromIni({ profile: NEW_PROFILE })` explicitly. They do NOT use the service's `contextClient` — agents are stateless and always use the profile from config directly.

---

## Frontend — how it works

### apiClient

`src/services/apiClient.js` is a plain `fetch` wrapper. It:
- Reads the active base URL from `ActiveEnvProvider` (set to `http://localhost:8787` for both envs currently).
- Auto-appends `?env=qa` or `?env=prod` from `localStorage`.
- Returns the parsed JSON body directly (not wrapped in `.data`).

```js
apiClient.get('/api/iam/users')  // returns { success: true, data: { users: [...] } }
```

### API layer pattern

File: `src/features/<service>/api/<service>Api.js`

```js
import { apiClient } from '@/services/apiClient'

export function listThings() {
  return apiClient.get('/api/new/things').then((r) => r.data)
  // r = { success, data: { things } }  →  r.data = { things: [...] }
}
```

Always call `.then((r) => r.data)` to strip the outer `{ success, data }` envelope. The hook then gets `{ things: [...] }` directly.

### Hook pattern

File: `src/features/<service>/hooks/useThings.js`

```js
import { useQuery } from '@tanstack/react-query'
import { listThings } from '../api/newApi'

export function useThings() {
  return useQuery({ queryKey: ['new', 'things'], queryFn: listThings })
}
// hook.data = { things: [...] }
```

Do NOT add `select` unless you need to transform the data. The API function already strips one envelope level.

### Data unwrapping in pages

```js
const { data: thingsData = {}, isLoading } = useThings()
const things = useMemo(() => thingsData.things ?? [], [thingsData])
```

### Agent hook pattern (for AI chat bars)

```js
export async function runNewInvestigation(query, history = []) {
  return apiClient.post('/api/agent/new/investigate', { query, history }).then((r) => r.data)
  // returns { reply, tool_calls_made, history }
}
```

The response from agent endpoints is `{ success: true, data: { reply, tool_calls_made, history } }`. After `.then((r) => r.data)` you get `{ reply, history, ... }` directly. The AI query bar component reads `data.reply` and `data.history`.

### Adding a new page

1. Create `src/features/<service>/pages/<Service>Page.jsx`
2. Create `src/features/<service>/routes.jsx` exporting `const <service>Routes = [{ path: '/new', element: <NewPage /> }]`
3. Create `src/features/<service>/index.js` exporting `export { newRoutes } from './routes'`
4. Import and spread in `src/app/router.jsx`
5. Add to `src/constants/nav.js` with `enabled: true`

---

## Checklist — adding a new AWS service module

Use this checklist every time. Do not skip steps.

### Backend

- [ ] **Config** — add `NEW_PROFILE` and `NEW_ENV` to `src/config/aws.js` and both `.env` files
- [ ] **Client** — create `src/clients/aws/new.client.js` using `fromIni({ profile: NEW_PROFILE })`, export from `src/clients/index.js`
- [ ] **Model** — create `src/models/New.js` with `toThing(awsThing)` mapper functions
- [ ] **Validator** — create `src/validators/new.validator.js`, import `ApiError` from `../errors.js`
- [ ] **Service** — create `src/services/new.service.js` with `setClientForEnv`, `getClient`, and all AWS calls. Paginate every list operation.
- [ ] **Controller** — create `src/controllers/new.controller.js` with `resolveEnv` and one handler per endpoint
- [ ] **Route** — create `src/routes/new.routes.js`, register in `src/routes/index.js` under `/new`
- [ ] **Agent tools** — create `src/agents/new-agent/tools.js` with own AWS client (`fromIni({ profile: NEW_PROFILE })`), `get_caller_identity` tool always first, `toolDefinitions` array, `executeTool` switch
- [ ] **Agent** — create `src/agents/new-agent/agent.js` with `SYSTEM_PROMPT`, `knowledgeDistillerPrompt`, and `runInvestigation` calling `runAgent`
- [ ] **Agent knowledge** — create empty `src/agents/new-agent/knowledge.md`
- [ ] **Agent route** — add `agentRouter.post('/new/investigate', agentController.investigateNew)` to `agent.routes.js`
- [ ] **Agent controller** — add `investigateNew` handler to `agent.controller.js`, import `runInvestigation` from new agent
- [ ] **App startup log** — add `NEW_PROFILE` to the `console.log` in `app.js`

### Frontend

- [ ] **API** — create `src/features/new/api/newApi.js` with all fetch functions, each ending in `.then((r) => r.data)`
- [ ] **Hooks** — create one `useThings.js` per resource in `src/features/new/hooks/`
- [ ] **Components** — create feature-specific components in `src/features/new/components/`
- [ ] **Page** — create `src/features/new/pages/NewOverviewPage.jsx`; use `useMemo(() => data.things ?? [], [data])` to unpack hook data
- [ ] **Routes** — create `src/features/new/routes.jsx` and `src/features/new/index.js`
- [ ] **Router** — import and spread new routes in `src/app/router.jsx`
- [ ] **Nav** — add entry to `NAV_MODULES` in `src/constants/nav.js` with `enabled: true`

---

## Common pitfalls

**AWS profile in service vs agent tools**
- Services use `contextClient` set by `setClientForEnv(env)` — the profile comes from `config/aws.js`.
- Agent `tools.js` files instantiate their own client directly with `fromIni({ profile: NEW_PROFILE })`. They bypass the service layer entirely. If you forget this, agents use the default AWS credential chain and hit permission walls.

**Data envelope unwrapping**
- Backend always returns `{ success, data: { ... } }`.
- `apiClient.get().then(r => r.data)` strips one level → `{ things: [...] }`.
- Hook's `.data` is therefore `{ things: [...] }`.
- Page uses `hookData.things ?? []`.
- Do NOT add TanStack `select: (r) => r.data` — the API layer already did that unwrap.

**Pagination**
- Every AWS list command that supports a continuation token must be wrapped in a `do/while` loop. `IsTruncated` + `Marker` for IAM, `IsTruncated` + `NextContinuationToken` for S3, `nextToken` for CloudWatch. A single call caps at 60–100 results and silently truncates.

**CloudWatch service uses `getClient()`**
- Never use a module-level variable name like `logsClient` — use `getClient()` so env switching works.

**Agent route lives in `agent.routes.js`**
- Not in the service route file. All `POST /api/agent/*/investigate` endpoints are centralised there.

**`express.json()` on agent routes**
- `agent.routes.js` calls `agentRouter.use(express.json())`. If you add a new agent route to a different router that doesn't have this middleware, the body will be `undefined`.

**`resolveEnv` is a `function` declaration**
- Hoisting means you can define it anywhere in the controller file. But by convention keep it at the top, before any exports, so it's easy to find.
