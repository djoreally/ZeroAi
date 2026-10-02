import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../lib/auth";
import { getStore } from "../../../../lib/runtime-store";

const Body=z.object({
  intentHash:z.string().min(1),
  graphHash:z.string().min(1)
});

export async function POST(request:Request) {
  try {
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"execution:run")) return Response.json({error:"FORBIDDEN"},{status:403});
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const execution={
      id:randomUUID(),
      workspaceId:auth.workspaceId,
      intentHash:parsed.data.intentHash,
      graphHash:parsed.data.graphHash,
      status:"queued" as const,
      createdAt:new Date().toISOString()
    };
    await store.createExecution(execution);
    return Response.json({execution},{status:201});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
