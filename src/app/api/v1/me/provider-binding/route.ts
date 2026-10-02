import { hashObject } from "@/lib/hash";
import {
  ConnectProviderRequestSchema,
  ProviderBindingRecordSchema,
  PROVIDER_BINDING_STATE_KEY,
  PROVIDER_SECRET_STATE_KEY
} from "@/lib/provider-binding";
import { encryptProviderSecret } from "@/lib/provider-secret";
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
    const parsed=ProviderBindingRecordSchema.safeParse(record?.value);
    return Response.json({
      binding:parsed.success ? {
        ...parsed.data,
        version:record?.version,
        updatedAt:record?.updatedAt,
        credentialConfigured:Boolean(parsed.data.credentialRef)
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
  const parsed=ConnectProviderRequestSchema.safeParse(body);
  if(!parsed.success) return Response.json({error:"INVALID_REQUEST",issues:parsed.error.issues},{status:422});

  try{
    const access=await authorize(workspaceId);
    if(!access.ok) return Response.json({error:access.error},{status:access.status});

    const {provider,model,mode,credentialEnv,apiKey,baseUrl}=parsed.data;
    const binding={
      provider,
      model,
      ...(provider==="ollama" ? {} : mode==="cloud"
        ? {credentialRef:{type:"vault" as const,id:"primary" as const}}
        : {credentialRef:{type:"env" as const,name:credentialEnv!}}),
      ...(baseUrl ? {baseUrl} : {})
    };
    const validBinding=ProviderBindingRecordSchema.parse(binding);

    const current=await access.store.getState(workspaceId,PROVIDER_BINDING_STATE_KEY);
    const now=new Date().toISOString();
    await access.store.putState({
      workspaceId,
      key:PROVIDER_BINDING_STATE_KEY,
      version:(current?.version ?? 0)+1,
      value:validBinding,
      valueHash:hashObject(validBinding),
      updatedAt:now
    },current?.version ?? 0);

    if(provider!=="ollama" && mode==="cloud"){
      const encrypted=encryptProviderSecret(apiKey!);
      const currentSecret=await access.store.getState(workspaceId,PROVIDER_SECRET_STATE_KEY);
      await access.store.putState({
        workspaceId,
        key:PROVIDER_SECRET_STATE_KEY,
        version:(currentSecret?.version ?? 0)+1,
        value:encrypted,
        valueHash:hashObject(encrypted),
        updatedAt:now
      },currentSecret?.version ?? 0);
    }

    return Response.json({
      binding:{
        ...validBinding,
        version:(current?.version ?? 0)+1,
        updatedAt:now,
        credentialConfigured:Boolean(validBinding.credentialRef)
      }
    });
  }catch(error){
    const message=error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return Response.json(
      {error:message},
      {status:message==="STATE_VERSION_CONFLICT" ? 409 : message.startsWith("ZEROAI_PROVIDER_SECRET_KEY_") ? 503 : message==="ZEROAI_PERSISTENCE_NOT_CONFIGURED" ? 503 : 500}
    );
  }
}
