import { z } from "zod";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { appendWorkspaceEvent } from "../../../../../lib/event-service";
import { getStore } from "../../../../../lib/runtime-store";

const Body=z.object({
  actor:z.string().min(1),
  action:z.string().min(1),
  payload:z.unknown(),
  evidenceRefs:z.array(z.string()).default([])
});

export async function POST(request:Request,{params}:{params:Promise<{stream:string}>}) {
  try {
    const {stream}=await params;
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"events:write")) return Response.json({error:"FORBIDDEN"},{status:403});
    const secret=process.env.ZEROAI_LEDGER_SECRET;
    if(!secret) return Response.json({error:"ZEROAI_LEDGER_SECRET_NOT_CONFIGURED"},{status:503});
    const parsed=Body.safeParse(await request.json());
    if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});
    const event=await appendWorkspaceEvent({store,workspaceId:auth.workspaceId,stream,secret,...parsed.data});
    return Response.json({event},{status:201});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="EVENT_SEQUENCE_CONFLICT" ? 409 : message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}

export async function GET(request:Request,{params}:{params:Promise<{stream:string}>}) {
  try {
    const {stream}=await params;
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"events:read")) return Response.json({error:"FORBIDDEN"},{status:403});
    return Response.json({events:await store.listEvents(auth.workspaceId,stream,100)});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
