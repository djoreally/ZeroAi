# @zeroai/memory

TypeScript client for the standalone ZeroMemory brain API.

ZeroMemory does not own your model. Your application can use OpenAI, Anthropic, Gemini, a local model, or any other inference provider while ZeroMemory supplies persistent selective memory.

## Client

```ts
import { createZeroMemory } from "@zeroai/memory";

const memory=createZeroMemory({
  baseUrl:process.env.ZEROAI_URL!,
  apiKey:process.env.ZEROAI_MEMORY_KEY!
});
```

## Chat loop

```ts
const {output,context}=await memory.runTurn({
  scope:{
    userId:user.id,
    agentId:"chat-assistant",
    projectId:"my-chat-app"
  },
  message,
  run:async({message,workingMemory})=>{
    return myModel({
      message,
      memory:workingMemory
    });
  }
});
```

`runTurn()` performs:

```text
message
  -> /brain/context
  -> bounded working-memory capsule
  -> your model callback
  -> /brain/observe
  -> selective durable memory
```

The model response is passed to observation for episode context but is not automatically promoted to durable truth by the server.

## Direct methods

```ts
await memory.context({scope,input,maxFacts});
await memory.observe({scope,input,output,memories});
await memory.consolidate({scope,minOccurrences:3});
await memory.maintain({scope,dryRun:false});
```

## Self-feeding maintenance

A scheduler can call `maintain()` and use the returned `nextSuggestedRunAt` to schedule the next wake cycle for that exact scope.

```ts
const result=await memory.maintain({
  scope:{userId:user.id,agentId:"chat-assistant"}
});

scheduleNext(result.nextSuggestedRunAt);
```

That lets memory remain dormant between useful maintenance cycles instead of continuously invoking a model or scanning history.

## Scopes

Every call requires a `userId`. Memory can optionally be narrowed with:

- `agentId`
- `projectId`
- `sessionId`

Retrieval may inherit broader applicable memory. Maintenance only mutates memory owned by the exact scope being maintained.

## Errors

Non-2xx responses throw `ZeroMemoryError`, exposing the HTTP `status` and parsed error `payload`.

## Package build

```bash
npm run build
```

The package emits ESM JavaScript and TypeScript declarations into `dist/`.
