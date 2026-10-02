import { hashObject } from "@/lib/hash";
import { ProviderBindingRecordSchema, PROVIDER_BINDING_STATE_KEY } from "@/lib/provider-binding";
import { authenticateWorkspaceRequest } from "@/lib/workspace-auth";
import { getStore } from "@/lib/runtime-store";

function workspaceIdFrom(request:Request){
  return request.headers.get("x-zeroai-workspace")?.trim() ?? "";
}

export async function GET(request:Request){
  const workspaceId=workspaceIdFrom(request);
  if(!workspaceId) return Response.json({error:"WORKSPACE_REQUIRED"},{status:400});
  try{
    const auth=await authenticateWorkspaceRequest(request,workspaceId,"runtime:intercept");
    if(!auth.ok) return Response.json({error:auth.error},{status:auth.status});
    const record=await getStore().getState(workspaceId,PROVIDER_BINDING_STATE_KEY);
    return Response.json({
      binding:record ? {
        ...(record.value as object),
        version:record.version,
        updatedAt:record.updatedAt
      } : null
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}

export async function PUT(request:Request){
  const workspaceId=workspaceIdFrom(request);
  if(!workspaceId) return Response.json({error:"WORKSPACE_REQUIRED"},{status:400});

  let body:unknown;
  try{body=await request.json();}catch{return Response.json({error:"INVALID_JSON"},{status:400});}

  const parsed=ProviderBindingRecordSchema.safeParse(body);
  if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

  try{
    const auth=await authenticateWorkspaceRequest(request,workspaceId,"runtime:intercept");
    if(!auth.ok) return Response.json({error:auth.error},{status:auth.status});

    const store=getStore();
    const current=await store.getState(workspaceId,PROVIDER_BINDING_STATE_KEY);
    const now=new Date().toISOString();
    const value=parsed.data;
    const record={
      workspaceId,
      key:PROVIDER_BINDING_STATE_KEY,
      version:(current?.version ?? 0)+1,
      value,
      valueHash:hashObject(value),
      updatedAt:now
    };
    await store.putState(record,current?.version ?? 0);
    return Response.json({
      binding:{...value,version:record.version,updatedAt:record.updatedAt}
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json(
      {error:message},
      {status:message==="STATE_VERSION_CONFLICT" ? 409 : message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500}
    );
  }
}
