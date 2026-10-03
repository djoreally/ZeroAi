# ZeroMemory Brain API

ZeroMemory is the standalone memory service inside ZeroAI. An application can use it without adopting ZeroRuntime, agents, policy evaluation, or certification.

## Contract

The client owns its model. ZeroMemory owns durable memory selection and retrieval.

```text
message -> POST /api/v1/brain/context -> working-memory capsule -> client model
client input/output -> POST /api/v1/brain/observe -> memory governor -> durable memory
repeated episodes -> POST /api/v1/brain/consolidate -> higher-order durable facts
```

ZeroMemory does not automatically treat model output as truth. `/observe` only auto-extracts conservative signals from user input. Applications can write explicit structured memories when they have authoritative data.

## Authentication

Use a ZeroAI workspace API key with:

- `memory:read` for context retrieval
- `memory:write` for observation, supersession history, and consolidation

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

The response includes the bounded memory capsule plus ZeroPipe diagnostics showing how much dormant memory was scanned, scope-filtered, collapsed, ranked, and finally returned.

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
      "decay": 0.99,
      "updatedAt": "..."
    }
  ],
  "workingMemory": "[decision:current] ship Friday",
  "count": 1,
  "pipe": {
    "scanned": 120,
    "active": 118,
    "scopeMatched": 27,
    "supersededCollapsed": 3,
    "ranked": 24,
    "returned": 12
  }
}
```

ZeroPipe is deterministic. It performs active-state filtering, scope isolation, supersession collapse, lexical relevance, salience, confidence, kind-specific decay, ranking, and context bounding before a model sees anything.

## Observe a turn

`POST /api/v1/brain/observe`

```json
{
  "scope": {
    "userId": "user_123",
    "agentId": "assistant"
  },
  "input": "We decided the launch is Friday.",
  "output": "Got it."
}
```

Common durable phrases such as `remember`, `I prefer`, `we decided`, `our goal is`, durable constraints, and experience phrases such as `we tried`, `failed because`, or `resolved by` are conservatively recognized. Ordinary chatter is ignored.

When a durable key changes, the current memory is updated but the previous value is preserved as an episodic supersession record. The brain therefore remembers that its belief changed without keeping stale state active in working memory.

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

Writing the same scope + kind + key again uses the same stable memory ID. The former value becomes an episode when it differs from the new value.

## Episodic memory and decay

ZeroMemory distinguishes experiences from durable knowledge. Episodes decay faster than decisions and constraints, so old experiences naturally lose attention unless they are repeatedly reinforced. Current half-life policy is deterministic and can evolve without changing the public API.

## Consolidation

`POST /api/v1/brain/consolidate`

```json
{
  "scope": {"userId":"user_123"},
  "minOccurrences": 3
}
```

The first consolidation engine is intentionally conservative and deterministic. Repeated similar episodes are grouped and promoted into a durable fact only after the configured occurrence threshold is reached. This is the beginning of the `experience -> knowledge` path; future model-assisted consolidation can sit behind the same contract.

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

## Current guarantees

- model-provider independent
- workspace isolation through existing API-key tenancy
- user/agent/project/session scopes
- deterministic ZeroPipe context reduction before model inference
- deterministic supersession with episodic history
- episodic memory with faster decay than durable decisions and constraints
- deterministic repeated-experience consolidation
- no automatic promotion of assistant output into durable truth
- bounded working-memory capsules
- existing Neon Data API persistence reused; no new database migration for this increment

## Next increments

The public contracts remain stable for semantic/vector retrieval, richer contradiction graphs, provenance expansion, scheduled self-consolidation, salience reinforcement, explicit forgetting, and optional model-assisted extraction/consolidation.