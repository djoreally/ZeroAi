import { randomUUID } from "node:crypto";
import { hashObject } from "./hash";
import { createLedgerEvent } from "./ledger";
import type { EventRecord } from "./domain";
import type { ZeroStore } from "./store";

export async function appendWorkspaceEvent(input:{
  store:ZeroStore;
  workspaceId:string;
  stream:string;
  actor:string;
  action:string;
  payload:unknown;
  evidenceRefs?:string[];
  secret:string;
  anchor?:string;
}):Promise<EventRecord> {
  const latest=await input.store.getLatestEvent(input.workspaceId,input.stream);
  const id=randomUUID();
  const createdAt=new Date().toISOString();
  const payloadHash=hashObject(input.payload);
  const signed=createLedgerEvent({
    eventId:id,
    workspaceId:input.workspaceId,
    actor:input.actor,
    action:input.action,
    timestamp:createdAt,
    inputHash:payloadHash,
    parentHash:latest?.eventHash ?? input.anchor ?? "GENESIS",
    evidenceRefs:input.evidenceRefs ?? []
  },input.secret);

  const record:EventRecord={
    id,
    workspaceId:input.workspaceId,
    stream:input.stream,
    sequence:(latest?.sequence ?? 0)+1,
    actor:input.actor,
    action:input.action,
    payload:input.payload,
    payloadHash,
    parentHash:signed.parentHash,
    eventHash:signed.eventHash,
    signature:signed.signature,
    evidenceRefs:signed.evidenceRefs,
    createdAt
  };

  await input.store.appendEvent(record);
  return record;
}
