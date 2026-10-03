# ZeroMemory Brain API

ZeroMemory is the standalone memory service inside ZeroAI. An application can use it without adopting ZeroRuntime, agents, policy evaluation, or certification.

## Contract

The client owns its model. ZeroMemory owns durable memory selection and retrieval.

```text
message -> POST /api/v1/brain/context -> working-memory capsule -> client model
client input/output -> POST /api/v1/brain/observe -> memory governor -> durable memory
```

ZeroMemory does not automatically treat model output as truth. `/observe` only auto-extracts conservative signals from user input. Applications can write explicit structured memories when they have authoritative data.

## Authentication

Use a ZeroAI workspace API key with:

- `memory:read` for context retrieval
- `memory:write` for observation / memory writes

Send it with the same API-key authentication mechanism used by the existing v1 BaaS endpoints.

## Get working memory

`POST /api/v1/brain/context`

```json
{
  "scope": {
    "userId": "user_123",
    "agentId": "assistant",
    "projectId": "chat-app",
    "sessionId": "session_456"
  },
  "input": "What did we decide about the launch?",
  "maxFacts": 24
}
```

Response:

```json
{
  "capsuleId": "...",
  "workspaceId": "...",
  "scope": {"userId":"user_123"},
  "memories": [
    {
      "id": "...",
      "kind": "decision",
      "key": "current",
      "value": "ship Friday",
      "confidence": 0.92,
      "salience": 0.9,
      "score": 0.81,
      "updatedAt": "..."
    }
  ],
  "workingMemory": "[decision:current] ship Friday",
  "count": 1
}
```

The current v1 context compiler is deliberately deterministic: scope filtering, supersession, lexical relevance, salience, confidence, and recency. Semantic/vector retrieval can be added behind this contract without changing client integrations.

## Observe a turn

`POST /api/v1/brain/observe`

```json
{
  "scope": {
    "userId": "user_123",
    "agentId": "assistant"
  },
  "input": "Remember that the launch is Friday.",
  "output": "Got it."
}
```

Common durable phrases such as `remember`, `I prefer`, `we decided`, `our goal is`, and durable constraints are conservatively recognized. Ordinary chatter is ignored.

Response:

```json
{
  "storedCount": 1,
  "inferredCount": 1,
  "ignored": false,
  "stored": [
    {
      "kind": "fact",
      "key": "remembered-...",
      "value": "the launch is Friday"
    }
  ]
}
```

## Explicit memories

For authoritative application state, pass structured memories:

```json
{
  "scope": {"userId":"user_123"},
  "memories": [
    {
      "kind": "preference",
      "key": "response-style",
      "value": "concise",
      "confidence": 1,
      "salience": 0.9
    },
    {
      "kind": "goal",
      "key": "launch",
      "value": "ship Friday",
      "confidence": 1,
      "salience": 1
    }
  ]
}
```

Writing the same scope + kind + key again uses the same stable memory ID and replaces the previous value. That gives v1 deterministic supersession without forcing the client to manage record IDs.

## Scope behavior

A memory may be scoped to a user and optionally narrowed to an agent, project, or session. Broader user memories remain available to narrower contexts; memories belonging to a different user are excluded. Workspace-level and legacy workspace facts remain available within the authenticated workspace.

## Minimal client loop

```ts
const capsule = await fetch(`${ZEROAI_URL}/api/v1/brain/context`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({scope:{userId},input:message})
}).then(r => r.json());

const response = await yourModel({
  input: message,
  memory: capsule.workingMemory
});

await fetch(`${ZEROAI_URL}/api/v1/brain/observe`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({scope:{userId},input:message,output:response})
});
```

## v1 guarantees

- model-provider independent
- workspace isolation through existing API-key tenancy
- user/agent/project/session scopes
- deterministic supersession for explicit memory keys
- deterministic context reduction before model inference
- no automatic promotion of assistant output into durable truth
- bounded context capsules
- current Neon Data API persistence reused; no new database migration is required for this slice

## Next increments

The API contract is intentionally stable enough for later additions: semantic/vector retrieval, episodic consolidation, contradiction handling, decay, provenance expansion, background consolidation, and model-assisted extraction.
