import { hashObject } from "../../../../../lib/hash";
import { authenticateRequest,hasScope } from "../../../../../lib/auth";
import { getStore } from "../../../../../lib/runtime-store";

export async function GET(request:Request,{params}:{params:Promise<{key:string}>}) {
  try {
    const {key}=await params;
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"state:read")) return Response.json({error:"FORBIDDEN"},{status:403});
    const state=await store.getState(auth.workspaceId,key);
    return state ? Response.json({state}) : Response.json({error:"STATE_NOT_FOUND"},{status:404});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}

export async function PUT(request:Request,{params}:{params:Promise<{key:string}>}) {
  try {
    const {key}=await params;
    const store=getStore();
    const auth=await authenticateRequest(request,store);
    if(!auth) return Response.json({error:"UNAUTHORIZED"},{status:401});
    if(!hasScope(auth,"state:write")) return Response.json({error:"FORBIDDEN"},{status:403});
    const body=await request.json() as {value:unknown;expectedVersion?:number};
    const current=await store.getState(auth.workspaceId,key);
    const version=(current?.version ?? 0)+1;
    const record={workspaceId:auth.workspaceId,key,version,value:body.value,valueHash:hashObject(body.value),updatedAt:new Date().toISOString()};
    await store.putState(record,body.expectedVersion);
    return Response.json({state:record});
  } catch(error) {
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="STATE_VERSION_CONFLICT" ? 409 : message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
