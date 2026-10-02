import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../../lib/auth";
import { getStore } from "../../../../../../lib/runtime-store";

const Body=z.object({
  type:z.string().min(1),
  state:z.enum(["VERIFIED","PARTIAL","UNKNOWN","FAILED"]),
  artifactHash:z.string().optional(),
  payload:z.unknown()
});

export async function POST(request:Request,{params}:{params:Promise<{executionId:string}>}) {
  try {
    const {executionId}=await params;
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"evidence:write")) return Response.json({error:"FORBIDDEN"},{status:403});
    if(!await store.getExecution(auth.workspaceId,executionId)) return Response.json({error:"EXECUTION_NOT_FOUND"},{status:404});
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const evidence={id:randomUUID(),workspaceId:auth.workspaceId,executionId,...parsed.data,createdAt:new Date().toISOString()};
    await store.createEvidence(evidence);
    return Response.json({evidence},{status:201});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
