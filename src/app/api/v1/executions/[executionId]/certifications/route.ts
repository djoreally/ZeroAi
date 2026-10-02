import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../../lib/auth";
import { certify } from "../../../../../../lib/cert";
import { getStore } from "../../../../../../lib/runtime-store";

const Body=z.object({
  requirementId:z.string().min(1),
  requiredEvidenceTypes:z.array(z.string()).min(1)
});

export async function POST(request:Request,{params}:{params:Promise<{executionId:string}>}) {
  try {
    const {executionId}=await params;
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"certification:write")) return Response.json({error:"FORBIDDEN"},{status:403});
    if(!await store.getExecution(auth.workspaceId,executionId)) return Response.json({error:"EXECUTION_NOT_FOUND"},{status:404});
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const evidence=await store.listEvidence(auth.workspaceId,executionId);
    const result=certify(
      {id:parsed.data.requirementId,requiredEvidenceTypes:parsed.data.requiredEvidenceTypes},
      evidence.map(item=>({id:item.id,type:item.type,state:item.state,artifactHash:item.artifactHash}))
    );
    const record={
      id:randomUUID(),
      workspaceId:auth.workspaceId,
      executionId,
      requirementId:parsed.data.requirementId,
      state:result.state,
      evidenceIds:result.evidence.map(item=>item.id),
      createdAt:new Date().toISOString()
    };
    await store.createCertification(record);
    return Response.json({certification:record});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
