import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { consolidationCandidates,memoryPredicate,scopeSubject,stableMemoryId } from "../../../../../lib/brain-memory";
import { getStore } from "../../../../../lib/runtime-store";

const Scope=z.object({
  userId:z.string().min(1).max(200),
  agentId:z.string().min(1).max(200).optional(),
  sessionId:z.string().min(1).max(200).optional(),
  projectId:z.string().min(1).max(200).optional()
});

const Body=z.object({
  scope:Scope,
  minOccurrences:z.number().int().min(2).max(10).optional()
});

export async function POST(request:Request){
  try{
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"memory:write")) return Response.json({error:"FORBIDDEN"},{status:403});

    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

    const facts=await store.listMemoryFacts(auth.workspaceId,5000);
    const candidates=consolidationCandidates(facts,parsed.data.scope,parsed.data.minOccurrences ?? 3);
    const subject=scopeSubject(parsed.data.scope);
    const now=new Date().toISOString();
    const stored=[] as Array<{id:string;kind:string;key:string;value:string}>;

    for(const candidate of candidates){
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
        validFrom:existing?.validFrom ?? now,
        createdAt:existing?.createdAt ?? now,
        updatedAt:now
      });
      stored.push({id,kind:candidate.kind,key:candidate.key,value:candidate.value});
    }

    return Response.json({
      workspaceId:auth.workspaceId,
      scope:parsed.data.scope,
      consolidatedCount:stored.length,
      stored
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
