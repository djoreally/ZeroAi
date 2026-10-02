export type Workspace = {
  id:string;
  slug:string;
  name:string;
  status:"active"|"suspended";
  createdAt:string;
  updatedAt:string;
};

export type ApiKeyRecord = {
  id:string;
  workspaceId:string;
  name:string;
  prefix:string;
  secretHash:string;
  scopes:string[];
  createdAt:string;
  lastUsedAt?:string;
  revokedAt?:string;
};

export type StateRecord = {
  workspaceId:string;
  key:string;
  version:number;
  value:unknown;
  valueHash:string;
  updatedAt:string;
};

export type EventRecord = {
  id:string;
  workspaceId:string;
  stream:string;
  sequence:number;
  actor:string;
  action:string;
  payload:unknown;
  payloadHash:string;
  parentHash:string;
  eventHash:string;
  signature:string;
  evidenceRefs:string[];
  createdAt:string;
};

export type MemoryFactRecord = {
  id:string;
  workspaceId:string;
  subject:string;
  predicate:string;
  object:string;
  confidence:number;
  salience:number;
  sourceEventId?:string;
  validFrom:string;
  invalidatedAt?:string;
  createdAt:string;
  updatedAt:string;
};

export type ExecutionRecord = {
  id:string;
  workspaceId:string;
  intentHash:string;
  graphHash:string;
  status:"queued"|"running"|"blocked"|"succeeded"|"failed"|"rejected";
  currentTaskId?:string;
  startedAt?:string;
  completedAt?:string;
  createdAt:string;
};

export type EvidenceRecord = {
  id:string;
  workspaceId:string;
  executionId:string;
  type:string;
  state:"VERIFIED"|"PARTIAL"|"UNKNOWN"|"FAILED";
  artifactHash?:string;
  payload:unknown;
  createdAt:string;
};

export type CertificationRecord = {
  id:string;
  workspaceId:string;
  executionId:string;
  requirementId:string;
  state:"VERIFIED"|"PARTIAL"|"UNKNOWN"|"FAILED";
  evidenceIds:string[];
  createdAt:string;
};
