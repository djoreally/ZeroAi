import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { ApiKeyRecord } from "./domain";

export function createApiKey(workspaceId:string,name:string,scopes:string[],salt:string) {
  const secret=randomBytes(32).toString("base64url");
  const prefix=`zai_${randomBytes(6).toString("hex")}`;
  const token=`${prefix}.${secret}`;
  const secretHash=hashSecret(secret,salt);
  const now=new Date().toISOString();

  const record:ApiKeyRecord={
    id:randomUUID(),
    workspaceId,
    name,
    prefix,
    secretHash,
    scopes,
    createdAt:now
  };
  return {token,record};
}

function hashSecret(secret:string,salt:string){
  return scryptSync(secret,salt,32).toString("hex");
}

export function verifyApiKey(token:string,record:ApiKeyRecord,salt:string):boolean {
  const [prefix,secret]=token.split(".");
  if(!prefix || !secret || prefix!==record.prefix || record.revokedAt) return false;
  const expected=Buffer.from(record.secretHash,"hex");
  const actual=Buffer.from(hashSecret(secret,salt),"hex");
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}

export function parseApiKeyPrefix(token:string):string|null {
  const [prefix,secret]=token.split(".");
  return prefix?.startsWith("zai_") && secret ? prefix : null;
}
