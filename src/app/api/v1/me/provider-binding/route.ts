import { hashObject } from "@/lib/hash";
import { ProviderBindingRecordSchema, PROVIDER_BINDING_STATE_KEY } from "@/lib/provider-binding";
import { getStore } from "@/lib/runtime-store";
import { getSignedInUser } from "@/lib/user-session";

function workspaceIdFrom(request:Request){
  return request.headers.get("x-zeroai-workspace")?.trim() ?? "";
}

async function authorize(workspaceId:string){
  const user=await getSignedInUser();
  if(!user) return {ok:false as const,status:401,error:"UNAUTHORIZED"};
  const store=getStore();
  const membership=await store.getWorkspaceMembership(workspaceId,user.id);
  if(!membership || membership.status!=="active") return {ok:false as const,status:403,error:"WORKSPACE_ACCESS_DENIED"};
  if(!["owner","admin","member"].includes(membership.role)) return {ok:false as const,status:403,error:"WORKSPACE_WRITE_DENIED"};
  return {ok:true as const,user,store,membership};
}

export async function GET(request:Request){
  const workspaceId=workspaceIdFrom(request);
  if(!workspaceId) return Response.json({error:"WORKSPACE_REQUIRED"},{status:400});
  try{
    const access=await authorize(workspaceId);
    if(!access.ok) return Response.json({error:access.error},{status:access.status});
    const record=await access.store.getState(workspaceId,PROVIDER_BINDING_STATE_KEY);
    return Response.json({
      binding:record ? {...(record.value as object),version:record.version,updatedAt:record.updatedAt} : null
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
    const access=await authorize(workspaceId);
    if(!access.ok) return Response.json({error:access.error},{status:access.status});
    const current=await access.store.getState(workspaceId,PROVIDER_BINDING_STATE_KEY);
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
    await access.store.putState(record,current?.version ?? 0);
    return Response.json({binding:{...value,version:record.version,updatedAt:record.updatedAt}});
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json({error:message},{status:message==="STATE_VERSION_CONFLICT" ? 409 : message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500});
  }
}
