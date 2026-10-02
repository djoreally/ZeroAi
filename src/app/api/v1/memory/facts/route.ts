import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { compactMemory } from "../../../../../lib/memory";
import { getStore } from "../../../../../lib/runtime-store";

const Body=z.object({
  subject:z.string().min(1),
  predicate:z.string().min(1),
  object:z.string().min(1),
  confidence:z.number().min(0).max(1),
  salience:z.number().min(0).max(1),
  sourceEventId:z.string().optional()
});

export async function GET(request:Request) {
  try {
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"memory:read")) return Response.json({error:"FORBIDDEN"},{status:403});
    const facts=await store.listMemoryFacts(auth.workspaceId,1000);
    return Response.json({facts:compactMemory(facts.map(f=>({id:f.id,subject:f.subject,predicate:f.predicate,object:f.object,confidence:f.confidence,salience:f.salience,updatedAt:f.updatedAt})),256)});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}

export async function POST(request:Request) {
  try {
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"memory:write")) return Response.json({error:"FORBIDDEN"},{status:403});
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const now=new Date().toISOString();
    const fact={id:randomUUID(),workspaceId:auth.workspaceId,...parsed.data,validFrom:now,createdAt:now,updatedAt:now};
    await store.upsertMemoryFact(fact);
    return Response.json({fact},{status:201});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
