import { randomUUID } from "node:crypto";
import type { Workspace } from "./domain";

export function newWorkspace(input:{name:string;slug:string}):Workspace {
  const now=new Date().toISOString();
  return {
    id:randomUUID(),
    name:input.name.trim(),
    slug:input.slug.trim().toLowerCase(),
    status:"active",
    createdAt:now,
    updatedAt:now
  };
}
