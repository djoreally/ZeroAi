import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { findSupersededFact,inferMemories,memoryPredicate,scopeSubject,stableMemoryId,supersessionEpisode } from "../../../../../lib/brain-memory";
import { getStore } from "../../../../../lib/runtime-store";

const Scope=z.object({
  userId:z.string().min(1).max(200),
  agentId:z.string().min(1).max(200).optional(),
  sessionId:z.string().min(1).max(200).optional(),
  projectId:z.string().min(1).max(200).optional()
});

const ExplicitMemory=z.object({
  kind:z.enum(["fact","preference","decision","goal","constraint","episode"]),
  key:z.string().min(1).max(80),
  value:z.string().min(1).max(4000),
  confidence:z.number().min(0).max(1).default(0.95),
  salience:z.number().min(0).max(1).default(0.8)
});

const Body=z.object({
  scope:Scope,
  input:z.string().max(20_000).optional(),
  output:z.string().max(20_000).optional(),
  memories:z.array(ExplicitMemory).max(64).optional()
}).refine(value=>Boolean(value.input || value.output || value.memories?.length),{message:"input, output, or memories is required"});

export async function POST(request:Request){
  try{
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"memory:write")) return Response.json({error:"FORBIDDEN"},{status:403});

    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

    const inferred=parsed.data.input ? inferMemories(parsed.data.input) : [];
    const explicit=parsed.data.memories ?? [];
    const deduped=new Map<string,(typeof inferred)[number]>();
    for(const candidate of [...inferred,...explicit]) deduped.set(`${candidate.kind}:${candidate.key}`,candidate);
    const candidates=[...deduped.values()];
    const subject=scopeSubject(parsed.data.scope);
    const now=new Date().toISOString();
    const currentFacts=await store.listMemoryFacts(auth.workspaceId,5000);
    const stored=[] as Array<{id:string;kind:string;key:string;value:string;confidence:number;salience:number}>;
    const superseded=[] as Array<{previous:string;next:string;kind:string;key:string;episodeId:string}>;

    for(const candidate of candidates){
      const predicate=memoryPredicate(candidate.kind,candidate.key);
      const id=stableMemoryId(auth.workspaceId,subject,predicate);
      const previous=findSupersededFact(currentFacts,subject,candidate);

      if(previous){
        const episode=supersessionEpisode(previous,candidate);
        const episodePredicate=memoryPredicate(episode.kind,episode.key);
        const episodeId=stableMemoryId(auth.workspaceId,subject,episodePredicate);
        await store.upsertMemoryFact({
          id:episodeId,
          workspaceId:auth.workspaceId,
          subject,
          predicate:episodePredicate,
          object:episode.value,
          confidence:episode.confidence,
          salience:episode.salience,
          validFrom:now,
          createdAt:now,
          updatedAt:now
        });
        superseded.push({previous:previous.object,next:candidate.value,kind:candidate.kind,key:candidate.key,episodeId});
      }

      const existing=currentFacts.find(fact=>fact.id===id);
      await store.upsertMemoryFact({
        id,
        workspaceId:auth.workspaceId,
        subject,
        predicate,
        object:candidate.value,
        confidence:candidate.confidence,
        salience:candidate.salience,
        validFrom:previous ? now : (existing?.validFrom ?? now),
        createdAt:existing?.createdAt ?? now,
        updatedAt:now
      });
      stored.push({id,kind:candidate.kind,key:candidate.key,value:candidate.value,confidence:candidate.confidence,salience:candidate.salience});
    }

    return Response.json({
      workspaceId:auth.workspaceId,
      scope:parsed.data.scope,
      stored,
      superseded,
      storedCount:stored.length,
      supersededCount:superseded.length,
      inferredCount:inferred.length,
      ignored:stored.length===0
    },{status:stored.length ? 201 : 200});
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
