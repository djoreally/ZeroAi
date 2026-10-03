import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { memoryPredicate,scopeSubject,stableMemoryId } from "../../../../../lib/brain-memory";
import { planMemoryMaintenance } from "../../../../../lib/memory-maintenance";
import { getStore } from "../../../../../lib/runtime-store";

const Scope=z.object({
  userId:z.string().min(1).max(200),
  agentId:z.string().min(1).max(200).optional(),
  sessionId:z.string().min(1).max(200).optional(),
  projectId:z.string().min(1).max(200).optional()
});

const Body=z.object({
  scope:Scope,
  minOccurrences:z.number().int().min(2).max(10).optional(),
  decayThreshold:z.number().min(0.01).max(0.5).optional(),
  dryRun:z.boolean().optional()
});

export async function POST(request:Request){
  try{
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"memory:read") || !hasScope(auth,"memory:write")) return Response.json({error:"FORBIDDEN"},{status:403});

    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

    const facts=await store.listMemoryFacts(auth.workspaceId,5000);
    const now=new Date();
    const plan=planMemoryMaintenance(facts,parsed.data.scope,{
      minOccurrences:parsed.data.minOccurrences,
      decayThreshold:parsed.data.decayThreshold,
      nowMs:now.getTime()
    });
    const dryRun=parsed.data.dryRun ?? false;
    const subject=scopeSubject(parsed.data.scope);

    if(!dryRun){
      for(const candidate of plan.consolidations){
        const predicate=memoryPredicate(candidate.kind,candidate.key);
        const id=stableMemoryId(auth.workspaceId,subject,predicate);
        const existing=facts.find(fact=>fact.id===id);
        await store.upsertMemoryFact({
          id,
          workspaceId:auth.workspaceId,
          subject,
          predicate,
          object:candidate.value,
          confidence:candidate.confidence,
          salience:candidate.salience,
          validFrom:existing?.validFrom ?? now.toISOString(),
          createdAt:existing?.createdAt ?? now.toISOString(),
          updatedAt:now.toISOString()
        });
      }

      for(const fact of plan.invalidations){
        await store.upsertMemoryFact({
          ...fact,
          invalidatedAt:now.toISOString(),
          updatedAt:now.toISOString()
        });
      }
    }

    const nextSuggestedRunAt=new Date(now.getTime()+(plan.nextRunAfterSeconds*1000)).toISOString();
    return Response.json({
      workspaceId:auth.workspaceId,
      scope:parsed.data.scope,
      dryRun,
      ...plan.stats,
      nextRunAfterSeconds:plan.nextRunAfterSeconds,
      nextSuggestedRunAt
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
