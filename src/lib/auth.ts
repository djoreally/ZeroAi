import type { ZeroStore } from "./store";
import { parseApiKeyPrefix, verifyApiKey } from "./api-key";

export type AuthContext = {workspaceId:string;apiKeyId:string;scopes:string[]};

export async function authenticateRequest(request:Request,store:ZeroStore):Promise<AuthContext|null> {
  const header=request.headers.get("authorization");
  if(!header?.startsWith("Bearer ")) return null;
  const token=header.slice(7).trim();
  const prefix=parseApiKeyPrefix(token);
  const salt=process.env.ZEROAI_API_KEY_SALT;
  if(!prefix || !salt) return null;
  const record=await store.findApiKeyByPrefix(prefix);
  if(!record || !verifyApiKey(token,record,salt)) return null;
  await store.updateApiKeyLastUsed(record.id,new Date().toISOString());
  return {workspaceId:record.workspaceId,apiKeyId:record.id,scopes:record.scopes};
}

export function hasScope(context:AuthContext,scope:string){
  return context.scopes.includes("*") || context.scopes.includes(scope);
}
