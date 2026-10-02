import { parseApiKeyPrefix, verifyApiKey } from "./api-key";
import { getStore } from "./runtime-store";

export async function authenticateWorkspaceRequest(request:Request,workspaceId:string,requiredScope:string){
  const header=request.headers.get("authorization") ?? "";
  if(!header.startsWith("Bearer ")) return {ok:false as const,status:401,error:"UNAUTHORIZED"};
  const token=header.slice(7).trim();
  const prefix=parseApiKeyPrefix(token);
  if(!prefix) return {ok:false as const,status:401,error:"UNAUTHORIZED"};

  const salt=process.env.ZEROAI_API_KEY_SALT;
  if(!salt) return {ok:false as const,status:503,error:"ZEROAI_API_KEY_SALT_NOT_CONFIGURED"};

  const store=getStore();
  const record=await store.findApiKeyByPrefix(prefix);
  if(!record || record.workspaceId!==workspaceId || !verifyApiKey(token,record,salt)){
    return {ok:false as const,status:401,error:"UNAUTHORIZED"};
  }
  if(!record.scopes.includes(requiredScope) && !record.scopes.includes("*")){
    return {ok:false as const,status:403,error:"INSUFFICIENT_SCOPE"};
  }
  await store.updateApiKeyLastUsed(record.id,new Date().toISOString());
  return {ok:true as const,workspaceId:record.workspaceId,apiKeyId:record.id};
}
