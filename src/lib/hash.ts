import { createHash, createHmac } from "node:crypto";

export function sha256(value:string):string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableJson(value:unknown):string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string,unknown>)
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>`${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
}

export function hashObject(value:unknown):string {
  return sha256(stableJson(value));
}

export function signHash(hash:string,secret:string):string {
  return createHmac("sha256",secret).update(hash).digest("hex");
}
