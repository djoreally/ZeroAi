import { hashObject, signHash } from "@/lib/hash";

export type LedgerEventInput = {
  eventId:string;
  workspaceId:string;
  actor:string;
  action:string;
  timestamp:string;
  inputHash:string;
  outputHash?:string;
  parentHash:string;
  evidenceRefs:string[];
};

export type LedgerEvent = LedgerEventInput & { eventHash:string; signature:string };

export function createLedgerEvent(input:LedgerEventInput,secret:string):LedgerEvent {
  const eventHash = hashObject(input);
  return {...input,eventHash,signature:signHash(eventHash,secret)};
}

export function verifyLedgerChain(events:LedgerEvent[],secret:string):boolean {
  for (let i=0;i<events.length;i+=1) {
    const {eventHash,signature,...unsigned}=events[i];
    if (hashObject(unsigned)!==eventHash) return false;
    if (signHash(eventHash,secret)!==signature) return false;
    if (i>0 && events[i].parentHash!==events[i-1].eventHash) return false;
  }
  return true;
}
