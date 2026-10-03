# ZeroMemory Autonomic Maintenance

ZeroMemory should behave like a brain that is mostly dormant, not like a model rereading all memory continuously.

`POST /api/v1/brain/maintain` is the first autonomic maintenance surface. It is intended for a scheduler, cron worker, queue, or application timer using the same workspace API key.

## Request

```json
{
  "scope": {
    "userId": "user_123",
    "agentId": "assistant"
  },
  "minOccurrences": 3,
  "decayThreshold": 0.08,
  "dryRun": false
}
```

The key must have both `memory:read` and `memory:write`.

## What one wake cycle does

```text
scheduled wake
  -> load active scoped memory
  -> detect repeated ordinary episodes
  -> consolidate stable repeated patterns
  -> identify low-salience stale episodes
  -> invalidate only eligible stale episodes
  -> preserve important + supersession history
  -> return nextSuggestedRunAt
  -> sleep
```

No general reasoning model is required for this loop.

## Adaptive scheduling

The maintenance planner currently recommends:

- 6 hours after a cycle that produced maintenance work
- 12 hours when there is no work but the scope was recently active
- 24 hours when there is no work and the scope is quiet

The client may honor `nextRunAfterSeconds` / `nextSuggestedRunAt` to create a self-feeding schedule. This keeps the memory brain dormant most of the time while still allowing repeated experiences to become knowledge.

## Decay policy

Episodes already lose retrieval weight faster than durable facts, preferences, goals, decisions, and constraints. Maintenance goes one step further: sufficiently old, low-salience ordinary episodes may be marked invalid so they stop participating in active retrieval.

Automatic maintenance does **not** invalidate:

- high-salience episodes (`salience >= 0.85`)
- supersession-history episodes
- durable facts, preferences, goals, decisions, or constraints

Invalidation is a state change, not physical deletion.

## Dry run

Use `"dryRun": true` to get the maintenance counts and recommended next wake time without mutating memory.

## Relationship to consolidation

`/brain/consolidate` remains available for explicit consolidation calls. `/brain/maintain` wraps consolidation together with decay cleanup and adaptive scheduling, making it the preferred endpoint for recurring background memory care.
