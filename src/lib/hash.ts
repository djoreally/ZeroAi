import { createHash, createHmac } from "node:crypto";
import canonicalize from "canonicalize";

export function sha256(value:string):string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value:unknown):string {
  const serialized=canonicalize(value);
  if(serialized===undefined) throw new Error("VALUE_IS_NOT_CANONICAL_JSON");
  return serialized;
}

export function hashObject(value:unknown):string {
  return sha256(stableJson(value));
}

export function signHash(hash:string,secret:string):string {
  return createHmac("sha256",secret).update(hash).digest("hex");
}
