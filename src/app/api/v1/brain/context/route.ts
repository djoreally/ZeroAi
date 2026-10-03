import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { compileBrainContext } from "../../../../../lib/brain-memory";
import { getStore } from "../../../../../lib/runtime-store";

const Scope=z.object({
  userId:z.string().min(1).max(200),
  agentId:z.string().min(1).max(200).optional(),
  sessionId:z.string().min(1).max(200).optional(),
  projectId:z.string().min(1).max(200).optional()
});

const Body=z.object({
  scope:Scope,
  input:z.string().min(1).max(20_000),
  maxFacts:z.number().int().min(1).max(64).optional()
});

export async function POST(request:Request){
  try{
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"memory:read")) return Response.json({error:"FORBIDDEN"},{status:403});

    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

    const facts=await store.listMemoryFacts(auth.workspaceId,2000);
    const compiled=compileBrainContext(facts,parsed.data.scope,parsed.data.input,parsed.data.maxFacts ?? 24);
    return Response.json({
      capsuleId:randomUUID(),
      workspaceId:auth.workspaceId,
      scope:parsed.data.scope,
      ...compiled
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
